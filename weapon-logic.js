/**
 * weapon-logic.js
 * 武器逻辑模块：负责射击、换弹、近战、命中判定与视觉效果生成。
 */

/**
 * 检测射线是否被烟雾遮挡。
 *
 * @param {Object} game - 游戏状态对象。
 * @param {{x:number,y:number,z:number}} ro - 射线起点。
 * @param {{x:number,y:number,z:number}} rd - 射线方向（单位向量）。
 * @param {number} maxDist - 最大检测距离。
 * @param {Function} rayAabb - AABB 射线求交函数。
 * @returns {boolean} 若烟雾在 `maxDist` 内阻挡射线则为 true。
 */
function rayBlockedBySmoke(game, ro, rd, maxDist, rayAabb) {
  for (const s of game.smoke.active) {
    const t = rayAabb(ro, rd, s.aabb)
    if (t !== null && t > 0 && t < maxDist) return true
  }
  return false
}

/**
 * 更新武器冷却与动画衰减状态。
 *
 * @param {Object} weapon - 当前武器对象。
 * @param {number} deltaTime - 帧时间（秒）。
 * @returns {void}
 */
export function updateWeaponCooldown(weapon, deltaTime) {
  if (weapon.cooldown > 0) weapon.cooldown = Math.max(0, weapon.cooldown - deltaTime)
  if (weapon.kick > 0) weapon.kick = Math.max(0, weapon.kick - deltaTime * 4.5)
  if (weapon.shot > 0) weapon.shot = Math.max(0, weapon.shot - deltaTime * 14)
  if (weapon.flash > 0) weapon.flash = Math.max(0, weapon.flash - deltaTime * 18)
}

/**
 * 处理武器换弹进度。
 *
 * @param {Object} weapon - 当前武器对象。
 * @param {number} deltaTime - 帧时间（秒）。
 * @param {Function} setStatus - 状态提示函数 `(text, urgent) => void`。
 * @returns {boolean} true 表示当前处于换弹流程并已消费本帧射击逻辑。
 */
export function updateWeaponReload(weapon, deltaTime, setStatus) {
  if (!weapon.reloading) return false

  weapon.reloadLeft -= deltaTime
  if (weapon.reloadLeft <= 0) {
    const needed = weapon.def.magSize - weapon.mag
    const take = Math.min(needed, weapon.reserve)
    weapon.mag += take
    weapon.reserve -= take
    weapon.reloading = false
    setStatus('Reloaded', false)
  }
  return true
}

/**
 * 处理刀具攻击。
 *
 * @param {Object} weapon - 当前武器对象（刀具）。
 * @param {Object} game - 游戏状态对象。
 * @param {Object} deps - 依赖注入对象。
 * @param {Function} deps.v3 - 向量构造函数。
 * @param {Function} deps.v3norm - 向量归一化函数。
 * @param {Function} deps.forwardFromYawPitch - 由 yaw/pitch 计算前向向量。
 * @param {Function} deps.rayAabb - AABB 射线求交函数。
 * @param {Function} deps.aabbFromCenter - 由中心点和半尺寸生成 AABB。
 * @param {Function} deps.setStatus - 状态提示函数。
 * @param {Object} deps.audio - 音频接口对象。
 * @param {Function} deps.recordFireTime - 记录最近射击时间。
 * @param {Function} deps.nowMs - 当前毫秒时间函数。
 * @param {Function} deps.addMoney - 增加金钱函数。
 * @returns {boolean} true 表示本帧处理了刀攻击输入。
 */
