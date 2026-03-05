/**
 * CSGO 网络优化 - 自适应同步策略
 * 实现日期: 2026-03-05
 *
 * 优化目标：
 * 1. 根据移动状态动态调整发送频率
 * 2. 静止时降低频率以节省带宽
 * 3. 快速移动时提高频率以确保流畅
 * 4. 战斗时提高频率以确保实时性
 */

// 配置参数
const NETWORK_CONFIG = {
  // 发送频率配置（毫秒）
  IDLE_INTERVAL: 200,    // 静止时：200ms (5 FPS)
  WALK_INTERVAL: 100,    // 步行时：100ms (10 FPS)
  RUN_INTERVAL: 50,      // 奔跑时：50ms (20 FPS)
  COMBAT_INTERVAL: 33,  // 战斗时：33ms (30 FPS)

  // 速度阈值（单位/秒）
  WALK_SPEED_THRESHOLD: 1.5,
  RUN_SPEED_THRESHOLD: 4.0,

  // 距离阈值（用于检测显著移动）
  POSITION_THRESHOLD: 0.05,

  // 角度阈值（用于检测视角变化）
  YAW_THRESHOLD: 0.01,
  PITCH_THRESHOLD: 0.01
}

// 状态跟踪
let lastMoveSendTime = 0
let lastSyncPos = null
let lastSyncYaw = 0
let lastSyncPitch = 0
let isCombatMode = false
let lastFireTime = 0

/**
 * 计算移动速度（单位/秒）
 */
function getMoveSpeed(vel) {
  if (!vel) return 0
  const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z)
  return Math.abs(speed)
}

/**
 * 计算位置变化
 */
function getPositionDelta(currentPos, lastPos) {
  if (!currentPos || !lastPos) return Infinity
  const dx = currentPos.x - lastPos.x
  const dz = currentPos.z - lastPos.z
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * 计算视角变化
 */
function getRotationDelta(currentYaw, currentPitch, lastYaw, lastPitch) {
  const yawDelta = Math.abs(currentYaw - lastYaw)
  const pitchDelta = Math.abs(currentPitch - lastPitch)
  return Math.sqrt(yawDelta * yawDelta + pitchDelta * pitchDelta)
}

/**
 * 判断是否处于战斗模式
 * 条件：最近3秒内开火，或当前正在瞄准
 */
function checkCombatMode() {
  const now = Date.now()
  const recentFire = (now - lastFireTime) < 3000
  return recentFire || isCombatMode
}

/**
 * 根据当前状态确定发送间隔
 */
function getSyncInterval(moveSpeed, isCombat) {
  // 战斗模式：最高频率
  if (isCombat) {
    return NETWORK_CONFIG.COMBAT_INTERVAL
  }

  // 根据速度决定频率
  if (moveSpeed >= NETWORK_CONFIG.RUN_SPEED_THRESHOLD) {
    return NETWORK_CONFIG.RUN_INTERVAL
  } else if (moveSpeed >= NETWORK_CONFIG.WALK_SPEED_THRESHOLD) {
    return NETWORK_CONFIG.WALK_INTERVAL
  } else {
    return NETWORK_CONFIG.IDLE_INTERVAL
  }
}

/**
 * 判断是否需要立即同步（位置或视角显著变化）
 */
function shouldForceSync(pos, yaw, pitch) {
  if (!lastSyncPos) return true

  const posDelta = getPositionDelta(pos, lastSyncPos)
  const rotDelta = getRotationDelta(yaw, pitch, lastSyncYaw, lastSyncPitch)

  return (
    posDelta >= NETWORK_CONFIG.POSITION_THRESHOLD ||
    rotDelta >= Math.sqrt(
      NETWORK_CONFIG.YAW_THRESHOLD ** 2 +
      NETWORK_CONFIG.PITCH_THRESHOLD ** 2
    )
  )
}

/**
 * 发送玩家移动数据（优化版）
 */
function sendPlayerMovement() {
  // 安全检查
  if (!multiplayer || !multiplayer.isConnected || game.mode !== 'online') return

  // 检查玩家是否初始化
  if (!game.player || !game.player.pos) {
    console.warn('⚠️ Player not initialized, skip movement sync')
    return
  }

  const now = Date.now()

  // 计算移动速度
  const moveSpeed = getMoveSpeed(game.vel)

  // 检查战斗模式
  const inCombat = checkCombatMode()

  // 获取同步间隔
  const syncInterval = getSyncInterval(moveSpeed, inCombat)

  // 检查是否需要立即同步
  const forceSync = shouldForceSync(game.player.pos, game.yaw, game.pitch)

  // 检查是否到达发送时间
  if (!forceSync && now - lastMoveSendTime < syncInterval) {
    return
  }

  // 更新发送时间
  lastMoveSendTime = now

  // 记录同步状态
  lastSyncPos = { ...game.player.pos }
  lastSyncYaw = game.yaw
  lastSyncPitch = game.pitch

  // 发送移动数据
  try {
    const weapon = game.getWeapon()
    multiplayer.sendMove(
      game.player.pos,
      { x: game.pitch, y: game.yaw, z: 0 },
      game.vel || { x: 0, y: 0, z: 0 },
      {
        hp: game.hp,
        weapon: weapon && weapon.def ? weapon.def.id : 'unknown',
        alive: game.playerAlive,
        team: game.team
      }
    )
  } catch (error) {
    console.error('Failed to send movement:', error)
  }
}

/**
 * 记录开火时间（用于战斗模式检测）
 */
function recordFireTime() {
  lastFireTime = Date.now()
}

/**
 * 设置战斗模式状态
 */
function setCombatMode(enabled) {
  isCombatMode = enabled
}

/**
 * 重置网络同步状态
 */
function resetNetworkSync() {
  lastMoveSendTime = 0
  lastSyncPos = null
  lastSyncYaw = 0
  lastSyncPitch = 0
  isCombatMode = false
  lastFireTime = 0
}

/**
 * 获取当前同步状态信息（用于调试）
 */
function getNetworkSyncStatus() {
  const moveSpeed = getMoveSpeed(game.vel)
  const inCombat = checkCombatMode()
  const interval = getSyncInterval(moveSpeed, inCombat)
  const forceSync = shouldForceSync(game.player.pos, game.yaw, game.pitch)

  return {
    moveSpeed: moveSpeed.toFixed(2),
    inCombat,
    interval,
    forceSync,
    mode: inCombat ? 'COMBAT' : (
      moveSpeed >= NETWORK_CONFIG.RUN_SPEED_THRESHOLD ? 'RUN' :
      moveSpeed >= NETWORK_CONFIG.WALK_SPEED_THRESHOLD ? 'WALK' : 'IDLE'
    )
  }
}

// 导出函数（如果需要从其他模块调用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendPlayerMovement,
    recordFireTime,
    setCombatMode,
    resetNetworkSync,
    getNetworkSyncStatus,
    NETWORK_CONFIG
  }
}
