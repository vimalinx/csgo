/**
 * CSGO Multiplayer Client
 * Connects to the multiplayer server and handles real-time communication
 * 
 * 集成反作弊系统 (2026-03-05):
 * - 速度检测 (SpeedLimiter)
 * - 位置验证 (PositionValidator)
 * - 射击验证 (ShootValidator)
 */

const TEAM_VISUALS = Object.freeze({
  ct: Object.freeze({
    key: 'ct',
    label: 'CT',
    hex: '#4A90E2',
    rgb: Object.freeze({ r: 74, g: 144, b: 226 }),
    v3: Object.freeze({ x: 0.29, y: 0.56, z: 0.89 })
  }),
  t: Object.freeze({
    key: 't',
    label: 'T',
    hex: '#E24A4A',
    rgb: Object.freeze({ r: 226, g: 74, b: 74 }),
    v3: Object.freeze({ x: 0.89, y: 0.29, z: 0.29 })
  }),
  neutral: Object.freeze({
    key: 'neutral',
    label: 'N',
    hex: '#808080',
    rgb: Object.freeze({ r: 128, g: 128, b: 128 }),
    v3: Object.freeze({ x: 0.5, y: 0.5, z: 0.5 })
  })
})

const WEAPON_ICON_MAP = Object.freeze({
  rifle: 'RFL',
  smg: 'SMG',
  pistol: 'PST',
  shotgun: 'SGN',
  sniper: 'SNP',
  knife: 'KNF',
  grenade: 'GND',
  unknown: 'UNK'
})

const DEFAULT_DEATH_ANIM_DURATION = 1000

function defaultRequestFrame(callback) {
  if (typeof globalThis !== 'undefined' && typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback)
  }
  return setTimeout(() => callback(Date.now()), 16)
}

function defaultCancelFrame(frameId) {
  if (typeof globalThis !== 'undefined' && typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId)
    return
  }
  clearTimeout(frameId)
}

export class RenderThrottler {
  constructor(renderFn, options = {}) {
    if (typeof renderFn !== 'function') {
      throw new Error('RenderThrottler: renderFn must be a function')
    }

    this.renderFn = renderFn
    this.requestFrame = typeof options.requestFrame === 'function' ? options.requestFrame : defaultRequestFrame
    this.cancelFrame = typeof options.cancelFrame === 'function' ? options.cancelFrame : defaultCancelFrame
    this.pendingRender = false
    this.rafId = null
    this.lastArgs = []
    this.hasArgs = false
  }

  requestRender(...args) {
    this.lastArgs = args
    this.hasArgs = true

    if (this.pendingRender) return
    this.pendingRender = true

    this.rafId = this.requestFrame(() => {
      this.pendingRender = false
      this.rafId = null

      if (!this.hasArgs) return

      const renderArgs = this.lastArgs
      this.lastArgs = []
      this.hasArgs = false
      this.renderFn(...renderArgs)
    })
  }

  cancelRender() {
    if (this.rafId !== null) {
      this.cancelFrame(this.rafId)
      this.rafId = null
    }
    this.pendingRender = false
    this.lastArgs = []
    this.hasArgs = false
  }

  flush() {
    if (!this.hasArgs) return
    const renderArgs = this.lastArgs
    this.cancelRender()
    this.renderFn(...renderArgs)
  }

  isRenderPending() {
    return this.pendingRender
  }
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return fallback
  }
  return Math.max(min, Math.min(max, number))
}

function safeString(value, fallback, maxLength = 24) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.slice(0, maxLength)
}

function normalizeDeathEventData(data = {}) {
  const playerId = data.playerId || data.targetId || data.targetPlayerId || data.victimId || null
  const deathTimeRaw = Number(data.deathTime ?? data.deathAt)
  const deathTime = Number.isFinite(deathTimeRaw) && deathTimeRaw > 0
    ? deathTimeRaw
    : Date.now()
  const durationRaw = Number(data.animDuration ?? data.deathAnimDuration)
  const animDuration = Number.isFinite(durationRaw) && durationRaw > 0
    ? durationRaw
    : DEFAULT_DEATH_ANIM_DURATION

  return {
    ...data,
    playerId,
    deathTime,
    animDuration
  }
}

