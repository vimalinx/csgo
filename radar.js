/**
 * CSGO 雷达/小地图系统
 * 功能：
 * - 玩家/队友/敌人位置显示
 * - 队友朝向显示
 * - 敌人可见性检测（视野内或队友可见）
 * - 爆炸物标记
 * - 包点标记
 * - 可切换大小（Tab键）
 */

import { normalizeTeam, TEAM_COLORS, RenderThrottler } from './multiplayer.js'

export const RADAR_SIZES = {
  SMALL: 200,
  LARGE: 300
}

export default class Radar {
  constructor(host, gameState) {
    this.game = gameState
    this.host = host
    this.sizes = [RADAR_SIZES.SMALL, RADAR_SIZES.LARGE, 0] // 0 = hidden
    this.sizeIndex = 0
    this.pad = 12
    this.visible = true
    this.size = this.sizes[0]

    // Canvas 设置
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'radar'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true })

    if (!this.ctx) {
      throw new Error('Radar 2D canvas unavailable')
    }

    this.renderThrottler = new RenderThrottler(() => {
      this.renderNow()
    })

    this.setSize(this.currentSize)
    host.appendChild(this.canvas)
    this.bindEvents()
  }

  get currentSize() {
    return this.sizes[this.sizeIndex]
  }

  setSize(size) {
    if (size === 0) {
      this.visible = false
      this.renderThrottler.cancelRender()
      this.canvas.classList.add('hidden')
      return
    }

    this.visible = true
    this.size = size
    this.canvas.width = size
    this.canvas.height = size
    this.canvas.classList.remove('hidden')
  }

  toggleSize() {
    this.sizeIndex = (this.sizeIndex + 1) % this.sizes.length
    this.setSize(this.currentSize)
    return this.currentSize
  }

  bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.repeat) {
        e.preventDefault()
        this.toggleSize()
      }
    })
  }

  worldToMap(x, z, bounds) {
    const inner = this.size - this.pad * 2
    const nx = Math.max(0, Math.min(1, (x + bounds) / (bounds * 2)))
    const nz = Math.max(0, Math.min(1, (z + bounds) / (bounds * 2)))
    return {
      x: this.pad + nx * inner,
      y: this.pad + (1 - nz) * inner
    }
  }

  // 检查两点之间的视线是否被障碍物阻挡
  lineOfSightBlocked(start, end, boxes = []) {
    if (!start || !end || !Array.isArray(boxes)) return false

    const dx = end.x - start.x
    const dy = end.y - start.y
    const dz = end.z - start.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < 0.1) return false

    const steps = Math.ceil(dist / 0.5) // 每0.5单位检查一次

    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const checkPoint = {
        x: start.x + dx * t,
        y: start.y + dy * t,
        z: start.z + dz * t
      }

      // 检查是否与任何障碍物碰撞
      for (const box of boxes) {
        if (!box || !box.solid || !box.pos || !box.scale) continue
        if (box.scale.x > 50 && box.scale.z > 50) continue // 跳过地面

        const halfX = box.scale.x * 0.5
        const halfY = box.scale.y * 0.5
        const halfZ = box.scale.z * 0.5

        if (
          checkPoint.x >= box.pos.x - halfX && checkPoint.x <= box.pos.x + halfX &&
          checkPoint.y >= box.pos.y - halfY && checkPoint.y <= box.pos.y + halfY &&
          checkPoint.z >= box.pos.z - halfZ && checkPoint.z <= box.pos.z + halfZ
        ) {
          return true
        }
      }
    }

    return false
  }

  // 检查敌人是否可见（玩家视野或队友视野）
  isEnemyVisible(enemyPos, playerPos, bots = [], boxes = []) {
    if (!enemyPos || !playerPos) return false

    // 检查玩家是否能直接看到敌人
    if (!this.lineOfSightBlocked(playerPos, enemyPos, boxes)) {
      return true
    }

    // 检查队友是否能看到敌人
    for (const bot of bots) {
      if (!bot || !bot.alive || !bot.pos) continue
      if (normalizeTeam(bot.team) !== normalizeTeam(this.game.team)) continue

      if (!this.lineOfSightBlocked(bot.pos, enemyPos, boxes)) {
        return true
      }
    }

    return false
  }

  drawObstacle(bounds, box) {
    if (!box || !box.pos || !box.scale) return

    const halfX = box.scale.x * 0.5
    const halfZ = box.scale.z * 0.5

    const tl = this.worldToMap(box.pos.x - halfX, box.pos.z + halfZ, bounds)
    const br = this.worldToMap(box.pos.x + halfX, box.pos.z - halfZ, bounds)
    const w = br.x - tl.x
    const h = br.y - tl.y

    if (w <= 0.5 || h <= 0.5) return
    this.ctx.fillRect(tl.x, tl.y, w, h)
    this.ctx.strokeRect(tl.x, tl.y, w, h)
  }

  drawDot(pos, color, radius, bounds) {
    if (!pos) return
    const p = this.worldToMap(pos.x, pos.z, bounds)
    this.ctx.beginPath()
    this.ctx.fillStyle = color
    this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    this.ctx.fill()
  }

  drawArrow(pos, yaw, color, length, bounds) {
    if (!pos || !Number.isFinite(yaw)) return
    const p = this.worldToMap(pos.x, pos.z, bounds)

    // 计算朝向方向
    const dirX = Math.sin(yaw)
    const dirZ = Math.cos(yaw)

    // 箭头终点
    const endP = this.worldToMap(pos.x + dirX * length, pos.z + dirZ * length, bounds)

    // 绘制箭头线
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(p.x, p.y)
    this.ctx.lineTo(endP.x, endP.y)
    this.ctx.stroke()

    // 绘制箭头头部
    const headLength = 4
    const angle = Math.atan2(endP.y - p.y, endP.x - p.x)

    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.moveTo(endP.x, endP.y)
    this.ctx.lineTo(
      endP.x - headLength * Math.cos(angle - Math.PI / 6),
      endP.y - headLength * Math.sin(angle - Math.PI / 6)
    )
    this.ctx.lineTo(
      endP.x - headLength * Math.cos(angle + Math.PI / 6),
      endP.y - headLength * Math.sin(angle + Math.PI / 6)
    )
    this.ctx.closePath()
    this.ctx.fill()
  }

  drawBombSite(bounds, site) {
    if (!site || !site.pos) return
    const mapBounds = Math.max(1, this.game?.mapBounds || 1)
    const p = this.worldToMap(site.pos.x, site.pos.z, bounds)
    const radius = Math.max(4, ((site.radius || 1) / (mapBounds * 2)) * this.size)

    // 绘制包点圆圈
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    this.ctx.stroke()

    // 绘制包点标记（A 或 B）
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
    this.ctx.font = `bold ${Math.max(12, this.size / 16)}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(site.key || '?', p.x, p.y)
  }

  drawBomb(bounds, bombPos) {
    if (!bombPos) return
    const p = this.worldToMap(bombPos.x, bombPos.z, bounds)

    // 绘制炸弹标记
    this.ctx.fillStyle = 'rgba(255, 60, 60, 0.95)'
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
    this.ctx.fill()

    // 绘制炸弹图标（十字）
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(p.x - 3, p.y)
    this.ctx.lineTo(p.x + 3, p.y)
    this.ctx.moveTo(p.x, p.y - 3)
    this.ctx.lineTo(p.x, p.y + 3)
    this.ctx.stroke()
  }

  renderNow() {
    if (!this.visible || this.size === 0) return

    const ctx = this.ctx
    const mapBounds = Number.isFinite(this.game?.mapBounds) ? this.game.mapBounds : 128
    const bounds = Math.max(1, mapBounds + 0.5)
    const inner = this.size - this.pad * 2

    // 清空画布
    ctx.clearRect(0, 0, this.size, this.size)

    // 绘制半透明背景
    ctx.fillStyle = 'rgba(6, 10, 16, 0.75)'
    ctx.fillRect(0, 0, this.size, this.size)

    // 绘制边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(0.75, 0.75, this.size - 1.5, this.size - 1.5)

    // 绘制地图边界
    const topLeft = this.worldToMap(-bounds, bounds, bounds)
    ctx.strokeStyle = 'rgba(156, 186, 226, 0.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(topLeft.x, topLeft.y, inner, inner)

    // 绘制障碍物
    ctx.fillStyle = 'rgba(170, 188, 214, 0.2)'
    ctx.strokeStyle = 'rgba(190, 207, 228, 0.4)'
    const boxes = Array.isArray(this.game?.boxes) ? this.game.boxes : []
    for (const box of boxes) {
      if (!box || !box.solid || !box.scale) continue
      if (box.scale.x > 50 && box.scale.z > 50) continue
      this.drawObstacle(bounds, box)
    }

    // 如果不是 AI 模式，只显示提示
    if (this.game.mode !== 'ai') {
      ctx.fillStyle = 'rgba(221, 231, 244, 0.8)'
      ctx.font = `${Math.max(12, this.size / 16)}px monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`RADAR [${this.size}px]`, 16, this.size - 16)
      return
    }

    // 绘制包点
    if (this.game.round && Array.isArray(this.game.round.sites)) {
      for (const site of this.game.round.sites) {
        this.drawBombSite(bounds, site)
      }
    }

    // 绘制炸弹（如果已放置）
    if (this.game.round && this.game.round.bombPlanted && this.game.round.bombPos) {
      this.drawBomb(bounds, this.game.round.bombPos)
    }

    // 绘制敌人（仅当可见时）
    const playerTeam = normalizeTeam(this.game.team)
    const bots = Array.isArray(this.game?.bots) ? this.game.bots : []
    for (const bot of bots) {
      if (!bot || !bot.alive || !bot.pos) continue

      const botTeam = normalizeTeam(bot.team)

      // 只显示敌人
      if (botTeam === playerTeam) continue

      // 检查敌人是否可见
      if (!this.isEnemyVisible(bot.pos, this.game.pos, bots, boxes)) {
        continue
      }

      const color = (TEAM_COLORS[botTeam] || TEAM_COLORS.neutral).hex
      this.drawDot(bot.pos, color, 3, bounds)
    }

    // 绘制队友（带朝向）
    for (const bot of bots) {
      if (!bot || !bot.alive || !bot.pos) continue

      const botTeam = normalizeTeam(bot.team)
      if (botTeam !== playerTeam) continue

      const color = (TEAM_COLORS[botTeam] || TEAM_COLORS.neutral).hex
      this.drawDot(bot.pos, color, 3, bounds)

      // 绘制队友朝向
      if (bot.yaw !== undefined) {
        this.drawArrow(bot.pos, bot.yaw, color, 1.8, bounds)
      }
    }

    // 绘制玩家（自己）
    if (this.game.playerAlive && this.game.pos) {
      const playerColor = '#4f9cff'
      this.drawDot(this.game.pos, playerColor, 4, bounds)

      // 绘制玩家朝向
      this.drawArrow(this.game.pos, this.game.yaw || 0, playerColor, 2.4, bounds)
    }

    // 绘制雷达大小指示器
    ctx.fillStyle = 'rgba(221, 231, 244, 0.7)'
    ctx.font = `${Math.max(10, this.size / 20)}px monospace`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`[${this.size}px] [Tab 切换]`, this.size - 8, this.size - 8)
  }

  render() {
    if (!this.visible || this.size === 0) {
      this.renderThrottler.cancelRender()
      return
    }
    this.renderThrottler.requestRender()
  }
}
