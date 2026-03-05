// Event Manager import - 防止内存泄漏
import { EventManager } from './event-manager.js'

// Multiplayer imports
import MultiplayerClient, { TEAM_COLORS as TEAM_VISUALS, normalizeTeam } from './multiplayer.js'
import {
  clearHealthBars,
  createHealthBar,
  createLoginUI,
  createMultiplayerHUD,
  createRoomListUI,
  createRoomWaitingUI,
  removeHealthBar,
  updateWaitingPlayerList
} from './multiplayer-ui.js'
// Radar system import
import Radar from './radar.js'
// Spectator mode import
import { SPECTATOR_MODE, SpectatorManager, SpectatorUI } from './spectator-mode.js'

// 全局错误处理器 - 捕获未处理的异常和Promise rejection
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error)
  // 防止错误导致游戏崩溃
  event.preventDefault()
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise rejection:', event.reason)
  // 防止错误导致游戏崩溃
  event.preventDefault()
})

const canvas = document.getElementById('gl');
const overlay = document.getElementById('overlay');

// 创建全局事件管理器 - 统一管理所有事件监听器，防止内存泄漏
const globalEventManager = new EventManager();
let frameCount = 0;

// ========== 对象池容量限制 ==========
// 防止对象池无限增长导致内存占用过高
// 当对象池满时，多余的对象会被垃圾回收器回收
const MAX_SHELL_POOL_SIZE = 200;  // 弹壳池最大容量
const MAX_TRACER_POOL_SIZE = 150; // 曳光弹池最大容量

const screenLobby = document.getElementById('screenLobby');
const screenAI = document.getElementById('screenAI');
const screenPause = document.getElementById('screenPause');
const screenSettings = document.getElementById('screenSettings');
const screenResult = document.getElementById('screenResult');

const btnModeAI = document.getElementById('btnModeAI');
const btnModeOnline = document.getElementById('btnModeOnline');
const btnLobbySettings = document.getElementById('btnLobbySettings');

const teamCT = document.getElementById('teamCT');
const teamT = document.getElementById('teamT');
const diffEasy = document.getElementById('diffEasy');
const diffNormal = document.getElementById('diffNormal');
const diffHard = document.getElementById('diffHard');
const modeBomb = document.getElementById('modeBomb');
const botMinus = document.getElementById('botMinus');
const botPlus = document.getElementById('botPlus');
const botCountText = document.getElementById('botCountText');
const btnStartAI = document.getElementById('btnStartAI');
const btnBackToLobby = document.getElementById('btnBackToLobby');

const btnResume = document.getElementById('btnResume');
const btnRestart = document.getElementById('btnRestart');
const btnPauseSettings = document.getElementById('btnPauseSettings');
const btnReturnLobby = document.getElementById('btnReturnLobby');

const resultTitle = document.getElementById('resultTitle');
const resultDetail = document.getElementById('resultDetail');
const resultBoard = document.getElementById('resultBoard');
const btnResultRestart = document.getElementById('btnResultRestart');
const btnResultLobby = document.getElementById('btnResultLobby');

const volMasterMinus = document.getElementById('volMasterMinus');
const volMasterPlus = document.getElementById('volMasterPlus');
const volSfxMinus = document.getElementById('volSfxMinus');
const volSfxPlus = document.getElementById('volSfxPlus');
const volMusicMinus = document.getElementById('volMusicMinus');
const volMusicPlus = document.getElementById('volMusicPlus');
const volMasterText = document.getElementById('volMasterText');
const volSfxText = document.getElementById('volSfxText');
const volMusicText = document.getElementById('volMusicText');
const btnSettingsBack = document.getElementById('btnSettingsBack');

const hud = document.getElementById('hud');
const statusEl = document.getElementById('status');
const ctAliveEl = document.getElementById('ctAlive');
const tAliveEl = document.getElementById('tAlive');
const hpBar = document.getElementById('hpBar');
const arBar = document.getElementById('arBar');
const hpText = document.getElementById('hpText');
const arText = document.getElementById('arText');
const weaponNameEl = document.getElementById('weaponName');
const fireModeHintEl = document.getElementById('fireModeHint');
const ammoText = document.getElementById('ammoText');
const tipText = document.getElementById('tipText');
const hitmarkerEl = document.getElementById('hitmarker');
const reloadWrap = document.getElementById('reloadWrap');
const reloadBar = document.getElementById('reloadBar');
const reloadText = document.getElementById('reloadText');
const crosshairEl = document.querySelector('.crosshair');
const scopeOverlayEl = document.getElementById('scopeOverlay');
const objectiveEl = document.getElementById('objective');
const objectiveText = document.getElementById('objectiveText');
const objectiveTimer = document.getElementById('objectiveTimer');
const objectiveFill = document.getElementById('objectiveFill');
const moneyTextEl = document.getElementById('moneyText');
const buyMenuEl = document.getElementById('buyMenu');
const buyMenuBodyEl = document.getElementById('buyMenuBody');
const buyNoticeEl = document.getElementById('buyNotice');

canvas.tabIndex = 0;

// ============================================================================
// 引入模块函数 - 从 math-utils.js 和 physics.js 模块中引入函数
// ============================================================================
const MathUtils = window.MathUtils;
const Physics = window.Physics;

// 向量运算函数
const { v3, v3add, v3sub, v3scale, v3dot, v3cross, v3len, v3norm } = MathUtils;
// 辅助数学函数
const { clamp01, clamp, lerp, easeOutQuad } = MathUtils;
// 矩阵运算函数
const { mat4Identity, mat4Mul } = MathUtils;
// 物理碰撞函数
const { aabbFromCenter, aabbIntersects, rayAabb } = Physics;

// 以上函数已从模块导入，本地定义已删除
// - v3, v3add, v3sub, v3scale, v3dot, v3cross, v3len, v3norm → math-utils.js
// - clamp01, clamp, lerp, easeOutQuad → math-utils.js
// - mat4Identity, mat4Mul → math-utils.js
// - aabbFromCenter, aabbIntersects, rayAabb → physics.js

// ============================================================================
// 保留的矩阵函数（模块中未提供）
// ============================================================================

function mat4Perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) / (near - far);
  out[15] = 0;
  return out;
}

function mat4LookAt(out, eye, center, up) {
  const f = v3norm(v3sub(center, eye));
  const s = v3norm(v3cross(up, f));
  const u = v3cross(f, s);

  out[0] = s.x;
  out[1] = u.x;
  out[2] = -f.x;
  out[3] = 0;
  out[4] = s.y;
  out[5] = u.y;
  out[6] = -f.y;
  out[7] = 0;
  out[8] = s.z;
  out[9] = u.z;
  out[10] = -f.z;
  out[11] = 0;
  out[12] = -v3dot(s, eye);
  out[13] = -v3dot(u, eye);
  out[14] = v3dot(f, eye);
  out[15] = 1;
  return out;
}

// mat4Mul 已移至 math-utils.js 模块

function mat4FromTranslation(out, t) {
  out.set(mat4Identity());
  out[12] = t.x;
  out[13] = t.y;
  out[14] = t.z;
  return out;
}

function mat4FromScale(out, s) {
  out.set(mat4Identity());
  out[0] = s.x;
  out[5] = s.y;
  out[10] = s.z;
  return out;
}

function mat4FromBasisTRS(out, right, up, forward, pos, scale) {
  out[0] = right.x * scale.x;
  out[1] = right.y * scale.x;
  out[2] = right.z * scale.x;
  out[3] = 0;
  out[4] = up.x * scale.y;
  out[5] = up.y * scale.y;
  out[6] = up.z * scale.y;
  out[7] = 0;
  out[8] = forward.x * scale.z;
  out[9] = forward.y * scale.z;
  out[10] = forward.z * scale.z;
  out[11] = 0;
  out[12] = pos.x;
  out[13] = pos.y;
  out[14] = pos.z;
  out[15] = 1;
  return out;
}

function forwardFromYawPitch(yaw, pitch) {
  const cp = Math.cos(pitch);
  return v3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
}

function rightFromYaw(yaw) {
  return v3(Math.cos(yaw), 0, -Math.sin(yaw));
}

// aabbFromCenter 已移至 physics.js 模块

// ============================================================================
// AABB Quadtree Broad-Phase (XZ plane)
// ============================================================================
function makeAabb2(minX, minZ, maxX, maxZ) {
  return { minX, minZ, maxX, maxZ };
}

function aabb2Intersects(a, b) {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}

function aabb2Contains(outer, inner) {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minZ >= outer.minZ &&
    inner.maxZ <= outer.maxZ
  );
}

function aabb3To2(aabb) {
  return makeAabb2(aabb.min.x, aabb.min.z, aabb.max.x, aabb.max.z);
}

function raySweepAabb2(ro, rd, maxDist, pad = 1.2) {
  const d = Math.max(0, maxDist);
  const endX = ro.x + rd.x * d;
  const endZ = ro.z + rd.z * d;
  return makeAabb2(
    Math.min(ro.x, endX) - pad,
    Math.min(ro.z, endZ) - pad,
    Math.max(ro.x, endX) + pad,
    Math.max(ro.z, endZ) + pad
  );
}

function playerBroadPhaseAabb(basePos) {
  // Covers all hit zones (head/torso/legs) regardless of yaw.
  return aabbFromCenter(v3(basePos.x, basePos.y + 1.1, basePos.z), v3(0.6, 1.1, 0.6));
}

class AabbQuadtreeNode {
  constructor(bounds, depth, maxDepth, capacity) {
    this.bounds = bounds;
    this.depth = depth;
    this.maxDepth = maxDepth;
    this.capacity = capacity;
    this.items = [];
    this.children = null;
  }

  clear() {
    this.items.length = 0;
    if (this.children) {
      for (const child of this.children) child.clear();
    }
    this.children = null;
  }

  subdivide() {
    if (this.children) return;
    const midX = (this.bounds.minX + this.bounds.maxX) * 0.5;
    const midZ = (this.bounds.minZ + this.bounds.maxZ) * 0.5;
    const d = this.depth + 1;
    this.children = [
      new AabbQuadtreeNode(makeAabb2(this.bounds.minX, this.bounds.minZ, midX, midZ), d, this.maxDepth, this.capacity),
      new AabbQuadtreeNode(makeAabb2(midX, this.bounds.minZ, this.bounds.maxX, midZ), d, this.maxDepth, this.capacity),
      new AabbQuadtreeNode(makeAabb2(this.bounds.minX, midZ, midX, this.bounds.maxZ), d, this.maxDepth, this.capacity),
      new AabbQuadtreeNode(makeAabb2(midX, midZ, this.bounds.maxX, this.bounds.maxZ), d, this.maxDepth, this.capacity),
    ];
  }

  childFor(aabb) {
    if (!this.children) return null;
    for (const child of this.children) {
      if (aabb2Contains(child.bounds, aabb)) return child;
    }
    return null;
  }

  insert(item) {
    const aabb = item && item.aabb2;
    if (!aabb || !aabb2Intersects(this.bounds, aabb)) return false;

    if (this.children) {
      const child = this.childFor(aabb);
      if (child) return child.insert(item);
    }

    if (this.items.length < this.capacity || this.depth >= this.maxDepth) {
      this.items.push(item);
      return true;
    }

    if (!this.children) this.subdivide();

    for (let i = this.items.length - 1; i >= 0; i--) {
      const existing = this.items[i];
      const child = this.childFor(existing.aabb2);
      if (!child) continue;
      this.items.splice(i, 1);
      child.insert(existing);
    }

    const child = this.childFor(aabb);
    if (child) return child.insert(item);
    this.items.push(item);
    return true;
  }

  query(range, outSet) {
    if (!aabb2Intersects(this.bounds, range)) return;

    for (const item of this.items) {
      if (aabb2Intersects(item.aabb2, range)) outSet.add(item);
    }

    if (!this.children) return;
    for (const child of this.children) {
      child.query(range, outSet);
    }
  }
}

class AabbQuadtree {
  constructor(bounds = makeAabb2(-128, -128, 128, 128), maxDepth = 6, capacity = 8) {
    this.bounds = bounds;
    this.maxDepth = maxDepth;
    this.capacity = capacity;
    this.root = new AabbQuadtreeNode(bounds, 0, maxDepth, capacity);
  }

  clear() {
    this.root.clear();
  }

  insert(item, aabb2) {
    if (!item || !aabb2) return false;
    item.aabb2 = aabb2;
    return this.root.insert(item);
  }

  query(range) {
    const out = new Set();
    this.root.query(range, out);
    return Array.from(out);
  }
}

const COLLISION_QUADTREE_BOUNDS = makeAabb2(-128, -128, 128, 128);

// Performance monitoring for collision detection
const collisionPerf = {
  frameTime: 0,
  rayCasts: 0,
  broadPhaseCandidates: 0,
  narrowPhaseTests: 0,
  earlyExits: 0
};

function resetCollisionPerf() {
  collisionPerf.rayCasts = 0;
  collisionPerf.broadPhaseCandidates = 0;
  collisionPerf.narrowPhaseTests = 0;
  collisionPerf.earlyExits = 0;
}

// Hitzone configuration (CS:GO standard damage multipliers)
const HITZONE_CONFIG = {
  head: { mult: 4.0, priority: 1 },
  torso: { mult: 1.0, priority: 2 },
  legs: { mult: 0.75, priority: 3 }
};

const HITZONE_FEEDBACK = {
  head: { label: 'HEADSHOT', color: '255, 82, 82' },
  torso: { label: 'TORSO', color: '255, 232, 153' },
  legs: { label: 'LEGS', color: '140, 210, 255' }
};

function getHitZoneFeedback(zone) {
  if (zone && HITZONE_FEEDBACK[zone]) return HITZONE_FEEDBACK[zone];
  return { label: 'BODY', color: '255, 232, 153' };
}

// Build player hitboxes (7 zones: head, upper torso, lower torso, 2 arms, 2 legs)
function buildPlayerHitboxes(basePos, yaw = 0) {
  const up = v3(0, 1, 0);
  const f = v3norm(forwardFromYawPitch(yaw, 0));
  const r = v3norm(v3cross(up, f));
  const u = up;
  const hip = v3add(basePos, v3(0, 0.95, 0));

  // Priority order: head first (early exit for headshots)
  return [
    // Head (smallest, highest damage)
    { zone: 'head', mult: HITZONE_CONFIG.head.mult, c: v3add(hip, v3(0, 1.18, 0.02)), h: v3(0.16, 0.16, 0.16), r, u, f },
    // Upper torso (chest)
    { zone: 'torso', mult: HITZONE_CONFIG.torso.mult, c: v3add(hip, v3(0, 0.78, 0.02)), h: v3(0.25, 0.22, 0.16), r, u, f },
    // Lower torso (stomach)
    { zone: 'torso', mult: HITZONE_CONFIG.torso.mult, c: v3add(hip, v3(0, 0.25, 0)), h: v3(0.28, 0.38, 0.15), r, u, f },
    // Arms (low priority)
    { zone: 'torso', mult: 0.75, c: v3add(hip, v3(0.42, 0.78, 0.02)), h: v3(0.09, 0.28, 0.09), r, u, f },
    { zone: 'torso', mult: 0.75, c: v3add(hip, v3(-0.42, 0.78, 0.02)), h: v3(0.09, 0.28, 0.09), r, u, f },
    // Legs
    { zone: 'legs', mult: HITZONE_CONFIG.legs.mult, c: v3add(basePos, v3(0.18, 0.45, 0)), h: v3(0.11, 0.45, 0.11), r, u, f },
    { zone: 'legs', mult: HITZONE_CONFIG.legs.mult, c: v3add(basePos, v3(-0.18, 0.45, 0)), h: v3(0.11, 0.45, 0.11), r, u, f },
  ];
}

function aabbIntersects(a, b) {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y &&
    a.min.z <= b.max.z &&
    a.max.z >= b.min.z
  );
}

function aabbIntersectsEps(a, b, eps) {
  return (
    a.min.x < b.max.x - eps &&
    a.max.x > b.min.x + eps &&
    a.min.y < b.max.y - eps &&
    a.max.y > b.min.y + eps &&
    a.min.z < b.max.z - eps &&
    a.max.z > b.min.z + eps
  );
}

function rayAabb(ro, rd, box) {
  const invX = 1 / (Math.abs(rd.x) < 1e-8 ? 1e-8 : rd.x);
  const invY = 1 / (Math.abs(rd.y) < 1e-8 ? 1e-8 : rd.y);
  const invZ = 1 / (Math.abs(rd.z) < 1e-8 ? 1e-8 : rd.z);

  let tmin = (box.min.x - ro.x) * invX;
  let tmax = (box.max.x - ro.x) * invX;
  if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

  let tymin = (box.min.y - ro.y) * invY;
  let tymax = (box.max.y - ro.y) * invY;
  if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
  if (tmin > tymax || tymin > tmax) return null;
  tmin = Math.max(tmin, tymin);
  tmax = Math.min(tmax, tymax);

  let tzmin = (box.min.z - ro.z) * invZ;
  let tzmax = (box.max.z - ro.z) * invZ;
  if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
  if (tmin > tzmax || tzmin > tmax) return null;
  tmin = Math.max(tmin, tzmin);
  tmax = Math.min(tmax, tzmax);

  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : tmax;
}

function rayObbLocal(ro, rd, center, right, up, forward, half) {
  const d = v3sub(ro, center);
  const roL = v3(v3dot(d, right), v3dot(d, up), v3dot(d, forward));
  const rdL = v3(v3dot(rd, right), v3dot(rd, up), v3dot(rd, forward));
  const box = {
    min: v3(-half.x, -half.y, -half.z),
    max: v3(half.x, half.y, half.z),
  };
  return rayAabb(roL, rdL, box);
}

function nowMs() {
  return performance.now();
}

const NAV_GRID_SIZE = 56;
const NAV_GRID_ORIGIN = -28;
const NAV_CELL_SIZE = 1;
const NAV_COLLIDER_PADDING = 0.42;
const NAV_DIAGONAL_COST = Math.SQRT2;
const NAV_NEIGHBORS = [
  { x: 1, z: 0, cost: 1 },
  { x: -1, z: 0, cost: 1 },
  { x: 0, z: 1, cost: 1 },
  { x: 0, z: -1, cost: 1 },
  { x: 1, z: 1, cost: NAV_DIAGONAL_COST },
  { x: -1, z: 1, cost: NAV_DIAGONAL_COST },
  { x: 1, z: -1, cost: NAV_DIAGONAL_COST },
  { x: -1, z: -1, cost: NAV_DIAGONAL_COST },
];

class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.gSfx = 0.7;
    this.gMusic = 0.0;
  }

  ensure() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(this.ctx.destination);
  }

  setVolumes(master, sfx, music) {
    if (!this.master) return;
    this.master.gain.value = 0.18 * master;
    this.gSfx = sfx;
    this.gMusic = music;
  }

  blip(freq, dur, wave) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave === 0 ? 'square' : wave === 1 ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(freq, t0);
    const amp = 0.8 * this.gSfx;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  shot(kind) {
    if (kind === 0) {
      this.blip(240, 0.06, 0);
      this.blip(160, 0.08, 2);
    } else if (kind === 1) {
      this.blip(320, 0.04, 1);
      this.blip(200, 0.06, 2);
    } else if (kind === 2) {
      this.blip(360, 0.032, 1);
      this.blip(260, 0.05, 2);
    } else {
      this.blip(180, 0.08, 0);
      this.blip(120, 0.12, 2);
    }
  }

  reload() {
    this.blip(700, 0.05, 2);
    this.blip(500, 0.05, 2);
  }

  hit() {
    this.blip(900, 0.03, 2);
    this.blip(1200, 0.02, 2);
  }
}

const audio = new AudioBus();

class GL {
  constructor(canvasEl) {
    const gl = canvasEl.getContext('webgl2', {
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.dpr = 1;
    this.width = 0;
    this.height = 0;
    this.vao = null;
    this.indexCount = 0;
  }

  resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (w === this.width && h === this.height && dpr === this.dpr) return;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    canvas.width = w;
    canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  createProgram(vs, fs) {
    const gl = this.gl;
    const v = gl.createShader(gl.VERTEX_SHADER);
    if (!v) throw new Error('Failed to create vertex shader');
    gl.shaderSource(v, vs);
    gl.compileShader(v);
    if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(v) || '(no log)';
      gl.deleteShader(v);
      throw new Error(`VS compile error: ${log}`);
    }
    const f = gl.createShader(gl.FRAGMENT_SHADER);
    if (!f) throw new Error('Failed to create fragment shader');
    gl.shaderSource(f, fs);
    gl.compileShader(f);
    if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(f) || '(no log)';
      gl.deleteShader(v);
      gl.deleteShader(f);
      throw new Error(`FS compile error: ${log}`);
    }
    const p = gl.createProgram();
    if (!p) throw new Error('Failed to create program');
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p) || '(no log)';
      gl.deleteProgram(p);
      throw new Error(`Program link error: ${log}`);
    }
    return p;
  }
}

function buildCubeMesh() {
  const v = [];
  const i = [];
  let base = 0;
  function addFace(nx, ny, nz, pts) {
    for (const p of pts) v.push(p[0], p[1], p[2], nx, ny, nz);
    i.push(base + 0, base + 1, base + 2, base + 0, base + 2, base + 3);
    base += 4;
  }
  addFace(0, 0, 1, [
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, 0.5],
    [-0.5, 0.5, 0.5],
  ]);
  addFace(0, 0, -1, [
    [0.5, -0.5, -0.5],
    [-0.5, -0.5, -0.5],
    [-0.5, 0.5, -0.5],
    [0.5, 0.5, -0.5],
  ]);
  addFace(1, 0, 0, [
    [0.5, -0.5, 0.5],
    [0.5, -0.5, -0.5],
    [0.5, 0.5, -0.5],
    [0.5, 0.5, 0.5],
  ]);
  addFace(-1, 0, 0, [
    [-0.5, -0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [-0.5, 0.5, 0.5],
    [-0.5, 0.5, -0.5],
  ]);
  addFace(0, 1, 0, [
    [-0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5],
    [0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5],
  ]);
  addFace(0, -1, 0, [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, -0.5, 0.5],
    [-0.5, -0.5, 0.5],
  ]);
  return {
    vertices: new Float32Array(v),
    indices: new Uint16Array(i),
  };
}

function buildCylinderMesh(segments = 18) {
  const seg = Math.max(6, segments | 0);
  const v = [];
  const i = [];

  function addVertex(px, py, pz, nx, ny, nz) {
    const index = v.length / 6;
    v.push(px, py, pz, nx, ny, nz);
    return index;
  }

  const topY = 0.5;
  const bottomY = -0.5;

  for (let s = 0; s <= seg; s++) {
    const t = (s / seg) * Math.PI * 2;
    const x = Math.cos(t);
    const z = Math.sin(t);
    addVertex(x, topY, z, x, 0, z);
    addVertex(x, bottomY, z, x, 0, z);
  }

  for (let s = 0; s < seg; s++) {
    const a = s * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    i.push(a, c, b, c, d, b);
  }

  const topCenter = addVertex(0, topY, 0, 0, 1, 0);
  const topStart = v.length / 6;
  for (let s = 0; s < seg; s++) {
    const t = (s / seg) * Math.PI * 2;
    addVertex(Math.cos(t), topY, Math.sin(t), 0, 1, 0);
  }
  for (let s = 0; s < seg; s++) {
    const cur = topStart + s;
    const nxt = topStart + ((s + 1) % seg);
    i.push(topCenter, cur, nxt);
  }

  const bottomCenter = addVertex(0, bottomY, 0, 0, -1, 0);
  const bottomStart = v.length / 6;
  for (let s = 0; s < seg; s++) {
    const t = (s / seg) * Math.PI * 2;
    addVertex(Math.cos(t), bottomY, Math.sin(t), 0, -1, 0);
  }
  for (let s = 0; s < seg; s++) {
    const cur = bottomStart + s;
    const nxt = bottomStart + ((s + 1) % seg);
    i.push(bottomCenter, nxt, cur);
  }

  return {
    vertices: new Float32Array(v),
    indices: new Uint16Array(i),
  };
}

function makeBox(pos, scale, color, solid) {
  const half = v3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5);
  return { pos, scale, color, solid, aabb: aabbFromCenter(pos, half) };
}

function makeTarget(id, pos) {
  return {
    id,
    pos,
    half: v3(0.35, 0.9, 0.35),
    hp: 100,
    maxHp: 100,
    alive: true,
    respawnAt: 0,
  };
}

/**
 * 创建 Bot 默认武器配置
 * @returns {Object} 武器配置对象
 */
function createDefaultWeapon() {
  return {
    rpm: 240,
    damage: 5,
    magSize: 18,
    mag: 18,
    reserve: 999,
    reloadSec: 1.3,
    reloading: false,
    reloadLeft: 0,
    reloadTotal: 1.3,
    spreadDeg: 2.2,
  };
}

/**
 * 创建 Bot 导航状态
 * @param {Object} pos - 初始位置 {x, y, z}
 * @returns {Object} 导航状态对象
 */
function createBotNavigationState(pos) {
  return {
    navPath: [],
    navIndex: 0,
    navGoalKey: '',
    navRepathAt: 0,
    forceRepath: false,
    stuckTime: 0,
    lastNavPos: v3(pos.x, pos.y, pos.z),
  };
}

/**
 * 创建 Bot 实例
 * @param {number} id - Bot ID
 * @param {Object} pos - 初始位置 {x, y, z}
 * @returns {Object} Bot 对象
 */
function makeBot(id, pos) {
  return {
    id,
    pos,
    spawn: v3(pos.x, pos.y, pos.z),
    vel: v3(0, 0, 0),
    yaw: 0,
    team: 't',
    kills: 0,
    deaths: 0,
    half: v3(0.35, 0.9, 0.35),
    hp: 100,
    maxHp: 100,
    alive: true,
    respawnAt: 0,
    nextThinkAt: 0,
    shootCooldown: 0,
    weapon: createDefaultWeapon(),
    state: 'patrol',
    patrolPhase: Math.random() * Math.PI * 2,
    patrolNode: 0,
    objectiveSite: id % 2 === 0 ? 'A' : 'B',
    ...createBotNavigationState(pos),
    coverPos: null,
    coverEvalAt: 0,
    coverEnemyKey: '',
  };
}

const DEFAULT_SPEED = 6.0;

// ==================== 投掷物系统 ====================

/**
 * 处理投掷物反弹逻辑
 * @param {Grenade} grenade - 投掷物实例
 * @param {Object} newPos - 新位置 {x, y, z}
 * @param {Array} colliders - 碰撞体数组
 * @returns {boolean} 是否继续更新（false 表示达到最大反弹次数）
 */
function handleGrenadeBounce(grenade, newPos, colliders) {
  const half = v3(0.1, 0.1, 0.1);
  const aabb = aabbFromCenter(newPos, half);

  // 与碰撞体反弹
  for (const c of colliders) {
    if (aabbIntersects(aabb, c)) {
      grenade.bounces++;

      if (grenade.bounces >= grenade.maxBounces) {
        grenade.alive = false;
        return false;
      }

      // 反弹速度分量并减速
      if (Math.abs(grenade.vel.y) > 0.1) {
        grenade.vel.y = -grenade.vel.y * 0.4;
        newPos.y = grenade.pos.y;
      }
      if (Math.abs(grenade.vel.x) > 0.1) {
        grenade.vel.x = -grenade.vel.x * 0.4;
      }
      if (Math.abs(grenade.vel.z) > 0.1) {
        grenade.vel.z = -grenade.vel.z * 0.4;
      }

      break;
    }
  }

  // 地面检测
  if (newPos.y <= 0.1) {
    newPos.y = 0.1;
    grenade.vel.y = -grenade.vel.y * 0.3;
    grenade.vel.x *= 0.7;
    grenade.vel.z *= 0.7;
    grenade.bounces++;

    if (grenade.bounces >= grenade.maxBounces || v3len(grenade.vel) < 0.5) {
      grenade.alive = false;
      return false;
    }
  }

  return true;
}

/**
 * 投掷物基类（抛物线轨迹）
 */
class Grenade {
  constructor(pos, vel, type) {
    this.pos = v3(pos.x, pos.y, pos.z);
    this.vel = v3(vel.x, vel.y, vel.z);
    this.type = type; // 'flash' | 'smoke' | 'molotov'
    this.alive = true;
    this.bounces = 0;
    this.maxBounces = 3;
    this.life = 3.0; // 最大飞行时间
  }

  update(dt, colliders) {
    if (!this.alive) return;

    // 重力
    this.vel.y -= 12.0 * dt;

    // 空气阻力
    this.vel.x *= 0.995;
    this.vel.z *= 0.995;

    // 计算新位置
    const newPos = v3add(this.pos, v3scale(this.vel, dt));

    // 处理反弹
    if (!handleGrenadeBounce(this, newPos, colliders)) {
      return; // 达到最大反弹次数，停止更新
    }

    this.pos = newPos;

    // 生命周期
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }
}

/**
 * 初始化烟雾粒子数组
 * @param {Object} system - 烟雾粒子系统实例
 * @returns {Array} 粒子数组
 */
function initSmokeParticles(system) {
  const particles = [];
  for (let i = 0; i < system.particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * system.radius;
    const x = system.pos.x + Math.cos(angle) * r;
    const z = system.pos.z + Math.sin(angle) * r;
    const y = system.pos.y + Math.random() * system.height;

    particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.1,
      vz: (Math.random() - 0.5) * 0.3,
      size: 0.3 + Math.random() * 0.4,
      opacity: 0.3 + Math.random() * 0.4,
      life: 1.0,
    });
  }
  return particles;
}

/**
 * 烟雾粒子系统
 */
class SmokeParticleSystem {
  constructor(pos, duration) {
    this.pos = v3(pos.x, pos.y + 0.5, pos.z);
    this.particles = [];
    this.duration = duration;
    this.timer = 0;
    this.alive = true;
    this.radius = 4.0;
    this.height = 2.5;
    this.particleCount = 200;

    this.particles = initSmokeParticles(this);
  }

/**
 * 约束粒子在边界内
 * @param {Object} particle - 粒子对象
 * @param {Object} system - 烟雾系统实例
 */
function constrainParticle(particle, system) {
  // 水平边界约束（圆形）
  const dx = particle.x - system.pos.x;
  const dz = particle.z - system.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > system.radius) {
    particle.x = system.pos.x + (dx / dist) * system.radius;
    particle.z = system.pos.z + (dz / dist) * system.radius;
    particle.vx *= -0.5;
    particle.vz *= -0.5;
  }

  // 高度约束
  if (particle.y < system.pos.y) particle.y = system.pos.y;
  if (particle.y > system.pos.y + system.height) particle.y = system.pos.y + system.height;
}

  update(dt) {
    this.timer += dt;

    if (this.timer >= this.duration) {
      this.alive = false;
      return;
    }

    // 淡出效果
    const fadeStart = this.duration - 2.0;
    const fadeMultiplier = this.timer > fadeStart 
      ? Math.max(0, (this.duration - this.timer) / 2.0) 
      : 1.0;

    for (const p of this.particles) {
      // 漂浮运动
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // 边界约束
      constrainParticle(p, this);

      // 随机扰动
      p.vx += (Math.random() - 0.5) * 0.1;
      p.vy += (Math.random() - 0.5) * 0.05;
      p.vz += (Math.random() - 0.5) * 0.1;

      p.opacity = (0.3 + Math.random() * 0.4) * fadeMultiplier;
    }
  }

  getAABB() {
    const halfX = this.radius;
    const halfY = this.height / 2;
    const halfZ = this.radius;
    const center = v3(this.pos.x, this.pos.y + halfY, this.pos.z);
    return aabbFromCenter(center, v3(halfX, halfY, halfZ));
  }

  containsPoint(point) {
    const dx = point.x - this.pos.x;
    const dz = point.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < this.radius && point.y >= this.pos.y && point.y <= this.pos.y + this.height;
  }
}