export function normalizeTeam(team) {
  if (typeof team !== 'string') return 'neutral'
  const lowered = team.trim().toLowerCase()
  if (lowered === 'ct' || lowered === 'counter-terrorist' || lowered === 'counterterrorist') {
    return 'ct'
  }
  if (lowered === 't' || lowered === 'terrorist' || lowered === 'terrorists') {
    return 't'
  }
  return 'neutral'
}

export function normalizeWeaponType(weapon) {
  if (typeof weapon !== 'string') return 'unknown'
  const lowered = weapon.trim().toLowerCase()
  if (!lowered) return 'unknown'

  if (lowered.includes('knife') || lowered.includes('melee')) return 'knife'
  if (lowered.includes('grenade') || lowered.includes('flash') || lowered.includes('smoke')) return 'grenade'
  if (lowered.includes('sniper') || lowered.includes('awp')) return 'sniper'
  if (lowered.includes('shotgun') || lowered.includes('nova')) return 'shotgun'
  if (
    lowered.includes('pistol') ||
    lowered.includes('deagle') ||
    lowered.includes('glock') ||
    lowered.includes('usp')
  ) {
    return 'pistol'
  }
  if (
    lowered.includes('smg') ||
    lowered.includes('mp5') ||
    lowered.includes('ump') ||
    lowered.includes('p90')
  ) {
    return 'smg'
  }
  if (
    lowered.includes('rifle') ||
    lowered.includes('ak') ||
    lowered.includes('m4')
  ) {
    return 'rifle'
  }

  return WEAPON_ICON_MAP[lowered] ? lowered : 'unknown'
}

export function getWeaponIcon(weapon) {
  return WEAPON_ICON_MAP[normalizeWeaponType(weapon)]
}

export function getTeamVisual(team) {
  return TEAM_VISUALS[normalizeTeam(team)] || TEAM_VISUALS.neutral
}

export function normalizePlayerVisualData(input = {}, fallback = {}) {
  const fallbackTeam = normalizeTeam(fallback.team)
  const fallbackMaxHp = clampNumber(fallback.maxHp ?? fallback.maxHealth, 1, 999, 100)
  const maxHp = clampNumber(input.maxHp ?? input.maxHealth, 1, 999, fallbackMaxHp)
  const hp = clampNumber(
    input.hp ?? input.health,
    0,
    maxHp,
    clampNumber(fallback.hp ?? fallback.health, 0, maxHp, maxHp)
  )
  const name = safeString(
    input.name ?? input.username,
    safeString(fallback.name ?? fallback.username, 'Player', 24),
    24
  )
  const team = normalizeTeam(input.team ?? fallbackTeam)
  const weapon = normalizeWeaponType(input.weapon ?? input.weaponType ?? fallback.weapon)
  const alive = typeof input.alive === 'boolean'
    ? input.alive
    : (typeof fallback.alive === 'boolean' ? fallback.alive : hp > 0)
  const healthRatio = maxHp > 0 ? hp / maxHp : 0

  return {
    team,
    hp,
    maxHp,
    name,
    weapon,
    alive,
    healthRatio
  }
}

class MultiplayerClient {
  constructor(serverUrl = 'https://123.60.21.129:443') {
    this.serverUrl = serverUrl
    this.socket = null
    this.roomId = null
    this.playerId = null
    this.username = null
    this.isConnected = false
    this.localVisualState = normalizePlayerVisualData({
      name: 'You',
      team: 'ct',
      hp: 100,
      maxHp: 100,
      weapon: 'rifle',
      alive: true
    })
    this.remoteVisualStates = new Map()
    this.internalVisualBridgeBound = false
    this.eventHandlers = {}

    // 初始化反作弊系统
    this.antiCheat = null
    this.initAntiCheat()
  }