export function handleKnifeAttack(weapon, game, deps) {
  const {
    v3,
    v3norm,
    forwardFromYawPitch,
    rayAabb,
    aabbFromCenter,
    setStatus,
    audio,
    recordFireTime,
    nowMs,
    addMoney
  } = deps

  if (!game.firePressed) return false
  if (weapon.cooldown > 0) return false

  game.firePressed = false
  weapon.cooldown = 0.5

  const roKnife = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z)
  const rdKnife = v3norm(forwardFromYawPitch(game.yaw, game.pitch))
  const maxKnifeDist = 2.0
  let nearestBlock = maxKnifeDist

  for (const c of game.colliders) {
    const t = rayAabb(roKnife, rdKnife, c)
    if (t !== null && t > 0 && t < nearestBlock) nearestBlock = t
  }

  let knifeTarget = null
  let knifeBestT = Math.min(maxKnifeDist, nearestBlock)

  for (const bot of game.bots) {
    if (!bot.alive) continue
    if (bot.team === game.team) continue

    const center = v3(bot.pos.x, bot.pos.y + bot.half.y, bot.pos.z)
    const aabb = aabbFromCenter(center, bot.half)
    const t = rayAabb(roKnife, rdKnife, aabb)
    if (t === null || t <= 0 || t > knifeBestT) continue

    knifeBestT = t
    knifeTarget = bot
  }

  if (!knifeTarget) {
    setStatus('Miss', false)
    return true
  }

  knifeTarget.hp -= 50
  audio.hit()
  recordFireTime()
  game.lastStatusAt = nowMs()
  game.hitmarker.t = 0.12
  game.hitmarker.head = false

  if (knifeTarget.hp <= 0) {
    knifeTarget.alive = false
    game.aliveBotsCacheDirty = true
    knifeTarget.respawnAt = nowMs() + 2500
    setStatus('Bot down', false)
    game.stats.kills += 1
    addMoney(game.econ.rewardKill)
  } else {
    setStatus('Hit: -50', false)
  }

  return true
}

/**
 * 计算武器射击精度、散布和枪口位姿。
 *
 * @param {Object} game - 游戏状态对象。
 * @param {Object} weapon - 当前武器对象。
 * @param {Object} deps - 依赖注入对象。
 * @param {Function} deps.v3 - 向量构造函数。
 * @param {Function} deps.v3add - 向量加法函数。
 * @param {Function} deps.v3scale - 向量缩放函数。
 * @param {Function} deps.v3cross - 向量叉乘函数。
 * @param {Function} deps.v3norm - 向量归一化函数。
 * @param {Function} deps.clamp01 - [0,1] 钳制函数。
 * @param {Function} deps.clamp - 区间钳制函数。
 * @param {Function} deps.lerp - 线性插值函数。
 * @param {Function} deps.forwardFromYawPitch - 由 yaw/pitch 计算前向向量。
 * @param {Function} deps.nowMs - 当前毫秒时间函数。
 * @returns {{
 *   finalAcc:number,
 *   aimDirAcc:{x:number,y:number,z:number},
 *   spread:number,
 *   fwdCam:{x:number,y:number,z:number},
 *   rightCam:{x:number,y:number,z:number},
 *   camUp:{x:number,y:number,z:number},
 *   camPos:{x:number,y:number,z:number},
 *   muzzle:{x:number,y:number,z:number},
 *   roAim:{x:number,y:number,z:number},
 *   rdAim:{x:number,y:number,z:number}
 * }} 精度与射线所需关键数据。
 */