/**
 * 火焰粒子系统（燃烧弹）
 */
class FireParticleSystem {
  constructor(pos, duration, damagePerSecond) {
    this.pos = v3(pos.x, pos.y + 0.1, pos.z);
    this.particles = [];
    this.duration = duration;
    this.timer = 0;
    this.alive = true;
    this.radius = 3.0;
    this.height = 1.5;
    this.damagePerSecond = damagePerSecond;
    this.damageTimer = 0;
    this.particleCount = 150;

    this.initParticles();
  }

  initParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.addParticle();
    }
  }

  addParticle() {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * this.radius;
    const x = this.pos.x + Math.cos(angle) * r;
    const z = this.pos.z + Math.sin(angle) * r;
    const y = this.pos.y;

    this.particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 0.8 + Math.random() * 0.5,
      vz: (Math.random() - 0.5) * 0.5,
      size: 0.2 + Math.random() * 0.3,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 0.5 + Math.random() * 0.5,
      hue: Math.random(), // 0=红, 0.15=橙, 0.33=黄
    });
  }

  update(dt) {
    this.timer += dt;
    this.damageTimer += dt;

    if (this.timer >= this.duration) {
      this.alive = false;
      return;
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      p.vy += 0.5 * dt; // 上升加速

      if (p.life <= 0 || p.y > this.pos.y + this.height) {
        this.particles.splice(i, 1);
      }
    }

    // 持续添加新粒子
    const spawnRate = 50 * (1 - this.timer / this.duration);
    if (Math.random() < spawnRate * dt) {
      this.addParticle();
    }
  }

  getAABB() {
    const halfX = this.radius;
    const halfY = this.height / 2;
    const halfZ = this.radius;
    const center = v3(this.pos.x, this.pos.y + halfY, this.pos.z);
    return aabbFromCenter(center, v3(halfX, halfY, halfZ));
  }

  containsPoint(point) {
    const dx = point.x - this.pos.x;
    const dz = point.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < this.radius && point.y >= this.pos.y - 0.5 && point.y <= this.pos.y + this.height;
  }

  shouldDamage() {
    if (this.damageTimer >= 0.1) {
      this.damageTimer = 0;
      return true;
    }
    return false;
  }
}

/**
 * 投掷物管理器
 */
class GrenadeManager {
  constructor() {
    this.flyingGrenades = []; // 飞行中的投掷物
    this.smokeSystems = [];   // 烟雾粒子系统
    this.fireSystems = [];    // 火焰粒子系统
  }

  throwGrenade(pos, dir, type) {
    const speed = type === 'molotov' ? 10 : 12;
    const vel = v3scale(v3norm(dir), speed);
    vel.y += 3; // 初始向上速度
    
    const grenade = new Grenade(pos, vel, type);
    this.flyingGrenades.push(grenade);
    return grenade;
  }

  update(dt, colliders, game) {
    // 更新飞行中的投掷物
    for (let i = this.flyingGrenades.length - 1; i >= 0; i--) {
      const g = this.flyingGrenades[i];
      g.update(dt, colliders);

      if (!g.alive) {
        // 投掷物落地，触发效果
        this.onGrenadeLanded(g, game);
        this.flyingGrenades.splice(i, 1);
      }
    }

    // 更新烟雾系统
    for (let i = this.smokeSystems.length - 1; i >= 0; i--) {
      const smoke = this.smokeSystems[i];
      smoke.update(dt);
      if (!smoke.alive) {
        this.smokeSystems.splice(i, 1);
      }
    }

    // 更新火焰系统
    for (let i = this.fireSystems.length - 1; i >= 0; i--) {
      const fire = this.fireSystems[i];
      fire.update(dt);

      // 火焰伤害
      if (fire.shouldDamage()) {
        this.applyFireDamage(fire, game);
      }

      if (!fire.alive) {
        this.fireSystems.splice(i, 1);
      }
    }
  }

  onGrenadeLanded(grenade, game) {
    const pos = grenade.pos;

    switch (grenade.type) {
      case 'flash':
        this.triggerFlashbang(pos, game);
        break;
      case 'smoke':
        this.triggerSmoke(pos, game);
        break;
      case 'molotov':
        this.triggerMolotov(pos, game);
        break;
    }
  }

  triggerFlashbang(pos, game) {
    const burstRadius = 14;
    const tNow = nowMs();

    // 影响敌人
    for (const b of game.bots) {
      if (!b.alive || b.team === game.team) continue;
      
      const eye = v3(b.pos.x, b.pos.y + 1.4, b.pos.z);
      const diff = v3sub(eye, pos);
      const dist = v3len(diff);
      
      if (dist <= 0.001 || dist > burstRadius) continue;
      
      b.nextThinkAt = Math.max(b.nextThinkAt, tNow + 2500);
      b.shootCooldown = Math.max(b.shootCooldown, 2.8);
    }

    // 玩家致盲效果
    const playerEye = v3(game.pos.x, game.pos.y + 1.6, game.pos.z);
    const playerDist = v3len(v3sub(playerEye, pos));
    
    if (playerDist <= burstRadius) {
      const intensity = 1 - (playerDist / burstRadius);
      game.flashEffect.active = true;
      game.flashEffect.intensity = Math.min(1, intensity + 0.3);
      game.flashEffect.timer = game.flashEffect.duration;
    }

    audio.blip(800, 0.1, 2);
    setStatus(`闪光弹爆炸`, false);
  }

  triggerSmoke(pos, game) {
    const smoke = new SmokeParticleSystem(pos, game.grenades.smoke.duration);
    this.smokeSystems.push(smoke);
    
    // 添加到游戏碰撞系统
    game.grenades.smoke.active.push({
      pos: v3(pos.x, pos.y + 1.0, pos.z),
      scale: v3(8, 2.5, 8),
      aabb: smoke.getAABB(),
      system: smoke,
      expiresAt: nowMs() + game.grenades.smoke.duration * 1000,
    });

    rebuildGameplayColliders();
    setStatus(`烟雾弹部署`, false);
  }

  triggerMolotov(pos, game) {
    const fire = new FireParticleSystem(
      pos, 
      game.grenades.molotov.duration,
      game.grenades.molotov.damagePerSecond
    );
    this.fireSystems.push(fire);

    game.grenades.molotov.active.push({
      pos: v3(pos.x, pos.y, pos.z),
      scale: v3(6, 1.5, 6),
      aabb: fire.getAABB(),
      system: fire,
      expiresAt: nowMs() + game.grenades.molotov.duration * 1000,
    });

    audio.blip(200, 0.2, 0);
    setStatus(`燃烧弹点燃`, false);
  }

  applyFireDamage(fire, game) {
    const damage = fire.damagePerSecond * 0.1; // 每0.1秒的伤害

    // 伤害玩家
    if (game.playerAlive) {
      const playerPos = v3(game.pos.x, game.pos.y + 0.5, game.pos.z);
      if (fire.containsPoint(playerPos)) {
        game.hp = Math.max(0, game.hp - damage);
        if (game.hp <= 0) {
          game.playerAlive = false;
          game.stats.deaths += 1;
          setStatus('你被火焰烧死了', true);
        }
      }
    }

    // 伤害机器人
    for (const b of game.bots) {
      if (!b.alive) continue;
      
      const botPos = v3(b.pos.x, b.pos.y + 0.5, b.pos.z);
      if (fire.containsPoint(botPos)) {
        b.hp -= damage;
        if (b.hp <= 0) {
          b.alive = false;
          b.respawnAt = nowMs() + 2500;
          if (b.team !== game.team) {
            game.stats.kills += 1;
            addMoney(game.econ.rewardKill);
          }
        }
      }
    }
  }

