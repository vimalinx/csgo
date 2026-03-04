/**
 * CSGO Spectator Mode Module
 * 死亡视角/观战模式系统
 */

// ==================== 观战模式常量 ====================

const SPECTATOR_MODE = Object.freeze({
  FIRST_PERSON: 'firstPerson',   // 第一人称（跟随队友视角）
  THIRD_PERSON: 'thirdPerson',   // 第三人称（俯视视角）
  FREE_CAMERA: 'freeCamera'      // 自由视角（飞行摄像头）
})

const SPECTATOR_TRANSITION_DURATION = 800 // 摄像头过渡时间（毫秒）
const SPECTATOR_START_DELAY = 3000         // 死亡后3秒开始观战
const FREE_CAMERA_SPEED = 10              // 自由视角移动速度
const FREE_CAMERA_SENSITIVITY = 0.003     // 自由视角鼠标灵敏度

// ==================== 观战模式状态 ====================

class SpectatorState {
  constructor() {
    this.enabled = false                  // 是否启用观战
    this.mode = SPECTATOR_MODE.THIRD_PERSON  // 当前视角模式
    this.targetPlayerId = null            // 当前观战目标
    this.targetIndex = 0                  // 当前目标索引
    this.transitioning = false            // 是否正在过渡
    this.transitionStart = 0              // 过渡开始时间
    this.transitionFrom = null            // 过渡起始位置
    this.transitionTo = null              // 过渡目标位置
    this.deathTime = 0                    // 死亡时间
    this.deathPosition = null             // 死亡位置
    this.killerId = null                  // 击杀者ID
    this.killerName = ''                  // 击杀者名字
    this.killerTeam = ''                  // 击杀者队伍
    this.startDelayActive = false         // 是否在延迟启动阶段
    this.freeCameraPos = null             // 自由视角位置
    this.freeCameraYaw = 0                // 自由视角偏航
    this.freeCameraPitch = 0              // 自由视角俯仰
  }

  reset() {
    this.enabled = false
    this.mode = SPECTATOR_MODE.THIRD_PERSON
    this.targetPlayerId = null
    this.targetIndex = 0
    this.transitioning = false
    this.transitionStart = 0
    this.transitionFrom = null
    this.transitionTo = null
    this.deathTime = 0
    this.deathPosition = null
    this.killerId = null
    this.killerName = ''
    this.killerTeam = ''
    this.startDelayActive = false
    this.freeCameraPos = null
    this.freeCameraYaw = 0
    this.freeCameraPitch = 0
  }
}

// ==================== 观战模式管理器 ====================

class SpectatorManager {
  constructor(game, multiplayer = null) {
    this.game = game
    this.multiplayer = multiplayer
    this.state = new SpectatorState()
    this.onModeChange = null    // 视角模式变化回调
    this.onTargetChange = null  // 观战目标变化回调
    this.onEnabled = null       // 启用观战回调
    this.onDisabled = null      // 禁用观战回调
  }

  /**
   * 开始观战模式
   * @param {Object} deathData - 死亡数据 { deathPosition, killerId, killerName, killerTeam }
   */
  start(deathData = {}) {
    this.state.reset()
    this.state.enabled = true
    this.state.deathTime = Date.now()
    this.state.deathPosition = deathData.deathPosition || { ...this.game.pos }
    this.state.killerId = deathData.killerId || null
    this.state.killerName = deathData.killerName || 'Unknown'
    this.state.killerTeam = deathData.killerTeam || ''
    this.state.startDelayActive = true

    // 初始化自由视角位置为死亡位置
    this.state.freeCameraPos = { ...this.state.deathPosition }
    this.state.freeCameraYaw = this.game.yaw
    this.state.freeCameraPitch = this.game.pitch

    // 设置延迟启动
    setTimeout(() => {
      if (this.state.enabled) {
        this.state.startDelayActive = false
        this._selectFirstTarget()
        if (this.onEnabled) this.onEnabled()
      }
    }, SPECTATOR_START_DELAY)
  }

  /**
   * 停止观战模式
   */
  stop() {
    const wasEnabled = this.state.enabled
    this.state.reset()
    if (wasEnabled && this.onDisabled) {
      this.onDisabled()
    }
  }