  /**
   * 初始化反作弊系统
   */
  initAntiCheat() {
    // 检查是否在浏览器环境且反作弊系统已加载
    if (typeof window !== 'undefined' && window.AntiCheatSystem) {
      this.antiCheat = new window.AntiCheatSystem({
        onViolation: (playerId, type, data) => {
          console.warn(`[反作弊] 检测到违规: 玩家 ${playerId}, 类型 ${type}`, data)
        },
        onWarning: (playerId, warnings) => {
          console.warn(`[反作弊] 警告: 玩家 ${playerId}, 违规次数 ${warnings.total}`)
        },
        onKick: (playerId, action, warnings) => {
          console.error(`[反作弊] ${action}: 玩家 ${playerId}, 总违规次数 ${warnings.total}`)
        }
      })
      console.log('[反作弊] 系统已初始化')
    }
  }

  /**
   * Connect to the multiplayer server
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('=== 连接详情 ===')
        console.log('服务器地址:', this.serverUrl)
        console.log('页面协议:', window.location.protocol)
        console.log('页面地址:', window.location.href)

        this.socket = io(this.serverUrl, {
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000
        })
        this.eventHandlers = {}
        this.internalVisualBridgeBound = false
        this.setupVisualStateBridge()

        this.addEventHandler('__connection', 'connect', () => {
          console.log('✅ 已连接到服务器')
          this.playerId = this.socket.id
          this.isConnected = true
          resolve()
        })

        this.addEventHandler('__connection', 'disconnect', () => {
          console.log('❌ 断开连接')
          this.isConnected = false
          if (this.onDisconnectCallback) {
            this.onDisconnectCallback()
          }
        })

        this.addEventHandler('__connection', 'connect_error', (error) => {
          console.error('=== 连接错误详情 ===')
          console.error('错误类型:', error.type || 'unknown')
          console.error('错误信息:', error.message)
          console.error('错误描述:', error.description || 'none')
          console.error('服务器地址:', this.serverUrl)
          console.error('页面协议:', window.location.protocol)

          let errorMsg = '无法连接到服务器: ' + error.message

          if (error.message && error.message.includes('certificate')) {
            errorMsg = 'SSL证书错误。请在浏览器中访问 https://123.60.21.129 并信任证书后重试。'
          } else if (error.message && error.message.includes('timeout')) {
            errorMsg = '连接超时。请检查网络连接或服务器状态。'
          } else if (window.location.protocol === 'https:' && this.serverUrl.startsWith('http:')) {
            errorMsg = 'HTTPS页面无法连接HTTP服务器（混合内容限制）。'
          }

          this.isConnected = false
          reject(new Error(errorMsg))
        })

        this.addEventHandler('__connection', 'error', (error) => {
          console.error('服务器错误:', error)
          if (this.onErrorCallback) {
            this.onErrorCallback(error)
          }
        })
      } catch (error) {
        console.error('初始化错误:', error)
        reject(error)
      }
    })
  }

  async register(username) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('未连接到服务器'))
        return
      }

      if (!username || username.length < 3 || username.length > 20) {
        reject(new Error('用户名长度必须在3-20字符之间'))
        return
      }

      let resolved = false
      let timeoutId = null

      const cleanup = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        this.removeEventHandlers('__register', successHandler)
        this.removeEventHandlers('__register', errorHandler)
      }

      const resolveOnce = (data) => {
        if (resolved) return
        resolved = true
        cleanup()
        resolve(data)
      }

      const rejectOnce = (error) => {
        if (resolved) return
        resolved = true
        cleanup()
        reject(error)
      }

      const successHandler = (data) => {
        if (data.success) {
          this.username = username
          this.setLocalVisualState({ name: username })
          resolveOnce(data)
        } else {
          rejectOnce(new Error(data.error || '注册失败'))
        }
      }

      const errorHandler = (error) => {
        rejectOnce(new Error(error))
      }

      this.addEventHandler('__register', 'registered', successHandler)
      this.addEventHandler('__register', 'error', errorHandler)

      timeoutId = setTimeout(() => {
        rejectOnce(new Error('注册超时'))
      }, 5000)

      this.socket.emit('register', username)
    })
  }

  async createRoom(roomName) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('未连接到服务器'))
        return
      }

      let resolved = false
      let timeoutId = null

      const cleanup = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        this.removeEventHandlers('__createRoom', createdHandler)
        this.removeEventHandlers('__createRoom', errorHandler)
      }

      const resolveOnce = (data) => {
        if (resolved) return
        resolved = true
        cleanup()
        resolve(data)
      }

      const rejectOnce = (error) => {
        if (resolved) return
        resolved = true
        cleanup()
        reject(error)
      }

      const createdHandler = (data) => {
        this.roomId = data.roomId
        resolveOnce(data)
      }

      const errorHandler = (error) => {
        rejectOnce(new Error(error))
      }

      this.addEventHandler('__createRoom', 'roomCreated', createdHandler)
      this.addEventHandler('__createRoom', 'error', errorHandler)

      timeoutId = setTimeout(() => {
        rejectOnce(new Error('创建房间超时'))
      }, 5000)

      this.socket.emit('createRoom', roomName)
    })
  }

  async joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('未连接到服务器'))
        return
      }

      let resolved = false
      let timeoutId = null

      const cleanup = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        this.removeEventHandlers('__joinRoom', joinedHandler)
        this.removeEventHandlers('__joinRoom', errorHandler)
      }

      const resolveOnce = (data) => {
        if (resolved) return
        resolved = true
        cleanup()
        resolve(data)
      }

      const rejectOnce = (error) => {
        if (resolved) return
        resolved = true
        cleanup()
        reject(error)
      }

      const joinedHandler = (data) => {
        this.roomId = roomId
        resolveOnce(data)
      }

      const errorHandler = (error) => {
        rejectOnce(new Error(error))
      }

      this.addEventHandler('__joinRoom', 'joinedRoom', joinedHandler)
      this.addEventHandler('__joinRoom', 'error', errorHandler)

      timeoutId = setTimeout(() => {
        rejectOnce(new Error('加入房间超时'))
      }, 5000)

      this.socket.emit('joinRoom', roomId)
    })
  }

  leaveRoom() {
    if (this.roomId && this.socket) {
      this.socket.emit('leaveRoom', this.roomId)
      this.roomId = null
    }
  }

  getRooms() {
    if (this.socket && this.isConnected) {
      this.socket.emit('getRooms')
    }
  }

  setLocalVisualState(state = {}) {
    this.localVisualState = normalizePlayerVisualData({
      ...this.localVisualState,
      ...state,
      name: state.name || state.username || this.username || this.localVisualState.name
    }, this.localVisualState)
    return { ...this.localVisualState }
  }

  getLocalVisualState() {
    return { ...this.localVisualState }
  }

  getRemoteVisualState(playerId) {
    if (!playerId) return null
    const value = this.remoteVisualStates.get(playerId)
    return value ? { ...value } : null
  }

  getRemoteVisualStateMap() {
    return new Map(this.remoteVisualStates)
  }

  onVisualStateUpdate(callback) {
    this.onVisualStateUpdateCallback = callback
  }

  sendMove(position, rotation, velocity, state = {}) {
    if (this.roomId && this.socket && this.isConnected) {
      if (this.antiCheat && this.playerId) {
        const antiCheatResult = this.antiCheat.checkMovement(
          this.playerId,
          position,
          {
            isCrouching: state.isCrouching || false,
            isRunning: state.isRunning || false,
            isJumping: state.isJumping || false
          }
        )

        if (!antiCheatResult.isValid) {
          console.warn('[反作弊] 移动验证失败', antiCheatResult)
        }
      }

      const visualState = this.setLocalVisualState(state)
      this.socket.emit('move', {
        roomId: this.roomId,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        velocity: velocity ? { x: velocity.x, y: velocity.y, z: velocity.z } : null,
        hp: visualState.hp,
        maxHp: visualState.maxHp,
        weapon: visualState.weapon,
        alive: visualState.alive,
        team: visualState.team,
        username: visualState.name,
        name: visualState.name
      })
    }
  }

  sendShoot(targetPlayerId, weaponType = 'unknown', extra = {}) {
    if (this.roomId && this.socket && this.isConnected) {
      if (this.antiCheat && this.playerId) {
        const antiCheatResult = this.antiCheat.checkShoot(
          this.playerId,
          {
            weapon: weaponType,
            position: extra.position || null,
            viewAngles: extra.viewAngles || null,
            targetPosition: extra.targetPosition || null
          }
        )

        if (!antiCheatResult.valid) {
          console.warn('[反作弊] 射击验证失败', antiCheatResult)
        }
      }

      const payload = {
        roomId: this.roomId,
        targetId: targetPlayerId || null,
        weaponType: weaponType || 'unknown',
        ...extra
      }

      this.socket.emit('shoot', payload)
    }
  }

  sendChat(message, channel = 'global') {
    if (this.roomId && this.socket && this.isConnected) {
      this.socket.emit('chat', {
        roomId: this.roomId,
        message,
        channel
      })
    }
  }

  onChat(callback) {
    if (this.socket) {
      this.socket.on('chat', callback)
    }
  }

  sendBuy(itemType, itemId) {
    if (this.roomId && this.socket && this.isConnected) {
      this.socket.emit('buy', {
        roomId: this.roomId,
        itemType,
        itemId,
        playerName: this.username || 'Player'
      })
    }
  }

  onBuy(callback) {
    if (this.socket) {
      this.socket.on('buy', callback)
    }
  }

  isInFreezeTime() {
    return this.isConnected && this.roomId !== null
  }

  sendHit(targetPlayerId, damage, weaponType = 'unknown', extra = {}) {
    if (this.roomId && this.socket && this.isConnected) {
      this.sendShoot(targetPlayerId, weaponType, { damage, ...extra })

      this.socket.emit('hit', {
        roomId: this.roomId,
        targetPlayerId,
        damage
      })
    }
  }

  onPlayerDamaged(callback) {
    if (this.socket) {
      this.socket.on('playerDamaged', callback)
    }
  }

  onDamage(callback) {
    if (!this.socket) return

    this.socket.on('damage', callback)

    this.socket.on('playerDamaged', (data) => {
      callback({
        ...data,
        targetId: data.targetId || data.playerId || data.targetPlayerId,
        hp: typeof data.hp === 'number' ? data.hp : data.health
      })
    })
  }

  onPlayerDied(callback) {
    if (this.socket) {
      this.socket.on('playerDied', (data = {}) => {
        callback(normalizeDeathEventData(data))
      })
    }
  }

  onDeath(callback) {
    if (!this.socket) return

    this.socket.on('death', (data = {}) => {
      callback(normalizeDeathEventData(data))
    })

    this.socket.on('playerDied', (data = {}) => {
      callback(normalizeDeathEventData(data))
    })
  }

  onPlayerRespawned(callback) {
    if (this.socket) {
      this.socket.on('playerRespawned', callback)
    }
  }

  onRespawn(callback) {
    if (!this.socket) return

    this.socket.on('respawn', callback)

    this.socket.on('playerRespawned', (data) => {
      callback({
        ...data,
        playerId: data.playerId || data.targetId || data.targetPlayerId
      })
    })
  }

  requestRespawn() {
    if (this.roomId && this.socket && this.isConnected) {
      const payload = { roomId: this.roomId }
      this.socket.emit('respawnRequest', payload)
      this.socket.emit('respawn', payload)
    }
  }

  onRoomList(callback) {
    if (this.socket) {
      this.socket.on('roomList', callback)
    }
  }

  onPlayerMove(callback) {
    if (this.socket) {
      this.socket.on('playerMove', callback)
    }
  }

  onPlayerShoot(callback) {
    if (this.socket) {
      this.socket.on('playerShoot', callback)
    }
  }

  onPlayerJoined(callback) {
    if (this.socket) {
      this.socket.on('playerJoined', callback)
    }
  }

  onPlayerLeft(callback) {
    if (this.socket) {
      this.socket.on('playerLeft', callback)
    }
  }

  onRoomUpdate(callback) {
    if (this.socket) {
      this.socket.on('roomUpdate', callback)
    }
  }

  onGameStart(callback) {
    if (this.socket) {
      this.socket.on('gameStart', callback)
    }
  }

  startGame() {
    if (this.roomId && this.socket && this.isConnected) {
      this.socket.emit('startGame', { roomId: this.roomId })
    }
  }

  onError(callback) {
    this.onErrorCallback = callback
  }

  onDisconnect(callback) {
    this.onDisconnectCallback = callback
  }

  addEventHandler(group, event, handler, originalCallback = handler) {
    if (!this.socket || typeof handler !== 'function') return

    this.socket.on(event, handler)

    if (!this.eventHandlers[group]) {
      this.eventHandlers[group] = []
    }

    this.eventHandlers[group].push({
      event,
      handler,
      originalCallback
    })
  }

  removeEventHandlers(group, callback = null) {
    const handlers = this.eventHandlers[group]
    if (!Array.isArray(handlers) || handlers.length === 0) return

    const remaining = []
    for (const entry of handlers) {
      const shouldRemove = !callback || entry.originalCallback === callback || entry.handler === callback

      if (shouldRemove) {
        if (this.socket) {
          this.socket.off(entry.event, entry.handler)
        }
      } else {
        remaining.push(entry)
      }
    }

    if (remaining.length > 0) {
      this.eventHandlers[group] = remaining
    } else {
      delete this.eventHandlers[group]
    }
  }

  clearAllEventHandlers() {
    for (const group of Object.keys(this.eventHandlers)) {
      this.removeEventHandlers(group)
    }
    this.eventHandlers = {}
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.clearAllEventHandlers()
      this.socket = null
      this.isConnected = false
      this.roomId = null
      this.playerId = null
      this.username = null
      this.remoteVisualStates.clear()
      this.internalVisualBridgeBound = false
      this.localVisualState = normalizePlayerVisualData({
        name: 'You',
        team: 'ct',
        hp: 100,
        maxHp: 100,
        weapon: 'rifle',
        alive: true
      })
    } else {
      this.eventHandlers = {}
    }
  }

  getScoreboardData() {
    return {
      ct: [],
      t: []
    }
  }

  getTeamColor(team) {
    const visual = getTeamVisual(team)
    return {
      hex: visual.hex,
      rgb: { ...visual.rgb },
      v3: { ...visual.v3 }
    }
  }

  getTeamColorV3(team) {
    return this.getTeamColor(team).v3
  }

  getTeamColorHex(team) {
    return this.getTeamColor(team).hex
  }

  getWeaponIcon(weapon) {
    return getWeaponIcon(weapon)
  }

  updateRemoteVisualState(playerId, state = {}) {
    if (!playerId || playerId === this.playerId) return null
    const current = this.remoteVisualStates.get(playerId)
    const next = normalizePlayerVisualData(state, current || {
      name: 'Player',
      team: 'neutral',
      hp: 100,
      maxHp: 100,
      weapon: 'unknown',
      alive: true
    })
    this.remoteVisualStates.set(playerId, next)
    this.emitVisualStateUpdate('update', playerId, next)
    return next
  }

  removeRemoteVisualState(playerId) {
    if (!playerId) return
    if (this.remoteVisualStates.delete(playerId)) {
      this.emitVisualStateUpdate('remove', playerId, null)
    }
  }

  rebuildRemoteVisualStates(players) {
    if (!Array.isArray(players)) return

    const incomingIds = new Set()
    for (const player of players) {
      const playerId = this.extractPlayerId(player)
      if (!playerId || playerId === this.playerId) continue
      incomingIds.add(playerId)
      this.updateRemoteVisualState(playerId, {
        team: player.team,
        hp: player.hp ?? player.health,
        maxHp: player.maxHp ?? player.maxHealth,
        name: player.username || player.name,
        weapon: player.weapon || player.weaponType,
        alive: player.alive
      })
    }

    for (const playerId of this.remoteVisualStates.keys()) {
      if (!incomingIds.has(playerId)) {
        this.removeRemoteVisualState(playerId)
      }
    }
  }

  extractPlayerId(data) {
    if (!data || typeof data !== 'object') return null
    return data.playerId || data.id || data.socketId || data.targetId || null
  }

  extractHp(data, fallback = undefined) {
    if (!data || typeof data !== 'object') return fallback
    const hp = data.hp ?? data.health ?? data.currentHp
    return typeof hp === 'number' ? hp : fallback
  }

  emitVisualStateUpdate(type, playerId, visualState) {
    if (!this.onVisualStateUpdateCallback) return
    this.onVisualStateUpdateCallback({
      type,
      playerId,
      visualState: visualState ? { ...visualState } : null
    })
  }

  setupVisualStateBridge() {
    if (!this.socket || this.internalVisualBridgeBound) return
    this.internalVisualBridgeBound = true

    this.socket.on('playerMove', (data = {}) => {
      const playerId = this.extractPlayerId(data)
      if (!playerId || playerId === this.playerId) return
      this.updateRemoteVisualState(playerId, {
        team: data.team,
        hp: this.extractHp(data),
        maxHp: data.maxHp ?? data.maxHealth,
        name: data.username || data.name,
        weapon: data.weapon || data.weaponType,
        alive: data.alive
      })
    })

    this.socket.on('playerJoined', (data = {}) => {
      if (Array.isArray(data.players)) {
        this.rebuildRemoteVisualStates(data.players)
      }

      const playerId = this.extractPlayerId(data)
      if (!playerId || playerId === this.playerId) return
      this.updateRemoteVisualState(playerId, {
        team: data.team,
        hp: this.extractHp(data, 100),
        maxHp: data.maxHp ?? data.maxHealth ?? 100,
        name: data.username || data.name,
        weapon: data.weapon || data.weaponType,
        alive: data.alive
      })
    })

    this.socket.on('playerLeft', (data = {}) => {
      if (Array.isArray(data.players)) {
        this.rebuildRemoteVisualStates(data.players)
        return
      }
      const playerId = this.extractPlayerId(data)
      if (!playerId) return
      this.removeRemoteVisualState(playerId)
    })

    this.socket.on('roomUpdate', (data = {}) => {
      if (Array.isArray(data.players)) {
        this.rebuildRemoteVisualStates(data.players)
      }
    })

    const updateHp = (data = {}) => {
      const playerId = data.targetId || data.playerId || data.targetPlayerId
      if (!playerId || playerId === this.playerId) return
      const hp = this.extractHp(data)
      if (typeof hp !== 'number') return
      this.updateRemoteVisualState(playerId, {
        hp,
        alive: hp > 0
      })
    }

    this.socket.on('damage', updateHp)
    this.socket.on('playerDamaged', updateHp)

    const onDeath = (data = {}) => {
      const deathEvent = normalizeDeathEventData(data)
      const playerId = deathEvent.playerId
      if (!playerId || playerId === this.playerId) return
      this.updateRemoteVisualState(playerId, { hp: 0, alive: false })
    }

    this.socket.on('death', onDeath)
    this.socket.on('playerDied', onDeath)

    const onRespawn = (data = {}) => {
      const playerId = data.playerId || data.targetId || data.targetPlayerId
      if (!playerId || playerId === this.playerId) return
      this.updateRemoteVisualState(playerId, {
        hp: this.extractHp(data, 100),
        maxHp: data.maxHp ?? data.maxHealth ?? 100,
        alive: true
      })
    }

    this.socket.on('respawn', onRespawn)
    this.socket.on('playerRespawned', onRespawn)
  }
}

export { TEAM_VISUALS as TEAM_COLORS, WEAPON_ICON_MAP as WEAPON_ICONS }
export default MultiplayerClient