  render(ctx, canvasWidth, canvasHeight, game) {
    // 渲染飞行中的投掷物（3D -> 2D 投影）
    for (const g of this.flyingGrenades) {
      const screenPos = this.worldToScreen(g.pos, game);
      if (screenPos) {
        const size = 8;
        ctx.fillStyle = g.type === 'flash' ? '#FFFF00' 
                      : g.type === 'smoke' ? '#666666' 
                      : '#FF4400';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 渲染烟雾粒子
    for (const smoke of this.smokeSystems) {
      for (const p of smoke.particles) {
        const screenPos = this.worldToScreen(v3(p.x, p.y, p.z), game);
        if (screenPos) {
          const size = p.size * 30;
          ctx.fillStyle = `rgba(128, 128, 128, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 渲染火焰粒子
    for (const fire of this.fireSystems) {
      for (const p of fire.particles) {
        const screenPos = this.worldToScreen(v3(p.x, p.y, p.z), game);
        if (screenPos) {
          const lifeRatio = p.life / p.maxLife;
          const size = p.size * 25 * lifeRatio;
          
          // 火焰颜色渐变（红->橙->黄）
          let r, g, b;
          if (lifeRatio > 0.7) {
            r = 255;
            g = Math.floor(100 + 155 * (1 - lifeRatio) / 0.3);
            b = 0;
          } else if (lifeRatio > 0.3) {
            r = 255;
            g = Math.floor(50 + 50 * (lifeRatio - 0.3) / 0.4);
            b = 0;
          } else {
            r = Math.floor(255 * lifeRatio / 0.3);
            g = 0;
            b = 0;
          }
          
          const opacity = lifeRatio * 0.8;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  worldToScreen(worldPos, game) {
    try {
      const camPos = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);
      const fwd = forwardFromYawPitch(game.yaw, game.pitch);
      const camTarget = v3add(camPos, fwd);

      const view = mat4Identity();
      mat4LookAt(view, camPos, camTarget, v3(0, 1, 0));

      const aspect = glsys.width / Math.max(1, glsys.height);
      const proj = mat4Identity();
      const fovDeg = 70 / (game.scope.active ? game.scope.zoomLevel : 1);
      mat4Perspective(proj, (fovDeg * Math.PI) / 180, aspect, 0.05, 120);

      const viewPos = mat4TransformPoint(view, worldPos);
      if (viewPos.z > -0.05) return null;

      const clipPos = mat4TransformPoint(proj, viewPos);
      const screenX = (clipPos.x + 1) / 2 * canvas.width;
      const screenY = (1 - clipPos.y) / 2 * canvas.height;

      if (screenX < -100 || screenX > canvas.width + 100 || 
          screenY < -100 || screenY > canvas.height + 100) {
        return null;
      }

      return { x: screenX, y: screenY };
    } catch (error) {
      return null;
    }
  }

  clear() {
    this.flyingGrenades = [];
    this.smokeSystems = [];
    this.fireSystems = [];
  }
}

// 全局投掷物管理器
const grenadeManager = new GrenadeManager();

const WEAPON_DEFS = [
  {
    id: 'knife',
    name: 'Knife',
    category: 'melee',
    slot: 'melee',
    kind: 4,
    auto: false,
    damage: 50,
    spreadDeg: 0,
    spreadMultiplier: 1.0,
    recoil: 0,
    accuracy: 100,
    magSize: 999,
    reserveMax: 999,
    reloadSec: 0,
    speed: 7.5,
    tip: '近战武器',
  },
  {
    id: 'glock',
    name: 'Glock',
    category: 'pistol',
    slot: 'secondary',
    kind: 0,
    auto: false,
    price: 200,
    rpm: 430,
    damage: 25,
    spreadDeg: 2.1,
    spreadMultiplier: 1.0,
    recoil: 0.75,
    accuracy: 74,
    magSize: 20,
    reserveMax: 120,
    reloadSec: 1.6,
    speed: 6.5,
    tip: '高射速近距手枪',
  },
  {
    id: 'usp',
    name: 'USP-S',
    category: 'pistol',
    slot: 'secondary',
    kind: 0,
    auto: false,
    price: 200,
    rpm: 360,
    damage: 30,
    spreadDeg: 1.6,
    spreadMultiplier: 1.0,
    recoil: 0.68,
    accuracy: 83,
    magSize: 12,
    reserveMax: 48,
    reloadSec: 1.7,
    speed: 6.5,
    tip: '稳定精准点射',
  },
  {
    id: 'deagle',
    name: 'Desert Eagle',
    category: 'pistol',
    slot: 'secondary',
    kind: 0,
    auto: false,
    price: 700,
    rpm: 230,
    damage: 55,
    spreadDeg: 1.2,
    spreadMultiplier: 1.1,
    recoil: 1.35,
    accuracy: 79,
    magSize: 7,
    reserveMax: 35,
    reloadSec: 2.2,
    speed: 6.5,
    tip: '高伤害重手枪',
  },
  {
    id: 'ak47',
    name: 'AK-47',
    category: 'rifle',
    slot: 'primary',
    kind: 1,
    auto: true,
    price: 2700,
    rpm: 600,
    damage: 36,
    spreadDeg: 2.6,
    spreadMultiplier: 1.2,
    recoil: 1.05,
    accuracy: 72,
    magSize: 30,
    reserveMax: 90,
    reloadSec: 2.5,
    speed: 5.0,
    tip: '高威力全自动步枪',
  },
  {
    id: 'm4a1s',
    name: 'M4A1-S',
    category: 'rifle',
    slot: 'primary',
    kind: 1,
    auto: true,
    price: 2900,
    rpm: 640,
    damage: 32,
    spreadDeg: 2.2,
    spreadMultiplier: 1.0,
    recoil: 0.92,
    accuracy: 78,
    magSize: 25,
    reserveMax: 75,
    reloadSec: 2.3,
    speed: 5.0,
    tip: '稳定可控中远距离',
  },
  {
    id: 'famas',
    name: 'FAMAS',
    category: 'rifle',
    slot: 'primary',
    kind: 1,
    auto: true,
    price: 2050,
    rpm: 670,
    damage: 30,
    spreadDeg: 2.4,
    spreadMultiplier: 1.1,
    recoil: 0.96,
    accuracy: 75,
    magSize: 25,
    reserveMax: 75,
    reloadSec: 2.1,
    speed: 5.0,
    tip: '经济型全自动步枪',
  },
  {
    id: 'mp5',
    name: 'MP5',
    category: 'smg',
    slot: 'primary',
    kind: 2,
    auto: true,
    price: 1500,
    rpm: 760,
    damage: 26,
    spreadDeg: 2.8,
    spreadMultiplier: 0.9,
    recoil: 0.88,
    accuracy: 68,
    magSize: 30,
    reserveMax: 120,
    reloadSec: 2.0,
    speed: 5.5,
    tip: '高机动冲锋枪',
  },
  {
    id: 'p90',
    name: 'P90',
    category: 'smg',
    slot: 'primary',
    kind: 2,
    auto: true,
    price: 2450, // 2350→2450 平衡性微调：P90 弹匣大射速快，上调价格
    rpm: 880,
    damage: 22,
    spreadDeg: 3.4,
    spreadMultiplier: 0.9,
    recoil: 0.82,
    accuracy: 63,
    magSize: 50,
    reserveMax: 100,
    reloadSec: 2.9,
    speed: 5.5,
    tip: '超高射速大弹匣',
  },
  {
    id: 'awp',
    name: 'AWP',
    category: 'sniper',
    slot: 'primary',
    kind: 3,
    auto: false,
    price: 4750,
    rpm: 52,
    damage: 115,
    spreadDeg: 0.28,
    spreadMultiplier: 2.5,
    recoil: 1.6,
    accuracy: 96,
    magSize: 10,
    reserveMax: 30,
    reloadSec: 3.0,
    speed: 4.5,
    tip: '高伤害狙击步枪',
    zoomLevel: 4, // 4倍镜
  },
  {
    id: 'scout',
    name: 'Scout',
    category: 'sniper',
    slot: 'primary',
    kind: 3,
    auto: false,
    price: 1800, // 1700→1800 平衡性微调：Scout 性价比过高，上调价格
    rpm: 78,
    damage: 75,
    spreadDeg: 0.42,
    spreadMultiplier: 2.0,
    recoil: 1.2,
    accuracy: 90,
    magSize: 10,
    reserveMax: 60,
    reloadSec: 2.8,
    speed: 4.5,
    tip: '轻型高机动狙击枪',
    zoomLevel: 2, // 2倍镜
  },
];

const WEAPON_DEF_BY_ID = new Map(WEAPON_DEFS.map((def) => [def.id, def]));

const EQUIPMENT_DEFS = {
  flash: {
    id: 'flash',
    name: '闪光弹',
    category: 'gear',
    price: 200,
    desc: '致盲干扰',
  },
  smoke: {
    id: 'smoke',
    name: '烟雾弹',
    category: 'gear',
    price: 300,
    desc: '烟雾遮挡',
  },
  molotov: {
    id: 'molotov',
    name: '燃烧弹',
    category: 'gear',
    price: 400,
    desc: '持续伤害',
  },
  armor: {
    id: 'armor',
    name: '防弹衣',
    category: 'gear',
    price: 650,
    desc: '护甲提升',
  },
};

const SHOP_CATEGORIES = [
  { id: 'pistol', label: '手枪' },
  { id: 'rifle', label: '步枪' },
  { id: 'smg', label: '冲锋枪' },
  { id: 'sniper', label: '狙击枪' },
  { id: 'gear', label: '装备' },
];

const SHOP_ITEMS = [
  { keyCode: 'Digit1', keyLabel: '1', type: 'weapon', id: 'glock' },
  { keyCode: 'Digit2', keyLabel: '2', type: 'weapon', id: 'usp' },
  { keyCode: 'Digit3', keyLabel: '3', type: 'weapon', id: 'deagle' },
  { keyCode: 'Digit4', keyLabel: '4', type: 'weapon', id: 'ak47' },
  { keyCode: 'Digit5', keyLabel: '5', type: 'weapon', id: 'm4a1s' },
  { keyCode: 'Digit6', keyLabel: '6', type: 'weapon', id: 'famas' },
  { keyCode: 'Digit7', keyLabel: '7', type: 'weapon', id: 'mp5' },
  { keyCode: 'Digit8', keyLabel: '8', type: 'weapon', id: 'p90' },
  { keyCode: 'Digit9', keyLabel: '9', type: 'weapon', id: 'awp' },
  { keyCode: 'Digit0', keyLabel: '0', type: 'weapon', id: 'scout' },
  { keyCode: 'KeyQ', keyLabel: 'Q', type: 'equip', id: 'flash' },
  { keyCode: 'KeyW', keyLabel: 'W', type: 'equip', id: 'smoke' },
  { keyCode: 'KeyE', keyLabel: 'E', type: 'equip', id: 'armor' },
  { keyCode: 'KeyR', keyLabel: 'R', type: 'equip', id: 'molotov' },
];

const SHOP_ITEM_BY_KEY = new Map(SHOP_ITEMS.map((item) => [item.keyCode, item]));

class WeaponState {
  constructor(def) {
    this.def = def;
    this.mag = def.magSize;
    this.reserve = def.reserveMax;
    this.cooldown = 0;
    this.reloading = false;
    this.reloadLeft = 0;
    this.reloadTotal = def.reloadSec;
    this.kick = 0;
    this.shot = 0;
    this.flash = 0;
    this.silencerOn = false; // 手枪消音器状态
  }
}

class Game {
  constructor() {
    this.pointerLocked = false;
    this.yaw = 0;
    this.pitch = 0;
    this.pos = v3(0, 1.1, 10);
    this.vel = v3(0, 0, 0);
    this.onGround = false;
    this.hp = 100;
    this.armor = 0;
    this.keys = new Set();
    this.mouseDown = false;
    this.firePressed = false;
    this.isAiming = false;
    this.scope = {
      active: false,
      zoomLevel: 1,
      targetZoom: 1,
      transitioning: false,
    };
    this.fireModeAuto = true; // 玩家可切换的开火模式
    /** @type {'flash' | 'smoke' | 'none'} */
    this.currentEquip = 'none';
    this.currentEquip = 'none';
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.weaponIndex = 0;
    this.weapons = [];
    this.currentEquip = 'none';
    this.weaponSlots = { primary: '', secondary: '', melee: '' };
    this.boxes = [];
    this.colliders = [];
    this.collisionQuadtree = new AabbQuadtree(COLLISION_QUADTREE_BOUNDS, 6, 8);
    this.grid = Array.from({ length: NAV_GRID_SIZE }, () => Array(NAV_GRID_SIZE).fill(0));
    this.targets = [];
    this.bots = [];
    this.aliveBotsCache = [];
    this.aliveBotsCacheDirty = true;
    this.shells = [];
    this.tracers = [];
    // 对象池（减少GC压力）
    this.shellPool = [];
    this.tracerPool = [];
    this.hitmarker = { t: 0, head: false };
    this.buyMenuOpen = false;
    this.buyNotice = '';
    this.buyNoticeUrgent = false;
    this.crosshairGap = 9;
    this.crouchT = 0;
    this.landKick = 0;
    this.mode = 'lobby';
    this.uiScreen = 'lobby';
    this.team = 'ct';
    this.difficulty = 'normal';
    this.botCount = 5;
    this.matchMode = 'bomb';
    this.score = { ct: 0, t: 0, limit: 25 };
    this.ending = false;
    this.stats = { kills: 0, deaths: 0 };
    this.playerAlive = true;
    this.econ = {
      money: 800,
      maxMoney: 16000,
      initialMoney: 800,
      rewardKill: 300,
      rewardWin: 3250,
      rewardLose: 1900,
    };
    this.mapBounds = 27.5;
    // Spawn zones moved away from buildings to avoid collision
    // CT building at (-20, -10) has x range -22.5 to -17.5, keep spawns at x <= -24
    // T building at (20, 10) has x range 17.5 to 22.5, keep spawns at x >= 24
    this.spawnZones = {
      ct: [
        v3(-25, 0.0, -20), v3(-25, 0.0, -14), v3(-25, 0.0, -8), v3(-25, 0.0, -2),
        v3(-24, 0.0, -17), v3(-24, 0.0, -11), v3(-24, 0.0, -5),
      ],
      t: [
        v3(25, 0.0, 20), v3(25, 0.0, 14), v3(25, 0.0, 8), v3(25, 0.0, 2),
        v3(24, 0.0, 17), v3(24, 0.0, 11), v3(24, 0.0, 5),
      ],
    };
    this.routeNodes = {
      ct: [v3(-23, 0, -17), v3(-16, 0, -17), v3(-9, 0, -17), v3(-1, 0, -17), v3(8, 0, -17), v3(17, 0, -17), v3(-21, 0, -8), v3(-13, 0, -8), v3(-5, 0, -8), v3(3, 0, -8), v3(11, 0, -8), v3(18, 0, -8), v3(-19, 0, 4), v3(-11, 0, 4), v3(-3, 0, 4), v3(5, 0, 4), v3(12, 0, 4), v3(19, 0, 4), v3(-18, 0, 14), v3(-10, 0, 14), v3(-2, 0, 14), v3(6, 0, 14), v3(14, 0, 14), v3(21, 0, 14)],
      t: [v3(23, 0, 17), v3(16, 0, 17), v3(9, 0, 17), v3(1, 0, 17), v3(-8, 0, 17), v3(-17, 0, 17), v3(21, 0, 8), v3(13, 0, 8), v3(5, 0, 8), v3(-3, 0, 8), v3(-11, 0, 8), v3(-18, 0, 8), v3(19, 0, -4), v3(11, 0, -4), v3(3, 0, -4), v3(-5, 0, -4), v3(-12, 0, -4), v3(-19, 0, -4), v3(18, 0, -14), v3(10, 0, -14), v3(2, 0, -14), v3(-6, 0, -14), v3(-14, 0, -14), v3(-21, 0, -14)],
    };
    // 投掷物系统
    this.grenades = {
      // 闪光弹
      flash: {
        cooldown: 0,
        cooldownTotal: 14,
        charges: 0,
        maxCharges: 2,
        active: [], // 飞行中的闪光弹
      },
      // 烟雾弹
      smoke: {
        cooldown: 0,
        cooldownTotal: 16,
        duration: 15, // 15秒持续时间
        charges: 0,
        maxCharges: 2,
        active: [], // 已部署的烟雾
        flying: [], // 飞行中的烟雾弹
        chokePoints: [
          { id: 'upperMid', pos: v3(2, 0.9, -10), scale: v3(3.0, 1.8, 3.4) },
          { id: 'midCross', pos: v3(2, 0.9, 0), scale: v3(3.0, 1.8, 3.4) },
          { id: 'lowerMid', pos: v3(2, 0.9, 10), scale: v3(3.0, 1.8, 3.4) },
          { id: 'AEntry', pos: v3(12, 0.9, -14), scale: v3(3.0, 1.8, 3.4) },
          { id: 'BEntry', pos: v3(12, 0.9, 14), scale: v3(3.0, 1.8, 3.4) },
        ],
      },
      // 燃烧弹
      molotov: {
        cooldown: 0,
        cooldownTotal: 18,
        duration: 7, // 7秒持续时间
        damagePerSecond: 8, // 每秒伤害
        charges: 0,
        maxCharges: 1,
        active: [], // 已部署的火焰区域
        flying: [], // 飞行中的燃烧弹
      },
    };
    // 兼容旧代码的别名
    this.smoke = this.grenades.smoke;
    this.flashbang = this.grenades.flash;
    // 闪光效果状态
    this.flashEffect = {
      active: false,
      intensity: 0,
      duration: 2.5, // 致盲持续时间
      timer: 0,
    };
    this.round = {
      state: 'idle',
      tPlanting: false,
      ctDefusing: false,
      progress: 0,
      plantLeft: 0,
      defuseLeft: 0,
      bombPlanted: false,
      bombTimer: 0,
      bombTotal: 35,
      roundTotal: 95,
      roundLeft: 95,
      freezeTotal: 8,
      freezeLeft: 8,
      postTotal: 4,
      postLeft: 0,
      bombPos: v3(16, 0.05, -14),
      sitePos: v3(16, 0.05, -14),
      siteRadius: 2.8,
      sites: [
        { key: 'A', pos: v3(16, 0.05, -14), radius: 2.8 },
        { key: 'B', pos: v3(16, 0.05, 14), radius: 2.8 },
      ],
      activeSite: '',
      plantSite: '',
      winner: '',
      reason: '',
      roundNum: 0,
    };
    this.showingSettingsFrom = 'lobby';
    this.lastStatusAt = 0;
  }

  getWeapon() {
    if (this.weapons.length === 0) return null;
    this.weaponIndex = clamp(this.weaponIndex, 0, this.weapons.length - 1);
    return this.weapons[this.weaponIndex];
  }

  /**
   * @param {'flash' | 'smoke' | 'none'} type
   */
  switchEquip(type) {
    if (type !== 'flash' && type !== 'smoke' && type !== 'none') return;
    this.currentEquip = type;
  }

  switchWeapon(i) {
    this.currentEquip = 'none';
    if (this.weapons.length <= 0) return;
    this.weaponIndex = clamp(i, 0, this.weapons.length - 1);
    const w = this.getWeapon();
    if (!w) return;
    updateWeaponHUD(w);
  }

  switchWeaponBySlot(slot) {
    for (let i = 0; i < this.weapons.length; i++) {
      if (this.weapons[i].def.slot === slot) {
        this.switchWeapon(i);
        return;
      }
    }
  }

  cycleWeapon(step = 1) {
    if (this.weapons.length <= 1) return;
    const len = this.weapons.length;
    let next = (this.weaponIndex + step) % len;
    if (next < 0) next += len;
    this.switchWeapon(next);
  }

  switchEquip(equipId) {
    if (equipId !== 'flash' && equipId !== 'smoke' && equipId !== 'molotov' && equipId !== 'none') return;
    this.currentEquip = equipId;
    // 切换投掷物时清空射击输入，避免误开火
    this.mouseDown = false;
    this.firePressed = false;
  }

  /**
   * 检测移动状态
   * @returns {'standing' | 'walking' | 'running' | 'jumping'}
   * 
   * 移动状态用于计算跑射散布：
   * - standing（静止）：散布倍率 1.0（基准精度）
   * - walking（走路）：散布倍率 1.3（精度下降 30%）
   * - running（跑步）：散布倍率 1.6（精度下降 60%）
   * - jumping（跳跃）：散布倍率 2.0（精度下降 100%，即散布翻倍）
   */
  getMovementState() {
    // 如果在空中，返回跳跃状态
    if (!this.onGround) return 'jumping';
    
    // 计算水平速度
    const speed = Math.sqrt(this.vel.x ** 2 + this.vel.z ** 2);
    
    // 根据速度判断移动状态
    // 跑步速度阈值：6.0 单位/秒
    // 走路速度阈值：2.0 单位/秒
    if (speed > 6.0) return 'running';
    if (speed > 2.0) return 'walking';
    return 'standing';
  }

  /**
   * 计算最终散布
   * @returns {number} 散布角度（度数）
   */
  calculateSpread() {
    const w = this.getWeapon();
    if (!w) return 0;
    
    // 获取基础散布
    const baseSpread = w.def.spreadDeg || 2.0;
    
    // 获取移动状态
    const movementState = this.getMovementState();
    
    // 移动散布倍率
    const MOVEMENT_SPREAD_MULTIPLIERS = {
      standing: 1.0,
      walking: 1.3,
      running: 1.6,
      jumping: 2.0
    };
    const movementMultiplier = MOVEMENT_SPREAD_MULTIPLIERS[movementState] || 1.0;
    
    // 武器散布倍率（如果武器定义中没有，默认为 1.0）
    const weaponMultiplier = w.def.spreadMultiplier || 1.0;
    
    // 计算最终散布
    return baseSpread * movementMultiplier * weaponMultiplier;
  }

  buildMap() {
    this.boxes.length = 0;
    this.colliders.length = 0;
    this.targets.length = 0;
    this.bots.length = 0;

    // 增强颜色对比度，提高视觉层次感 - 更鲜明的配色方案
    const groundBaseColor = v3(0.48, 0.38, 0.28);  // 棕色基础地面（更有质感）
    const groundCenterColor = v3(0.50, 0.55, 0.62);  // 中间通道（冷色调，灰蓝色）
    const groundNorthColor = v3(0.62, 0.46, 0.32);  // 北区（暖色调，棕色）
    const groundSouthColor = v3(0.40, 0.55, 0.40);  // 南区（绿色调，草地）
    const perimeterWallColor = v3(0.42, 0.52, 0.68);  // 周边墙（蓝色调）
    const structureWallColor = v3(0.68, 0.58, 0.44);  // 结构墙（浅棕色）
    const coverColor = v3(0.38, 0.60, 0.42);  // 掩体（深绿色）
    const buildingColor = v3(0.82, 0.55, 0.36);  // 建筑（橙棕色）
    const buildingHighlightColor = v3(0.92, 0.66, 0.45);  // 建筑高光面

    this.boxes.push(makeBox(v3(0, -0.5, 0), v3(56, 1, 56), groundBaseColor, true));
    this.boxes.push(makeBox(v3(0, 0.02, 0), v3(22, 0.04, 56), groundCenterColor, false));
    this.boxes.push(makeBox(v3(0, 0.02, -17), v3(56, 0.04, 18), groundNorthColor, false));
    this.boxes.push(makeBox(v3(0, 0.02, 17), v3(56, 0.04, 18), groundSouthColor, false));
    this.boxes.push(makeBox(v3(0, 2, -28), v3(56, 6, 1), perimeterWallColor, true));
    this.boxes.push(makeBox(v3(0, 2, 28), v3(56, 6, 1), perimeterWallColor, true));
    this.boxes.push(makeBox(v3(-28, 2, 0), v3(1, 6, 56), perimeterWallColor, true));
    this.boxes.push(makeBox(v3(28, 2, 0), v3(1, 6, 56), perimeterWallColor, true));

    // 主要建筑物（增强光照效果）
    this.boxes.push(makeBox(v3(-20, 1.6, -10), v3(5.0, 3.2, 18), buildingColor, true));
    this.boxes.push(makeBox(v3(20, 1.6, 10), v3(5.0, 3.2, 18), buildingColor, true));

    // 建筑物高光面（模拟受光面）
    this.boxes.push(makeBox(v3(-17.4, 1.6, -10), v3(0.1, 3.0, 16), buildingHighlightColor, false));
    this.boxes.push(makeBox(v3(17.4, 1.6, 10), v3(0.1, 3.0, 16), buildingHighlightColor, false));

    this.boxes.push(makeBox(v3(-4, 1.5, -20), v3(8, 3, 2.2), structureWallColor, true));
    this.boxes.push(makeBox(v3(8, 1.5, -20), v3(6, 3, 2.2), structureWallColor, true));
    this.boxes.push(makeBox(v3(3, 1.5, -14), v3(2.2, 3, 8), structureWallColor, true));
    this.boxes.push(makeBox(v3(11, 1.5, -12), v3(2.2, 3, 6), structureWallColor, true));

    this.boxes.push(makeBox(v3(-6, 1.4, -10), v3(4.5, 2.8, 3), coverColor, true));
    this.boxes.push(makeBox(v3(10, 1.0, -16), v3(4, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(15.5, 1.0, -9), v3(3, 2, 4), coverColor, true));

    this.boxes.push(makeBox(v3(-3.5, 1.5, 0), v3(7, 3, 2.2), structureWallColor, true));
    this.boxes.push(makeBox(v3(8, 1.5, 0), v3(6, 3, 2.2), structureWallColor, true));
    this.boxes.push(makeBox(v3(2.2, 1.5, 6.5), v3(2.2, 3, 6), structureWallColor, true));
    this.boxes.push(makeBox(v3(9.8, 1.5, -6.5), v3(2.2, 3, 6), structureWallColor, true));

    this.boxes.push(makeBox(v3(-10, 1.0, 0), v3(4.8, 2, 3.2), coverColor, true));
    this.boxes.push(makeBox(v3(14, 1.0, 0), v3(3.2, 2, 3.2), coverColor, true));

    this.boxes.push(makeBox(v3(-5, 1.5, 20), v3(7, 3, 2.2), structureWallColor, true));
    this.boxes.push(makeBox(v3(7.5, 1.5, 20), v3(6.5, 3, 2.2), structureWallColor, true));
    this.boxes.push(makeBox(v3(3, 1.5, 14), v3(2.2, 3, 8), structureWallColor, true));
    this.boxes.push(makeBox(v3(11, 1.5, 12), v3(2.2, 3, 6), structureWallColor, true));

    this.boxes.push(makeBox(v3(-7, 1.0, 10), v3(4.5, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(10, 1.0, 16), v3(4, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(15.5, 1.0, 9), v3(3, 2, 4), coverColor, true));

    this.boxes.push(makeBox(v3(-16.5, 1.0, -14), v3(3, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(-16.5, 1.0, -4), v3(3, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(16.5, 1.0, 14), v3(3, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(16.5, 1.0, 4), v3(3, 2, 3), coverColor, true));

    this.boxes.push(makeBox(v3(16, 0.25, -14), v3(2.2, 0.5, 2.2), v3(0.22, 0.45, 0.86), false));
    this.boxes.push(makeBox(v3(16, 0.25, 14), v3(2.2, 0.5, 2.2), v3(0.86, 0.42, 0.18), false));

    rebuildGameplayColliders();

    const siteA = v3(16, 0.05, -14);
    const siteB = v3(16, 0.05, 14);
    this.round.sites = [
      { key: 'A', pos: siteA, radius: 2.8 },
      { key: 'B', pos: siteB, radius: 2.8 },
    ];
    this.round.sitePos = v3(siteA.x, siteA.y, siteA.z);
    this.round.siteRadius = 2.8;
    this.round.activeSite = '';
    this.round.plantSite = '';
    this.round.bombPos = v3(siteA.x, siteA.y, siteA.z);
  }
}

// 旧的 Minimap 类已被 Radar 系统取代
// 参见 radar.js

// ========== 性能优化：脏标记系统和缓存 ==========
// HUD脏标记：只在数据变化时更新DOM
const hudDirtyFlags = {
  health: true,
  armor: true,
  ammo: true,
  money: true,
  weapon: true,
  objective: true,
  crosshair: true,
  aliveCount: true
};

// HUD上一次的值，用于比较变化
const lastHudValues = {
  hp: -1,
  armor: -1,
  money: -1,
  ammoMag: -1,
  ammoReserve: -1,
  ctAlive: -1,
  tAlive: -1
};

// 标记HUD需要更新
function markHudDirty(flag) {
  if (flag) hudDirtyFlags[flag] = true;
  else Object.keys(hudDirtyFlags).forEach(k => hudDirtyFlags[k] = true);
}

// ========== 性能监控系统 ==========
const gamePerformance = {
  // FPS 计算
  fps: 0,
  frameTime: 0,
  lastTime: performance.now(),
  frameCount: 0,
  fpsUpdateInterval: 500, // 500ms 更新一次
  lastFpsUpdate: performance.now(),

  // 帧时间统计
  minFrameTime: Infinity,
  maxFrameTime: 0,
  avgFrameTime: 0,
  frameTimeHistory: [],

  // 游戏循环各阶段耗时
  stages: {
    input: 0,
    physics: 0,
    ai: 0,
    render: 0,
    network: 0
  },

  // 更新方法
  beginFrame() {
    this.frameStart = performance.now();
  },

  endFrame() {
    const now = performance.now();
    this.frameTime = now - this.frameStart;
    this.frameCount++;

    // 更新 FPS
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    // 统计帧时间
    this.frameTimeHistory.push(this.frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    this.minFrameTime = Math.min(...this.frameTimeHistory);
    this.maxFrameTime = Math.max(...this.frameTimeHistory);
    this.avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
  },

  stageStart(stage) {
    this.stages[stage] = performance.now();
  },

  stageEnd(stage) {
    this.stages[stage] = performance.now() - this.stages[stage];
  }
};

// 向量计算缓存（LRU策略）
const vectorCache = new Map();
const VECTOR_CACHE_MAX_SIZE = 500;

function cachedV3Norm(v) {
  const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
  if (vectorCache.has(key)) {
    return vectorCache.get(key);
  }
  const result = v3norm(v);
  vectorCache.set(key, result);
  
  // LRU：超过限制时删除最旧的
  if (vectorCache.size > VECTOR_CACHE_MAX_SIZE) {
    const firstKey = vectorCache.keys().next().value;
    vectorCache.delete(firstKey);
  }
  
  return result;
}

// 更新函数节流控制
let lastBotUpdateTime = 0;
let lastTargetUpdateTime = 0;
const BOT_UPDATE_INTERVAL = 16; // 16ms (约60fps)
const TARGET_UPDATE_INTERVAL = 8; // 8ms (更高频率)

// Web Worker for Bot AI
let botWorker = null;
let botWorkerReady = false;
let pendingBotUpdate = false;
let workerPerformanceMonitor = {
  workerTime: 0,
  mainThreadTime: 0,
  frameCount: 0
};

// 初始化 Bot Worker
function initBotWorker() {
  try {
    botWorker = new Worker('bot-worker.js');
    
    botWorker.onmessage = function(e) {
      const { type, data, workerTime } = e.data;
      
      if (type === 'result') {
        // 应用 Worker 返回的结果
        applyBotUpdateResults(data);
        
        // 性能监控
        workerPerformanceMonitor.workerTime = workerTime;
        workerPerformanceMonitor.frameCount++;
        
        pendingBotUpdate = false;
      }
    };
    
    botWorker.onerror = function(error) {
      console.error('Bot Worker 错误:', error);
      botWorkerReady = false;
      // Worker 失败，回退到主线程
      console.warn('回退到主线程 Bot AI');
    };
    
    botWorkerReady = true;
    console.log('Bot Worker 初始化成功');
  } catch (error) {
    console.error('Bot Worker 初始化失败:', error);
    botWorkerReady = false;
  }
}

// 应用 Worker 返回的结果
function applyBotUpdateResults(result) {
  const { bots, events } = result;
  
  // 更新性能监控显示
  const workerPerfEl = document.getElementById('workerPerf');
  if (workerPerfEl) {
    workerPerfEl.style.display = 'block';
    workerPerfEl.textContent = `FPS: ${gamePerformance.fps} | Frame: ${gamePerformance.avgFrameTime.toFixed(1)}ms (${gamePerformance.minFrameTime.toFixed(1)}/${gamePerformance.maxFrameTime.toFixed(1)}) | Worker: ${workerPerformanceMonitor.workerTime.toFixed(2)}ms | 主线程: ${workerPerformanceMonitor.mainThreadTime.toFixed(2)}ms`;
  }
  
  // 更新 bot 状态
  for (const updatedBot of bots) {
    const originalBot = game.bots.find(b => b.id === updatedBot.id);
    if (originalBot) {
      // 只更新可变状态
      originalBot.pos = updatedBot.pos;
      originalBot.vel = updatedBot.vel;
      originalBot.yaw = updatedBot.yaw;
      originalBot.state = updatedBot.state;
      originalBot.shootCooldown = updatedBot.shootCooldown;
      originalBot.weapon = updatedBot.weapon;
      originalBot.navPath = updatedBot.navPath;
      originalBot.navIndex = updatedBot.navIndex;
      originalBot.navGoal = updatedBot.navGoal;
      originalBot.firstSawEnemyTime = updatedBot.firstSawEnemyTime;
      originalBot.objectiveSite = updatedBot.objectiveSite;
      originalBot.patrolNode = updatedBot.patrolNode;
      originalBot.alive = updatedBot.alive;
      originalBot.hp = updatedBot.hp;
    }
  }
  
  // 处理事件
  for (const event of events) {
    switch (event.type) {
      case 'shoot':
        // 在主线程创建曳光弹
        const botTracer = obtainTracer();
        botTracer.a = event.muzzle;
        botTracer.b = event.end;
        botTracer.travel = 0;
        botTracer.speed = 95;
        botTracer.life = 0.32;
        botTracer.hue = event.hue;
        game.tracers.push(botTracer);
        break;
        
      case 'damagePlayer':
        // 处理玩家伤害
        if (game.team === game.bots.find(b => b.id === event.botId)?.team) {
          break; // 友军伤害
        }
        const botDamage = event.damage;
        let actualDamage = botDamage;
        const hasArmor = game.armor > 0;
        if (hasArmor && botDamage > 0) {
          const armorAbsorb = Math.min(game.armor, botDamage * 0.3);
          actualDamage = botDamage - armorAbsorb;
          game.armor = Math.max(0, game.armor - armorAbsorb * 0.5);
        }
        game.hp -= actualDamage;
        if (game.hp <= 0) {
          if (game.mode === 'online') {
            handleLocalPlayerDeath('You died');
          } else {
            game.playerAlive = false;
            game.hp = 0;
            game.vel = v3(0, 0, 0);
            setStatus('You died', true);
            game.stats.deaths += 1;
          }
        } else {
          setStatus('Hit by bot', true);
        }
        break;
        
      case 'botDied':
        // 更新缓存标记
        game.aliveBotsCacheDirty = true;
        break;
        
      case 'setActiveSite':
        if (!game.round.activeSite) {
          game.round.activeSite = event.siteKey;
        }
        break;
        
      case 'setRoundSite':
        setRoundSite(event.site);
        break;
        
      case 'tPlanting':
        game.round.tPlanting = event.value;
        break;
        
      case 'ctDefusing':
        game.round.ctDefusing = event.value;
        break;
    }
  }
}

const game = new Game();
const radar = new Radar(hud, game);
ensureRadarActive();
resetPlayerLoadout();

// 初始化 Bot Worker
initBotWorker();

// Spectator mode initialization
const spectatorManager = new SpectatorManager(game, null);
const spectatorUI = new SpectatorUI();
spectatorUI.init();

// Spectator mode callbacks
spectatorManager.onEnabled = () => {
  spectatorUI.show();
};

spectatorManager.onDisabled = () => {
  spectatorUI.hide();
};

spectatorManager.onModeChange = (oldMode, newMode) => {
  const modeNames = {
    [SPECTATOR_MODE.FIRST_PERSON]: '第一人称',
    [SPECTATOR_MODE.THIRD_PERSON]: '第三人称',
    [SPECTATOR_MODE.FREE_CAMERA]: '自由视角'
  };
  setStatus(`视角: ${modeNames[newMode] || newMode}`, false);
};

spectatorManager.onTargetChange = (targetId) => {
  const targetInfo = spectatorManager.getTargetInfo();
  if (targetInfo) {
    setStatus(`观战: ${targetInfo.name}`, false);
  }
};

// Multiplayer state
const multiplayer = new MultiplayerClient();
let multiplayerHUD = null;
let otherPlayers = new Map(); // Store other players' data
let floatingDamageNumbers = []
let onlineRespawnTimer = null

const ONLINE_RESPAWN_DELAY_MS = 3000
const REMOTE_FALL_ANIM_MS = 1000
const remoteDeathAnimHandles = new Map()

function safeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function readSyncedHp(data, fallback = 100) {
  if (!data) return fallback
  if (typeof data.hp === 'number') return clamp(data.hp, 0, 100)
  if (typeof data.health === 'number') return clamp(data.health, 0, 100)
  return fallback
}

function normalizeAnimDurationMs(value) {
  return Math.max(1, safeNumber(value, REMOTE_FALL_ANIM_MS))
}

function toPerformanceTimestamp(timestampMs, fallback = nowMs()) {
  const raw = safeNumber(timestampMs, NaN)
  if (!Number.isFinite(raw) || raw <= 0) return fallback

  let perfStamp = raw
  if (raw > 1e11 && Number.isFinite(performance.timeOrigin)) {
    perfStamp = raw - performance.timeOrigin
  }

  if (!Number.isFinite(perfStamp)) return fallback
  return Math.max(0, Math.min(nowMs(), perfStamp))
}

function clearRemoteDeathAnimation(playerId) {
  const rafId = remoteDeathAnimHandles.get(playerId)
  if (typeof rafId === 'number') {
    cancelAnimationFrame(rafId)
  }
  remoteDeathAnimHandles.delete(playerId)
}

function clearAllRemoteDeathAnimations() {
  for (const playerId of remoteDeathAnimHandles.keys()) {
    clearRemoteDeathAnimation(playerId)
  }
}

function tickRemoteDeathAnimation(playerId) {
  const playerData = otherPlayers.get(playerId)
  if (!playerData) {
    clearRemoteDeathAnimation(playerId)
    return
  }

  const deathAt = toPerformanceTimestamp(playerData.deathAt, nowMs())
  const animDuration = normalizeAnimDurationMs(playerData.animDuration)
  const elapsed = Math.max(0, nowMs() - deathAt)
  playerData.fallT = Math.min(1, elapsed / animDuration)

  if (playerData.fallT >= 1) {
    playerData.fallT = 1
    playerData.deathHidden = true
    clearRemoteDeathAnimation(playerId)
    removeHealthBar(playerId)
    return
  }

  const rafId = requestAnimationFrame(() => {
    tickRemoteDeathAnimation(playerId)
  })
  remoteDeathAnimHandles.set(playerId, rafId)
}

function startRemoteDeathAnimation(playerId, playerData, deathData = {}) {
  if (!playerId || !playerData) return

  const deathAt = toPerformanceTimestamp(
    deathData.deathTime ?? deathData.deathAt ?? playerData.deathAt,
    nowMs()
  )
  const animDuration = normalizeAnimDurationMs(
    deathData.animDuration ?? playerData.animDuration
  )
  const sameDeathStamp = Math.abs(safeNumber(playerData.deathAt, 0) - deathAt) < 0.5
  const hasActiveAnim = remoteDeathAnimHandles.has(playerId)
  const alreadyAnimating =
    hasActiveAnim &&
    playerData.alive === false &&
    playerData.deathHidden !== true &&
    safeNumber(playerData.fallT, 0) < 1 &&
    sameDeathStamp
  const alreadyHidden = playerData.alive === false && playerData.deathHidden === true && sameDeathStamp

  if (alreadyAnimating || alreadyHidden) return

  playerData.alive = false
  playerData.hp = 0
  playerData.deathAt = deathAt
  playerData.animDuration = animDuration
  playerData.fallT = 0
  playerData.deathHidden = false

  clearRemoteDeathAnimation(playerId)
  console.log('[SFX] Death sound played for player', playerId)
  tickRemoteDeathAnimation(playerId)
}

function spawnDamageNumber(worldPos, damage, options = {}) {
  if (!worldPos) return
  const value = Math.max(0, Math.floor(safeNumber(damage, 0)))
  if (value <= 0) return

  floatingDamageNumbers.push({
    pos: v3(
      worldPos.x + (Math.random() - 0.5) * 0.35,
      worldPos.y + 1.7 + Math.random() * 0.2,
      worldPos.z + (Math.random() - 0.5) * 0.35
    ),
    value,
    crit: !!options.crit,
    life: 0.95,
    maxLife: 0.95,
    rise: 1.35 + Math.random() * 0.45,
    driftX: (Math.random() - 0.5) * 0.2,
    driftZ: (Math.random() - 0.5) * 0.2,
    color: options.color || null
  })

  if (floatingDamageNumbers.length > 80) {
    floatingDamageNumbers.splice(0, floatingDamageNumbers.length - 80)
  }
}

function spawnDamageNumberForPlayer(playerId, damage, options = {}) {
  const playerData = otherPlayers.get(playerId)
  if (!playerData || !playerData.position) return
  spawnDamageNumber(playerData.position, damage, options)
}

function updateDamageNumbers(dt) {
  for (const fx of floatingDamageNumbers) {
    fx.life -= dt
    fx.pos.y += fx.rise * dt
    fx.pos.x += fx.driftX * dt
    fx.pos.z += fx.driftZ * dt
  }
  floatingDamageNumbers = floatingDamageNumbers.filter((fx) => fx.life > 0)
}

function clearOnlineRespawnTimer() {
  if (onlineRespawnTimer) {
    clearTimeout(onlineRespawnTimer)
    onlineRespawnTimer = null
  }
}

function markRemotePlayerDead(playerId, playerData, deathData = null) {
  if (!playerData) return
  startRemoteDeathAnimation(playerId, playerData, deathData || {})
}

function markRemotePlayerRespawned(playerId, playerData, data = null) {
  if (!playerData) return
  clearRemoteDeathAnimation(playerId)
  playerData.alive = true
  playerData.deathAt = 0
  playerData.animDuration = REMOTE_FALL_ANIM_MS
  playerData.fallT = 0
  playerData.deathHidden = false
  playerData.hp = readSyncedHp(data || playerData, 100)
  if (data && data.position) {
    playerData.position = data.position
  }
}

function requestOnlineRespawnIn3s() {
  clearOnlineRespawnTimer()
  onlineRespawnTimer = setTimeout(() => {
    if (game.mode !== 'online' || !multiplayer.isConnected || game.playerAlive) return
    multiplayer.requestRespawn()
    setStatus('请求重生中...', false)
  }, ONLINE_RESPAWN_DELAY_MS)
}

function handleLocalPlayerDeath(reason = 'You died', deathData = {}) {
  if (!game.playerAlive && game.hp <= 0) return
  game.playerAlive = false
  game.hp = 0
  game.vel = v3(0, 0, 0)
  game.stats.deaths += 1
  setStatus(reason, true)
  
  // 启动观战模式
  spectatorManager.start({
    deathPosition: { ...game.pos },
    killerId: deathData.killerId || null,
    killerName: deathData.killerName || 'Unknown',
    killerTeam: deathData.killerTeam || ''
  })
  
  requestOnlineRespawnIn3s()
}

function handleDamageEvent(data) {
  if (!data) return

  const targetId = data.targetId || data.targetPlayerId || data.playerId || data.victimId
  if (!targetId) return

  const attackerId = data.attackerId || data.shooterId || data.fromPlayerId || data.sourcePlayerId
  const attackerData = attackerId ? otherPlayers.get(attackerId) : null
  const dmg = Math.max(0, Math.floor(safeNumber(data.damage ?? data.amount, 0)))
  const headshot = !!(data.headshot || data.isHeadshot || data.hitZone === 'head')
  const syncedHp = readSyncedHp(data, null)

  if (targetId === multiplayer.playerId) {
    const oldHp = game.hp
    const oldArmor = game.armor

    if (typeof syncedHp === 'number') {
      game.hp = clamp(syncedHp, 0, 100)
    } else {
      // 护甲减伤逻辑
      let actualDamage = dmg
      const hasArmor = game.armor > 0
      if (hasArmor && dmg > 0) {
        const armorAbsorb = Math.min(game.armor, dmg * 0.3)
        actualDamage = dmg - armorAbsorb
        game.armor = Math.max(0, game.armor - armorAbsorb * 0.5)
      }

      game.hp = clamp(game.hp - actualDamage, 0, 100)
    }

    if (game.hp <= 0) {
      // 传递击杀者信息
      handleLocalPlayerDeath('你已阵亡', {
        killerId: attackerId,
        killerName: attackerData?.name || attackerData?.username || 'Unknown',
        killerTeam: attackerData?.team || ''
      })
    } else if (dmg > 0) {
      const realDamage = Math.max(1, Math.round(oldHp - game.hp))
      const armorUsed = Math.max(0, Math.round(oldArmor - game.armor))
      if (armorUsed > 0) {
        setStatus(`受到伤害 -${realDamage} | 护甲 -${armorUsed}`, true)
      } else {
        setStatus(`受到伤害 -${realDamage}`, true)
      }
    }
    return
  }

  const playerData = otherPlayers.get(targetId)
  if (!playerData) return

  const oldHp = readSyncedHp(playerData, 100)
  if (typeof syncedHp === 'number') {
    playerData.hp = syncedHp
  } else {
    playerData.hp = clamp(oldHp - dmg, 0, 100)
  }

  if (playerData.hp <= 0) {
    markRemotePlayerDead(targetId, playerData, {
      deathTime: data.deathTime ?? data.deathAt,
      animDuration: data.animDuration
    })
  } else {
    clearRemoteDeathAnimation(targetId)
    playerData.alive = true
    playerData.deathAt = 0
    playerData.animDuration = REMOTE_FALL_ANIM_MS
    playerData.fallT = 0
    playerData.deathHidden = false
  }

  if (dmg > 0 && attackerId && attackerId !== multiplayer.playerId) {
    spawnDamageNumberForPlayer(targetId, dmg, { crit: headshot })
  }
}

function handleDeathEvent(data) {
  if (!data) return
  const deadId = data.playerId || data.targetId || data.targetPlayerId || data.victimId
  if (!deadId) return

  const attackerId = data.attackerId || data.shooterId || data.fromPlayerId || data.sourcePlayerId
  const attackerData = attackerId ? otherPlayers.get(attackerId) : null

  if (deadId === multiplayer.playerId) {
    handleLocalPlayerDeath('你已阵亡', {
      killerId: attackerId,
      killerName: attackerData?.name || attackerData?.username || 'Unknown',
      killerTeam: attackerData?.team || ''
    })
    return
  }

  const playerData = otherPlayers.get(deadId)
  if (!playerData) return
  markRemotePlayerDead(deadId, playerData, {
    deathTime: data.deathTime ?? data.deathAt,
    animDuration: data.animDuration
  })
}

function handleRespawnEvent(data) {
  if (!data) return
  const respawnId = data.playerId || data.targetId || data.targetPlayerId || data.victimId
  if (!respawnId) return

  if (respawnId === multiplayer.playerId) {
    clearOnlineRespawnTimer()
    game.playerAlive = true
    game.hp = readSyncedHp(data, 100)
    game.armor = typeof data.armor === 'number' ? clamp(data.armor, 0, 100) : game.armor

    // 停止观战模式
    spectatorManager.stop()

    if (data.position) {
      game.pos = v3(
        safeNumber(data.position.x, game.pos.x),
        safeNumber(data.position.y, 1.1),
        safeNumber(data.position.z, game.pos.z)
      )
    } else {
      respawnPlayer()
    }

    game.vel = v3(0, 0, 0)
    game.onGround = false
    game.crouchT = 0
    setStatus('已重生', false)
    return
  }

  const playerData = otherPlayers.get(respawnId)
  if (!playerData) return
  markRemotePlayerRespawned(respawnId, playerData, data)
}

function ensureRadarActive() {
  radar.setVisible(true);
  if (hud) hud.classList.add('hud--with-radar');
}

showScreen('lobby');
setOverlayVisible(true);

function showScreen(name) {
  const screens = [screenLobby, screenAI, screenPause, screenSettings, screenResult];
  for (const s of screens) s.classList.add('hidden');
  if (name === 'lobby') screenLobby.classList.remove('hidden');
  if (name === 'ai') screenAI.classList.remove('hidden');
  if (name === 'pause') screenPause.classList.remove('hidden');
  if (name === 'settings') screenSettings.classList.remove('hidden');
  if (name === 'result') screenResult.classList.remove('hidden');
  game.uiScreen = name;
}

function getSwipeScreenOrder() {
  if (game.uiScreen === 'result') return ['result', 'lobby'];
  if (game.uiScreen === 'pause') return ['pause', 'settings'];
  if (game.uiScreen === 'settings' && game.showingSettingsFrom === 'pause') return ['pause', 'settings'];
  return ['lobby', 'ai', 'settings'];
}

function swipeToScreen(direction) {
  const order = getSwipeScreenOrder();
  const idx = order.indexOf(game.uiScreen);
  if (idx === -1) return;
  let next = idx + direction;
  if (next < 0) next = order.length - 1;
  if (next >= order.length) next = 0;
  showScreen(order[next]);
}

function showResult(title, detail) {
  resultTitle.textContent = title;
  resultDetail.textContent = detail;
  const lines = [];
  lines.push(`You (${game.team.toUpperCase()})  K/D: ${game.stats.kills}/${game.stats.deaths}`);
  lines.push(`Score CT ${game.score.ct} : ${game.score.t} T`);
  resultBoard.textContent = lines.join('\n');
  setOverlayVisible(true);
  showScreen('result');
}

function setOverlayVisible(visible) {
  overlay.classList.toggle('hidden', !visible);
  hud.style.display = visible ? 'none' : 'grid';
}

function describeWeaponStats(def) {
  const fireMode = def.auto ? 'AUTO' : 'SEMI';
  return `伤害 ${def.damage} · 射速 ${def.rpm} · 后坐 ${def.recoil.toFixed(2)} · 精准 ${def.accuracy}% · ${fireMode}`;
}

function getEquipLabel(type) {
  if (type === 'flash') return '闪光弹';
  if (type === 'smoke') return '烟雾弹';
  if (type === 'molotov') return '燃烧弹';
  return '';
}

function updateWeaponHUD(w) {
  if (!w) return;
  let name = w.def.name;
  if (w.def.category === 'pistol' && w.silencerOn) {
    name += ' [消音器]';
  }
  weaponNameEl.textContent = name;
  tipText.textContent = describeWeaponStats(w.def);
}

function getWeaponStateById(id) {
  for (const ws of game.weapons) {
    if (ws.def.id === id) return ws;
  }
  return null;
}

function syncWeaponSlots() {
  game.weaponSlots.primary = '';
  game.weaponSlots.secondary = '';
  game.weaponSlots.melee = '';
  for (const ws of game.weapons) {
    if (ws.def.slot === 'primary') game.weaponSlots.primary = ws.def.id;
    if (ws.def.slot === 'secondary') game.weaponSlots.secondary = ws.def.id;
    if (ws.def.slot === 'melee') game.weaponSlots.melee = ws.def.id;
  }
}

function refillWeaponState(ws) {
  ws.mag = ws.def.magSize;
  ws.reserve = ws.def.reserveMax;
  ws.reloading = false;
  ws.reloadLeft = 0;
  ws.reloadTotal = ws.def.reloadSec;
  ws.cooldown = 0;
  ws.kick = 0;
  ws.shot = 0;
  ws.flash = 0;
}

function giveWeaponToPlayer(weaponId) {
  const def = WEAPON_DEF_BY_ID.get(weaponId);
  if (!def) return null;

  const existed = getWeaponStateById(weaponId);
  if (existed) {
    refillWeaponState(existed);
    return existed;
  }

  const slot = def.slot;
  let removedIndex = -1;
  for (let i = 0; i < game.weapons.length; i++) {
    if (game.weapons[i].def.slot === slot) {
      removedIndex = i;
      break;
    }
  }
  if (removedIndex >= 0) {
    game.weapons.splice(removedIndex, 1);
    if (game.weaponIndex > removedIndex) game.weaponIndex -= 1;
    if (game.weaponIndex === removedIndex) game.weaponIndex = 0;
  }

  const ws = new WeaponState(def);
  game.weapons.push(ws);
  syncWeaponSlots();
  return ws;
}

function resetPlayerLoadout() {
  game.weapons.length = 0;
  game.weaponIndex = 0;
  game.switchEquip('none');
  syncWeaponSlots();
  const sidearmId = game.team === 'ct' ? 'usp' : 'glock';
  giveWeaponToPlayer(sidearmId);
  syncWeaponSlots();
  game.switchWeaponBySlot('secondary');
}

function refillPlayerLoadoutAmmo() {
  for (const ws of game.weapons) {
    refillWeaponState(ws);
  }
}

function isBuyAllowed() {
  // 单机模式：冻结期可购买
  if (game.mode === 'ai') {
    return game.round.state === 'freeze' && game.playerAlive
  }
  // 多人模式：检查是否在冻结期（购买阶段）
  if (game.mode === 'online' || game.mode === 'multiplayer') {
    return multiplayer.isConnected && game.playerAlive
  }
  return false
}

function setBuyNotice(text, urgent) {
  game.buyNotice = text || '';
  game.buyNoticeUrgent = !!urgent;
  if (!buyNoticeEl) return;
  buyNoticeEl.textContent = game.buyNotice;
  buyNoticeEl.classList.remove('ok', 'fail');
  if (game.buyNotice) buyNoticeEl.classList.add(urgent ? 'fail' : 'ok');
}

function closeBuyMenu() {
  game.buyMenuOpen = false;
  if (buyMenuEl) {
    buyMenuEl.classList.add('hidden');
    buyMenuEl.setAttribute('aria-hidden', 'true');
  }
}

function openBuyMenu(autoMessage) {
  if (!buyMenuEl) return;
  if (!isBuyAllowed()) {
    if (game.mode === 'ai' && game.round.state !== 'freeze') {
      setStatus('仅冻结期可购买', true);
    }
    return;
  }
  game.buyMenuOpen = true;
  buyMenuEl.classList.remove('hidden');
  buyMenuEl.setAttribute('aria-hidden', 'false');
  if (autoMessage) setBuyNotice('回合开始，按数字键/字母键购买', false);
  renderBuyMenu();
}

function toggleBuyMenu() {
  if (game.buyMenuOpen) {
    closeBuyMenu();
    return;
  }
  openBuyMenu(false);
}

function renderBuyMenu() {
  if (!buyMenuBodyEl || !buyMenuEl) return;
  buyMenuEl.classList.toggle('hidden', !game.buyMenuOpen);
  buyMenuEl.setAttribute('aria-hidden', game.buyMenuOpen ? 'false' : 'true');

  const grouped = new Map(SHOP_CATEGORIES.map((cat) => [cat.id, []]));
  const items = Array.isArray(SHOP_ITEMS) ? SHOP_ITEMS : [];
  for (const item of items) {
    let catId = 'gear';
    if (item.type === 'weapon') {
      const w = WEAPON_DEF_BY_ID.get(item.id);
      if (!w) continue;
      catId = w.category;
    }
    const list = grouped.get(catId);
    if (list) list.push(item);
  }

  const activeWeapon = game.getWeapon();
  const canBuyNow = isBuyAllowed();
  const blocks = [];

  for (const cat of SHOP_CATEGORIES) {
    const items = grouped.get(cat.id) || [];
    const rows = [];
    for (const item of items) {
      if (item.type === 'weapon') {
        const def = WEAPON_DEF_BY_ID.get(item.id);
        if (!def) continue;
        const owned = getWeaponStateById(def.id);
        const active = !!activeWeapon && activeWeapon.def.id === def.id;
        const cannotAfford = game.econ.money < def.price;
        const locked = !canBuyNow || cannotAfford;
        const classes = ['buy-item'];
        if (owned) classes.push('buy-item--owned');
        if (active) classes.push('buy-item--active');
        if (locked) classes.push('buy-item--locked');
        rows.push(
          `<div class="${classes.join(' ')}" data-item-key="${item.keyCode}" onclick="tryBuyShopItem(SHOP_ITEM_BY_KEY.get('${item.keyCode}'))" onmouseenter="this.classList.add('buy-item--hover')" onmouseleave="this.classList.remove('buy-item--hover')"><div class="buy-item__top"><span class="buy-item__name">${def.name}</span><span class="buy-item__price">$${def.price}</span></div><div class="buy-item__meta">${def.magSize}发 · 伤害${def.damage} · 射速${def.rpm}</div><span class="buy-item__key">[${item.keyLabel}]</span></div>`
        );
      } else {
        const def = EQUIPMENT_DEFS[item.id];
        if (!def) continue;
        const cannotAfford = game.econ.money < def.price;
        let extra = def.desc;
        let owned = false;
        if (def.id === 'armor') {
          owned = game.armor >= 100;
          extra = `护甲 ${Math.floor(game.armor)}/100`;
        }
        if (def.id === 'flash') {
          owned = game.flashbang.charges >= game.flashbang.maxCharges;
          extra = `库存 ${game.flashbang.charges}/${game.flashbang.maxCharges}`;
        }
        if (def.id === 'smoke') {
          owned = game.smoke.charges >= game.smoke.maxCharges;
          extra = `库存 ${game.smoke.charges}/${game.smoke.maxCharges}`;
        }
        const locked = !canBuyNow || cannotAfford || owned;
        const classes = ['buy-item'];
        if (owned) classes.push('buy-item--owned');
        if (locked) classes.push('buy-item--locked');
        rows.push(
          `<div class="${classes.join(' ')}" data-item-key="${item.keyCode}" onclick="tryBuyShopItem(SHOP_ITEM_BY_KEY.get('${item.keyCode}'))" onmouseenter="this.classList.add('buy-item--hover')" onmouseleave="this.classList.remove('buy-item--hover')"><div class="buy-item__top"><span class="buy-item__name">${def.name}</span><span class="buy-item__price">$${def.price}</span></div><div class="buy-item__meta">${extra}</div><span class="buy-item__key">[${item.keyLabel}]</span></div>`
        );
      }
    }
    blocks.push(`<div class="buy-col"><div class="buy-col__title">${cat.label}</div>${rows.join('')}</div>`);
  }

  buyMenuBodyEl.innerHTML = blocks.join('');
  setBuyNotice(game.buyNotice, game.buyNoticeUrgent);
}

function tryBuyShopItem(item) {
  if (!item) return false;
  if (!isBuyAllowed()) {
    const reason = !game.playerAlive ? '死亡状态无法购买' : '仅冻结期可购买';
    setStatus(reason, true);
    setBuyNotice(reason, true);
    renderBuyMenu();
    return true;
  }

  if (item.type === 'weapon') {
    const def = WEAPON_DEF_BY_ID.get(item.id);
    if (!def) return true;
    const existed = getWeaponStateById(def.id);
    if (existed && existed.mag >= existed.def.magSize && existed.reserve >= existed.def.reserveMax) {
      const msg = `${def.name} 弹药已满`;
      setStatus(msg, true);
      setBuyNotice(msg, true);
      renderBuyMenu();
      return true;
    }
    if (!spendMoney(def.price)) {
      const msg = `资金不足：${def.name} 需要 $${def.price}`;
      setStatus(msg, true);
      setBuyNotice(msg, true);
      renderBuyMenu();
      return true;
    }
    giveWeaponToPlayer(def.id);
    syncWeaponSlots();
    game.switchWeaponBySlot(def.slot);
    const ok = `购买成功：${def.name} ($${def.price})`;
    setStatus(ok, false);
    setBuyNotice(ok, false);
    renderBuyMenu();
    
    // 多人模式：同步购买事件
    if ((game.mode === 'online' || game.mode === 'multiplayer') && multiplayer.isConnected) {
      multiplayer.sendBuy('weapon', def.id)
    }
    return true;
  }

  const def = EQUIPMENT_DEFS[item.id];
  if (!def) return true;
  if (item.id === 'armor' && game.armor >= 100) {
    setStatus('防弹衣已满', true);
    setBuyNotice('防弹衣已满', true);
    renderBuyMenu();
    return true;
  }
  if (item.id === 'flash' && game.grenades.flash.charges >= game.grenades.flash.maxCharges) {
    setStatus('闪光弹库存已满', true);
    setBuyNotice('闪光弹库存已满', true);
    renderBuyMenu();
    return true;
  }
  if (item.id === 'smoke' && game.grenades.smoke.charges >= game.grenades.smoke.maxCharges) {
    setStatus('烟雾弹库存已满', true);
    setBuyNotice('烟雾弹库存已满', true);
    renderBuyMenu();
    return true;
  }
  if (item.id === 'molotov' && game.grenades.molotov.charges >= game.grenades.molotov.maxCharges) {
    setStatus('燃烧弹库存已满', true);
    setBuyNotice('燃烧弹库存已满', true);
    renderBuyMenu();
    return true;
  }
  if (!spendMoney(def.price)) {
    const msg = `资金不足：${def.name} 需要 $${def.price}`;
    setStatus(msg, true);
    setBuyNotice(msg, true);
    renderBuyMenu();
    return true;
  }

  if (item.id === 'armor') game.armor = 100;
  if (item.id === 'flash') game.grenades.flash.charges += 1;
  if (item.id === 'smoke') game.grenades.smoke.charges += 1;
  if (item.id === 'molotov') game.grenades.molotov.charges += 1;

  const ok = `购买成功：${def.name} ($${def.price})`;
  setStatus(ok, false);
  setBuyNotice(ok, false);
  renderBuyMenu();
  
  // 多人模式：同步购买事件
  if ((game.mode === 'online' || game.mode === 'multiplayer') && multiplayer.isConnected) {
    multiplayer.sendBuy('equip', def.id)
  }
  return true;
}

function applyDifficultyToBots() {
  const d = game.difficulty;
  let rpm = 200;
  let spreadDeg = 3.2;
  let dmg = 4;
  let reactionTime = 300; // Easy: 220~320ms
  if (d === 'normal') {
    rpm = 240;
    spreadDeg = 2.2;
    dmg = 5;
    reactionTime = 180; // Normal: 140~220ms
  }
  if (d === 'hard') {
    rpm = 300;
    spreadDeg = 1.7;
    dmg = 6;
    reactionTime = 110; // Hard: 80~140ms
  }
  for (const b of game.bots) {
    b.weapon.rpm = rpm;
    b.weapon.spreadDeg = spreadDeg;
    b.weapon.damage = dmg;
    b.reactionTime = reactionTime;
    b.firstSawEnemyTime = null; // 反应时间追踪
  }
}

function applyTeamToBots() {
  for (const b of game.bots) {
    b.team = b.id <= 5 ? 'ct' : 't';
  }
}

function rebuildGameplayColliders() {
  game.colliders.length = 0;
  for (const b of game.boxes) {
    if (b.solid) game.colliders.push(b.aabb);
  }
  for (const s of game.smoke.active) {
    game.colliders.push(s.aabb);
  }
  buildNavGrid(); // AI寻路：构建导航网格
}

function isRoundFrozen() {
  return game.round.state === 'freeze';
}

function addMoney(amount) {
  game.econ.money = clamp(Math.floor(game.econ.money + amount), 0, game.econ.maxMoney);
  renderBuyMenu();
}

function spendMoney(cost) {
  if (game.econ.money < cost) return false;
  game.econ.money -= cost;
  renderBuyMenu();
  return true;
}

function teamAliveCount(team) {
  let alive = team === game.team && game.playerAlive ? 1 : 0;
  for (const b of game.bots) {
    if (b.alive && b.team === team) alive += 1;
  }
  return alive;
}

function roundAward(winnerTeam) {
  const myTeam = game.team;
  if (winnerTeam === myTeam) addMoney(game.econ.rewardWin);
  else addMoney(game.econ.rewardLose);
}

function resetRoundEntities() {
  respawnPlayer();
  game.playerAlive = true;
  refillPlayerLoadoutAmmo();
  for (const b of game.bots) {
    const spawn = randomSpawnFromTeam(b.team);
    b.spawn = v3(spawn.x, spawn.y, spawn.z);
    b.pos = v3(spawn.x, spawn.y, spawn.z);
    b.vel = v3(0, 0, 0);
    b.alive = true;
    b.hp = b.maxHp;
    b.objectiveSite = Math.random() < 0.5 ? 'A' : 'B';
    b.weapon.mag = b.weapon.magSize;
    b.weapon.reserve = 999;
    b.weapon.reloading = false;
    b.weapon.reloadLeft = 0;
    b.shootCooldown = 0;
    b.navPath = [];
    b.navIndex = 0;
    b.navGoalKey = '';
    b.navRepathAt = 0;
    b.forceRepath = false;
    b.stuckTime = 0;
    b.lastNavPos = v3(spawn.x, spawn.y, spawn.z);
    b.coverPos = null;
    b.coverEvalAt = 0;
    b.coverEnemyKey = '';
  }
}

function prepareNewBombRound() {
  game.round.roundNum += 1;
  game.round.state = 'freeze';
  game.round.freezeLeft = game.round.freezeTotal;
  game.round.roundLeft = game.round.roundTotal;
  game.round.postLeft = 0;
  game.round.winner = '';
  game.round.reason = '';
  game.round.bombPlanted = false;
  game.round.bombTimer = 0;
  game.round.tPlanting = false;
  game.round.ctDefusing = false;
  game.round.progress = 0;
  game.round.plantLeft = 0;
  game.round.defuseLeft = 0;
  game.round.activeSite = Math.random() < 0.5 ? 'A' : 'B';
  game.round.plantSite = '';
  const site = getSiteByKey(game.round.activeSite) || getSiteByKey('A');
  if (site) {
    setRoundSite(site);
    game.round.bombPos = v3(site.pos.x, site.pos.y, site.pos.z);
  }
  game.smoke.active = [];
  game.smoke.cooldown = 0;
  game.flashbang.cooldown = 0;
  rebuildGameplayColliders();
  resetRoundEntities();
  openBuyMenu(true);
}

function endBombRound(winnerTeam, reason) {
  if (game.round.state === 'post') return;
  closeBuyMenu();
  game.round.winner = winnerTeam;
  game.round.reason = reason;
  game.round.state = 'post';
  game.round.postLeft = game.round.postTotal;
  if (winnerTeam === 'ct') game.score.ct += 1;
  else game.score.t += 1;
  roundAward(winnerTeam);
  setStatus(`${winnerTeam.toUpperCase()} win: ${reason}`, false);
}

function getSiteByKey(key) {
  if (!key) return game.round.sites[0] || null;
  for (const s of game.round.sites) {
    if (s.key === key) return s;
  }
  return game.round.sites[0] || null;
}

function setRoundSite(site) {
  if (!site) return;
  game.round.sitePos = v3(site.pos.x, site.pos.y, site.pos.z);
  game.round.siteRadius = site.radius;
}

function detectSiteAtPosition(pos) {
  const p = v3(pos.x, 0, pos.z);
  for (const site of game.round.sites) {
    const d = v3sub(p, v3(site.pos.x, 0, site.pos.z));
    if (v3len(d) <= site.radius) return site;
  }
  return null;
}

/**
 * 部署投掷物（通用函数）
 */
function deployGrenade(type) {
  const grenadeData = game.grenades[type];
  if (!grenadeData) {
    setStatus(`Unknown grenade type: ${type}`, true);
    return false;
  }

  if (game.mode !== 'ai') {
    setStatus(`${type} available in AI mode only`, true);
    return false;
  }
  if (!game.playerAlive) {
    setStatus(`Cannot use ${type} while dead`, true);
    return false;
  }
  if (grenadeData.cooldown > 0) {
    setStatus(`${type} cooldown ${grenadeData.cooldown.toFixed(1)}s`, true);
    return false;
  }
  if (grenadeData.charges <= 0) {
    setStatus(`No ${type} charge`, true);
    return false;
  }

  // 计算投掷方向
  const camPos = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);
  const throwDir = v3norm(forwardFromYawPitch(game.yaw, game.pitch));

  // 投掷
  grenadeManager.throwGrenade(camPos, throwDir, type);

  grenadeData.cooldown = grenadeData.cooldownTotal;
  grenadeData.charges = Math.max(0, grenadeData.charges - 1);

  setStatus(`投掷 ${type}`, false);
  renderBuyMenu();
  return true;
}

function deployFlashbang() {
  return deployGrenade('flash');
}

function deploySmokeWall() {
  return deployGrenade('smoke');
}

function deployMolotov() {
  return deployGrenade('molotov');
}

function updateGrenades(dt) {
  // 更新投掷物管理器
  grenadeManager.update(dt, game.colliders, game);

  // 更新冷却
  for (const type of ['flash', 'smoke', 'molotov']) {
    const g = game.grenades[type];
    if (g.cooldown > 0) {
      g.cooldown = Math.max(0, g.cooldown - dt);
    }
  }

  // 更新闪光效果
  if (game.flashEffect.active) {
    game.flashEffect.timer -= dt;
    if (game.flashEffect.timer <= 0) {
      game.flashEffect.active = false;
      game.flashEffect.intensity = 0;
    } else {
      // 逐渐恢复
      const recoveryProgress = 1 - (game.flashEffect.timer / game.flashEffect.duration);
      game.flashEffect.intensity = Math.max(0, 1 - recoveryProgress * 1.5);
    }
  }

  // 清理过期的烟雾
  const tNow = nowMs();
  game.grenades.smoke.active = game.grenades.smoke.active.filter(s => {
    if (tNow >= s.expiresAt) {
      if (s.system) s.system.alive = false;
      return false;
    }
    return true;
  });

  // 清理过期的火焰
  game.grenades.molotov.active = game.grenades.molotov.active.filter(f => {
    if (tNow >= f.expiresAt) {
      if (f.system) f.system.alive = false;
      return false;
    }
    return true;
  });

  // 重建碰撞体（如果有变化）
  if (game.grenades.smoke.active.length > 0 || game.grenades.molotov.active.length > 0) {
    rebuildGameplayColliders();
  }
}

function updateSmoke(dt) {
  // 兼容旧代码，现在由 updateGrenades 处理
  updateGrenades(dt);
}

function spawnPointCollides(pos) {
  // Player bounding box (approximate: 0.8m wide, 1.8m tall, 0.8m deep)
  const playerHalf = v3(0.4, 0.9, 0.4);
  const playerAABB = aabbFromCenter(v3(pos.x, 1.1, pos.z), playerHalf);
  
  // Check against all colliders
  for (const c of game.colliders) {
    if (aabbIntersects(playerAABB, c)) {
      return true;
    }
  }
  return false;
}

function randomSpawnFromTeam(team) {
  const spots = game.spawnZones[team] || game.spawnZones.ct;
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const idx = Math.floor(Math.random() * spots.length) % spots.length;
    const base = spots[idx];
    const jitter = v3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4);
    const spawnPos = v3add(base, jitter);
    
    // Check for collision with buildings/walls
    if (!spawnPointCollides(spawnPos)) {
      return spawnPos;
    }
  }
  
  // Fallback: return center of map if no safe spawn found
  return v3(0, 0, 0);
}

function respawnPlayer() {
  const spawn = randomSpawnFromTeam(game.team);
  game.hp = 100;
  game.armor = 0;
  game.pos = v3(spawn.x, 1.1, spawn.z);
  game.vel = v3(0, 0, 0);
}

function rebuildBots(count) {
  game.bots.length = 0;
  const teamSize = clamp(Math.floor(count), 1, 6);
  for (let i = 0; i < teamSize; i++) {
    const spawn = randomSpawnFromTeam('ct');
    const bot = makeBot(i + 1, spawn);
    bot.team = 'ct';
    bot.spawn = v3(spawn.x, spawn.y, spawn.z);
    bot.patrolNode = Math.floor(Math.random() * game.routeNodes.ct.length) % game.routeNodes.ct.length;
    bot.objectiveSite = i % 2 === 0 ? 'A' : 'B';
    game.bots.push(bot);
  }
  for (let i = 0; i < teamSize; i++) {
    const spawn = randomSpawnFromTeam('t');
    const bot = makeBot(i + 1 + teamSize, spawn);
    bot.team = 't';
    bot.spawn = v3(spawn.x, spawn.y, spawn.z);
    bot.patrolNode = Math.floor(Math.random() * game.routeNodes.t.length) % game.routeNodes.t.length;
    bot.objectiveSite = i % 2 === 0 ? 'A' : 'B';
    game.bots.push(bot);
  }
  applyDifficultyToBots();
}

function startAIMode() {
  setMatchMode('bomb');

  game.mode = 'ai';
  showScreen('ai');
  setOverlayVisible(false);
  ensureRadarActive();
  game.playerAlive = true;
  closeBuyMenu();
  resetPlayerLoadout();
  respawnPlayer();
  game.vel = v3(0, 0, 0);
  game.crouchT = 0;
  game.landKick = 0;
  game.ending = false;
  game.stats.kills = 0;
  game.stats.deaths = 0;
  game.isAiming = false;
  game.scope = {
    active: false,
    zoomLevel: 1,
    targetZoom: 1,
    transitioning: false,
  };
  game.buildMap();
  game.score.ct = 0;
  game.score.t = 0;
  game.score.limit = 25;
  game.round.state = 'freeze';
  game.round.tPlanting = false;
  game.round.ctDefusing = false;
  game.round.progress = 0;
  game.round.plantLeft = 0;
  game.round.defuseLeft = 0;
  game.round.bombPlanted = false;
  game.round.bombTimer = 0;
  game.round.roundNum = 0;
  game.round.winner = '';
  game.round.reason = '';
  game.round.postLeft = 0;
  game.round.freezeLeft = game.round.freezeTotal;
  game.round.roundLeft = game.round.roundTotal;

  // 重置投掷物系统
  game.grenades.flash.active = [];
  game.grenades.flash.cooldown = 0;
  game.grenades.flash.charges = 0;
  game.grenades.smoke.active = [];
  game.grenades.smoke.cooldown = 0;
  game.grenades.smoke.charges = 0;
  game.grenades.molotov.active = [];
  game.grenades.molotov.cooldown = 0;
  game.grenades.molotov.charges = 0;
  
  // 清理投掷物管理器
  grenadeManager.clear();
  
  // 重置闪光效果
  game.flashEffect.active = false;
  game.flashEffect.intensity = 0;
  game.flashEffect.timer = 0;
  
  // 兼容旧代码的别名
  game.smoke = game.grenades.smoke;
  game.flashbang = game.grenades.flash;

  rebuildGameplayColliders();
  rebuildBots(game.botCount);
  game.econ.money = game.econ.initialMoney;

  prepareNewBombRound();

  lockPointer();
}

function returnToLobby() {
  game.mode = 'lobby';
  closeBuyMenu();
  unlockPointer();
  setOverlayVisible(true);
  showScreen('lobby');
  clearOnlineRespawnTimer()
  clearAllRemoteDeathAnimations()
  floatingDamageNumbers = []
  clearHealthBars()

  // 清理游戏相关的事件监听器（不清理全局错误处理器）
  // window 的 'error' 和 'unhandledrejection' 是直接通过 addEventListener 注册的，不受影响
  globalEventManager.clear('canvas');
  globalEventManager.clear('document');
  globalEventManager.clear('window');
  globalEventManager.clear('online');

  // 清理观战模式
  if (spectatorManager && spectatorManager.isEnabled()) {
    spectatorManager.stop();
  }
  if (spectatorUI && spectatorUI.isVisible) {
    spectatorUI.destroy();
  }

  // Clean up multiplayer if active
  if (multiplayer.isConnected) {
    multiplayer.disconnect()
    if (multiplayerHUD) {
      multiplayerHUD.remove()
      multiplayerHUD = null
    }
    otherPlayers.clear()
  }
}

/**
 * Start online multiplayer mode
 */
async function startOnlineMode() {
  try {
    // Try to connect to server
    setStatus('连接服务器中...', false)
    await multiplayer.connect()

    // Show login UI
    createLoginUI(multiplayer, (username) => {
      console.log(`玩家 ${username} 登录成功`)
      // After login, show room list
      createRoomListUI(
        multiplayer,
        // Join room callback (now includes isHost parameter)
        (roomId, roomName, isHost = false) => {
          console.log(`${isHost ? '创建' : '加入'}房间: ${roomName} (${roomId})`)

          // Show room waiting UI
          const roomInfo = {
            id: roomId,
            name: roomName,
            isHost: isHost
          }

          createRoomWaitingUI(
            multiplayer,
            roomInfo,
            // Start game callback
            () => {
              console.log('游戏开始!')
              // If host, notify server to start game
              if (isHost) {
                multiplayer.startGame()
              }
              startMultiplayerGame(roomId, roomName)
            },
            // Leave room callback
            () => {
              multiplayer.leaveRoom()
              showScreen('lobby')
            }
          )

          // Listen for player joined
          multiplayer.onPlayerJoined((data) => {
            console.log('玩家加入:', data)
            // Request room update to get latest player list
            if (data.players) {
              updateWaitingPlayerList(multiplayer, data.players)
            }
          })

          // Listen for player left
          multiplayer.onPlayerLeft((data) => {
            console.log('玩家离开:', data)
            if (data.players) {
              updateWaitingPlayerList(multiplayer, data.players)
            }
          })

          // Listen for room updates
          multiplayer.onRoomUpdate((data) => {
            console.log('房间更新:', data)
            if (data.players) {
              updateWaitingPlayerList(multiplayer, data.players)
            }
          })

          // Listen for game start
          multiplayer.onGameStart((data) => {
            console.log('收到游戏开始信号')
            // Remove waiting UI if still present
            const waitingOverlay = document.getElementById('roomWaitingOverlay')
            if (waitingOverlay) {
              waitingOverlay.remove()
            }
            startMultiplayerGame(roomId, roomName)
          })
        },
        // Back callback
        () => {
          multiplayer.disconnect()
          showScreen('lobby')
        }
      )
    })
  } catch (error) {
    console.error('连接失败:', error)

    // 提供更友好的错误提示
    let errorMessage = error.message

    if (error.message.includes('SSL证书') || error.message.includes('certificate')) {
      errorMessage = `SSL证书错误。

由于服务器使用自签名证书，您需要先手动信任证书：

1. 在新标签页中打开：https://123.60.21.129
2. 点击"高级" → "继续访问"
3. 然后返回此页面重试

或者使用HTTP访问（如果服务器支持）：
http://vimalinx.github.io/csgo/`
    } else if (error.message.includes('timeout')) {
      errorMessage = '连接超时。服务器可能暂时不可用，请稍后重试。'
    }

    alert('连接失败\n\n' + errorMessage)
    showScreen('lobby')
  }
}

/**
 * Start the multiplayer game session
 */
function startMultiplayerGame(roomId, roomName) {
  setMatchMode('bomb')
  
  game.mode = 'online'
  game.roomName = roomName
  showScreen('ai') // Reuse AI screen for now
  setOverlayVisible(false)
  ensureRadarActive()
  
  game.playerAlive = true
  clearOnlineRespawnTimer()
  clearAllRemoteDeathAnimations()
  otherPlayers.clear()
  floatingDamageNumbers = []
  closeBuyMenu()
  resetPlayerLoadout()
  respawnPlayer()
  
  game.vel = v3(0, 0, 0)
  game.crouchT = 0
  game.landKick = 0
  game.ending = false
  game.stats.kills = 0
  game.stats.deaths = 0
  game.isAiming = false
  game.scope = {
    active: false,
    zoomLevel: 1,
    targetZoom: 1,
    transitioning: false,
  }
  
  game.buildMap()
  game.score.ct = 0
  game.score.t = 0
  game.score.limit = 25
  game.round.state = 'freeze'
  game.round.tPlanting = false
  game.round.ctDefusing = false
  game.round.progress = 0
  game.round.plantLeft = 0
  game.round.defuseLeft = 0
  game.round.bombPlanted = false
  game.round.bombTimer = 0
  game.round.roundNum = 0
  game.round.winner = ''
  game.round.reason = ''
  game.round.postLeft = 0
  game.round.freezeLeft = game.round.freezeTotal
  game.round.roundLeft = game.round.roundTotal
  
  game.smoke.active = []
  game.smoke.cooldown = 0
  game.smoke.charges = 0
  game.flashbang.cooldown = 0
  game.flashbang.charges = 0
  
  rebuildGameplayColliders()
  // Don't spawn bots in multiplayer mode
  game.bots = []
  game.econ.money = game.econ.initialMoney
  
  prepareNewBombRound()
  
  // Create multiplayer HUD
  multiplayerHUD = createMultiplayerHUD(multiplayer)
  
  // Setup multiplayer event listeners
  setupMultiplayerListeners()
  
  lockPointer()
}

/**
 * Setup multiplayer event listeners
 */
function setupMultiplayerListeners() {
  // Listen for other players' movement
  multiplayer.onPlayerMove((data) => {
    if (data.playerId !== multiplayer.playerId) {
      const prev = otherPlayers.get(data.playerId) || {}
      const syncedHp = typeof data.hp === 'number' ? clamp(data.hp, 0, 100) : readSyncedHp(prev, 100)
      const alive = typeof data.alive === 'boolean' ? data.alive : syncedHp > 0
      const deathAt = !alive
        ? (prev.deathAt || toPerformanceTimestamp(data.deathTime ?? data.deathAt, nowMs()))
        : 0
      const nextPlayerState = {
        ...prev,
        position: data.position,
        rotation: data.rotation,
        velocity: data.velocity,
        team: data.team || prev.team || 'ct',
        hp: syncedHp,
        name: data.username || prev.name || 'Player',
        weapon: data.weapon || prev.weapon || 'rifle',
        alive,
        deathAt,
        animDuration: normalizeAnimDurationMs(data.animDuration ?? prev.animDuration),
        fallT: alive ? 0 : clamp01(safeNumber(prev.fallT, 0)),
        deathHidden: alive ? false : !!prev.deathHidden,
        timestamp: Date.now()
      }

      otherPlayers.set(data.playerId, nextPlayerState)

      if (!alive && prev.alive !== false) {
        startRemoteDeathAnimation(data.playerId, nextPlayerState, {
          deathTime: data.deathTime ?? data.deathAt,
          animDuration: data.animDuration
        })
      } else if (alive && prev.alive === false) {
        clearRemoteDeathAnimation(data.playerId)
      }
    }
  })
  
  // Listen for other players joining
  multiplayer.onPlayerJoined((data) => {
    console.log(`玩家加入: ${data.username}`)
    setStatus(`${data.username} 加入了游戏`, false)
  })
  
  // Listen for other players leaving
  multiplayer.onPlayerLeft((data) => {
    console.log(`玩家离开: ${data.username}`)
    clearRemoteDeathAnimation(data.playerId)
    otherPlayers.delete(data.playerId)
    removeHealthBar(data.playerId)
    setStatus(`${data.username} 离开了游戏`, false)
  })
  
  // Listen for shooting events
  multiplayer.onPlayerShoot((data) => {
    if (data.playerId !== multiplayer.playerId) {
      // Handle other player shooting
      console.log(`玩家 ${data.playerId} 开枪`)
    }
  })

  // Damage / death / respawn sync
  multiplayer.onDamage((data) => {
    handleDamageEvent(data)
  })

  multiplayer.onDeath((data) => {
    handleDeathEvent(data)
  })

  multiplayer.onRespawn((data) => {
    handleRespawnEvent(data)
  })
  
  // Handle disconnection
  multiplayer.onDisconnect(() => {
    console.log('与服务器的连接断开')
    alert('与服务器的连接断开')
    returnToLobby()
  })

  multiplayer.onError((error) => {
    console.error('多人游戏错误:', error)
    setStatus('网络错误: ' + error, true)
  })

  // Tab键计分板监听
  globalEventManager.add(document, 'keydown', (e) => {
    if (e.key === 'Tab' && game.mode === 'online') {
      e.preventDefault()
      const scoreboard = document.getElementById('scoreboard')
      if (scoreboard) {
        scoreboard.style.display = 'block'
      }
    }
  }, {}, 'online')

  globalEventManager.add(document, 'keyup', (e) => {
    if (e.key === 'Tab' && game.mode === 'online') {
      const scoreboard = document.getElementById('scoreboard')
      if (scoreboard) {
        scoreboard.style.display = 'none'
      }
    }
  }, {}, 'online')

  // 聊天系统
  import('./multiplayer-ui.js').then(module => {
    module.createChatUI()

    // 聊天消息监听
    multiplayer.onChat((data) => {
      module.addChatMessage(data.channel, data.playerName, data.message, data.team)
    })
  })

  // Y键全局聊天，U键队伍聊天
  globalEventManager.add(document, 'keydown', (e) => {
    if (game.mode === 'online' && game.pointerLocked) {
      const chatInput = document.getElementById('chatInput')

      // Y键 - 全局聊天
      if ((e.key === 'y' || e.key === 'Y') && (!chatInput || chatInput.style.display === 'none')) {
        e.preventDefault()
        import('./multiplayer-ui.js').then(module => {
          module.toggleChatInput(true, 'global')
          unlockPointer()
        })
      }

      // U键 - 队伍聊天
      if ((e.key === 'u' || e.key === 'U') && (!chatInput || chatInput.style.display === 'none')) {
        e.preventDefault()
        import('./multiplayer-ui.js').then(module => {
          module.toggleChatInput(true, 'team')
          unlockPointer()
        })
      }
    }
  }, {}, 'online')

  // 聊天输入监听
  globalEventManager.add(document, 'keydown', (e) => {
    const chatInput = document.getElementById('chatInput')
    if (!chatInput || chatInput.style.display === 'none') return

    if (e.key === 'Enter') {
      const message = chatInput.value.trim()
      if (message) {
        // 获取当前频道（从输入框的 dataset 读取）
        const currentChannel = chatInput.dataset.channel || 'global'
        multiplayer.sendChat(message, currentChannel)

        // 显示自己的消息
        import('./multiplayer-ui.js').then(module => {
          module.addChatMessage(currentChannel, multiplayer.username, message, multiplayer.getLocalVisualState().team)
        })
      }
      chatInput.value = ''
      import('./multiplayer-ui.js').then(module => {
        module.toggleChatInput(false)
      })
      lockPointer()
    } else if (e.key === 'Escape') {
      chatInput.value = ''
      import('./multiplayer-ui.js').then(module => {
        module.toggleChatInput(false)
      })
      lockPointer()
    }
  }, {}, 'online')

  // 购买事件监听
  multiplayer.onBuy((data) => {
    if (data.playerId === multiplayer.playerId) return // 忽略自己的购买事件

    const playerName = data.playerName || 'Player'
    const itemType = data.itemType
    const itemId = data.itemId

    // 获取物品名称
    let itemName = itemId
    if (itemType === 'weapon') {
      const weaponDef = WEAPON_DEF_BY_ID.get(itemId)
      if (weaponDef) {
        itemName = weaponDef.name
      }
    } else if (itemType === 'equip') {
      const equipDef = EQUIPMENT_DEFS[itemId]
      if (equipDef) {
        itemName = equipDef.name
      }
    }

    // 显示购买提示
    setStatus(`${playerName} 购买了 ${itemName}`, false)
    console.log(`[BUY] ${playerName} purchased ${itemName} (${itemType})`)
  })
}

/**
 * Update multiplayer scoreboard data
 */
function updateMultiplayerScoreboard() {
  if (game.mode !== 'online') return

  // 收集所有玩家数据
  const ctPlayers = []
  const tPlayers = []

  // 添加本地玩家
  const localPlayerData = {
    name: multiplayer.username || 'You',
    kills: game.stats.kills || 0,
    deaths: game.stats.deaths || 0,
    assists: game.stats.assists || 0,
    money: game.econ.money || 800,
    ping: 0 // 本地玩家延迟为0
  }

  if (game.team === 'ct') {
    ctPlayers.push(localPlayerData)
  } else {
    tPlayers.push(localPlayerData)
  }

  // 添加其他玩家
  for (const [playerId, playerData] of otherPlayers) {
    const playerScoreData = {
      name: playerData.name || 'Player',
      kills: playerData.kills || 0,
      deaths: playerData.deaths || 0,
      assists: playerData.assists || 0,
      money: playerData.money || 800,
      ping: playerData.ping || Math.floor(Math.random() * 100) // 模拟延迟
    }

    if (playerData.team === 'ct') {
      ctPlayers.push(playerScoreData)
    } else {
      tPlayers.push(playerScoreData)
    }
  }

  // 更新计分板
  const scoreboardData = {
    ct: ctPlayers,
    t: tPlayers
  }

  // 确保计分板存在
  let scoreboard = document.getElementById('scoreboard')
  if (!scoreboard) {
    import('./multiplayer-ui.js').then(module => {
      module.createScoreboard(scoreboardData)
    })
  } else {
    import('./multiplayer-ui.js').then(module => {
      module.updateScoreboard(scoreboardData)
    })
  }
}

/**
 * Send player movement to server (called from game loop)
 * 优化版本：自适应网络同步
 * - 根据移动状态动态调整发送频率
 * - 静止时降低频率（200ms / 5 FPS）
 * - 步行时中等频率（100ms / 10 FPS）
 * - 奔跑时标准频率（50ms / 20 FPS）
 * - 战斗时高频率（33ms / 30 FPS）
 */
const NETWORK_CONFIG = {
  IDLE_INTERVAL: 200,
  WALK_INTERVAL: 100,
  RUN_INTERVAL: 50,
  COMBAT_INTERVAL: 33,
  WALK_SPEED_THRESHOLD: 1.5,
  RUN_SPEED_THRESHOLD: 4.0,
  POSITION_THRESHOLD: 0.05,
  YAW_THRESHOLD: 0.01,
  PITCH_THRESHOLD: 0.01
}

let lastMoveSendTime = 0
let lastSyncPos = null
let lastSyncYaw = 0
let lastSyncPitch = 0
let lastFireTime = 0

function getMoveSpeed(vel) {
  if (!vel) return 0
  const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z)
  return Math.abs(speed)
}

function getPositionDelta(currentPos, lastPos) {
  if (!currentPos || !lastPos) return Infinity
  const dx = currentPos.x - lastPos.x
  const dz = currentPos.z - lastPos.z
  return Math.sqrt(dx * dx + dz * dz)
}

function getRotationDelta(currentYaw, currentPitch, lastYaw, lastPitch) {
  const yawDelta = Math.abs(currentYaw - lastYaw)
  const pitchDelta = Math.abs(currentPitch - lastPitch)
  return Math.sqrt(yawDelta * yawDelta + pitchDelta * pitchDelta)
}

function checkCombatMode() {
  const now = Date.now()
  const recentFire = (now - lastFireTime) < 3000
  return recentFire
}

function getSyncInterval(moveSpeed, isCombat) {
  if (isCombat) return NETWORK_CONFIG.COMBAT_INTERVAL
  if (moveSpeed >= NETWORK_CONFIG.RUN_SPEED_THRESHOLD) return NETWORK_CONFIG.RUN_INTERVAL
  if (moveSpeed >= NETWORK_CONFIG.WALK_SPEED_THRESHOLD) return NETWORK_CONFIG.WALK_INTERVAL
  return NETWORK_CONFIG.IDLE_INTERVAL
}

function shouldForceSync(pos, yaw, pitch) {
  if (!lastSyncPos) return true
  const posDelta = getPositionDelta(pos, lastSyncPos)
  const rotDelta = getRotationDelta(yaw, pitch, lastSyncYaw, lastSyncPitch)
  return (
    posDelta >= NETWORK_CONFIG.POSITION_THRESHOLD ||
    rotDelta >= Math.sqrt(NETWORK_CONFIG.YAW_THRESHOLD ** 2 + NETWORK_CONFIG.PITCH_THRESHOLD ** 2)
  )
}

function sendPlayerMovement() {
  if (!multiplayer || !multiplayer.isConnected || game.mode !== 'online') return
  if (!game.pos) {
    console.warn('⚠️ Player not initialized, skip movement sync')
    return
  }

  const now = Date.now()
  const moveSpeed = getMoveSpeed(game.vel)
  const inCombat = checkCombatMode()
  const syncInterval = getSyncInterval(moveSpeed, inCombat)
  const forceSync = shouldForceSync(game.pos, game.yaw, game.pitch)

  if (!forceSync && now - lastMoveSendTime < syncInterval) return

  lastMoveSendTime = now
  lastSyncPos = { ...game.pos }
  lastSyncYaw = game.yaw
  lastSyncPitch = game.pitch

  try {
    const weapon = game.getWeapon()
    multiplayer.sendMove(
      game.pos,
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

function recordFireTime() {
  lastFireTime = Date.now()
}

function resetNetworkSync() {
  lastMoveSendTime = 0
  lastSyncPos = null
  lastSyncYaw = 0
  lastSyncPitch = 0
  lastFireTime = 0
}

const glsys = new GL(canvas);
glsys.resize();
const gl = glsys.gl;

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uLightDir;
uniform mat4 uLightSpaceMatrix;
uniform vec3 uViewPos;

out vec3 vColor;
out float vOpacity;
out vec3 vWorldPos;
out vec3 vNormal;
out vec4 vFragPosLightSpace;

void main() {
  vec4 worldPos = uModel * vec4(aPos, 1.0);
  vec3 n = normalize(mat3(uModel) * aNor);

  // 增强的光照计算 - 提高对比度
  vec3 lightDir = normalize(-uLightDir);

  // 环境光（降低，增加暗部深度）
  float ambient = 0.22;

  // 漫反射光（增强对比度，亮部更亮）
  float ndl = clamp(dot(n, lightDir), 0.0, 1.0);
  float diffuse = ndl * 0.92;

  // 高度照明（高处更亮，增强对比度）
  float heightLight = clamp((worldPos.y + 0.8) / 10.0, 0.0, 1.0);
  float heightFactor = mix(0.65, 1.50, heightLight);

  // 环境光遮蔽（AO）模拟 - 低处和角落更暗（增强）
  float ao = 1.0;
  if (worldPos.y < 0.5) {
    ao = mix(0.50, 1.0, clamp(worldPos.y / 0.5, 0.0, 1.0));
  }

  // 边缘光照（rim lighting）- 增强效果
  vec3 viewDir = normalize(uViewPos - worldPos.xyz);
  float rim = 1.0 - clamp(dot(viewDir, n), 0.0, 1.0);
  rim = pow(rim, 3.0) * 0.30;

  // 最终光照
  float lit = (ambient + diffuse + rim) * heightFactor * ao;

  vColor = uColor * lit;
  vOpacity = uOpacity;
  vWorldPos = worldPos.xyz;
  vNormal = n;
  vFragPosLightSpace = uLightSpaceMatrix * worldPos;

  gl_Position = uProj * uView * worldPos;
}
`;

const FS = `#version 300 es
precision highp float;

in vec3 vColor;
in float vOpacity;
in vec3 vWorldPos;
in vec3 vNormal;
in vec4 vFragPosLightSpace;

uniform sampler2D uShadowMap;
uniform vec3 uLightDir;
uniform vec3 uViewPos;

out vec4 fragColor;

void main() {
  vec3 color = vColor;

  // 简化的阴影模拟（基于高度和法线）- 增强对比度
  float fakeShadow = 0.0;
  if (vWorldPos.y < 0.1) {
    // 地面阴影 - 根据附近建筑物计算
    // 这里简化处理，基于世界坐标模拟阴影
    float buildingShadow = 0.0;

    // 模拟几个主要建筑物的阴影（增强效果）
    vec2 shadowPos1 = vWorldPos.xz - vec2(-20.0, -10.0);
    vec2 shadowPos2 = vWorldPos.xz - vec2(20.0, 10.0);

    // 建筑物1的阴影（向光方向延伸）- 增强阴影强度
    if (length(shadowPos1) < 8.0) {
      buildingShadow = 0.50 * (1.0 - length(shadowPos1) / 8.0);
    }

    // 建筑物2的阴影 - 增强阴影强度
    if (length(shadowPos2) < 8.0) {
      buildingShadow = max(buildingShadow, 0.50 * (1.0 - length(shadowPos2) / 8.0));
    }

    fakeShadow = buildingShadow;
  }

  // 应用阴影 - 增强对比度
  color = color * (1.0 - fakeShadow);

  // 地面特殊处理 - 增加层次感和纹理
  if (vWorldPos.y < 0.1) {
    // 距离衰减 - 远处略暗（增强对比度）
    float dist = length(vWorldPos.xz);
    float distFade = 1.0 - clamp(dist / 60.0, 0.0, 0.38);
    color *= mix(0.65, 1.0, distFade);

    // 地面纹理模拟（基于位置的明暗变化）- 增强纹理
    float pattern = sin(vWorldPos.x * 0.5) * sin(vWorldPos.z * 0.5);
    color *= 1.0 + pattern * 0.10;

    // 增加随机纹理变化
    float noise = fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
    color *= 0.92 + noise * 0.12;
  }

  // 雾效（基于距离的线性雾）- 使用更鲜明的颜色
  vec3 fogColor = vec3(0.65, 0.80, 0.90);
  float fogDensity = 0.012;
  float dist = length(vWorldPos - uViewPos);
  float fogFactor = 1.0 - exp(-fogDensity * dist);
  fogFactor = clamp(fogFactor, 0.0, 0.55);  // 限制雾的最大强度

  // 混合雾效
  color = mix(color, fogColor, fogFactor);

  // 饱和度增强（提高色彩鲜艳度）
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  float saturation = 1.30;  // 饱和度倍率（1.0 = 原始，>1.0 = 增强）
  color = mix(vec3(luminance), color, saturation);

  // 对比度增强（亮部更亮，暗部更暗）
  color = (color - 0.5) * 1.20 + 0.5;  // 对比度倍率 1.20

  fragColor = vec4(color, clamp(vOpacity, 0.0, 1.0));
}
`;

const program = glsys.createProgram(VS, FS);
gl.useProgram(program);

const uProj = gl.getUniformLocation(program, 'uProj');
const uView = gl.getUniformLocation(program, 'uView');
const uModel = gl.getUniformLocation(program, 'uModel');
const uColor = gl.getUniformLocation(program, 'uColor');
const uOpacity = gl.getUniformLocation(program, 'uOpacity');
const uLightDir = gl.getUniformLocation(program, 'uLightDir');
const uLightSpaceMatrix = gl.getUniformLocation(program, 'uLightSpaceMatrix');
const uViewPos = gl.getUniformLocation(program, 'uViewPos');
const uShadowMap = gl.getUniformLocation(program, 'uShadowMap');

// 详细的 uniforms 检查
const missingUniforms = [];
if (!uProj) missingUniforms.push('uProj');
if (!uView) missingUniforms.push('uView');
if (!uModel) missingUniforms.push('uModel');
if (!uColor) missingUniforms.push('uColor');
if (!uOpacity) missingUniforms.push('uOpacity');
if (!uLightDir) missingUniforms.push('uLightDir');
if (!uLightSpaceMatrix) missingUniforms.push('uLightSpaceMatrix');
if (!uViewPos) missingUniforms.push('uViewPos');
if (!uShadowMap) missingUniforms.push('uShadowMap');

if (missingUniforms.length > 0) {
  console.warn('=== 着色器 Uniforms 警告（已降级处理）===');
  console.warn('缺失的 uniforms:', missingUniforms);
  console.warn('着色器程序链接状态:', gl.getProgramParameter(program, gl.LINK_STATUS));
  console.warn('着色器程序信息:', gl.getProgramInfoLog(program));
  console.warn('顶点着色器长度:', VS.length);
  console.warn('片段着色器长度:', FS.length);
  console.warn('⚠️ 部分着色器特性可能不可用，但游戏可以继续运行');
  // 不再抛出错误，改为降级处理（允许游戏继续运行）
}

const cube = buildCubeMesh();
const cylinder = buildCylinderMesh(18);
const vao = gl.createVertexArray();
if (!vao) throw new Error('VAO failed');
gl.bindVertexArray(vao);
const vbo = gl.createBuffer();
const ibo = gl.createBuffer();
if (!vbo || !ibo) throw new Error('Buffer failed');
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);
gl.bindVertexArray(null);
glsys.vao = vao;
glsys.indexCount = cube.indices.length;

const cylVao = gl.createVertexArray();
if (!cylVao) throw new Error('Cylinder VAO failed');
gl.bindVertexArray(cylVao);
const cylVbo = gl.createBuffer();
const cylIbo = gl.createBuffer();
if (!cylVbo || !cylIbo) throw new Error('Cylinder buffer failed');
gl.bindBuffer(gl.ARRAY_BUFFER, cylVbo);
gl.bufferData(gl.ARRAY_BUFFER, cylinder.vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylIbo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cylinder.indices, gl.STATIC_DRAW);
gl.bindVertexArray(null);
glsys.cylVao = cylVao;
glsys.cylIndexCount = cylinder.indices.length;

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.cullFace(gl.BACK);  // 网格使用 CCW 顶点顺序（正面），剔除背面

// ========== 阴影映射系统 ==========
const SHADOW_WIDTH = 2048;
const SHADOW_HEIGHT = 2048;

// 创建深度贴图帧缓冲
const depthMapFBO = gl.createFramebuffer();

// 创建深度贴图纹理
const depthMap = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthMap);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW_WIDTH, SHADOW_HEIGHT, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// 绑定深度贴图到帧缓冲
gl.bindFramebuffer(gl.FRAMEBUFFER, depthMapFBO);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthMap, 0);
gl.drawBuffers([gl.NONE]);
gl.readBuffer(gl.NONE);
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
  console.error('Shadow framebuffer incomplete');
}
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// 光源投影矩阵和视图矩阵
function createLightSpaceMatrix() {
  // 正交投影（用于定向光）
  const lightProj = new Float32Array(16);
  const near = -50.0;
  const far = 150.0;
  const size = 40.0;

  // 正交投影矩阵
  lightProj[0] = 2.0 / (size * 2);
  lightProj[1] = 0.0;
  lightProj[2] = 0.0;
  lightProj[3] = 0.0;
  lightProj[4] = 0.0;
  lightProj[5] = 2.0 / (size * 2);
  lightProj[6] = 0.0;
  lightProj[7] = 0.0;
  lightProj[8] = 0.0;
  lightProj[9] = 0.0;
  lightProj[10] = -2.0 / (far - near);
  lightProj[11] = 0.0;
  lightProj[12] = 0.0;
  lightProj[13] = 0.0;
  lightProj[14] = -(far + near) / (far - near);
  lightProj[15] = 1.0;

  // 光源视图矩阵（从光源位置看向场景）
  const lightView = new Float32Array(16);
  const lightPos = v3(50, 100, 50);
  const lightTarget = v3(0, 0, 0);
  const lightUp = v3(0, 1, 0);
  mat4LookAt(lightView, lightPos, lightTarget, lightUp);

  // 组合矩阵
  const lightSpaceMatrix = new Float32Array(16);
  mat4Mul(lightSpaceMatrix, lightProj, lightView);

  return lightSpaceMatrix;
}

const lightSpaceMatrix = createLightSpaceMatrix();
console.log('✨ Shadow mapping system initialized');
game.switchWeaponBySlot('secondary');

const proj = mat4Identity();
const view = mat4Identity();
const model = mat4Identity();
const tmpA = mat4Identity();
const tmpB = mat4Identity();

function setStatus(text, urgent) {
  game.lastStatusAt = nowMs();
  statusEl.textContent = text;
  statusEl.style.borderColor = urgent
    ? 'rgba(255, 77, 109, 0.55)'
    : 'rgba(255, 255, 255, 0.08)';
}

function updateHud() {
  // 性能优化：只在HP/护甲变化时更新DOM
  const currentHp = Math.max(0, Math.floor(game.hp));
  const currentArmor = Math.max(0, Math.floor(game.armor));
  
  if (hudDirtyFlags.health || lastHudValues.hp !== currentHp) {
    hpText.textContent = String(currentHp);
    hpBar.style.width = `${clamp01(game.hp / 100) * 100}%`;
    lastHudValues.hp = currentHp;
    hudDirtyFlags.health = false;
  }
  
  if (hudDirtyFlags.armor || lastHudValues.armor !== currentArmor) {
    arText.textContent = String(currentArmor);
    arBar.style.width = `${clamp01(game.armor / 100) * 100}%`;
    lastHudValues.armor = currentArmor;
    hudDirtyFlags.armor = false;
  }
  
  const w = game.getWeapon();
  
  // 金钱：降低更新频率
  const currentMoney = Math.floor(game.econ.money);
  if (hudDirtyFlags.money || lastHudValues.money !== currentMoney) {
    if (moneyTextEl) moneyTextEl.textContent = `$${currentMoney}`;
    lastHudValues.money = currentMoney;
    hudDirtyFlags.money = false;
  }
  
  // 弹药：只在变化时更新
  if (w) {
    if (hudDirtyFlags.ammo || lastHudValues.ammoMag !== w.mag || lastHudValues.ammoReserve !== w.reserve) {
      ammoText.textContent = `${w.mag} / ${w.reserve}`;
      lastHudValues.ammoMag = w.mag;
      lastHudValues.ammoReserve = w.reserve;
      hudDirtyFlags.ammo = false;
    }
  } else {
    ammoText.textContent = '-- / --';
  }
  if (fireModeHintEl) {
    const mode = game.fireModeAuto ? 'AUTO' : 'SEMI';
    const buyState = game.buyMenuOpen ? '关闭购买菜单' : '购买菜单';
    const equipLabel = getEquipLabel(game.currentEquip);
    const equipText = equipLabel ? ` · [投掷] ${equipLabel}` : '';
    
    // 显示倍率
    let scopeText = '';
    if (game.scope.active || game.scope.transitioning) {
      const zoom = game.scope.zoomLevel.toFixed(1);
      scopeText = ` · [镜] ${zoom}x`;
    }
    
    fireModeHintEl.textContent = `[B] ${buyState} · [1/2] 切枪 · [X] ${mode}${equipText}${scopeText}`;
  }

  // 存活人数：只在变化时更新
  if (hudDirtyFlags.aliveCount) {
    if (ctAliveEl) ctAliveEl.textContent = String(teamAliveCount('ct'));
    if (tAliveEl) tAliveEl.textContent = String(teamAliveCount('t'));
    hudDirtyFlags.aliveCount = false;
  }

  const isReloading = !!w && w.reloading;
  reloadWrap.classList.toggle('show', isReloading);
  if (isReloading) {
    const p = clamp01(1 - w.reloadLeft / Math.max(0.0001, w.reloadTotal));
    reloadBar.style.width = `${p * 100}%`;
    reloadText.textContent = `Reloading ${Math.ceil(w.reloadLeft * 10) / 10}s`;
  }

  if (game.hitmarker.t > 0) {
    hitmarkerEl.classList.add('show');
    hitmarkerEl.classList.toggle('head', game.hitmarker.head);
  } else {
    hitmarkerEl.classList.remove('show');
    hitmarkerEl.classList.remove('head');
  }

  // 准星大小基于散布计算
  const spread = w ? game.calculateSpread() : 0;
  const speed = Math.hypot(game.vel.x, game.vel.z);
  const moving = clamp01(speed / 6);
  const firing = clamp01(w ? w.kick : 0);
  const crouch = clamp01(game.crouchT);
  const air = game.onGround ? 0 : 1;
  const land = clamp01(game.landKick);
  
  // 准星扩散 = 基础大小 + 散布影响 + 后坐力影响 + 跳跃影响
  const spreadGap = spread * 4; // 散布对准星的影响
  const gap = 9 + spreadGap + moving * 12 + firing * 10 - crouch * 6 + air * 16 + land * 14;
  const len = 8 + moving * 4 + spreadGap * 0.5;
  const host = crosshairEl || hud;
  host.style.setProperty('--ch-gap', `${gap.toFixed(1)}px`);
  host.style.setProperty('--ch-len', `${len.toFixed(1)}px`);
  const aimingActive = game.isAiming && game.pointerLocked && game.playerAlive;
  hud.classList.toggle('hud--aiming', aimingActive);
  if (scopeOverlayEl) scopeOverlayEl.classList.toggle('show', aimingActive);

  const r = game.round;
  const showObj = game.mode === 'ai';
  objectiveEl.classList.toggle('hidden', !showObj);
  
  // 添加散布信息到 HUD
  const movementState = game.getMovementState();
  const spreadValue = w ? game.calculateSpread() : 0;
  const spreadInfo = w ? `  散布: ${spreadValue.toFixed(2)}° (${movementState})` : '';
  
  if (showObj) {
    const siteLabel = r.activeSite || 'A/B';
    const plantedLabel = r.plantSite || siteLabel;
    if (r.state === 'freeze') {
      objectiveText.textContent = `Freeze ${r.freezeLeft.toFixed(1)}s  $${game.econ.money}`;
      objectiveTimer.textContent = `Buy: B打开菜单 / 1-0购买枪械 / Q闪 W烟 E甲${spreadInfo}`;
      objectiveFill.style.width = `${clamp01(r.freezeLeft / Math.max(0.1, r.freezeTotal)) * 100}%`;
    } else if (r.state === 'post') {
      objectiveText.textContent = `${(r.winner || '').toUpperCase()} win - ${r.reason}`;
      objectiveTimer.textContent = `Next round ${r.postLeft.toFixed(1)}s${spreadInfo}`;
      objectiveFill.style.width = `${clamp01(r.postLeft / Math.max(0.1, r.postTotal)) * 100}%`;
    } else if (!r.bombPlanted) {
      objectiveText.textContent = game.team === 't' ? `Plant at ${siteLabel} (E hold)` : `Defend site ${siteLabel}`;
      objectiveTimer.textContent = `R ${r.roundLeft.toFixed(1)}s  $${game.econ.money}  SMK ${game.smoke.charges}  FLSH ${game.flashbang.charges}${spreadInfo}`;
      objectiveFill.style.width = `${clamp01(r.progress) * 100}%`;
    } else {
      objectiveText.textContent = game.team === 'ct' ? `Defuse ${plantedLabel} (E hold)` : `Bomb planted ${plantedLabel}`;
      objectiveTimer.textContent = `${Math.max(0, r.bombTimer).toFixed(1)}s  $${game.econ.money}${spreadInfo}`;
      objectiveFill.style.width = `${clamp01(r.bombTimer / r.bombTotal) * 100}%`;
    }
  }

  // 性能优化：只在购买菜单打开时渲染
  if (game.buyMenuOpen) {
    renderBuyMenu();
  }
}

function lockPointer() {
  audio.ensure();
  canvas.requestPointerLock();
}

function unlockPointer() {
  document.exitPointerLock();
}

// 使用事件管理器注册 canvas click - 防止内存泄漏
globalEventManager.add(
  canvas,
  'click',
  () => {
    if (!game.pointerLocked && game.mode === 'ai') lockPointer();
  },
  {},
  'canvas' // 命名空间：canvas
);

// 使用事件管理器注册 document pointerlockchange - 防止内存泄漏
globalEventManager.add(
  document,
  'pointerlockchange',
  () => {
    game.pointerLocked = document.pointerLockElement === canvas;
    setOverlayVisible(!game.pointerLocked);
    if (!game.pointerLocked && game.mode === 'ai') {
      closeBuyMenu();
      if (!game.ending && game.uiScreen !== 'result') {
        showScreen('pause');
        setStatus('Paused', false);
      }
    }
    if (game.pointerLocked) {
      setStatus('In game', false);
      if (isBuyAllowed()) openBuyMenu(true);
    }
    game.keys.clear();
    game.mouseDown = false;
    game.firePressed = false;
    game.isAiming = false;
    if (game.pointerLocked) canvas.focus();
  },
  {},
  'document' // 命名空间：document
);

// 使用事件管理器注册 document pointerlockerror - 防止内存泄漏
globalEventManager.add(
  document,
  'pointerlockerror',
  () => {
    setStatus('Pointer lock failed (try click canvas)', true);
  },
  {},
  'document' // 命名空间：document
);

// 使用事件管理器注册 document keydown - 防止内存泄漏
globalEventManager.add(
  document,
  'keydown',
  (e) => {
  if (e.code === 'F5') {
    e.preventDefault();
    const shown = radar.toggleSize();
    setStatus(`Radar ${shown > 0 ? `${shown}px` : 'hidden'}`, false);
    return;
  }

  if (e.code === 'KeyX' && game.pointerLocked) {
    e.preventDefault();
    game.fireModeAuto = !game.fireModeAuto;
    const mode = game.fireModeAuto ? 'AUTO' : 'SEMI';
    setStatus(`Fire mode: ${mode}`, false);
    return;
  }

  // 观战模式控制
  if (spectatorManager.isEnabled()) {
    // 空格键：切换观战目标
    if (e.code === 'Space') {
      e.preventDefault();
      spectatorManager.nextTarget();
      return;
    }
    // Q键：切换视角模式
    if (e.code === 'KeyQ') {
      e.preventDefault();
      spectatorManager.cycleMode();
      return;
    }
    // 自由视角模式下，WASD控制移动
    if (spectatorManager.getMode() === SPECTATOR_MODE.FREE_CAMERA) {
      if (
        e.code === 'KeyW' ||
        e.code === 'KeyA' ||
        e.code === 'KeyS' ||
        e.code === 'KeyD' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight'
      ) {
        e.preventDefault();
      }
    }
  }

  if (game.pointerLocked) {
    if (
      e.code === 'KeyW' ||
      e.code === 'KeyA' ||
      e.code === 'KeyS' ||
      e.code === 'KeyD' ||
      e.code === 'Space' ||
      e.code === 'ShiftLeft' ||
      e.code === 'ShiftRight' ||
      e.code === 'AltLeft' ||
      e.code === 'AltRight' ||
      e.code === 'KeyE' ||
      e.code === 'KeyF' ||
      e.code === 'KeyQ' ||
      e.code === 'Digit3' ||
      e.code === 'Digit4' ||
      e.code === 'Digit5' ||
      e.code === 'Digit6' ||
      e.code === 'Digit7' ||
      e.code === 'Digit8' ||
      e.code === 'Digit9' ||
      e.code === 'Digit0' ||
      e.code === 'KeyR' ||
      e.code === 'KeyG' ||
      e.code === 'KeyB' ||
      e.code === 'Digit1' ||
      e.code === 'Digit2'
    ) {
      e.preventDefault();
    }
  }

  if (game.pointerLocked && e.code === 'Escape' && game.buyMenuOpen) {
    closeBuyMenu();
    setStatus('购买菜单已关闭', false);
    e.preventDefault();
    return;
  }

  if (game.pointerLocked && game.buyMenuOpen) {
    if (e.code === 'KeyB') {
      closeBuyMenu();
      setStatus('购买菜单已关闭', false);
      e.preventDefault();
      return;
    }
    const buyItem = SHOP_ITEM_BY_KEY.get(e.code);
    if (buyItem) {
      tryBuyShopItem(buyItem);
      e.preventDefault();
      return;
    }
  }

  game.keys.add(e.code);
  if (e.code === 'Digit1') {
    if (game.weaponSlots.primary) game.switchWeaponBySlot('primary');
    else game.switchWeaponBySlot('secondary');
  }
  if (e.code === 'Digit2') game.switchWeaponBySlot('secondary');
  if (e.code === 'Digit3') game.switchWeaponBySlot('melee');
  // 4键：闪光弹
  if (e.code === 'Digit4') {
    game.switchEquip(game.currentEquip === 'flash' ? 'none' : 'flash');
  }
  // 5键：烟雾弹
  if (e.code === 'Digit5') {
    game.switchEquip(game.currentEquip === 'smoke' ? 'none' : 'smoke');
  }
  // 6键：燃烧弹
  if (e.code === 'Digit6') {
    game.switchEquip(game.currentEquip === 'molotov' ? 'none' : 'molotov');
  }
  if (e.code === 'KeyR') tryReload();
  if (e.code === 'KeyB') toggleBuyMenu();
  if (e.code === 'Escape' && game.pointerLocked) unlockPointer();
});

// 使用事件管理器注册 window keydown - 防止内存泄漏
globalEventManager.add(
  window,
  'keydown',
  (e) => {
    if (!(game.pointerLocked || game.mode === 'ai')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const code = e.code;
      const block =
        code === 'KeyW' ||
        code === 'KeyR' ||
        code === 'KeyS' ||
        code === 'KeyP' ||
        code === 'KeyL' ||
        code === 'KeyT' ||
        code === 'KeyN' ||
        code === 'KeyQ' ||
        code === 'Tab' ||
        code === 'F5' ||
        code === 'F6' ||
        code === 'F11';
      if (block) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  },
  { capture: true },
  'window' // 命名空间：window
);


// 使用事件管理器注册 document keyup - 防止内存泄漏
globalEventManager.add(
  document,
  'keyup',
  (e) => {
    game.keys.delete(e.code);
  },
  {},
  'document' // 命名空间：document
);

// 使用事件管理器注册 document mousedown - 防止内存泄漏
globalEventManager.add(
  document,
  'mousedown',
  (e) => {
    if (!game.pointerLocked) return;
    if (e.button === 0) {
      if (game.currentEquip === 'flash') {
        game.mouseDown = false;
        game.firePressed = false;
        deployFlashbang();
        return;
      }
      if (game.currentEquip === 'smoke') {
        game.mouseDown = false;
        game.firePressed = false;
        deploySmokeWall();
        return;
      }
      if (game.currentEquip === 'molotov') {
        game.mouseDown = false;
        game.firePressed = false;
        deployMolotov();
        return;
      }
      game.mouseDown = true;
      game.firePressed = true;
      return;
    }
    if (e.button === 2) {
      const w = game.getWeapon();
      if (!w) return;
      if (w.def.category === 'sniper') {
        e.preventDefault();
        // 开镜
        game.isAiming = true;
        game.scope.active = true;
        game.scope.targetZoom = w.def.zoomLevel || 4;
        game.scope.transitioning = true;
        return;
      }
      if (w.def.category === 'pistol') {
        e.preventDefault();
        w.silencerOn = !w.silencerOn;
        setStatus(`Silencer: ${w.silencerOn ? 'ON' : 'OFF'}`, false);
      }
    }
  },
  {},
  'document' // 命名空间：document
);

// 使用事件管理器注册 document mouseup - 防止内存泄漏
globalEventManager.add(
  document,
  'mouseup',
  (e) => {
    if (e.button === 0) game.mouseDown = false;
    if (e.button === 2) {
      e.preventDefault();
      // 关镜
      game.isAiming = false;
      game.scope.active = false;
      game.scope.targetZoom = 1;
      game.scope.transitioning = true;
    }
  },
  {},
  'document' // 命名空间：document
);

// 使用事件管理器注册 document contextmenu - 防止内存泄漏
globalEventManager.add(
  document,
  'contextmenu',
  (e) => {
    if (!game.pointerLocked) return;
    e.preventDefault();
  },
  {},
  'document' // 命名空间：document
);

const SWIPE_MIN_DISTANCE = 56;
const SWIPE_MAX_VERTICAL_DRIFT = 72;
let swipeStartX = 0;
let swipeStartY = 0;

overlay.addEventListener(
  'touchstart',
  (e) => {
    if (game.pointerLocked || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    swipeStartX = t.clientX;
    swipeStartY = t.clientY;
  },
  { passive: true }
);

overlay.addEventListener(
  'touchend',
  (e) => {
    if (game.pointerLocked || !e.changedTouches || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStartX;
    const dy = t.clientY - swipeStartY;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dy) > SWIPE_MAX_VERTICAL_DRIFT) return;
    swipeToScreen(dx < 0 ? 1 : -1);
  },
  { passive: true }
);

// 使用事件管理器注册 window blur - 防止内存泄漏
globalEventManager.add(
  window,
  'blur',
  () => {
    game.keys.clear();
    game.mouseDown = false;
    game.firePressed = false;
    game.isAiming = false;
    game.scope.active = false;
    game.scope.targetZoom = 1;
    game.scope.transitioning = true;
    game.mouseDX = 0;
    game.mouseDY = 0;
  },
  {},
  'window' // 命名空间：window
);

btnModeAI.addEventListener('click', () => {
  showScreen('ai');
});

btnModeOnline.addEventListener('click', () => {
  startOnlineMode();
});

btnBackToLobby.addEventListener('click', () => {
  showScreen('lobby');
});

btnStartAI.addEventListener('click', () => {
  audio.ensure();
  startAIMode();
});

btnLobbySettings.addEventListener('click', () => {
  game.showingSettingsFrom = 'lobby';
  showScreen('settings');
});

btnPauseSettings.addEventListener('click', () => {
  game.showingSettingsFrom = 'pause';
  showScreen('settings');
});

btnSettingsBack.addEventListener('click', () => {
  showScreen(game.showingSettingsFrom === 'pause' ? 'pause' : 'lobby');
});

btnResume.addEventListener('click', () => {
  if (game.mode === 'ai') lockPointer();
});

btnRestart.addEventListener('click', () => {
  if (game.mode === 'ai') {
    startAIMode();
  }
});
  },
  {},
  'document' // 命名空间：document
);

btnReturnLobby.addEventListener('click', () => {
  returnToLobby();
});

btnResultLobby.addEventListener('click', () => {
  returnToLobby();
});

btnResultRestart.addEventListener('click', () => {
  if (game.mode === 'ai') startAIMode();
});

function setActiveOption(group, value) {
  for (const [v, el] of Object.entries(group)) {
    if (!el) continue;
    el.classList.toggle('active', v === value);
  }
}

const teamButtons = { ct: teamCT, t: teamT };
const diffButtons = { easy: diffEasy, normal: diffNormal, hard: diffHard };
const modeButtons = { bomb: modeBomb };

function setTeam(value) {
  game.team = value;
  setActiveOption(teamButtons, value);
}

function setDifficulty(value) {
  game.difficulty = value;
  setActiveOption(diffButtons, value);
}

function setBotCount(value) {
  game.botCount = clamp(value, 1, 6);
  botCountText.textContent = `${game.botCount}v${game.botCount}`;
}

function setMatchMode(_value) {
  game.matchMode = 'bomb';
  setActiveOption(modeButtons, 'bomb');
}

teamCT.addEventListener('click', () => setTeam('ct'));
teamT.addEventListener('click', () => setTeam('t'));
diffEasy.addEventListener('click', () => setDifficulty('easy'));
diffNormal.addEventListener('click', () => setDifficulty('normal'));
diffHard.addEventListener('click', () => setDifficulty('hard'));
botMinus.addEventListener('click', () => setBotCount(game.botCount - 1));
botPlus.addEventListener('click', () => setBotCount(game.botCount + 1));

if (modeBomb) modeBomb.addEventListener('click', () => setMatchMode('bomb'));

function setStepValue(textEl, next) {
  textEl.textContent = String(next);
}

function stepVolume(textEl, delta) {
  const cur = Number(textEl.textContent);
  const next = clamp(cur + delta, 0, 100);
  setStepValue(textEl, next);
  applyVolumesFromUI();
}

function applyVolumesFromUI() {
  const m = Number(volMasterText.textContent) / 100;
  const s = Number(volSfxText.textContent) / 100;
  const mu = Number(volMusicText.textContent) / 100;
  audio.setVolumes(m, s, mu);
}

volMasterMinus.addEventListener('click', () => stepVolume(volMasterText, -5));
volMasterPlus.addEventListener('click', () => stepVolume(volMasterText, 5));
volSfxMinus.addEventListener('click', () => stepVolume(volSfxText, -5));
volSfxPlus.addEventListener('click', () => stepVolume(volSfxText, 5));
volMusicMinus.addEventListener('click', () => stepVolume(volMusicText, -5));
volMusicPlus.addEventListener('click', () => stepVolume(volMusicText, 5));

setTeam('ct');
setDifficulty('normal');
setBotCount(5);
setMatchMode('bomb');
applyVolumesFromUI();

// 使用事件管理器注册 document mousemove - 防止内存泄漏
globalEventManager.add(
  document,
  'mousemove',
  (e) => {
  // 观战模式下，自由视角需要鼠标控制
  if (spectatorManager.isEnabled() && spectatorManager.getMode() === SPECTATOR_MODE.FREE_CAMERA) {
    // 自由视角模式下，直接更新game.yaw和game.pitch用于观战
    const sens = 0.0022;
    game.yaw += e.movementX * sens;
    game.pitch -= e.movementY * sens;
    game.mouseDX = game.mouseDX * 0.6 + e.movementX * 0.4;
    game.mouseDY = game.mouseDY * 0.6 + e.movementY * 0.4;
    const maxPitch = Math.PI / 2 - 0.02;
    game.pitch = clamp(game.pitch, -maxPitch, maxPitch);
    return;
  }

  if (!game.pointerLocked) return;
  const sens = 0.0022;
  game.yaw += e.movementX * sens;
  game.pitch -= e.movementY * sens;
  game.mouseDX = game.mouseDX * 0.6 + e.movementX * 0.4;
  game.mouseDY = game.mouseDY * 0.6 + e.movementY * 0.4;
  const maxPitch = Math.PI / 2 - 0.02;
  game.pitch = clamp(game.pitch, -maxPitch, maxPitch);
  },
  {},
  'document' // 命名空间：document
);

function tryReload() {
  const w = game.getWeapon();
  if (w.reloading) return;
  if (w.mag >= w.def.magSize) return;
  if (w.reserve <= 0) {
    setStatus('No reserve ammo', true);
    return;
  }
  w.reloading = true;
  w.reloadTotal = w.def.reloadSec;
  w.reloadLeft = w.def.reloadSec;
  audio.reload();
  setStatus('Reloading...', false);
}

function playerAabb(pos) {
  const half = v3(0.3, 0.9, 0.3);
  const center = v3(pos.x, pos.y + half.y, pos.z);
  return aabbFromCenter(center, half);
}

function moveAndCollide(pos, delta, colliders) {
  let p = { x: pos.x, y: pos.y, z: pos.z };
  let onGround = false;

  const eps = 1e-4;

  if (delta.x !== 0) {
    p.x += delta.x;
    let a = playerAabb(p);
    for (const c of colliders) {
      if (!aabbIntersectsEps(a, c, eps)) continue;
      if (delta.x > 0) p.x = Math.min(p.x, c.min.x - 0.3);
      else p.x = Math.max(p.x, c.max.x + 0.3);
      a = playerAabb(p);
    }
  }

  if (delta.z !== 0) {
    p.z += delta.z;
    let a = playerAabb(p);
    for (const c of colliders) {
      if (!aabbIntersectsEps(a, c, eps)) continue;
      if (delta.z > 0) p.z = Math.min(p.z, c.min.z - 0.3);
      else p.z = Math.max(p.z, c.max.z + 0.3);
      a = playerAabb(p);
    }
  }

  if (delta.y !== 0) {
    p.y += delta.y;
    let a = playerAabb(p);
    for (const c of colliders) {
      if (!aabbIntersectsEps(a, c, eps)) continue;
      if (delta.y > 0) p.y = Math.min(p.y, c.min.y - 1.8);
      else {
        p.y = Math.max(p.y, c.max.y);
        onGround = true;
      }
      a = playerAabb(p);
    }
  }

  return { pos: p, onGround };
}

function rayBlockedBySmoke(ro, rd, maxDist) {
  for (const s of game.smoke.active) {
    const t = rayAabb(ro, rd, s.aabb);
    if (t !== null && t > 0 && t < maxDist) return true;
  }
  return false;
}

function updateWeapon(dt) {
  if (!game.playerAlive) return;
  if (isRoundFrozen()) return;

  const w = game.getWeapon();
  if (!w) return;
  if (w.cooldown > 0) w.cooldown = Math.max(0, w.cooldown - dt);
  if (w.kick > 0) w.kick = Math.max(0, w.kick - dt * 4.5);
  if (w.shot > 0) w.shot = Math.max(0, w.shot - dt * 14);
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 18);

  if (w.reloading) {
    w.reloadLeft -= dt;
    if (w.reloadLeft <= 0) {
      const needed = w.def.magSize - w.mag;
      const take = Math.min(needed, w.reserve);
      w.mag += take;
      w.reserve -= take;
      w.reloading = false;
      setStatus('Reloaded', false);
    }
    return;
  }

  if (w.def.kind === 4) {
    if (!game.firePressed) return;
    if (w.cooldown > 0) return;

    game.firePressed = false;
    w.cooldown = 0.5;

    const roKnife = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);
    const rdKnife = v3norm(forwardFromYawPitch(game.yaw, game.pitch));
    const maxKnifeDist = 2.0;
    let nearestBlock = maxKnifeDist;
    for (const c of game.colliders) {
      const t = rayAabb(roKnife, rdKnife, c);
      if (t !== null && t > 0 && t < nearestBlock) nearestBlock = t;
    }

    let knifeTarget = null;
    let knifeBestT = Math.min(maxKnifeDist, nearestBlock);
    for (const bot of game.bots) {
      if (!bot.alive) continue;
      if (bot.team === game.team) continue;
      const center = v3(bot.pos.x, bot.pos.y + bot.half.y, bot.pos.z);
      const aabb = aabbFromCenter(center, bot.half);
      const t = rayAabb(roKnife, rdKnife, aabb);
      if (t === null || t <= 0 || t > knifeBestT) continue;
      knifeBestT = t;
      knifeTarget = bot;
    }

    if (!knifeTarget) {
      setStatus('Miss', false);
      return;
    }

    knifeTarget.hp -= 50;
    audio.hit();
    recordFireTime();
    game.lastStatusAt = nowMs();
    game.hitmarker.t = 0.12;
    game.hitmarker.head = false;
    if (knifeTarget.hp <= 0) {
      knifeTarget.alive = false;
      game.aliveBotsCacheDirty = true;
      knifeTarget.respawnAt = nowMs() + 2500;
      setStatus('Bot down', false);
      game.stats.kills += 1;
      addMoney(game.econ.rewardKill);
    } else {
      setStatus('Hit: -50', false);
    }
    return;
  }

  const fireHeld = game.mouseDown && game.pointerLocked;
  const wantsFire = game.fireModeAuto ? fireHeld || game.firePressed : game.firePressed;
  if (!wantsFire) return;
  if (w.cooldown > 0) return;
  if (w.mag <= 0) {
    setStatus('Empty! Press R', true);
    w.cooldown = 0.15;
    game.firePressed = false;
    return;
  }

  w.mag -= 1;
  audio.shot(w.def.kind);
  w.cooldown = 60 / w.def.rpm;
  game.firePressed = false;
  w.shot = Math.min(1, w.shot + 0.95);
  w.flash = 1;

  const recoilBase = w.def.recoil * (0.6 + Math.random() * 0.5);
  const recoil = recoilBase;
  game.pitch += recoil * 0.012;
  game.yaw += (Math.random() - 0.5) * recoil * 0.007;
  w.kick = Math.min(1, w.kick + 0.35);

  // 使用新的散布系统
  const spreadDeg = game.calculateSpread();
  const spread = (spreadDeg * Math.PI) / 180;
  const sx = (Math.random() - 0.5) * spread;
  const sy = (Math.random() - 0.5) * spread;
  const fwdCam = v3norm(forwardFromYawPitch(game.yaw, game.pitch));
  const upCam = v3(0, 1, 0);
  const rightCam = v3norm(v3cross(upCam, fwdCam));
  const camUp = v3norm(v3cross(fwdCam, rightCam));
  const camPos = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);

  const wpn = game.getWeapon();
  const kick = wpn.kick;
  const speed = Math.hypot(game.vel.x, game.vel.z);

  const crouchAcc = lerp(1, 0.22, game.crouchT);
  const moveAcc = 1 + clamp01(speed / 6) * 3.6;
  const airAcc = game.onGround ? 1 : 2.2;
  const landAcc = 1 + game.landKick * 1.8;
  const spreadAcc = crouchAcc * moveAcc;
  const weaponAcc = clamp((120 - w.def.accuracy) / 100, 0.24, 1.2);
  const finalAcc = spreadAcc * airAcc * landAcc * weaponAcc;
  const aimDirAcc = v3norm(forwardFromYawPitch(game.yaw + sx * finalAcc, game.pitch + sy * finalAcc));
  const bobT = nowMs() * 0.001;
  const bobA = 0.02 * clamp01(speed / 6);
  const bobY = Math.sin(bobT * 9.5) * bobA;
  const bobX = Math.cos(bobT * 9.5) * bobA;
  const swayPosX = clamp(game.mouseDX * 0.0005, -0.03, 0.03);
  const swayPosY = clamp(game.mouseDY * 0.0005, -0.03, 0.03);

  const muzzle = v3add(
    camPos,
    v3add(
      v3add(v3scale(rightCam, 0.55 + bobX + swayPosX), v3scale(camUp, -0.45 + bobY + kick * 0.03 + swayPosY)),
      v3scale(fwdCam, 0.95)
    )
  );

  const roAim = camPos;
  const rdAim = aimDirAcc;
  const roTrace = muzzle;
  const rdTrace = aimDirAcc;

  let bestT = Infinity;
  let bestTarget = null;
  let bestZone = '';
  let bestMult = 1;

  for (const c of game.colliders) {
    const t = rayAabb(roAim, rdAim, c);
    if (t === null) continue;
    if (t > 0 && t < bestT) bestT = t;
  }

  if (rayBlockedBySmoke(roAim, rdAim, bestT)) {
    bestT = Math.min(bestT, 12);
    bestTarget = null;
  }

  // AABB 四叉树宽相 + OBB 部位窄相
  collisionPerf.rayCasts++;
  const maxTargetDist = Math.min(90, Number.isFinite(bestT) ? bestT : 90);
  const queryAabb = raySweepAabb2(roAim, rdAim, maxTargetDist, 1.4);
  const targetTree = game.collisionQuadtree;
  targetTree.clear();

  for (let i = 0; i < game.bots.length; i++) {
    const bot = game.bots[i];
    if (!bot || !bot.alive) continue;
    if (bot.team === game.team) continue;

    const basePos = v3(bot.pos.x, bot.pos.y, bot.pos.z);
    const entry = {
      id: `bot:${i}`,
      type: 'bot',
      bot,
      basePos,
      position: basePos,
      yaw: safeNumber(bot.yaw, 0),
    };
    const broadAabb2 = aabb3To2(playerBroadPhaseAabb(basePos));
    targetTree.insert(entry, broadAabb2);
  }

  if (game.mode === 'online') {
    for (const [playerId, playerData] of otherPlayers) {
      if (!playerData || playerData.deathHidden) continue;
      const hp = readSyncedHp(playerData, 100);
      if (playerData.alive === false || hp <= 0) continue;
      if (playerData.team === game.team) continue;
      if (!playerData.position) continue;

      const pos = playerData.position;
      const basePos = v3(pos.x, pos.y, pos.z);
      const entry = {
        id: `player:${playerId}`,
        type: 'player',
        playerId,
        playerData,
        basePos,
        position: pos,
        yaw: safeNumber(playerData.yaw, 0),
      };
      const broadAabb2 = aabb3To2(playerBroadPhaseAabb(basePos));
      targetTree.insert(entry, broadAabb2);
    }
  }

  const broadCandidates = targetTree.query(queryAabb);
  collisionPerf.broadPhaseCandidates += broadCandidates.length;

  for (const candidate of broadCandidates) {
    const distToTarget = v3len(v3sub(roAim, candidate.basePos));
    if (distToTarget > 95) {
      collisionPerf.earlyExits++;
      continue;
    }

    const hitboxes = buildPlayerHitboxes(candidate.basePos, candidate.yaw);
    for (const hb of hitboxes) {
      collisionPerf.narrowPhaseTests++;
      const t = rayObbLocal(roAim, rdAim, hb.c, hb.r, hb.u, hb.f, hb.h);
      if (t === null || t <= 0 || t >= bestT) continue;

      bestT = t;
      bestTarget = candidate;
      bestZone = hb.zone;
      bestMult = hb.mult;

      // 命中头部后跳过该目标剩余 hitbox。
      if (hb.zone === 'head') {
        collisionPerf.earlyExits++;
        break;
      }
    }
  }

  if (bestTarget) {
    // 距离衰减伤害计算
    const targetPos = bestTarget.position || bestTarget.basePos || bestTarget.pos;
    const distance = targetPos ? v3len(v3sub(roAim, targetPos)) : 0;
    const maxRange = 80; // 最大有效射程
    const falloffStart = 20; // 开始衰减的距离
    const falloffMult = distance < falloffStart
      ? 1.0
      : distance > maxRange
        ? 0.1
        : 1.0 - ((distance - falloffStart) / (maxRange - falloffStart)) * 0.9;

    const dmg = Math.floor(w.def.damage * bestMult * falloffMult);

    const isHeadshot = bestZone === 'head';
    const zoneFx = getHitZoneFeedback(bestZone);

    // 多人模式：发送伤害事件到服务器
    if (bestTarget.type === 'player') {
      const weaponType = w && w.def ? w.def.id : 'unknown';
      // 标准化伤害区域命名
      const normalizedZone = bestZone === 'torso' ? 'body' : bestZone;
      multiplayer.sendHit(bestTarget.playerId, dmg, weaponType, {
        hitZone: normalizedZone || 'body',
        headshot: isHeadshot
      });
      audio.hit();
      recordFireTime();
      game.lastStatusAt = nowMs();
      game.hitmarker.t = 0.12;
      game.hitmarker.head = isHeadshot;
      spawnDamageNumberForPlayer(bestTarget.playerId, dmg, { crit: isHeadshot, color: zoneFx.color });
      const targetName = (bestTarget.playerData && bestTarget.playerData.name) || 'Player';
      setStatus(`Hit ${targetName} [${zoneFx.label}]: -${dmg}`, false);
    } else {
      // AI 模式：本地处理bot伤害
      const bot = bestTarget.bot;
      if (!bot) {
        setStatus('Miss', false);
      } else {
        bot.hp -= dmg;
        audio.hit();
        recordFireTime();
        game.lastStatusAt = nowMs();
        game.hitmarker.t = 0.12;
        game.hitmarker.head = isHeadshot;
        spawnDamageNumber(v3(bot.pos.x, bot.pos.y, bot.pos.z), dmg, { crit: isHeadshot, color: zoneFx.color });
        if (bot.hp <= 0) {
          bot.alive = false;
          game.aliveBotsCacheDirty = true;
          bot.respawnAt = nowMs() + 2500;
          setStatus('Bot down', false);
          game.stats.kills += 1;
          if (bot.team !== game.team) addMoney(game.econ.rewardKill);
        } else {
          setStatus(`Hit [${zoneFx.label}]: -${dmg}`, false);
        }
      }
    }
  } else {
    setStatus('Miss', false);
  }

  const endAim = bestT < Infinity ? v3add(roAim, v3scale(rdAim, Math.min(bestT, 80))) : v3add(roAim, v3scale(rdAim, 80));
  const endTrace = endAim;
  const tracer = obtainTracer();
  tracer.a = roTrace;
  tracer.b = endTrace;
  tracer.travel = 0;
  tracer.speed = 110;
  tracer.life = 0.32;
  tracer.hue = 0.55;
  game.tracers.push(tracer);

  const shellPos = v3add(
    camPos,
    v3add(v3scale(rightCam, 0.42), v3add(v3scale(camUp, -0.22), v3scale(fwdCam, 0.62)))
  );
  const rv = 2.4 + Math.random() * 1.2;
  const uv = 1.6 + Math.random() * 1.0;
  const fv = 0.8 + Math.random() * 0.7;
  const shellVel = v3add(v3scale(rightCam, rv), v3add(v3scale(camUp, uv), v3scale(fwdCam, fv)));
  const shell = obtainShell();
  shell.pos = shellPos;
  shell.vel = shellVel;
  shell.life = 1.6;
  game.shells.push(shell);
}

function updateShells(dt) {
  const g = -16;
  for (const s of game.shells) {
    s.vel.y += g * dt;
    s.pos = v3add(s.pos, v3scale(s.vel, dt));
    if (s.pos.y < 0.02) {
      s.pos.y = 0.02;
      s.vel.y *= -0.25;
      s.vel.x *= 0.65;
      s.vel.z *= 0.65;
    }
    s.life -= dt;
  }
  // 原地移除死亡弹壳并回收到对象池
  for (let i = game.shells.length - 1; i >= 0; i--) {
    if (game.shells[i].life <= 0) {
      recycleShell(game.shells[i]);
      game.shells.splice(i, 1);
    }
  }
}

function updateTracers(dt) {
  for (const t of game.tracers) {
    t.life -= dt;
    t.travel = Math.min(1, (t.travel || 0) + dt * (t.speed || 120) / Math.max(0.001, v3len(v3sub(t.b, t.a))));
  }
  // 原地移除死亡曳光弹并回收到对象池
  for (let i = game.tracers.length - 1; i >= 0; i--) {
    if (game.tracers[i].life <= 0) {
      recycleTracer(game.tracers[i]);
      game.tracers.splice(i, 1);
    }
  }
}

function updateHitmarker(dt) {
  if (game.hitmarker.t > 0) game.hitmarker.t = Math.max(0, game.hitmarker.t - dt);
}

function updateBombMode(dt) {
  if (game.mode !== 'ai') return;
  const r = game.round;

  if (r.state === 'freeze') {
    r.freezeLeft = Math.max(0, r.freezeLeft - dt);
    if (r.freezeLeft <= 0) {
      r.state = 'running';
      setStatus(`Round ${r.roundNum} live`, false);
    }
    return;
  }

  if (r.state === 'post') {
    r.postLeft = Math.max(0, r.postLeft - dt);
    if (r.postLeft <= 0) {
      if (game.score.ct >= game.score.limit || game.score.t >= game.score.limit) {
        game.ending = true;
        const winner = game.score.ct >= game.score.limit ? 'CT' : 'T';
        showResult(`${winner} Victory`, `Final score CT ${game.score.ct} : ${game.score.t} T`);
        unlockPointer();
        return;
      }
      prepareNewBombRound();
    }
    return;
  }

  const fallbackSite =
    getSiteByKey(r.activeSite) ||
    getSiteByKey(r.plantSite) ||
    getSiteByKey('A');
  if (!fallbackSite) return;

  const siteAtPlayer = detectSiteAtPosition(game.pos);
  let liveSite = fallbackSite;
  if (!r.bombPlanted && game.team === 't' && siteAtPlayer) {
    r.activeSite = siteAtPlayer.key;
    liveSite = siteAtPlayer;
  }
  if (r.bombPlanted) {
    const plantedSite = getSiteByKey(r.plantSite);
    if (plantedSite) liveSite = plantedSite;
  }

  setRoundSite(liveSite);

  const site = liveSite.pos;
  const p = v3(game.pos.x, 0, game.pos.z);
  const d = v3sub(p, v3(site.x, 0, site.z));
  const inSite = v3len(d) <= liveSite.radius;
  const holdingE = game.keys.has('KeyE');

  r.roundLeft = Math.max(0, r.roundLeft - dt);

  if (!r.bombPlanted) {
    if (inSite) {
      if (game.team === 't') setStatus(`Hold E to plant ${liveSite.key}`, false);
      else setStatus(`Protect site ${r.activeSite || liveSite.key}`, false);
    }
  } else {
    if (inSite) {
      if (game.team === 'ct') setStatus(`Hold E to defuse ${r.plantSite || liveSite.key}`, false);
      else setStatus('Defend the bomb', false);
    }
  }

  if (!r.bombPlanted) {
    r.tPlanting = false;
    if (game.team === 't' && inSite && holdingE) {
      r.plantLeft = r.plantLeft > 0 ? r.plantLeft : 3.0;
      r.plantLeft -= dt;
      r.progress = clamp01(1 - r.plantLeft / 3.0);
      if (r.plantLeft <= 0) {
        r.bombPlanted = true;
        r.bombTimer = r.bombTotal;
        r.bombPos = v3(site.x, site.y, site.z);
        r.plantSite = liveSite.key;
        r.activeSite = liveSite.key;
        r.progress = 0;
        setStatus('Bomb planted', false);
      }
    } else {
      r.plantLeft = 0;
      r.progress = Math.max(0, r.progress - dt * 2);
    }

    const aliveT = teamAliveCount('t');
    const aliveCT = teamAliveCount('ct');
    if (aliveT === 0) {
      endBombRound('ct', 'T eliminated before plant');
    }
    if (aliveCT === 0) {
      endBombRound('t', 'CT eliminated');
    }
    if (r.roundLeft <= 0) {
      endBombRound('ct', 'Time up before plant');
    }
    return;
  }

  r.bombTimer -= dt;
  if (r.bombTimer <= 0) {
    endBombRound('t', 'Bomb exploded');
    return;
  }

  if (game.team === 'ct' && inSite && holdingE) {
    r.ctDefusing = true;
    r.defuseLeft = r.defuseLeft > 0 ? r.defuseLeft : 5.0;
    r.defuseLeft -= dt;
    r.progress = clamp01(1 - r.defuseLeft / 5.0);
    if (r.defuseLeft <= 0) {
      endBombRound('ct', 'Bomb defused');
      return;
    }
  } else {
    r.ctDefusing = false;
    r.defuseLeft = 0;
    r.progress = Math.max(0, r.progress - dt * 2);
  }

  const aliveT = teamAliveCount('t');
  if (aliveT === 0) {
    endBombRound('ct', 'T eliminated after plant');
    return;
  }

  const aliveCT = teamAliveCount('ct');
  if (aliveCT === 0) {
    endBombRound('t', 'CT eliminated after plant');
  }
}

function updatePlayer(dt) {
  if (!game.playerAlive) {
    game.vel.x = 0;
    game.vel.z = 0;
    return;
  }

  if (isRoundFrozen()) {
    game.vel.x = 0;
    game.vel.z = 0;
    game.vel.y = 0;
    return;
  }

  const crouching = game.keys.has('ShiftLeft') || game.keys.has('ShiftRight');
  const sprint = game.keys.has('AltLeft') || game.keys.has('AltRight');
  const w = game.getWeapon();
  const weaponDef = w && w.def ? w.def : null;
  const speed = weaponDef && weaponDef.speed ? weaponDef.speed : 6.0;
  const holdingThrowable =
    !!weaponDef &&
    (weaponDef.category === 'throwable' ||
      weaponDef.category === 'grenade' ||
      weaponDef.slot === 'grenade' ||
      weaponDef.slot === 'utility' ||
      weaponDef.id === 'flash' ||
      weaponDef.id === 'smoke');
  let baseSpeed = speed * (sprint ? 6.8 / 6.0 : 4.8 / 6.0);
  if (holdingThrowable) baseSpeed *= 0.9;
  
  // 开镜时移动速度降低50%
  if (game.scope.active) {
    baseSpeed *= 0.5;
  }
  
  const maxSpeed = crouching ? baseSpeed * 0.55 : baseSpeed;
  const accel = game.onGround ? 45 : 18;
  const friction = game.onGround ? 14 : 1;

  const fwd = forwardFromYawPitch(game.yaw, 0);
  const right = rightFromYaw(game.yaw);
  let wish = v3(0, 0, 0);
  if (game.keys.has('KeyW')) wish = v3add(wish, fwd);
  if (game.keys.has('KeyS')) wish = v3sub(wish, fwd);
  if (game.keys.has('KeyD')) wish = v3add(wish, right);
  if (game.keys.has('KeyA')) wish = v3sub(wish, right);
  wish.y = 0;
  const wishDir = v3norm(wish);

  const hv = v3(game.vel.x, 0, game.vel.z);
  const currentSpeed = v3dot(hv, wishDir);
  const addSpeed = maxSpeed - currentSpeed;
  if (addSpeed > 0) {
    const accelSpeed = Math.min(addSpeed, accel * dt * maxSpeed);
    game.vel.x += wishDir.x * accelSpeed;
    game.vel.z += wishDir.z * accelSpeed;
  }

  if (game.onGround) {
    const speed = Math.hypot(game.vel.x, game.vel.z);
    if (speed > 0.0001) {
      const drop = speed * friction * dt;
      const newSpeed = Math.max(0, speed - drop);
      const k = newSpeed / speed;
      game.vel.x *= k;
      game.vel.z *= k;
    }
  }

  if (game.onGround && game.keys.has('Space')) {
    game.vel.y = 6.3;
    game.onGround = false;
  }

  game.vel.y += -18.5 * dt;
  game.vel.y = Math.max(game.vel.y, -30);

  const delta = v3scale(game.vel, dt);
  const moved = moveAndCollide(game.pos, delta, game.colliders);
  game.pos = moved.pos;
  if (moved.onGround) {
    if (!game.onGround && game.vel.y < -4) {
      game.landKick = Math.min(1, game.landKick + clamp01((-game.vel.y - 4) / 10));
    }
    game.onGround = true;
    if (game.vel.y < 0) game.vel.y = 0;
  } else {
    game.onGround = false;
  }

  game.pos.x = clamp(game.pos.x, -game.mapBounds, game.mapBounds);
  game.pos.z = clamp(game.pos.z, -game.mapBounds, game.mapBounds);

  const targetC = crouching ? 1 : 0;
  game.crouchT = lerp(game.crouchT, targetC, clamp01(dt * 12));

  if (game.landKick > 0) game.landKick = Math.max(0, game.landKick - dt * 3.2);
}

function updateTargets(dt) {
  // 性能优化：节流控制，降低更新频率
  const now = performance.now();
  if (now - lastTargetUpdateTime < TARGET_UPDATE_INTERVAL) {
    return; // 跳过本帧更新
  }
  lastTargetUpdateTime = now;
  
  const tNow = nowMs();
  for (const tgt of game.targets) {
    if (!tgt.alive) {
      if (tNow >= tgt.respawnAt) {
        tgt.alive = true;
        game.aliveBotsCacheDirty = true;
        tgt.hp = tgt.maxHp;
      }
      continue;
    }
    const phase = (tNow * 0.001 + tgt.id * 0.77) % (Math.PI * 2);
    const targetX = tgt.id % 2 === 0 ? 8 : -8;
    tgt.pos.x = lerp(tgt.pos.x, targetX + Math.sin(phase) * 1.5, clamp01(dt * 0.8));
  }
}

// ==================== A* 寻路系统 ====================

/**
 * 构建导航网格，标记障碍物
 */
function buildNavGrid() {
  // 重置网格为全 0（可通行）
  for (let x = 0; x < NAV_GRID_SIZE; x++) {
    for (let z = 0; z < NAV_GRID_SIZE; z++) {
      game.grid[x][z] = 0;
    }
  }

  // 标记所有 solid boxes 为障碍物
  for (const box of game.boxes) {
    if (!box.solid) continue;
    // 忽略地面和过大的盒子（地图边界）
    if (box.scale.x > 50 || box.scale.z > 50) continue;

    // 将盒子转换为网格坐标
    const minX = Math.floor((box.pos.x - box.scale.x / 2 - NAV_GRID_ORIGIN) / NAV_GRID_SIZE * NAV_GRID_SIZE);
    const maxX = Math.ceil((box.pos.x + box.scale.x / 2 - NAV_GRID_ORIGIN) / NAV_GRID_SIZE * NAV_GRID_SIZE);
    const minZ = Math.floor((box.pos.z - box.scale.z / 2 - NAV_GRID_ORIGIN) / NAV_GRID_SIZE * NAV_GRID_SIZE);
    const maxZ = Math.ceil((box.pos.z + box.scale.z / 2 - NAV_GRID_ORIGIN) / NAV_GRID_SIZE * NAV_GRID_SIZE);

    // 标记障碍物（扩展 1 格，给 AI 留出空间）
    for (let gx = Math.max(0, minX - 1); gx <= Math.min(NAV_GRID_SIZE - 1, maxX + 1); gx++) {
      for (let gz = Math.max(0, minZ - 1); gz <= Math.min(NAV_GRID_SIZE - 1, maxZ + 1); gz++) {
        game.grid[gx][gz] = 1; // 1 = 障碍物
      }
    }
  }
}

/**
 * 世界坐标转网格坐标
 */
function worldToGrid(x, z) {
  const gx = Math.floor((x - NAV_GRID_ORIGIN) / (game.mapBounds * 2 / NAV_GRID_SIZE));
  const gz = Math.floor((z - NAV_GRID_ORIGIN) / (game.mapBounds * 2 / NAV_GRID_SIZE));
  return { x: clamp(gx, 0, NAV_GRID_SIZE - 1), z: clamp(gz, 0, NAV_GRID_SIZE - 1) };
}

/**
 * 网格坐标转世界坐标
 */
function gridToWorld(gx, gz) {
  const x = NAV_GRID_ORIGIN + (gx + 0.5) * (game.mapBounds * 2 / NAV_GRID_SIZE);
  const z = NAV_GRID_ORIGIN + (gz + 0.5) * (game.mapBounds * 2 / NAV_GRID_SIZE);
  return v3(x, 0, z);
}

/**
 * 检查网格点是否可通行
 */
function isWalkable(gx, gz) {
  if (gx < 0 || gx >= NAV_GRID_SIZE || gz < 0 || gz >= NAV_GRID_SIZE) return false;
  return game.grid[gx][gz] === 0;
}

/**
 * A* 启发式函数（曼哈顿距离）
 */
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

/**
 * 获取节点的邻居（4方向）
 */
function getNeighbors(node) {
  const neighbors = [];
  const directions = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
  ];

  for (const dir of directions) {
    const neighbor = { x: node.x + dir.x, z: node.z + dir.z };
    if (isWalkable(neighbor.x, neighbor.z)) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

/**
 * A* 寻路算法
 * @param {Object} start - 起点 {x, z} 世界坐标
 * @param {Object} end - 终点 {x, z} 世界坐标
 * @returns {Array} - 路径点数组，如果找不到路径则返回 null
 */
function findPath(start, end) {
  const startGrid = worldToGrid(start.x, start.z);
  const endGrid = worldToGrid(end.x, end.z);

  // 如果终点不可达，尝试找最近的可通行点
  if (!isWalkable(endGrid.x, endGrid.z)) {
    let found = false;
    for (let r = 1; r < 5 && !found; r++) {
      for (let dx = -r; dx <= r && !found; dx++) {
        for (let dz = -r; dz <= r && !found; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          if (isWalkable(endGrid.x + dx, endGrid.z + dz)) {
            endGrid.x += dx;
            endGrid.z += dz;
            found = true;
          }
        }
      }
    }
    if (!found) return null;
  }

  // A* 算法
  const openSet = [startGrid];
  const closedSet = new Set();
  const cameFrom = new Map();

  const gScore = new Map();
  const fScore = new Map();

  const key = (n) => `${n.x},${n.z}`;
  gScore.set(key(startGrid), 0);
  fScore.set(key(startGrid), heuristic(startGrid, endGrid));

  let iterations = 0;
  const maxIterations = 1000; // 防止无限循环

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // 找到 fScore 最小的节点
    let current = openSet[0];
    let currentKey = key(current);
    for (const node of openSet) {
      const nodeKey = key(node);
      if ((fScore.get(nodeKey) || Infinity) < (fScore.get(currentKey) || Infinity)) {
        current = node;
        currentKey = nodeKey;
      }
    }

    // 到达终点
    if (current.x === endGrid.x && current.z === endGrid.z) {
      // 重建路径
      const path = [];
      let curr = current;
      while (cameFrom.has(key(curr))) {
        path.unshift(gridToWorld(curr.x, curr.z));
        curr = cameFrom.get(key(curr));
      }
      return path.length > 0 ? path : [gridToWorld(endGrid.x, endGrid.z)];
    }

    // 移除当前节点
    openSet.splice(openSet.indexOf(current), 1);
    closedSet.add(currentKey);

    // 检查邻居
    for (const neighbor of getNeighbors(current)) {
      const neighborKey = key(neighbor);
      if (closedSet.has(neighborKey)) continue;

      const tentativeGScore = (gScore.get(currentKey) || 0) + 1; // 每步代价为 1

      if (!openSet.some((n) => n.x === neighbor.x && n.z === neighbor.z)) {
        openSet.push(neighbor);
      } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
        continue;
      }

      cameFrom.set(neighborKey, current);
      gScore.set(neighborKey, tentativeGScore);
      fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, endGrid));
    }
  }

  // 找不到路径
  return null;
}

/**
 * 获取随机巡逻点
 */
function getRandomPatrolPoint() {
  const attempts = 20;
  for (let i = 0; i < attempts; i++) {
    const x = (Math.random() - 0.5) * game.mapBounds * 1.6;
    const z = (Math.random() - 0.5) * game.mapBounds * 1.6;
    const grid = worldToGrid(x, z);
    if (isWalkable(grid.x, grid.z)) {
      return v3(x, 0, z);
    }
  }
  // 默认返回地图中心
  return v3(0, 0, 0);
}

// ==================== AI 更新 ====================

function updateBots(dt) {
  // 性能优化：节流控制，降低更新频率
  const now = performance.now();
  if (now - lastBotUpdateTime < BOT_UPDATE_INTERVAL) {
    return; // 跳过本帧更新
  }
  lastBotUpdateTime = now;
  
  if (isRoundFrozen()) return;
  
  // 如果 Worker 不可用或正在处理上一帧，回退到主线程
  if (!botWorkerReady || pendingBotUpdate) {
    updateBotsMainThread(dt);
    return;
  }
  
  // 使用 Worker 进行 Bot AI 计算
  const startTime = performance.now();
  
  // 准备发送给 Worker 的数据
  const workerData = {
    bots: JSON.parse(JSON.stringify(game.bots)), // 深拷贝 bot 状态
    playerPos: { x: game.pos.x, y: game.pos.y, z: game.pos.z },
    playerCrouchT: game.crouchT,
    playerAlive: game.playerAlive,
    playerTeam: game.team,
    colliders: game.colliders,
    roundState: {
      bombPlanted: game.round.bombPlanted,
      activeSite: game.round.activeSite,
      plantSite: game.round.plantSite,
      sitePos: game.round.sitePos,
      siteRadius: game.round.siteRadius,
      state: game.round.state
    },
    mapBounds: game.mapBounds,
    grid: game.grid,
    sites: game.round.sites,
    routeNodes: game.routeNodes,
    dt: dt,
    now: nowMs()
  };
  
  // 发送数据到 Worker
  botWorker.postMessage({
    type: 'update',
    data: workerData
  });
  
  pendingBotUpdate = true;
  workerPerformanceMonitor.mainThreadTime = performance.now() - startTime;
}

// 主线程版本的 updateBots（用于回退）
function updateBotsMainThread(dt) {

  const tNow = nowMs();
  const playerEye = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);
  // Use cached alive bots list to avoid creating new array every frame
  if (game.aliveBotsCacheDirty) {
    game.aliveBotsCache = game.bots.filter((x) => x.alive);
    game.aliveBotsCacheDirty = false;
  }
  const aliveBots = game.aliveBotsCache;
  for (const b of game.bots) {
    if (!b.alive) continue;

    if (b.shootCooldown > 0) b.shootCooldown = Math.max(0, b.shootCooldown - dt);

    const bw = b.weapon;
    if (bw.reloading) {
      bw.reloadLeft -= dt;
      if (bw.reloadLeft <= 0) {
        const take = Math.min(bw.magSize - bw.mag, bw.reserve);
        bw.mag += take;
        bw.reserve -= take;
        bw.reloading = false;
      }
    }

    const lookFrom = v3(b.pos.x, b.pos.y + 1.6, b.pos.z);

    let bestEnemy = null;
    let bestEnemyDist = Infinity;
    for (const other of aliveBots) {
      if (other.id === b.id) continue;
      if (other.team === b.team) continue;
      const oEye = v3(other.pos.x, other.pos.y + 1.6, other.pos.z);
      const d = v3sub(oEye, lookFrom);
      const L = v3len(d);
      if (L < bestEnemyDist) {
        bestEnemyDist = L;
        bestEnemy = other;
      }
    }

    let targetType = 'none';
    let targetBot = null;
    let targetPos = null;
    let dist = Infinity;

    if (bestEnemy) {
      targetType = 'bot';
      targetBot = bestEnemy;
      targetPos = v3(bestEnemy.pos.x, bestEnemy.pos.y + 1.6, bestEnemy.pos.z);
      dist = bestEnemyDist;
    }

    if (game.playerAlive && game.team !== b.team) {
      const dPlayer = v3len(v3sub(playerEye, lookFrom));
      if (dPlayer < dist) {
        targetType = 'player';
        targetBot = null;
        targetPos = playerEye;
        dist = dPlayer;
      }
    }

    if (!game.round.bombPlanted && b.team === 't') {
      const pick = getSiteByKey(b.objectiveSite) || getSiteByKey(game.round.activeSite) || getSiteByKey('A');
      if (pick && !game.round.activeSite) game.round.activeSite = pick.key;
      if (pick) b.objectiveSite = pick.key;
      if (pick) setRoundSite(pick);
      const site = pick ? pick.pos : game.round.sitePos;
      const dSite = v3len(v3sub(v3(site.x, lookFrom.y, site.z), lookFrom));
      if (dSite < dist) {
        targetType = 'site';
        targetBot = null;
        targetPos = v3(site.x, lookFrom.y, site.z);
        dist = dSite;
      }
    }

    if (game.round.bombPlanted && b.team === 'ct') {
      const defSite = getSiteByKey(game.round.plantSite) || getSiteByKey(game.round.activeSite) || getSiteByKey('A');
      if (defSite) setRoundSite(defSite);
      const site = defSite ? defSite.pos : game.round.sitePos;
      const dSite = v3len(v3sub(v3(site.x, lookFrom.y, site.z), lookFrom));
      if (dSite < dist) {
        targetType = 'site';
        targetBot = null;
        targetPos = v3(site.x, lookFrom.y, site.z);
        dist = dSite;
      }
    }

    if (!targetPos) continue;

    const toTarget = v3sub(targetPos, lookFrom);
    const dir = dist > 1e-5 ? v3scale(toTarget, 1 / dist) : v3(0, 0, 1);
    b.yaw = Math.atan2(dir.x, dir.z);
    let occluded = false;
    for (const c of game.colliders) {
      const t = rayAabb(lookFrom, dir, c);
      if (t !== null && t > 0 && t < dist) {
        occluded = true;
        break;
      }
    }

    const shouldChase = dist < 18 && !occluded;
    b.state = shouldChase ? 'chase' : 'patrol';

    // 反应时间逻辑：让 Bot 行为更像人类
    const hasValidTarget = shouldChase && targetType !== 'site';
    if (hasValidTarget && b.firstSawEnemyTime === null) {
      // 首次发现敌人，记录时间戳
      b.firstSawEnemyTime = tNow;
    }
    if (!hasValidTarget) {
      // 目标丢失，重置反应时间状态
      b.firstSawEnemyTime = null;
    }
    // 计算是否可以开火（带随机抖动 0.7~1.3 倍）
    const reactionTime = b.reactionTime || 180;
    const actualReactionTime = reactionTime * (0.7 + Math.random() * 0.6);
    const canShoot = b.firstSawEnemyTime !== null && (tNow - b.firstSawEnemyTime) >= actualReactionTime;

    let wish = v3(0, 0, 0);
    if (b.state === 'chase') {
      // 追逐模式：使用 A* 寻路追踪目标
      if (!b.navPath || b.navIndex >= b.navPath.length || !b.navGoal || v3len(v3sub(targetPos, b.navGoal)) > 2) {
        // 需要重新计算路径
        b.navGoal = targetPos;
        b.navPath = findPath(v3(b.pos.x, 0, b.pos.z), v3(targetPos.x, 0, targetPos.z));
        b.navIndex = 0;
      }

      if (b.navPath && b.navIndex < b.navPath.length) {
        const nextPoint = b.navPath[b.navIndex];
        const toNext = v3sub(nextPoint, v3(b.pos.x, 0, b.pos.z));
        const distNext = v3len(toNext);

        if (distNext < 1.0) {
          b.navIndex++; // 到达路径点，移动到下一个
        } else {
          wish = v3norm(toNext);
        }
      } else {
        // A* 失败，直接追踪
        wish = v3(dir.x, 0, dir.z);
      }

      if (dist < 4.2) wish = v3scale(wish, -0.25);
    } else {
      // 巡逻模式：使用 A* 寻路到随机点
      if (!b.navPath || b.navIndex >= b.navPath.length) {
        // 需要找到新的巡逻目标
        const target = getRandomPatrolPoint();
        b.navGoal = target;
        b.navPath = findPath(v3(b.pos.x, 0, b.pos.z), target);
        b.navIndex = 0;
      }

      if (b.navPath && b.navIndex < b.navPath.length) {
        const nextPoint = b.navPath[b.navIndex];
        const toNext = v3sub(nextPoint, v3(b.pos.x, 0, b.pos.z));
        const distNext = v3len(toNext);

        if (distNext < 1.0) {
          b.navIndex++; // 到达路径点，移动到下一个
        } else {
          wish = v3norm(toNext);
        }
      } else {
        // A* 失败，使用旧的巡逻逻辑作为后备
        const nodes = game.routeNodes[b.team] || game.routeNodes.ct;
        const targetNode = nodes[b.patrolNode % nodes.length];
        const toNode = v3sub(targetNode, v3(b.pos.x, 0, b.pos.z));
        const distNode = v3len(toNode);
        if (distNode < 1.5) {
          b.patrolNode = (b.patrolNode + 1 + Math.floor(Math.random() * 2)) % nodes.length;
        }
        wish = v3norm(toNode);
      }
    }
    wish = v3norm(wish);

    const speed = b.state === 'chase' ? 2.8 : 1.6;
    b.vel.x = wish.x * speed;
    b.vel.z = wish.z * speed;
    b.vel.y += -18.5 * dt;
    b.vel.y = Math.max(b.vel.y, -30);

    const next = moveAndCollide(v3(b.pos.x, b.pos.y, b.pos.z), v3scale(b.vel, dt), game.colliders);
    b.pos = next.pos;
    if (next.onGround && b.vel.y < 0) b.vel.y = 0;

    b.pos.x = clamp(b.pos.x, -game.mapBounds + 0.3, game.mapBounds - 0.3);
    b.pos.z = clamp(b.pos.z, -game.mapBounds + 0.3, game.mapBounds - 0.3);

    const onSite = v3len(v3sub(v3(b.pos.x, 0, b.pos.z), v3(game.round.sitePos.x, 0, game.round.sitePos.z))) <= game.round.siteRadius;
    if (!game.round.bombPlanted && b.team === 't' && onSite) {
      game.round.tPlanting = true;
    }
    if (game.round.bombPlanted && b.team === 'ct' && onSite) {
      game.round.ctDefusing = true;
    }

    if (shouldChase && dist < 24 && !occluded && b.shootCooldown <= 0 && targetType !== 'site' && canShoot) {
      if (!bw.reloading && bw.mag <= 0) {
        bw.reloading = true;
        bw.reloadTotal = bw.reloadSec;
        bw.reloadLeft = bw.reloadSec;
      }

      if (!bw.reloading && bw.mag > 0) {
        bw.mag -= 1;

        const cooldown = 60 / bw.rpm;
        b.shootCooldown = cooldown * (1.45 + Math.random() * 0.6);

        const spread = (bw.spreadDeg * Math.PI) / 180;
        const sx = (Math.random() - 0.5) * spread;
        const sy = (Math.random() - 0.5) * spread;
        const shotDir = v3norm(forwardFromYawPitch(b.yaw + sx, sy));

        const muzzle = v3add(lookFrom, v3add(v3scale(v3norm(v3cross(v3(0, 1, 0), shotDir)), 0.18), v3scale(shotDir, 0.55)));
        const end = v3add(muzzle, v3scale(shotDir, Math.min(dist + 4, 80)));

        let blocked = false;
        for (const ally of aliveBots) {
          if (!ally.alive) continue;
          if (ally.id === b.id) continue;
          if (ally.team !== b.team) continue;
          const center = v3(ally.pos.x, ally.pos.y + ally.half.y, ally.pos.z);
          const aabb = aabbFromCenter(center, ally.half);
          const tHit = rayAabb(muzzle, shotDir, aabb);
          if (tHit !== null && tHit > 0 && tHit < dist) {
            blocked = true;
            break;
          }
        }

        if (!blocked && game.playerAlive && game.team === b.team) {
          const pAabb = playerAabb(game.pos);
          const tHit = rayAabb(muzzle, shotDir, pAabb);
          if (tHit !== null && tHit > 0 && tHit < dist) {
            blocked = true;
          }
        }

        if (blocked) {
          b.shootCooldown = 0.18;
          continue;
        }

        const botTracer = obtainTracer();
        botTracer.a = muzzle;
        botTracer.b = end;
        botTracer.travel = 0;
        botTracer.speed = 95;
        botTracer.life = 0.32;
        botTracer.hue = 0.02;
        game.tracers.push(botTracer);

        const hitChance = clamp01((26 - dist) / 26);
        if (Math.random() < 0.02 + 0.11 * hitChance) {
          if (targetType === 'player') {
            if (game.team === b.team) {
              b.shootCooldown = 0.18;
              continue;
            }
            // 护甲减伤逻辑
            const botDamage = bw.damage
            let actualDamage = botDamage
            const hasArmor = game.armor > 0
            if (hasArmor && botDamage > 0) {
              const armorAbsorb = Math.min(game.armor, botDamage * 0.3)
              actualDamage = botDamage - armorAbsorb
              game.armor = Math.max(0, game.armor - armorAbsorb * 0.5)
            }

            game.hp -= actualDamage;
            if (game.hp <= 0) {
              if (game.mode === 'online') {
                handleLocalPlayerDeath('You died')
              } else {
                game.playerAlive = false;
                game.hp = 0;
                game.vel = v3(0, 0, 0);
                setStatus('You died', true);
                game.stats.deaths += 1;
              }
            } else {
              setStatus('Hit by bot', true);
            }
          } else if (targetType === 'bot' && targetBot) {
            if (targetBot.team === b.team) {
              b.shootCooldown = 0.18;
              continue;
            }
            targetBot.hp -= bw.damage;
            if (targetBot.hp <= 0) {
              targetBot.alive = false;
              game.aliveBotsCacheDirty = true;
              if (game.round.bombPlanted) {
              }
            }
          }
        }
      } else {
        b.shootCooldown = 0.18;
      }
    }
  }

}

// ========== 视锥裁剪系统（Frustum Culling）==========

/**
 * 从视图投影矩阵创建视锥裁剪器
 * @param {number[]} viewProj - 4x4视图投影矩阵
 * @returns {object} 裁剪器对象，包含6个裁剪平面
 */
function makeFrustumCuller(viewProj) {
  const planes = [];
  
  // 提取6个裁剪平面（左、右、下、上、近、远）
  // 每个平面表示为 { normal: v3, distance: number }
  
  // 左平面
  planes.push({
    normal: v3(
      viewProj[3] + viewProj[0],
      viewProj[7] + viewProj[4],
      viewProj[11] + viewProj[8]
    ),
    distance: viewProj[15] + viewProj[12]
  });
  
  // 右平面
  planes.push({
    normal: v3(
      viewProj[3] - viewProj[0],
      viewProj[7] - viewProj[4],
      viewProj[11] - viewProj[8]
    ),
    distance: viewProj[15] - viewProj[12]
  });
  
  // 下平面
  planes.push({
    normal: v3(
      viewProj[3] + viewProj[1],
      viewProj[7] + viewProj[5],
      viewProj[11] + viewProj[9]
    ),
    distance: viewProj[15] + viewProj[13]
  });
  
  // 上平面
  planes.push({
    normal: v3(
      viewProj[3] - viewProj[1],
      viewProj[7] - viewProj[5],
      viewProj[11] - viewProj[9]
    ),
    distance: viewProj[15] - viewProj[13]
  });
  
  // 近平面
  planes.push({
    normal: v3(
      viewProj[3] + viewProj[2],
      viewProj[7] + viewProj[6],
      viewProj[11] + viewProj[10]
    ),
    distance: viewProj[15] + viewProj[14]
  });
  
  // 远平面
  planes.push({
    normal: v3(
      viewProj[3] - viewProj[2],
      viewProj[7] - viewProj[6],
      viewProj[11] - viewProj[10]
    ),
    distance: viewProj[15] - viewProj[14]
  });
  
  // 归一化平面法向量
  for (const plane of planes) {
    const len = v3len(plane.normal);
    if (len > 0.0001) {
      plane.normal = v3scale(plane.normal, 1 / len);
      plane.distance /= len;
    }
  }
  
  return { planes };
}

/**
 * 测试球体是否在视锥内
 * @param {object} culler - 裁剪器对象
 * @param {{x: number, y: number, z: number}} center - 球心
 * @param {number} radius - 球半径
 * @returns {boolean} 是否可见
 */
function isSphereVisible(culler, center, radius) {
  const p = center;
  const r = radius;
  
  for (const plane of culler.planes) {
    // 计算球心到平面的距离
    const dist = plane.normal.x * p.x + plane.normal.y * p.y + plane.normal.z * p.z + plane.distance;
    
    // 如果距离小于负半径，球体完全在平面外侧，不可见
    if (dist < -r) {
      return false;
    }
  }
  
  return true;
}

/**
 * 测试线段是否在视锥内（保守估计）
 * @param {object} culler - 裁剪器对象
 * @param {{x: number, y: number, z: number}} start - 线段起点
 * @param {{x: number, y: number, z: number}} end - 线段终点
 * @returns {boolean} 是否可见
 */
function isSegmentVisible(culler, start, end) {
  // 使用保守策略：测试两端点和中点
  // 如果任一点可见，则整个线段可见
  const mid = v3scale(v3add(start, end), 0.5);
  
  // 使用很小的半径进行点测试
  return isSphereVisible(culler, start, 0.01) ||
         isSphereVisible(culler, end, 0.01) ||
         isSphereVisible(culler, mid, 0.01);
}

// ========== 对象池化系统（Object Pooling）==========

/**
 * 从对象池获取弹壳对象
 */
function obtainShell() {
  return game.shellPool.pop() || {};
}

/**
 * 回收弹壳对象到对象池
 * 容量限制：超过 MAX_SHELL_POOL_SIZE 时丢弃对象（让 GC 回收）
 */
function recycleShell(shell) {
  if (game.shellPool.length < MAX_SHELL_POOL_SIZE) {
    game.shellPool.push(shell);
  }
  // 超过容量则丢弃，让垃圾回收器回收
}

/**
 * 从对象池获取曳光弹对象
 */
function obtainTracer() {
  return game.tracerPool.pop() || {};
}

/**
 * 回收曳光弹对象到对象池
 * 容量限制：超过 MAX_TRACER_POOL_SIZE 时丢弃对象（让 GC 回收）
 */
function recycleTracer(tracer) {
  if (game.tracerPool.length < MAX_TRACER_POOL_SIZE) {
    game.tracerPool.push(tracer);
  }
  // 超过容量则丢弃，让垃圾回收器回收
}

// ========== 基础绘图原语 ==========

/**
 * 绘制轴对齐的盒子
 * @param {{x: number, y: number, z: number}} pos - 盒子位置
 * @param {{x: number, y: number, z: number}} scale - 盒子缩放
 * @param {{x: number, y: number, z: number}} color - RGB颜色
 * @param {number} opacity - 不透明度 (0-1)
 */
function drawBox(pos, scale, color, opacity = 1) {
  mat4FromTranslation(tmpA, pos);
  mat4FromScale(tmpB, scale);
  mat4Mul(model, tmpA, tmpB);
  gl.uniformMatrix4fv(uModel, false, model);
  gl.uniform3f(uColor, color.x, color.y, color.z);
  if (uOpacity) gl.uniform1f(uOpacity, clamp01(opacity));
  gl.drawElements(gl.TRIANGLES, glsys.indexCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * 绘制有方向的盒子
 * @param {{x: number, y: number, z: number}} pos - 盒子位置
 * @param {{x: number, y: number, z: number}} right - 右方向向量
 * @param {{x: number, y: number, z: number}} up - 上方向向量
 * @param {{x: number, y: number, z: number}} forward - 前方向向量
 * @param {{x: number, y: number, z: number}} scale - 盒子缩放
 * @param {{x: number, y: number, z: number}} color - RGB颜色
 * @param {number} opacity - 不透明度 (0-1)
 */
function drawOrientedBox(pos, right, up, forward, scale, color, opacity = 1) {
  mat4FromBasisTRS(model, right, up, forward, pos, scale);
  gl.uniformMatrix4fv(uModel, false, model);
  gl.uniform3f(uColor, color.x, color.y, color.z);
  if (uOpacity) gl.uniform1f(uOpacity, clamp01(opacity));
  gl.drawElements(gl.TRIANGLES, glsys.indexCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * 绘制有方向的圆柱体
 * @param {{x: number, y: number, z: number}} pos - 圆柱体位置
 * @param {{x: number, y: number, z: number}} right - 右方向向量
 * @param {{x: number, y: number, z: number}} up - 上方向向量
 * @param {{x: number, y: number, z: number}} forward - 前方向向量
 * @param {{x: number, y: number, z: number}} scale - 圆柱体缩放
 * @param {{x: number, y: number, z: number}} color - RGB颜色
 * @param {number} opacity - 不透明度 (0-1)
 */
function drawOrientedCylinder(pos, right, up, forward, scale, color, opacity = 1) {
  if (!glsys.cylVao || !glsys.cylIndexCount) return;
  mat4FromBasisTRS(model, right, up, forward, pos, scale);
  gl.uniformMatrix4fv(uModel, false, model);
  gl.uniform3f(uColor, color.x, color.y, color.z);
  if (uOpacity) gl.uniform1f(uOpacity, clamp01(opacity));
  gl.bindVertexArray(glsys.cylVao);
  gl.drawElements(gl.TRIANGLES, glsys.cylIndexCount, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(glsys.vao);
}

/**
 * 绘制弹道追踪线
 * @param {{x: number, y: number, z: number}} a - 起点位置
 * @param {{x: number, y: number, z: number}} b - 终点位置
 * @param {{x: number, y: number, z: number}} color - RGB颜色
 */
function drawTracer(a, b, color) {
  const mid = v3scale(v3add(a, b), 0.5);
  const d = v3sub(b, a);
  const len = v3len(d);
  if (len < 0.001) return;
  const f = v3scale(d, 1 / len);
  const up = v3(0, 1, 0);
  let r = v3cross(up, f);
  if (v3len(r) < 0.001) r = v3(1, 0, 0);
  r = v3norm(r);
  const u = v3norm(v3cross(f, r));
  drawOrientedBox(mid, r, u, f, v3(0.009, 0.009, len), color);
}

function drawWorld() {
  glsys.resize();
  const aspect = glsys.width / Math.max(1, glsys.height);
  
  // 平滑的瞄准镜缩放过渡
  if (game.scope.transitioning) {
    const diff = game.scope.targetZoom - game.scope.zoomLevel;
    game.scope.zoomLevel += diff * 0.15; // 过渡速度
    
    if (Math.abs(diff) < 0.01) {
      game.scope.zoomLevel = game.scope.targetZoom;
      game.scope.transitioning = false;
    }
  }
  
  // 根据缩放级别计算 FOV
  const baseFov = 70;
  const fovDeg = baseFov / game.scope.zoomLevel;
  
  mat4Perspective(proj, (fovDeg * Math.PI) / 180, aspect, 0.05, 120);

  // 观战模式摄像机
  let camPos, fwd, camTarget;
  if (spectatorManager.isEnabled()) {
    const spectatorCam = spectatorManager.update(0, game.keys, game.mouseDX, game.mouseDY);
    camPos = v3(spectatorCam.pos.x, spectatorCam.pos.y, spectatorCam.pos.z);
    fwd = forwardFromYawPitch(spectatorCam.yaw, spectatorCam.pitch);
    camTarget = v3add(camPos, fwd);
  } else {
    camPos = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);
    fwd = forwardFromYawPitch(game.yaw, game.pitch);
    camTarget = v3add(camPos, fwd);
  }
  mat4LookAt(view, camPos, camTarget, v3(0, 1, 0));

  // 创建视锥裁剪器（用于剔除不可见物体）
  const viewProj = mat4Mul(mat4Identity(), proj, view);
  const culler = makeFrustumCuller(viewProj);

  const tSky = nowMs() * 0.00005;
  // 更鲜明的天蓝色天空
  const skyA = v3(0.55, 0.82, 0.94);  // 天蓝色
  const skyB = v3(0.70, 0.89, 0.97);  // 浅天蓝色
  gl.clearColor(lerp(skyA.x, skyB.x, 0.7), lerp(skyA.y, skyB.y, 0.7), lerp(skyA.z, skyB.z, 0.7), 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);

  // 启用雾效（通过多边形偏移实现简单的距离雾）
  // 注意：WebGL2 没有固定管线的雾效，这里通过清除颜色模拟
  const fogColor = v3(0.65, 0.80, 0.90);  // 雾的颜色（天蓝色调）
  const fogDensity = 0.012;  // 雾的密度

  gl.uniformMatrix4fv(uProj, false, proj);
  gl.uniformMatrix4fv(uView, false, view);
  gl.uniform3f(uLightDir, -0.35, -1.0, 0.25);

  // 设置新的光照相关 uniform
  gl.uniformMatrix4fv(uLightSpaceMatrix, false, lightSpaceMatrix);
  gl.uniform3f(uViewPos, camPos.x, camPos.y, camPos.z);
  gl.uniform1i(uShadowMap, 0); // 纹理单元 0

  gl.bindVertexArray(glsys.vao);

  // 地图盒体（使用视锥裁剪）
  for (const b of game.boxes) {
    // 使用盒体的最大尺寸作为包围球半径
    const radius = Math.max(b.scale.x, b.scale.y, b.scale.z) * 1.5;
    if (isSphereVisible(culler, b.pos, radius)) {
      drawBox(b.pos, b.scale, b.color);
    }
  }

  // 云层（使用视锥裁剪）
  for (let i = 0; i < 22; i++) {
    const x = -game.mapBounds + ((i * 9) % (game.mapBounds * 2));
    const z = -game.mapBounds + ((i * 13) % (game.mapBounds * 2));
    const y = 10.5 + Math.sin(tSky + i) * 0.25;
    const puff = 1.2 + ((i % 3) * 0.45);
    const cloudPos = v3(x, y, z);
    const cloudRadius = Math.max(3.6 * puff, 2.2 * puff);
    if (isSphereVisible(culler, cloudPos, cloudRadius)) {
      const c = v3(0.96, 0.98, 1.0);
      drawBox(cloudPos, v3(3.6 * puff, 0.6, 2.2 * puff), c);
    }
  }

  if (game.mode === 'ai') {
    const planted = game.round.bombPlanted;
    // Bomb sites（使用视锥裁剪）
    for (const site of game.round.sites) {
      const sitePos = v3(site.pos.x, site.pos.y, site.pos.z);
      if (isSphereVisible(culler, sitePos, 2.5)) {
        const active = site.key === game.round.activeSite;
        const plantedHere = site.key === game.round.plantSite;
        const neutral = v3(0.92, 0.94, 0.98);
        const activeCol = site.key === 'A' ? v3(0.60, 0.75, 1.0) : v3(0.95, 0.80, 0.55);
        const plantedCol = v3(1.0, 0.55, 0.40);
        const padCol = plantedHere ? plantedCol : active ? activeCol : neutral;
        drawBox(sitePos, v3(1.8, 0.06, 1.8), padCol);
      }
    }
    // Bomb（使用视锥裁剪）
    if (planted) {
      const bombPos = v3(game.round.bombPos.x, game.round.bombPos.y + 0.12, game.round.bombPos.z);
      if (isSphereVisible(culler, bombPos, 0.5)) {
        drawBox(bombPos, v3(0.22, 0.16, 0.36), v3(1.0, 0.30, 0.20));
      }
    }
  }

  // AI 烟雾（使用视锥裁剪）
  if (game.mode === 'ai' && game.smoke.active.length > 0) {
    for (const s of game.smoke.active) {
      const smokePos = v3(s.pos.x, s.pos.y, s.pos.z);
      const smokeRadius = Math.max(s.scale.x, s.scale.y, s.scale.z);
      if (isSphereVisible(culler, smokePos, smokeRadius)) {
        drawBox(smokePos, v3(s.scale.x, s.scale.y, s.scale.z), v3(0.62, 0.66, 0.72));
        drawBox(v3(s.pos.x, s.pos.y + 0.95, s.pos.z), v3(s.scale.x * 0.7, s.scale.y * 0.6, s.scale.z * 0.7), v3(0.78, 0.8, 0.84));
      }
    }
  }

  function drawHumanoid(pos, yaw, hp, maxHp, palette, fallT = 0) {
    const safeMaxHp = Math.max(1, safeNumber(maxHp, 100))
    const hurt = 1 - clamp01(safeNumber(hp, 0) / safeMaxHp);
    const baseCol = v3(
      lerp(palette.body.x, palette.hurt.x, hurt),
      lerp(palette.body.y, palette.hurt.y, hurt),
      lerp(palette.body.z, palette.hurt.z, hurt)
    );
    const up = v3(0, 1, 0);
    const fall = clamp01(fallT || 0);
    const easedFall = easeOutQuad(fall)
    const bodyHeight = lerp(1.8, 0.3, easedFall)
    const heightScale = bodyHeight / 1.8
    const opacity = 1 - easedFall
    let f = v3norm(forwardFromYawPitch(yaw, 0));
    const r = v3norm(v3cross(up, f));
    let u = v3(0, 1, 0);

    if (fall > 0) {
      const angle = (Math.PI * 0.5) * easedFall
      const ca = Math.cos(angle)
      const sa = Math.sin(angle)
      const baseU = u
      const baseF = f
      u = v3norm(v3add(v3scale(baseU, ca), v3scale(baseF, sa)))
      f = v3norm(v3add(v3scale(baseF, ca), v3scale(baseU, -sa)))
    }

    const scaleY = (value) => value * heightScale
    const base = v3(pos.x, pos.y - 0.68 * easedFall, pos.z);
    const hip = v3add(base, v3(0, scaleY(0.95), 0));

    drawOrientedBox(v3add(hip, v3(0, scaleY(0.25), 0)), r, u, f, v3(0.55, 0.75 * heightScale, 0.3), baseCol, opacity);
    drawOrientedBox(v3add(hip, v3(0, scaleY(0.78), 0.02)), r, u, f, v3(0.5, 0.45 * heightScale, 0.32), baseCol, opacity);

    const headCol = palette.head;
    drawOrientedBox(v3add(hip, v3(0, scaleY(1.18), 0.02)), r, u, f, v3(0.32, 0.32 * heightScale, 0.32), headCol, opacity);

    const armCol = palette.arm;
    drawOrientedBox(v3add(hip, v3(0.42, scaleY(0.78), 0.02)), r, u, f, v3(0.18, 0.55 * heightScale, 0.18), armCol, opacity);
    drawOrientedBox(v3add(hip, v3(-0.42, scaleY(0.78), 0.02)), r, u, f, v3(0.18, 0.55 * heightScale, 0.18), armCol, opacity);

    const legCol = palette.leg;
    drawOrientedBox(v3add(base, v3(0.18, scaleY(0.45), 0)), r, u, f, v3(0.22, 0.9 * heightScale, 0.22), legCol, opacity);
    drawOrientedBox(v3add(base, v3(-0.18, scaleY(0.45), 0)), r, u, f, v3(0.22, 0.9 * heightScale, 0.22), legCol, opacity);

    const gunCol = palette.gun;
    drawOrientedBox(v3add(hip, v3(0.18, scaleY(0.78), 0.48)), r, u, f, v3(0.16, 0.12 * heightScale, 0.62), gunCol, opacity);
    return fall >= 1
  }

  for (const bot of game.bots) {
    if (!bot.alive) continue;
    // Bot 模型（使用视锥裁剪）
    const botPos = bot.pos;
    if (!isSphereVisible(culler, v3(botPos.x, botPos.y + 0.9, botPos.z), 1.2)) continue;
    
    const team = normalizeTeam(bot.team)
    const teamColorV3 = TEAM_VISUALS[team].v3
    const teamColor = v3(teamColorV3.x, teamColorV3.y, teamColorV3.z)
    const pal = {
      body: teamColor,
      hurt: v3(0.95, 0.22, 0.24),
      head: v3(teamColor.x * 0.55, teamColor.y * 0.55, teamColor.z * 0.55),
      arm: v3(teamColor.x * 0.8, teamColor.y * 0.8, teamColor.z * 0.8),
      leg: v3(teamColor.x * 0.6, teamColor.y * 0.6, teamColor.z * 0.6),
      gun: v3(0.12, 0.12, 0.14),
    };
    drawHumanoid(bot.pos, bot.yaw, bot.hp, bot.maxHp, pal);
  }

  // Draw other players in multiplayer mode
  if (game.mode === 'online') {
    for (const [playerId, playerData] of otherPlayers) {
      const pos = playerData.position
      if (!pos || playerData.deathHidden) {
        removeHealthBar(playerId)
        continue
      }
      
      // 在线玩家模型（使用视锥裁剪）
      const playerPos = v3(pos.x, pos.y + 0.9, pos.z);
      if (!isSphereVisible(culler, playerPos, 1.2)) continue;
      
      const rotation = playerData.rotation || {}

      // 根据阵营设置颜色
      const team = normalizeTeam(playerData.team)
      const teamColorV3 = TEAM_VISUALS[team].v3
      const teamColor = v3(teamColorV3.x, teamColorV3.y, teamColorV3.z)

      const pal = {
        body: teamColor,
        hurt: v3(0.95, 0.22, 0.24),
        head: v3(teamColor.x * 0.55, teamColor.y * 0.55, teamColor.z * 0.55),
        arm: v3(teamColor.x * 0.8, teamColor.y * 0.8, teamColor.z * 0.8),
        leg: v3(teamColor.x * 0.6, teamColor.y * 0.6, teamColor.z * 0.6),
        gun: v3(0.12, 0.12, 0.14),
      }

      // Convert rotation to yaw (pitch is used for looking up/down, yaw for left/right)
      const yaw = rotation.y || 0
      const hp = readSyncedHp(playerData, 100)
      const alive = playerData.alive !== false && hp > 0
      const deathAt = toPerformanceTimestamp(playerData.deathAt, nowMs())
      const animDuration = normalizeAnimDurationMs(playerData.animDuration)
      const fallbackFallT = clamp01((nowMs() - deathAt) / animDuration)
      const fallT = alive ? 0 : clamp01(safeNumber(playerData.fallT, fallbackFallT))
      const canHide = drawHumanoid(
        v3(pos.x, pos.y, pos.z),
        yaw,
        hp,
        100,
        pal,
        fallT
      )

      if (!alive && canHide) {
        playerData.deathHidden = true
        removeHealthBar(playerId)
      }
    }
  }

  // 观战模式下不渲染玩家武器（除非是第一人称模式）
  if (spectatorManager.isEnabled() && spectatorManager.getMode() !== SPECTATOR_MODE.FIRST_PERSON) {
    // 跳过武器渲染，继续渲染其他元素
    const w = game.getWeapon();
    const kick = w.kick;
    const worldUp = v3(0, 1, 0);
    const camRight = v3norm(v3cross(worldUp, fwd));
    const camUp = v3norm(v3cross(fwd, camRight));

    // 继续渲染弹壳和曳光弹（使用视锥裁剪）
    for (const s of game.shells) {
      // 弹壳裁剪测试
      if (!isSphereVisible(culler, s.pos, 0.2)) continue;
      const c = v3(0.65, 0.55, 0.2);
      drawBox(s.pos, v3(0.06, 0.04, 0.1), c);
    }

    for (const t of game.tracers) {
      const k = clamp01(t.life / 0.32);
      const hue = t.hue || 0.55;
      const baseCol =
        hue < 0.1
          ? v3(1.0 * k, 0.28 + 0.28 * k, 0.24)
          : v3(0.28 + 0.72 * k, 0.92 * k, 1.0 * k);

      const travel = clamp01(t.travel || 0);
      const segLen = 1.4;
      const dir = v3sub(t.b, t.a);
      const L = v3len(dir);
      if (L > 0.001) {
        const f = v3scale(dir, 1 / L);
        const tip = v3add(t.a, v3scale(f, L * travel));
        const tail = v3add(tip, v3scale(f, -Math.min(segLen, L * travel)));
        
        // 曳光弹线段裁剪测试
        if (!isSegmentVisible(culler, tail, tip)) continue;
        
        drawTracer(tail, tip, baseCol);

        if ((t.hue || 0.55) >= 0.1) {
          gl.disable(gl.CULL_FACE);
          gl.disable(gl.DEPTH_TEST);
          const glow = v3(baseCol.x * 0.6, baseCol.y * 0.6, baseCol.z * 0.6);
          drawOrientedBox(
            v3scale(v3add(tail, tip), 0.5),
            v3norm(v3cross(v3(0, 1, 0), f)),
            v3norm(v3cross(f, v3norm(v3cross(v3(0, 1, 0), f)))),
            f,
            v3(0.02, 0.02, Math.min(segLen, v3len(v3sub(tip, tail))) * 1.1),
            glow
          );
          gl.enable(gl.DEPTH_TEST);
          gl.enable(gl.CULL_FACE);
        }
      }
    }

    gl.bindVertexArray(null);
    return;
  }

  const w = game.getWeapon();
  const kick = w.kick;
  const worldUp = v3(0, 1, 0);
  const camRight = v3norm(v3cross(worldUp, fwd));
  const camUp = v3norm(v3cross(fwd, camRight));

  const swayX = clamp(game.mouseDX * 0.003, -0.06, 0.06);
  const swayY = clamp(game.mouseDY * 0.003, -0.06, 0.06);
  const swayPosX = clamp(game.mouseDX * 0.0005, -0.03, 0.03);
  const swayPosY = clamp(game.mouseDY * 0.0005, -0.03, 0.03);
  const swayRight = v3norm(v3add(camRight, v3scale(fwd, -swayX)));
  const swayUp = v3norm(v3add(camUp, v3scale(fwd, swayY)));
  const swayFwd = v3norm(fwd);

  const speed = Math.hypot(game.vel.x, game.vel.z);
  const bobT = nowMs() * 0.001;
  const bobA = 0.02 * clamp01(speed / 6);
  const bobY = Math.sin(bobT * 9.5) * bobA;
  const bobX = Math.cos(bobT * 9.5) * bobA;

  const wmOrigin = v3add(
    camPos,
    v3add(
      v3add(
        v3add(
          v3scale(camRight, 0.55 + bobX + swayPosX),
          v3scale(camUp, -0.45 + bobY + kick * 0.03 + swayPosY)
        ),
        v3scale(fwd, 0.75)
      ),
      v3(0, 0, 0)
    )
  );

  function drawWeaponPart(localPos, partScale, color) {
    const p = v3add(
      wmOrigin,
      v3add(
        v3add(v3scale(camRight, localPos.x), v3scale(camUp, localPos.y)),
        v3scale(fwd, localPos.z)
      )
    );
    drawOrientedBox(p, swayRight, swayUp, swayFwd, partScale, color);
  }

  function drawWeaponPartFwd(localPos, partScale, color, fwdExtra) {
    const p = v3add(
      wmOrigin,
      v3add(
        v3add(v3scale(camRight, localPos.x), v3scale(camUp, localPos.y)),
        v3scale(fwd, localPos.z + fwdExtra)
      )
    );
    drawOrientedBox(p, swayRight, swayUp, swayFwd, partScale, color);
  }

  const currentEquip = typeof game.currentEquip === 'string' ? game.currentEquip : 'none';
  if (currentEquip !== 'none') {
    // 根据投掷物类型设置颜色
    let grenadeColor;
    if (currentEquip === 'flash') {
      grenadeColor = v3(1.0, 1.0, 0.0); // 黄色
    } else if (currentEquip === 'smoke') {
      grenadeColor = v3(68 / 255, 68 / 255, 68 / 255); // 深灰色
    } else if (currentEquip === 'molotov') {
      grenadeColor = v3(0.8, 0.2, 0.1); // 红橙色
    } else {
      grenadeColor = v3(0.5, 0.5, 0.5); // 默认灰色
    }
    const wobbleT = nowMs() * 0.001;
    const wobbleX = Math.sin(wobbleT * 6.8) * 0.015;
    const wobbleY = Math.cos(wobbleT * 5.6) * 0.01;
    const wobbleTilt = Math.sin(wobbleT * 4.2) * 0.14;

    const throwablePos = v3add(
      wmOrigin,
      v3add(v3add(v3scale(camRight, 0.06 + wobbleX), v3scale(camUp, -0.04 + wobbleY)), v3scale(fwd, 0.46))
    );
    const cylUp = v3norm(v3add(swayFwd, v3scale(swayRight, wobbleTilt)));
    let cylRight = v3cross(swayUp, cylUp);
    if (v3len(cylRight) < 0.001) cylRight = v3(1, 0, 0);
    cylRight = v3norm(cylRight);
    const cylForward = v3norm(v3cross(cylRight, cylUp));

    drawOrientedCylinder(throwablePos, cylRight, cylUp, cylForward, v3(0.04, 0.12, 0.04), grenadeColor);
  } else if (w.def.kind === 4) {
    // 刀
    const bladeColor = v3(0.75, 0.75, 0.75); // 银色
    const handleColor = v3(0.27, 0.27, 0.27); // 深灰色

    // 刀刃
    const bladePos = v3add(wmOrigin, v3add(v3scale(camRight, 0.06), v3add(v3scale(camUp, -0.02), v3scale(fwd, 0.45))));
    drawOrientedBox(bladePos, swayRight, swayUp, swayFwd, v3(0.03, 0.3, 0.003), bladeColor);

    // 手柄
    const handlePos = v3add(wmOrigin, v3add(v3scale(camRight, 0.06), v3add(v3scale(camUp, 0.08), v3scale(fwd, 0.35))));
    drawOrientedBox(handlePos, swayRight, swayUp, swayFwd, v3(0.025, 0.1, 0.02), handleColor);
  } else if (w.def.kind === 0) {
    const dark = v3(0.16, 0.17, 0.2);
    const metal = v3(0.22, 0.22, 0.24);
    const accent = v3(0.12, 0.23, 0.2);

    const slide = w.shot * 0.08;

    drawWeaponPart(v3(0.0, -0.02, 0.0), v3(0.22, 0.12, 0.55), metal);
    drawWeaponPartFwd(v3(0.0, -0.08, 0.12), v3(0.2, 0.08, 0.28), metal, -slide);
    drawWeaponPartFwd(v3(0.0, -0.02, 0.38), v3(0.12, 0.08, 0.32), metal, -slide);
    drawWeaponPart(v3(0.0, -0.16, 0.08), v3(0.12, 0.22, 0.18), dark);
    drawWeaponPart(v3(0.0, -0.02, 0.46), v3(0.06, 0.06, 0.14), accent);

    if (w.flash > 0.001) {
      const flash = v3(lerp(0.9, 1.0, w.flash), lerp(0.75, 0.95, w.flash), 0.2);
      drawWeaponPart(v3(0.0, -0.02, 0.56), v3(0.09, 0.09, 0.12), flash);
    }
  } else {
    const dark = v3(0.14, 0.16, 0.18);
    const metal = v3(0.2, 0.22, 0.25);
    const wood = v3(0.22, 0.16, 0.1);
    const accent = v3(0.12, 0.24, 0.22);

    const bolt = w.shot * 0.06;

    drawWeaponPart(v3(0.0, 0.0, 0.0), v3(0.22, 0.12, 0.95), metal);
    drawWeaponPart(v3(0.0, -0.1, 0.18), v3(0.16, 0.22, 0.24), dark);
    drawWeaponPart(v3(0.0, -0.16, 0.18), v3(0.1, 0.32, 0.12), dark);
    drawWeaponPart(v3(0.0, -0.04, 0.62), v3(0.1, 0.08, 0.7), metal);
    drawWeaponPart(v3(0.0, 0.04, 0.42), v3(0.24, 0.08, 0.28), wood);
    drawWeaponPartFwd(v3(0.0, 0.02, 0.78), v3(0.06, 0.06, 0.12), accent, -bolt);

    if (w.flash > 0.001) {
      const flash = v3(lerp(0.95, 1.0, w.flash), lerp(0.8, 0.98, w.flash), 0.25);
      drawWeaponPart(v3(0.0, -0.01, 0.98), v3(0.12, 0.1, 0.16), flash);
    }
  }

  const hand = v3(0.18, 0.16, 0.14);
  drawOrientedBox(v3add(wmOrigin, v3add(v3scale(camRight, 0.2), v3scale(camUp, -0.22))), swayRight, swayUp, swayFwd, v3(0.16, 0.12, 0.2), hand);
  drawOrientedBox(v3add(wmOrigin, v3add(v3scale(camRight, -0.02), v3scale(camUp, -0.26))), swayRight, swayUp, swayFwd, v3(0.14, 0.12, 0.2), hand);

  drawOrientedBox(
    v3add(wmOrigin, v3add(v3scale(camRight, 0.26), v3add(v3scale(camUp, -0.34), v3scale(fwd, 0.18)))),
    swayRight,
    swayUp,
    swayFwd,
    v3(0.22, 0.16, 0.28),
    hand
  );

  // 弹壳绘制（使用视锥裁剪）
  for (const s of game.shells) {
    if (!isSphereVisible(culler, s.pos, 0.2)) continue;
    const c = v3(0.65, 0.55, 0.2);
    drawBox(s.pos, v3(0.06, 0.04, 0.1), c);
  }

  // 曳光弹绘制（使用视锥裁剪）
  for (const t of game.tracers) {
    const k = clamp01(t.life / 0.32);
    const hue = t.hue || 0.55;
    const baseCol =
      hue < 0.1
        ? v3(1.0 * k, 0.28 + 0.28 * k, 0.24)
        : v3(0.28 + 0.72 * k, 0.92 * k, 1.0 * k);

    const travel = clamp01(t.travel || 0);
    const segLen = 1.4;
    const dir = v3sub(t.b, t.a);
    const L = v3len(dir);
    if (L > 0.001) {
      const f = v3scale(dir, 1 / L);
      const tip = v3add(t.a, v3scale(f, L * travel));
      const tail = v3add(tip, v3scale(f, -Math.min(segLen, L * travel)));
      
      // 曳光弹线段裁剪测试
      if (!isSegmentVisible(culler, tail, tip)) continue;
      
      drawTracer(tail, tip, baseCol);

      if ((t.hue || 0.55) >= 0.1) {
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        const glow = v3(baseCol.x * 0.6, baseCol.y * 0.6, baseCol.z * 0.6);
        drawOrientedBox(
          v3scale(v3add(tail, tip), 0.5),
          v3norm(v3cross(v3(0, 1, 0), f)),
          v3norm(v3cross(f, v3norm(v3cross(v3(0, 1, 0), f)))),
          f,
          v3(0.02, 0.02, Math.min(segLen, v3len(v3sub(tip, tail))) * 1.1),
          glow
        );
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
      }
    }
  }

  gl.bindVertexArray(null);
}

/**
 * 渲染其他玩家的 UI 元素（血量条、名字标签、武器图标）
 * 使用 Canvas 2D 绘制
 */
function renderOtherPlayersUI() {
  if (game.mode !== 'online') {
    clearHealthBars()
    return
  }

  // 创建一个 2D canvas 用于绘制 UI（如果还没有）
  let uiCanvas = document.getElementById('playerUICanvas')
  if (!uiCanvas) {
    uiCanvas = document.createElement('canvas')
    uiCanvas.id = 'playerUICanvas'
    uiCanvas.style.position = 'absolute'
    uiCanvas.style.top = '0'
    uiCanvas.style.left = '0'
    uiCanvas.style.width = '100%'
    uiCanvas.style.height = '100%'
    uiCanvas.style.pointerEvents = 'none'
    uiCanvas.style.zIndex = '10'
    uiCanvas.width = canvas.width
    uiCanvas.height = canvas.height
    canvas.parentElement.appendChild(uiCanvas)
  }

  // 确保 canvas 尺寸匹配
  if (uiCanvas.width !== canvas.width || uiCanvas.height !== canvas.height) {
    uiCanvas.width = canvas.width
    uiCanvas.height = canvas.height
  }

  const ctx = uiCanvas.getContext('2d')
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height)

  for (const [playerId, playerData] of otherPlayers) {
    const pos = playerData.position
    if (!pos || playerData.deathHidden) {
      removeHealthBar(playerId)
      continue
    }

    const hp = readSyncedHp(playerData, 100)
    const isAlive = playerData.alive !== false && hp > 0
    const isDeathAnimating = !isAlive && safeNumber(playerData.fallT, 0) < 1

    // 1. 更新血量条（玩家头顶 2.2 米处）
    const healthBarPos = worldToScreen(v3(pos.x, pos.y + 2.2, pos.z))
    if (healthBarPos && (isAlive || isDeathAnimating)) {
      createHealthBar(
        playerId,
        healthBarPos.x,
        healthBarPos.y,
        isAlive ? hp : 0,
        playerData.name,
        playerData.team
      )
    } else {
      removeHealthBar(playerId)
    }

    // 2. 绘制阵营标识（血量条上方，2.5 米处）
    const teamPos = worldToScreen(v3(pos.x, pos.y + 2.5, pos.z))
    if (teamPos && isAlive) {
      const team = normalizeTeam(playerData.team)
      const visual = TEAM_VISUALS[team]
      const teamColor = `rgba(${visual.rgb.r}, ${visual.rgb.g}, ${visual.rgb.b}, 0.9)`

      // 绘制阵营标签背景
      const teamLabel = visual.label
      ctx.font = 'bold 12px sans-serif'
      const labelWidth = ctx.measureText(teamLabel).width + 8
      const labelHeight = 16

      ctx.fillStyle = teamColor
      ctx.fillRect(teamPos.x - labelWidth / 2, teamPos.y - labelHeight / 2, labelWidth, labelHeight)

      // 绘制阵营标签文字
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(teamLabel, teamPos.x, teamPos.y)
    }

    // 3. 绘制玩家名字（血量条上方，2.4 米处）
    const namePos = worldToScreen(v3(pos.x, pos.y + 2.4, pos.z))
    if (namePos) {
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // 黑色描边
      ctx.strokeStyle = 'black'
      ctx.lineWidth = 3
      ctx.strokeText(playerData.name || 'Player', namePos.x, namePos.y)

      // 白色文字
      ctx.fillStyle = isAlive ? 'white' : 'rgba(255, 180, 180, 0.9)'
      ctx.fillText(playerData.name || 'Player', namePos.x, namePos.y)
    }

    // 4. 绘制武器图标和名称（玩家右手位置）
    const weaponPos = worldToScreen(v3(pos.x + 0.5, pos.y + 1.0, pos.z))
    if (weaponPos && isAlive) {
      const weapon = playerData.weapon || 'rifle'
      const weaponInfo = getWeaponInfo(weapon)
      
      // 武器名称背景
      ctx.font = '12px sans-serif'
      const weaponName = weaponInfo.name || weapon
      const nameWidth = ctx.measureText(weaponName).width + 10
      const nameHeight = 18

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(weaponPos.x - nameWidth / 2, weaponPos.y - nameHeight / 2, nameWidth, nameHeight)

      // 武器名称文字
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(weaponName, weaponPos.x, weaponPos.y)

      // 武器图标（简单图标，根据武器类型）
      const iconY = weaponPos.y - nameHeight / 2 - 5
      drawWeaponIcon(ctx, weaponPos.x, iconY, weapon)
    }
  }

  // 4. 绘制伤害飘字（上浮 + 淡出）
  for (const fx of floatingDamageNumbers) {
    const p = worldToScreen(fx.pos)
    if (!p) continue

    const a = clamp01(fx.life / Math.max(0.001, fx.maxLife))
    const scale = 0.88 + (1 - a) * 0.25
    ctx.font = `${fx.crit ? '700' : '600'} ${Math.floor((fx.crit ? 20 : 17) * scale)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const text = `-${fx.value}`
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.6 * a})`
    ctx.lineWidth = 3
    ctx.strokeText(text, p.x, p.y)

    const fill = fx.color || (fx.crit ? '255, 82, 82' : '255, 232, 153')
    ctx.fillStyle = `rgba(${fill}, ${a})`
    ctx.fillText(text, p.x, p.y)
  }
}

/**
 * 将 3D 世界坐标转换为 2D 屏幕坐标
 */
function worldToScreen(worldPos) {
  try {
    // 使用相机的视图和投影矩阵转换
    const camPos = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z)
    const fwd = forwardFromYawPitch(game.yaw, game.pitch)
    const camTarget = v3add(camPos, fwd)

    const view = mat4Identity()
    mat4LookAt(view, camPos, camTarget, v3(0, 1, 0))

    const aspect = glsys.width / Math.max(1, glsys.height)
    const proj = mat4Identity()
    const fovDeg = 70 / (game.scope.active ? game.scope.zoomLevel : 1)
    mat4Perspective(proj, (fovDeg * Math.PI) / 180, aspect, 0.05, 120)

    // 转换到视图空间
    const viewPos = mat4TransformPoint(view, worldPos)

    // 裁剪（如果在相机后面，返回 null）
    if (viewPos.z > -0.05) return null

    // 转换到裁剪空间
    const clipPos = mat4TransformPoint(proj, viewPos)

    // 转换到屏幕坐标
    const screenX = (clipPos.x + 1) / 2 * canvas.width
    const screenY = (1 - clipPos.y) / 2 * canvas.height

    // 检查是否在屏幕范围内
    if (screenX < 0 || screenX > canvas.width || screenY < 0 || screenY > canvas.height) {
      return null
    }

    return { x: screenX, y: screenY }
  } catch (error) {
    return null
  }
}

/**
 * 矩阵变换点
 */
function mat4TransformPoint(m, p) {
  const x = m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12]
  const y = m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13]
  const z = m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14]
  const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15]
  // 透视除法保护：w 接近 0 时返回会导致裁剪的点
  if (Math.abs(w) < 1e-8) return v3(0, 0, 0)
  return v3(x / w, y / w, z / w)
}

/**
 * 获取武器信息
 */
function getWeaponInfo(weaponId) {
  const weapons = {
    'knife': { name: '🔪 匕首', type: 'melee' },
    'pistol': { name: '🔫 手枪', type: 'pistol' },
    'glock': { name: '🔫 Glock', type: 'pistol' },
    'usp': { name: '🔫 USP', type: 'pistol' },
    'deagle': { name: '🔫 沙漠之鹰', type: 'pistol' },
    'rifle': { name: '🎯 步枪', type: 'rifle' },
    'ak47': { name: '🎯 AK-47', type: 'rifle' },
    'm4a1': { name: '🎯 M4A1', type: 'rifle' },
    'awp': { name: '🎯 AWP', type: 'sniper' },
    'smg': { name: '🔫 冲锋枪', type: 'smg' },
    'mp5': { name: '🔫 MP5', type: 'smg' },
    'shotgun': { name: '💥 霰弹枪', type: 'shotgun' }
  }
  return weapons[weaponId] || { name: weaponId, type: 'unknown' }
}

/**
 * 绘制武器图标
 */
function drawWeaponIcon(ctx, x, y, weaponId) {
  const info = getWeaponInfo(weaponId)
  const iconSize = 16

  // 绘制武器图标背景
  ctx.fillStyle = 'rgba(40, 40, 40, 0.8)'
  ctx.beginPath()
  ctx.arc(x, y, iconSize / 2, 0, Math.PI * 2)
  ctx.fill()

  // 绘制武器图标（使用emoji）
  ctx.font = `${iconSize - 4}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(info.name.split(' ')[0], x, y) // 只绘制emoji部分
}

/**
 * 渲染投掷物效果（粒子 + 闪光）
 */
function renderGrenadeEffects() {
  // 创建或获取粒子渲染 canvas
  let particleCanvas = document.getElementById('particleCanvas');
  if (!particleCanvas) {
    particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'particleCanvas';
    particleCanvas.style.position = 'absolute';
    particleCanvas.style.top = '0';
    particleCanvas.style.left = '0';
    particleCanvas.style.width = '100%';
    particleCanvas.style.height = '100%';
    particleCanvas.style.pointerEvents = 'none';
    particleCanvas.style.zIndex = '5';
    canvas.parentElement.appendChild(particleCanvas);
  }

  // 确保 canvas 尺寸匹配
  if (particleCanvas.width !== canvas.width || particleCanvas.height !== canvas.height) {
    particleCanvas.width = canvas.width;
    particleCanvas.height = canvas.height;
  }

  const ctx = particleCanvas.getContext('2d');
  ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

  // 渲染投掷物粒子效果
  grenadeManager.render(ctx, particleCanvas.width, particleCanvas.height, game);

  // 渲染闪光效果（白屏逐渐恢复）
  if (game.flashEffect.active && game.flashEffect.intensity > 0) {
    const alpha = game.flashEffect.intensity;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, particleCanvas.width, particleCanvas.height);
  }
}

let last = nowMs();
function frame() {
  gamePerformance.beginFrame(); // 性能监控：帧开始

  const t = nowMs();
  let dt = (t - last) / 1000;
  frameCount++;
  last = t;
  dt = Math.min(0.033, Math.max(0, dt));
  const aiRunning = game.mode === 'ai' && game.uiScreen === 'ai' && !game.ending;

  updateSmoke(dt);

  // 观战模式更新
  if (spectatorManager.isEnabled()) {
    // 更新观战UI
    const deathInfo = spectatorManager.getDeathInfo();
    if (deathInfo) {
      if (deathInfo.startDelay) {
        spectatorUI.showDeathOverlay(deathInfo);
      } else {
        spectatorUI.hideDeathOverlay();
        const targetInfo = spectatorManager.getTargetInfo();
        spectatorUI.updateTargetInfo(targetInfo);
        spectatorUI.updateModeIndicator(
          spectatorManager.getMode(),
          targetInfo?.name || null
        );
      }
    }
  }

  if (game.pointerLocked) {
    updatePlayer(dt);
    updateWeapon(dt);

    // Send multiplayer movement only when in online mode
    if (game.mode === 'online') {
      sendPlayerMovement()
    }
  }

  if (game.pointerLocked || aiRunning) {
    updateTargets(dt);
    updateBots(dt);
    updateShells(dt);
    updateTracers(dt);
    updateHitmarker(dt);
    updateBombMode(dt);
  }

  updateDamageNumbers(dt)

  if (t - game.lastStatusAt > 2500 && (game.pointerLocked || aiRunning)) {
    statusEl.textContent = `Pos ${game.pos.x.toFixed(1)}, ${game.pos.z.toFixed(1)}`;
  }

  updateHud();
  drawWorld();
  radar.render();
  renderOtherPlayersUI(); // 渲染其他玩家的 UI 元素
  renderGrenadeEffects(); // 渲染投掷物效果

  // 更新计分板（多人模式）
  if (game.mode === 'online' && frameCount % 60 === 0) { // 每秒更新一次（60帧）
    updateMultiplayerScoreboard()
  }

  gamePerformance.endFrame(); // 性能监控：帧结束
  requestAnimationFrame(frame);
}

setOverlayVisible(true);
setStatus('Lobby', false);
renderBuyMenu();
requestAnimationFrame(frame);