  /**
   * 是否在观战模式
   */
  isEnabled() {
    return this.state.enabled
  }

  /**
   * 是否在延迟启动阶段
   */
  isInStartDelay() {
    return this.state.startDelayActive
  }

  /**
   * 获取当前视角模式
   */
  getMode() {
    return this.state.mode
  }

  /**
   * 切换视角模式
   * 循环: 第一人称 -> 第三人称 -> 自由视角 -> 第一人称
   */
  cycleMode() {
    if (!this.state.enabled || this.state.startDelayActive) return

    const modes = [
      SPECTATOR_MODE.FIRST_PERSON,
      SPECTATOR_MODE.THIRD_PERSON,
      SPECTATOR_MODE.FREE_CAMERA
    ]

    const currentIndex = modes.indexOf(this.state.mode)
    const nextIndex = (currentIndex + 1) % modes.length
    const oldMode = this.state.mode
    this.state.mode = modes[nextIndex]

    // 如果切换到自由视角，初始化位置
    if (this.state.mode === SPECTATOR_MODE.FREE_CAMERA) {
      const targetPos = this._getTargetPosition()
      if (targetPos) {
        this.state.freeCameraPos = {
          x: targetPos.x,
          y: targetPos.y + 3,
          z: targetPos.z
        }
      }
    }

    // 开始过渡动画
    this._startTransition()

    if (this.onModeChange) {
      this.onModeChange(oldMode, this.state.mode)
    }
  }

  /**
   * 切换观战目标（下一个队友）
   */
  nextTarget() {
    if (!this.state.enabled || this.state.startDelayActive) return
    if (this.state.mode === SPECTATOR_MODE.FREE_CAMERA) return

    const targets = this._getValidTargets()
    if (targets.length === 0) return

    this.state.targetIndex = (this.state.targetIndex + 1) % targets.length
    this.state.targetPlayerId = targets[this.state.targetIndex].id

    this._startTransition()

    if (this.onTargetChange) {
      this.onTargetChange(this.state.targetPlayerId)
    }
  }

  /**
   * 切换观战目标（上一个队友）
   */
  prevTarget() {
    if (!this.state.enabled || this.state.startDelayActive) return
    if (this.state.mode === SPECTATOR_MODE.FREE_CAMERA) return

    const targets = this._getValidTargets()
    if (targets.length === 0) return

    this.state.targetIndex = (this.state.targetIndex - 1 + targets.length) % targets.length
    this.state.targetPlayerId = targets[this.state.targetIndex].id

    this._startTransition()

    if (this.onTargetChange) {
      this.onTargetChange(this.state.targetPlayerId)
    }
  }

  /**
   * 更新观战摄像机
   * @param {number} dt - 帧时间（秒）
   * @param {Set} keys - 按键集合
   * @param {number} mouseDX - 鼠标X移动
   * @param {number} mouseDY - 鼠标Y移动
   * @returns {Object} 摄像机位置和朝向 { pos, yaw, pitch }
   */
  update(dt, keys = new Set(), mouseDX = 0, mouseDY = 0) {
    if (!this.state.enabled || this.state.startDelayActive) {
      // 返回死亡视角（缓慢下落）
      return {
        pos: this.state.deathPosition || this.game.pos,
        yaw: this.game.yaw,
        pitch: this.game.pitch
      }
    }

    // 处理过渡
    if (this.state.transitioning) {
      return this._updateTransition()
    }

    // 根据模式返回摄像机位置
    switch (this.state.mode) {
      case SPECTATOR_MODE.FIRST_PERSON:
        return this._updateFirstPerson()
      case SPECTATOR_MODE.THIRD_PERSON:
        return this._updateThirdPerson()
      case SPECTATOR_MODE.FREE_CAMERA:
        return this._updateFreeCamera(dt, keys, mouseDX, mouseDY)
      default:
        return this._updateThirdPerson()
    }
  }

  /**
   * 获取观战目标信息
   */
  getTargetInfo() {
    if (!this.state.enabled || this.state.startDelayActive) {
      return null
    }

    if (this.state.mode === SPECTATOR_MODE.FREE_CAMERA) {
      return null
    }

    const target = this._getCurrentTarget()
    if (!target) return null

    return {
      id: target.id,
      name: target.name,
      hp: target.hp,
      maxHp: target.maxHp || 100,
      weapon: target.weapon || 'unknown',
      team: target.team,
      alive: target.alive !== false
    }
  }