export function calculateWeaponAccuracy(game, weapon, deps) {
  const {
    v3,
    v3add,
    v3scale,
    v3cross,
    v3norm,
    clamp01,
    clamp,
    lerp,
    forwardFromYawPitch,
    nowMs
  } = deps

  const spreadDeg = game.calculateSpread()
  const spread = (spreadDeg * Math.PI) / 180
  const sx = (Math.random() - 0.5) * spread
  const sy = (Math.random() - 0.5) * spread
  const fwdCam = v3norm(forwardFromYawPitch(game.yaw, game.pitch))
  const upCam = v3(0, 1, 0)
  const rightCam = v3norm(v3cross(upCam, fwdCam))
  const camUp = v3norm(v3cross(fwdCam, rightCam))
  const camPos = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z)

  const wpn = game.getWeapon()
  const kick = wpn.kick
  const speed = Math.hypot(game.vel.x, game.vel.z)

  const crouchAcc = lerp(1, 0.22, game.crouchT)
  const moveAcc = 1 + clamp01(speed / 6) * 3.6
  const airAcc = game.onGround ? 1 : 2.2
  const landAcc = 1 + game.landKick * 1.8
  const spreadAcc = crouchAcc * moveAcc
  const weaponAcc = clamp((120 - weapon.def.accuracy) / 100, 0.24, 1.2)
  const finalAcc = spreadAcc * airAcc * landAcc * weaponAcc
  const aimDirAcc = v3norm(forwardFromYawPitch(game.yaw + sx * finalAcc, game.pitch + sy * finalAcc))
  const bobT = nowMs() * 0.001
  const bobA = 0.02 * clamp01(speed / 6)
  const bobY = Math.sin(bobT * 9.5) * bobA
  const bobX = Math.cos(bobT * 9.5) * bobA
  const swayPosX = clamp(game.mouseDX * 0.0005, -0.03, 0.03)
  const swayPosY = clamp(game.mouseDY * 0.0005, -0.03, 0.03)

  const muzzle = v3add(
    camPos,
    v3add(
      v3add(v3scale(rightCam, 0.55 + bobX + swayPosX), v3scale(camUp, -0.45 + bobY + kick * 0.03 + swayPosY)),
      v3scale(fwdCam, 0.95)
    )
  )

  return {
    finalAcc,
    aimDirAcc,
    spread,
    fwdCam,
    rightCam,
    camUp,
    camPos,
    muzzle,
    roAim: camPos,
    rdAim: aimDirAcc
  }
}

/**
 * 执行射线检测与碰撞筛选。
 *
 * @param {Object} game - 游戏状态对象。
 * @param {{x:number,y:number,z:number}} roAim - 射线起点。
 * @param {{x:number,y:number,z:number}} rdAim - 射线方向（单位向量）。
 * @param {Object} deps - 依赖注入对象。
 * @param {Function} deps.rayAabb - AABB 射线求交函数。
 * @param {Object} deps.collisionPerf - 碰撞性能统计对象。
 * @param {Function} deps.raySweepAabb2 - 生成射线扫掠二维包围盒。
 * @param {Function} deps.aabb3To2 - 3D AABB 转 2D AABB。
 * @param {Function} deps.playerBroadPhaseAabb - 玩家宽相 AABB 生成函数。
 * @param {Function} deps.safeNumber - 数值安全回退函数。
 * @param {Map<string, Object>} deps.otherPlayers - 联机其他玩家映射。
 * @param {Function} deps.readSyncedHp - 读取同步血量函数。
 * @param {Function} deps.buildPlayerHitboxes - 构建玩家命中盒函数。
 * @param {Function} deps.rayObbLocal - OBB 射线求交函数。
 * @param {Function} deps.v3 - 向量构造函数。
 * @param {Function} deps.v3sub - 向量减法函数。
 * @param {Function} deps.v3len - 向量长度函数。
 * @returns {{bestT:number, bestTarget:Object|null, bestZone:string, bestMult:number}}
 * 命中结果信息。
 */