  /**
   * 获取死亡信息
   */
  getDeathInfo() {
    if (!this.state.enabled) return null

    return {
      deathTime: this.state.deathTime,
      killerName: this.state.killerName,
      killerTeam: this.state.killerTeam,
      startDelay: this.state.startDelayActive
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 选择第一个观战目标
   */
  _selectFirstTarget() {
    const targets = this._getValidTargets()
    if (targets.length > 0) {
      this.state.targetIndex = 0
      this.state.targetPlayerId = targets[0].id
      this._startTransition()
    }
  }

  /**
   * 获取有效的观战目标列表（队友）
   */
  _getValidTargets() {
    const targets = []
    const myTeam = this.game.team

    // AI模式：从bots中选择队友
    if (this.game.mode === 'ai' && this.game.bots) {
      for (const bot of this.game.bots) {
        if (bot.alive && bot.team === myTeam) {
          targets.push({
            id: `bot_${bot.id}`,
            name: bot.name || `Bot ${bot.id}`,
            hp: bot.hp,
            maxHp: bot.maxHp || 100,
            weapon: bot.weapon?.def?.id || 'rifle',
            team: bot.team,
            pos: bot.pos,
            yaw: bot.yaw,
            alive: true,
            isBot: true,
            botRef: bot
          })
        }
      }
    }

    // 多人模式：从otherPlayers中选择队友
    if (this.game.mode === 'online' && typeof otherPlayers !== 'undefined') {
      for (const [playerId, playerData] of otherPlayers) {
        if (playerData.team === myTeam && playerData.alive !== false) {
          const hp = playerData.hp ?? playerData.health ?? 100
          if (hp > 0) {
            targets.push({
              id: playerId,
              name: playerData.name || playerData.username || 'Player',
              hp: hp,
              maxHp: playerData.maxHp || 100,
              weapon: playerData.weapon || 'rifle',
              team: playerData.team,
              pos: playerData.position,
              yaw: playerData.rotation?.y || 0,
              pitch: playerData.rotation?.x || 0,
              alive: true,
              isBot: false
            })
          }
        }
      }
    }

    return targets
  }

  /**
   * 获取当前观战目标
   */
  _getCurrentTarget() {
    const targets = this._getValidTargets()
    return targets.find(t => t.id === this.state.targetPlayerId) || targets[0] || null
  }

  /**
   * 获取目标位置
   */
  _getTargetPosition() {
    const target = this._getCurrentTarget()
    return target ? target.pos : null
  }

  /**
   * 开始过渡动画
   */
  _startTransition() {
    const currentPos = this._getCurrentCameraPosition()
    const targetPos = this._getTargetCameraPosition()

    if (currentPos && targetPos) {
      this.state.transitioning = true
      this.state.transitionStart = Date.now()
      this.state.transitionFrom = currentPos
      this.state.transitionTo = targetPos
    }
  }

  /**
   * 更新过渡动画
   */
  _updateTransition() {
    const elapsed = Date.now() - this.state.transitionStart
    const t = Math.min(1, elapsed / SPECTATOR_TRANSITION_DURATION)
    const easeT = this._easeInOutCubic(t)

    const from = this.state.transitionFrom
    const to = this.state.transitionTo

    const pos = {
      x: from.pos.x + (to.pos.x - from.pos.x) * easeT,
      y: from.pos.y + (to.pos.y - from.pos.y) * easeT,
      z: from.pos.z + (to.pos.z - from.pos.z) * easeT
    }

    const yaw = from.yaw + this._angleDiff(to.yaw, from.yaw) * easeT
    const pitch = from.pitch + (to.pitch - from.pitch) * easeT

    if (t >= 1) {
      this.state.transitioning = false
    }

    return { pos, yaw, pitch }
  }

  /**
   * 获取当前摄像机位置
   */
  _getCurrentCameraPosition() {
    const target = this._getCurrentTarget()
    if (!target) return null

    switch (this.state.mode) {
      case SPECTATOR_MODE.FIRST_PERSON:
        return this._getFirstPersonCamera(target)
      case SPECTATOR_MODE.THIRD_PERSON:
        return this._getThirdPersonCamera(target)
      case SPECTATOR_MODE.FREE_CAMERA:
        return {
          pos: { ...this.state.freeCameraPos },
          yaw: this.state.freeCameraYaw,
          pitch: this.state.freeCameraPitch
        }
      default:
        return this._getThirdPersonCamera(target)
    }
  }

  /**
   * 获取目标摄像机位置
   */
  _getTargetCameraPosition() {
    const target = this._getCurrentTarget()
    if (!target) return null

    switch (this.state.mode) {
      case SPECTATOR_MODE.FIRST_PERSON:
        return this._getFirstPersonCamera(target)
      case SPECTATOR_MODE.THIRD_PERSON:
        return this._getThirdPersonCamera(target)
      case SPECTATOR_MODE.FREE_CAMERA:
        return {
          pos: { ...this.state.freeCameraPos },
          yaw: this.state.freeCameraYaw,
          pitch: this.state.freeCameraPitch
        }
      default:
        return this._getThirdPersonCamera(target)
    }
  }

  /**
   * 第一人称摄像机
   */
  _getFirstPersonCamera(target) {
    return {
      pos: {
        x: target.pos.x,
        y: target.pos.y + 1.6, // 眼睛高度
        z: target.pos.z
      },
      yaw: target.yaw,
      pitch: target.pitch || 0
    }
  }

  /**
   * 第三人称摄像机（俯视视角）
   */
  _getThirdPersonCamera(target) {
    const distance = 5
    const height = 3
    const yaw = target.yaw

    // 计算摄像机位置（在目标身后）
    const camX = target.pos.x - Math.sin(yaw) * distance
    const camY = target.pos.y + height
    const camZ = target.pos.z - Math.cos(yaw) * distance

    // 计算朝向目标的角度
    const dx = target.pos.x - camX
    const dz = target.pos.z - camZ
    const camYaw = Math.atan2(dx, dz)
    const camPitch = -0.3 // 轻微向下看

    return {
      pos: { x: camX, y: camY, z: camZ },
      yaw: camYaw,
      pitch: camPitch
    }
  }

  /**
   * 更新第一人称视角
   */
  _updateFirstPerson() {
    const target = this._getCurrentTarget()
    if (!target) return this._updateThirdPerson()

    return this._getFirstPersonCamera(target)
  }

  /**
   * 更新第三人称视角
   */
  _updateThirdPerson() {
    const target = this._getCurrentTarget()
    if (!target) {
      // 没有有效目标时，保持死亡位置
      return {
        pos: this.state.deathPosition || this.game.pos,
        yaw: this.game.yaw,
        pitch: this.game.pitch
      }
    }

    return this._getThirdPersonCamera(target)
  }

  /**
   * 更新自由视角
   */
  _updateFreeCamera(dt, keys, mouseDX, mouseDY) {
    // 鼠标控制视角
    this.state.freeCameraYaw += mouseDX * FREE_CAMERA_SENSITIVITY
    this.state.freeCameraPitch -= mouseDY * FREE_CAMERA_SENSITIVITY
    this.state.freeCameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.state.freeCameraPitch))

    // 计算移动方向
    const fwd = this._forwardFromYawPitch(this.state.freeCameraYaw, this.state.freeCameraPitch)
    const right = this._rightFromYaw(this.state.freeCameraYaw)
    const up = { x: 0, y: 1, z: 0 }

    let moveDir = { x: 0, y: 0, z: 0 }

    // WASD 移动
    if (keys.has('KeyW')) {
      moveDir.x += fwd.x
      moveDir.y += fwd.y
      moveDir.z += fwd.z
    }
    if (keys.has('KeyS')) {
      moveDir.x -= fwd.x
      moveDir.y -= fwd.y
      moveDir.z -= fwd.z
    }
    if (keys.has('KeyA')) {
      moveDir.x -= right.x
      moveDir.z -= right.z
    }
    if (keys.has('KeyD')) {
      moveDir.x += right.x
      moveDir.z += right.z
    }
    if (keys.has('Space')) {
      moveDir.y += 1
    }
    if (keys.has('ShiftLeft') || keys.has('ShiftRight')) {
      moveDir.y -= 1
    }

    // 归一化移动方向
    const len = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y + moveDir.z * moveDir.z)
    if (len > 0) {
      moveDir.x /= len
      moveDir.y /= len
      moveDir.z /= len
    }

    // 应用移动
    const speed = FREE_CAMERA_SPEED * dt
    this.state.freeCameraPos.x += moveDir.x * speed
    this.state.freeCameraPos.y += moveDir.y * speed
    this.state.freeCameraPos.z += moveDir.z * speed

    // 限制高度范围
    this.state.freeCameraPos.y = Math.max(0.5, Math.min(50, this.state.freeCameraPos.y))

    // 限制地图边界
    const bounds = this.game.mapBounds || 27.5
    this.state.freeCameraPos.x = Math.max(-bounds, Math.min(bounds, this.state.freeCameraPos.x))
    this.state.freeCameraPos.z = Math.max(-bounds, Math.min(bounds, this.state.freeCameraPos.z))

    return {
      pos: { ...this.state.freeCameraPos },
      yaw: this.state.freeCameraYaw,
      pitch: this.state.freeCameraPitch
    }
  }

  /**
   * 辅助函数：从偏航和俯仰计算前方向量
   */
  _forwardFromYawPitch(yaw, pitch) {
    const cosPitch = Math.cos(pitch)
    return {
      x: Math.sin(yaw) * cosPitch,
      y: -Math.sin(pitch),
      z: Math.cos(yaw) * cosPitch
    }
  }

  /**
   * 辅助函数：从偏航计算右方向量
   */
  _rightFromYaw(yaw) {
    return {
      x: Math.cos(yaw),
      y: 0,
      z: -Math.sin(yaw)
    }
  }

  /**
   * 辅助函数：角度差（处理环绕）
   */
  _angleDiff(to, from) {
    let diff = to - from
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return diff
  }

  /**
   * 辅助函数：缓动函数
   */
  _easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}