export function performWeaponRaycast(game, roAim, rdAim, deps) {
  const {
    rayAabb,
    collisionPerf,
    raySweepAabb2,
    aabb3To2,
    playerBroadPhaseAabb,
    safeNumber,
    otherPlayers,
    readSyncedHp,
    buildPlayerHitboxes,
    rayObbLocal,
    v3,
    v3sub,
    v3len
  } = deps

  let bestT = Infinity
  let bestTarget = null
  let bestZone = ''
  let bestMult = 1

  for (const c of game.colliders) {
    const t = rayAabb(roAim, rdAim, c)
    if (t === null) continue
    if (t > 0 && t < bestT) bestT = t
  }

  if (rayBlockedBySmoke(game, roAim, rdAim, bestT, rayAabb)) {
    bestT = Math.min(bestT, 12)
    bestTarget = null
  }

  collisionPerf.rayCasts++
  const maxTargetDist = Math.min(90, Number.isFinite(bestT) ? bestT : 90)
  const queryAabb = raySweepAabb2(roAim, rdAim, maxTargetDist, 1.4)
  const targetTree = game.collisionQuadtree
  targetTree.clear()

  for (let i = 0; i < game.bots.length; i++) {
    const bot = game.bots[i]
    if (!bot || !bot.alive) continue
    if (bot.team === game.team) continue

    const basePos = v3(bot.pos.x, bot.pos.y, bot.pos.z)
    const entry = {
      id: `bot:${i}`,
      type: 'bot',
      bot,
      basePos,
      position: basePos,
      yaw: safeNumber(bot.yaw, 0)
    }
    const broadAabb2 = aabb3To2(playerBroadPhaseAabb(basePos))
    targetTree.insert(entry, broadAabb2)
  }

  if (game.mode === 'online') {
    for (const [playerId, playerData] of otherPlayers) {
      if (!playerData || playerData.deathHidden) continue
      const hp = readSyncedHp(playerData, 100)
      if (playerData.alive === false || hp <= 0) continue
      if (playerData.team === game.team) continue
      if (!playerData.position) continue

      const pos = playerData.position
      const basePos = v3(pos.x, pos.y, pos.z)
      const entry = {
        id: `player:${playerId}`,
        type: 'player',
        playerId,
        playerData,
        basePos,
        position: pos,
        yaw: safeNumber(playerData.yaw, 0)
      }
      const broadAabb2 = aabb3To2(playerBroadPhaseAabb(basePos))
      targetTree.insert(entry, broadAabb2)
    }
  }

  const broadCandidates = targetTree.query(queryAabb)
  collisionPerf.broadPhaseCandidates += broadCandidates.length

  for (const candidate of broadCandidates) {
    const distToTarget = v3len(v3sub(roAim, candidate.basePos))
    if (distToTarget > 95) {
      collisionPerf.earlyExits++
      continue
    }

    const hitboxes = buildPlayerHitboxes(candidate.basePos, candidate.yaw)
    for (const hb of hitboxes) {
      collisionPerf.narrowPhaseTests++
      const t = rayObbLocal(roAim, rdAim, hb.c, hb.r, hb.u, hb.f, hb.h)
      if (t === null || t <= 0 || t >= bestT) continue

      bestT = t
      bestTarget = candidate
      bestZone = hb.zone
      bestMult = hb.mult

      if (hb.zone === 'head') {
        collisionPerf.earlyExits++
        break
      }
    }
  }

  return { bestT, bestTarget, bestZone, bestMult }
}

/**
 * 计算并应用武器伤害。
 *
 * @param {Object} weapon - 当前武器对象。
 * @param {Object|null} target - 命中目标（玩家或 Bot）。
 * @param {string} zone - 命中部位。
 * @param {number} mult - 部位伤害倍率。
 * @param {Object} game - 游戏状态对象。
 * @param {Object} deps - 依赖注入对象。
 * @param {Function} deps.v3 - 向量构造函数。
 * @param {Function} deps.v3sub - 向量减法函数。
 * @param {Function} deps.v3len - 向量长度函数。
 * @param {Function} deps.getHitZoneFeedback - 命中反馈映射函数。
 * @param {Object} deps.multiplayer - 联机客户端对象。
 * @param {Object} deps.audio - 音频接口对象。
 * @param {Function} deps.recordFireTime - 记录最近射击时间。
 * @param {Function} deps.nowMs - 当前毫秒时间函数。
 * @param {Function} deps.spawnDamageNumberForPlayer - 生成联机目标飘字。
 * @param {Function} deps.spawnDamageNumber - 生成 Bot 飘字。
 * @param {Function} deps.setStatus - 状态提示函数。
 * @param {Function} deps.addMoney - 增加金钱函数。
 * @param {{x:number,y:number,z:number}} roAim - 射线起点，用于计算距离衰减。
 * @returns {{hit:boolean, damage:number, headshot:boolean}} 命中结果摘要。
 */
export function applyWeaponDamage(weapon, target, zone, mult, game, deps, roAim) {
  const {
    v3,
    v3sub,
    v3len,
    getHitZoneFeedback,
    multiplayer,
    audio,
    recordFireTime,
    nowMs,
    spawnDamageNumberForPlayer,
    spawnDamageNumber,
    setStatus,
    addMoney
  } = deps

  if (!target) {
    setStatus('Miss', false)
    return { hit: false, damage: 0, headshot: false }
  }

  const targetPos = target.position || target.basePos || target.pos
  const distance = targetPos ? v3len(v3sub(roAim, targetPos)) : 0
  const maxRange = 80
  const falloffStart = 20
  const falloffMult = distance < falloffStart
    ? 1.0
    : distance > maxRange
      ? 0.1
      : 1.0 - ((distance - falloffStart) / (maxRange - falloffStart)) * 0.9

  const dmg = Math.floor(weapon.def.damage * mult * falloffMult)
  const isHeadshot = zone === 'head'
  const zoneFx = getHitZoneFeedback(zone)

  if (target.type === 'player') {
    const weaponType = weapon && weapon.def ? weapon.def.id : 'unknown'
    const normalizedZone = zone === 'torso' ? 'body' : zone

    multiplayer.sendHit(target.playerId, dmg, weaponType, {
      hitZone: normalizedZone || 'body',
      headshot: isHeadshot
    })

    audio.hit()
    recordFireTime()
    game.lastStatusAt = nowMs()
    game.hitmarker.t = 0.12
    game.hitmarker.head = isHeadshot
    spawnDamageNumberForPlayer(target.playerId, dmg, { crit: isHeadshot, color: zoneFx.color })

    const targetName = (target.playerData && target.playerData.name) || 'Player'
    setStatus(`Hit ${targetName} [${zoneFx.label}]: -${dmg}`, false)
    return { hit: true, damage: dmg, headshot: isHeadshot }
  }

  const bot = target.bot
  if (!bot) {
    setStatus('Miss', false)
    return { hit: false, damage: 0, headshot: false }
  }

  bot.hp -= dmg
  audio.hit()
  recordFireTime()
  game.lastStatusAt = nowMs()
  game.hitmarker.t = 0.12
  game.hitmarker.head = isHeadshot
  spawnDamageNumber(v3(bot.pos.x, bot.pos.y, bot.pos.z), dmg, { crit: isHeadshot, color: zoneFx.color })

  if (bot.hp <= 0) {
    bot.alive = false
    game.aliveBotsCacheDirty = true
    bot.respawnAt = nowMs() + 2500
    setStatus('Bot down', false)
    game.stats.kills += 1
    if (bot.team !== game.team) addMoney(game.econ.rewardKill)
  } else {
    setStatus(`Hit [${zoneFx.label}]: -${dmg}`, false)
  }

  return { hit: true, damage: dmg, headshot: isHeadshot }
}

/**
 * 生成射击视觉效果（曳光弹与弹壳抛射）。
 *
 * @param {Object} game - 游戏状态对象。
 * @param {{x:number,y:number,z:number}} muzzlePos - 枪口世界坐标。
 * @param {{x:number,y:number,z:number}} camPos - 视角世界坐标。
 * @param {{x:number,y:number,z:number}} rightCam - 相机右向量。
 * @param {{x:number,y:number,z:number}} camUp - 相机上向量。
 * @param {{x:number,y:number,z:number}} fwdCam - 相机前向量。
 * @param {Object} deps - 依赖注入对象。
 * @param {Function} deps.v3add - 向量加法函数。
 * @param {Function} deps.v3scale - 向量缩放函数。
 * @param {Function} deps.obtainTracer - 获取曳光弹对象（对象池）。
 * @param {Function} deps.obtainShell - 获取弹壳对象（对象池）。
 * @param {{x:number,y:number,z:number}} roAim - 视线射线起点。
 * @param {{x:number,y:number,z:number}} rdAim - 视线射线方向。
 * @param {number} bestT - 最近命中距离。
 * @returns {void}
 */