// ==================== 观战UI管理器 ====================

class SpectatorUI {
  constructor() {
    this.container = null
    this.deathOverlay = null
    this.targetInfoPanel = null
    this.modeIndicator = null
    this.isVisible = false
  }

  /**
   * 初始化UI
   */
  init() {
    if (this.container) return

    // 创建容器
    this.container = document.createElement('div')
    this.container.id = 'spectatorUI'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      display: none;
    `

    // 死亡覆盖层
    this.deathOverlay = document.createElement('div')
    this.deathOverlay.id = 'deathOverlay'
    this.deathOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(139, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.5s ease;
    `
    this.container.appendChild(this.deathOverlay)

    // 目标信息面板
    this.targetInfoPanel = document.createElement('div')
    this.targetInfoPanel.id = 'spectatorTargetInfo'
    this.targetInfoPanel.style.cssText = `
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.75);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      color: white;
      font-family: 'Arial', sans-serif;
      min-width: 200px;
      text-align: center;
      display: none;
    `
    this.container.appendChild(this.targetInfoPanel)

    // 视角模式指示器
    this.modeIndicator = document.createElement('div')
    this.modeIndicator.id = 'spectatorModeIndicator'
    this.modeIndicator.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 8px 16px;
      color: white;
      font-family: 'Arial', sans-serif;
      font-size: 14px;
      display: none;
    `
    this.container.appendChild(this.modeIndicator)

    document.body.appendChild(this.container)
  }

  /**
   * 显示UI
   */
  show() {
    if (!this.container) this.init()
    this.container.style.display = 'block'
    this.isVisible = true
  }

  /**
   * 隐藏UI
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none'
    }
    this.isVisible = false
  }

  /**
   * 显示死亡覆盖层
   */
  showDeathOverlay(deathInfo) {
    if (!this.deathOverlay) return

    const elapsed = Date.now() - deathInfo.deathTime
    const remaining = Math.max(0, Math.ceil((3000 - elapsed) / 1000))

    let killerText = ''
    if (deathInfo.killerName) {
      const teamColor = deathInfo.killerTeam === 'ct' ? '#4A90E2' : '#E24A4A'
      killerText = `
        <div style="margin-top: 10px; font-size: 18px;">
          被击杀: <span style="color: ${teamColor}; font-weight: bold;">${deathInfo.killerName}</span>
        </div>
      `
    }

    this.deathOverlay.innerHTML = `
      <div style="font-size: 48px; font-weight: bold; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        你已阵亡
      </div>
      ${killerText}
      <div style="margin-top: 20px; font-size: 16px; color: rgba(255,255,255,0.7);">
        ${remaining > 0 ? `${remaining}秒后进入观战模式...` : '正在切换观战视角...'}
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: rgba(255,255,255,0.5);">
        [空格] 切换目标 · [Q] 切换视角
      </div>
    `
    this.deathOverlay.style.opacity = '1'
  }

  /**
   * 隐藏死亡覆盖层
   */
  hideDeathOverlay() {
    if (this.deathOverlay) {
      this.deathOverlay.style.opacity = '0'
    }
  }

  /**
   * 更新目标信息面板
   */
  updateTargetInfo(targetInfo) {
    if (!this.targetInfoPanel) return

    if (!targetInfo) {
      this.targetInfoPanel.style.display = 'none'
      return
    }

    const hpPercent = Math.max(0, Math.min(100, (targetInfo.hp / targetInfo.maxHp) * 100))
    const hpColor = hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#FFC107' : '#F44336'
    const teamColor = targetInfo.team === 'ct' ? '#4A90E2' : '#E24A4A'
    const weaponName = this._getWeaponDisplayName(targetInfo.weapon)

    this.targetInfoPanel.innerHTML = `
      <div style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 4px;">正在观战</div>
      <div style="font-size: 18px; font-weight: bold; color: ${teamColor}; margin-bottom: 8px;">
        ${targetInfo.name}
      </div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: 12px; color: rgba(255,255,255,0.6);">HP</span>
        <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden;">
          <div style="width: ${hpPercent}%; height: 100%; background: ${hpColor}; transition: width 0.3s;"></div>
        </div>
        <span style="font-size: 12px; color: ${hpColor};">${targetInfo.hp}/${targetInfo.maxHp}</span>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.7);">
        武器: ${weaponName}
      </div>
    `
    this.targetInfoPanel.style.display = 'block'
  }

  /**
   * 更新视角模式指示器
   */
  updateModeIndicator(mode, targetName = null) {
    if (!this.modeIndicator) return

    const modeNames = {
      [SPECTATOR_MODE.FIRST_PERSON]: '第一人称',
      [SPECTATOR_MODE.THIRD_PERSON]: '第三人称',
      [SPECTATOR_MODE.FREE_CAMERA]: '自由视角'
    }

    const modeName = modeNames[mode] || '未知'
    let html = `<span style="color: #4CAF50;">● ${modeName}</span>`

    if (targetName && mode !== SPECTATOR_MODE.FREE_CAMERA) {
      html += ` <span style="color: rgba(255,255,255,0.5);">| ${targetName}</span>`
    }

    html += `
      <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 4px;">
        [空格] 切换目标 · [Q] 切换视角
      </div>
    `

    this.modeIndicator.innerHTML = html
    this.modeIndicator.style.display = 'block'
  }

  /**
   * 隐藏视角模式指示器
   */
  hideModeIndicator() {
    if (this.modeIndicator) {
      this.modeIndicator.style.display = 'none'
    }
  }

  /**
   * 获取武器显示名称
   */
  _getWeaponDisplayName(weaponId) {
    const weapons = {
      'knife': '匕首',
      'pistol': '手枪',
      'glock': 'Glock',
      'usp': 'USP',
      'deagle': '沙漠之鹰',
      'rifle': '步枪',
      'ak47': 'AK-47',
      'm4a1': 'M4A1',
      'm4a1s': 'M4A1-S',
      'famas': 'FAMAS',
      'awp': 'AWP',
      'scout': 'SSG 08',
      'smg': '冲锋枪',
      'mp5': 'MP5',
      'p90': 'P90',
      'shotgun': '霰弹枪'
    }
    return weapons[weaponId] || weaponId
  }

  /**
   * 销毁UI
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.container = null
    this.deathOverlay = null
    this.targetInfoPanel = null
    this.modeIndicator = null
    this.isVisible = false
  }
}

// ==================== 导出 ====================

export {
  SPECTATOR_MODE,
  SPECTATOR_TRANSITION_DURATION,
  SPECTATOR_START_DELAY,
  SpectatorState,
  SpectatorManager,
  SpectatorUI
}

export default SpectatorManager