export function spawnWeaponVisuals(game, muzzlePos, camPos, rightCam, camUp, fwdCam, deps, roAim, rdAim, bestT) {
  const { v3add, v3scale, obtainTracer, obtainShell } = deps

  const endAim = bestT < Infinity
    ? v3add(roAim, v3scale(rdAim, Math.min(bestT, 80)))
    : v3add(roAim, v3scale(rdAim, 80))

  const tracer = obtainTracer()
  tracer.a = muzzlePos
  tracer.b = endAim
  tracer.travel = 0
  tracer.speed = 110
  tracer.life = 0.32
  tracer.hue = 0.55
  game.tracers.push(tracer)

  const shellPos = v3add(
    camPos,
    v3add(v3scale(rightCam, 0.42), v3add(v3scale(camUp, -0.22), v3scale(fwdCam, 0.62)))
  )
  const rv = 2.4 + Math.random() * 1.2
  const uv = 1.6 + Math.random() * 1.0
  const fv = 0.8 + Math.random() * 0.7
  const shellVel = v3add(v3scale(rightCam, rv), v3add(v3scale(camUp, uv), v3scale(fwdCam, fv)))

  const shell = obtainShell()
  shell.pos = shellPos
  shell.vel = shellVel
  shell.life = 1.6
  game.shells.push(shell)
}

/**
 * 主武器更新函数。
 *
 * @param {Object} game - 游戏状态对象。
 * @param {number} dt - 帧时间（秒）。
 * @param {Object} deps - 依赖注入对象。
 * @param {Function} deps.isRoundFrozen - 回合冻结检测函数。
 * @param {Function} deps.setStatus - 状态提示函数。
 * @param {Object} deps.audio - 音频接口对象。
 * @param {Function} deps.forwardFromYawPitch - yaw/pitch 转前向向量函数。
 * @returns {void}
 */
export function updateWeapon(game, dt, deps) {
  if (!game.playerAlive) return
  if (deps.isRoundFrozen()) return

  const weapon = game.getWeapon()
  if (!weapon) return

  updateWeaponCooldown(weapon, dt)

  if (updateWeaponReload(weapon, dt, deps.setStatus)) {
    return
  }

  if (weapon.def.kind === 4) {
    handleKnifeAttack(weapon, game, deps)
    return
  }

  const fireHeld = game.mouseDown && game.pointerLocked
  const wantsFire = game.fireModeAuto ? fireHeld || game.firePressed : game.firePressed
  if (!wantsFire) return
  if (weapon.cooldown > 0) return

  if (weapon.mag <= 0) {
    deps.setStatus('Empty! Press R', true)
    weapon.cooldown = 0.15
    game.firePressed = false
    return
  }

  weapon.mag -= 1
  deps.audio.shot(weapon.def.kind)
  weapon.cooldown = 60 / weapon.def.rpm
  game.firePressed = false
  weapon.shot = Math.min(1, weapon.shot + 0.95)
  weapon.flash = 1

  const recoilBase = weapon.def.recoil * (0.6 + Math.random() * 0.5)
  const recoil = recoilBase
  game.pitch += recoil * 0.012
  game.yaw += (Math.random() - 0.5) * recoil * 0.007
  weapon.kick = Math.min(1, weapon.kick + 0.35)

  const accuracy = calculateWeaponAccuracy(game, weapon, deps)
  const raycast = performWeaponRaycast(game, accuracy.roAim, accuracy.rdAim, deps)

  applyWeaponDamage(
    weapon,
    raycast.bestTarget,
    raycast.bestZone,
    raycast.bestMult,
    game,
    deps,
    accuracy.roAim
  )

  spawnWeaponVisuals(
    game,
    accuracy.muzzle,
    accuracy.camPos,
    accuracy.rightCam,
    accuracy.camUp,
    accuracy.fwdCam,
    deps,
    accuracy.roAim,
    accuracy.rdAim,
    raycast.bestT
  )
}
