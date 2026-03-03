const canvas = document.getElementById('gl');
const overlay = document.getElementById('overlay');

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
const objectiveEl = document.getElementById('objective');
const objectiveText = document.getElementById('objectiveText');
const objectiveTimer = document.getElementById('objectiveTimer');
const objectiveFill = document.getElementById('objectiveFill');

canvas.tabIndex = 0;

function v3(x, y, z) {
  return { x, y, z };
}

function v3add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function v3sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function v3scale(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function v3dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function v3cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function v3len(a) {
  return Math.hypot(a.x, a.y, a.z);
}

function v3norm(a) {
  const L = v3len(a);
  if (L <= 1e-8) return { x: 0, y: 0, z: 0 };
  return { x: a.x / L, y: a.y / L, z: a.z / L };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mat4Identity() {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

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

function mat4Mul(out, a, b) {
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  const a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  const b00 = b[0],
    b01 = b[1],
    b02 = b[2],
    b03 = b[3];
  const b10 = b[4],
    b11 = b[5],
    b12 = b[6],
    b13 = b[7];
  const b20 = b[8],
    b21 = b[9],
    b22 = b[10],
    b23 = b[11];
  const b30 = b[12],
    b31 = b[13],
    b32 = b[14],
    b33 = b[15];

  out[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
  out[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
  out[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
  out[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
  out[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
  return out;
}

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

function aabbFromCenter(p, half) {
  return {
    min: v3(p.x - half.x, p.y - half.y, p.z - half.z),
    max: v3(p.x + half.x, p.y + half.y, p.z + half.z),
  };
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
    } else {
      this.blip(320, 0.04, 1);
      this.blip(200, 0.06, 2);
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
    weapon: {
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
    },
    state: 'patrol',
    patrolPhase: Math.random() * Math.PI * 2,
    patrolNode: 0,
    objectiveSite: id % 2 === 0 ? 'A' : 'B',
  };
}

const WEAPONS = [
  {
    name: 'Pistol',
    kind: 0,
    rpm: 300,
    damage: 34,
    spreadDeg: 1.4,
    recoil: 0.9,
    magSize: 30,
    reserveMax: 90,
    reloadSec: 1.25,
    tip: '精准点射',
  },
  {
    name: 'Rifle',
    kind: 1,
    rpm: 600,
    damage: 18,
    spreadDeg: 2.2,
    recoil: 0.6,
    magSize: 30,
    reserveMax: 90,
    reloadSec: 1.7,
    tip: '全自动压枪',
  },
];

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
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.weaponIndex = 0;
    this.weapons = [new WeaponState(WEAPONS[0]), new WeaponState(WEAPONS[1])];
    this.boxes = [];
    this.colliders = [];
    this.targets = [];
    this.bots = [];
    this.shells = [];
    this.tracers = [];
    this.hitmarker = { t: 0, head: false };
    this.autoFire = true;
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
      rewardKill: 300,
      rewardWin: 3250,
      rewardLose: 1900,
      buy: {
        armor: 650,
        rifle: 2700,
        smoke: 300,
      },
    };
    this.mapBounds = 27.5;
    this.spawnZones = {
      ct: [v3(-23, 0.0, -14), v3(-23, 0.0, -6), v3(-23, 0.0, 2), v3(-23, 0.0, 10), v3(-19, 0.0, -10), v3(-19, 0.0, 6)],
      t: [v3(23, 0.0, -14), v3(23, 0.0, -6), v3(23, 0.0, 2), v3(23, 0.0, 10), v3(19, 0.0, -10), v3(19, 0.0, 6)],
    };
    this.routeNodes = {
      ct: [v3(-22, 0, -13), v3(-14, 0, -13), v3(-6, 0, -13), v3(2, 0, -13), v3(10, 0, -13), v3(18, 0, -13), v3(-20, 0, -1), v3(-12, 0, -1), v3(-4, 0, -1), v3(0, 0, -1), v3(6, 0, -1), v3(14, 0, -1), v3(-22, 0, 12), v3(-14, 0, 12), v3(-6, 0, 12), v3(2, 0, 12), v3(10, 0, 12), v3(18, 0, 12)],
      t: [v3(22, 0, -13), v3(14, 0, -13), v3(6, 0, -13), v3(-2, 0, -13), v3(-10, 0, -13), v3(-18, 0, -13), v3(20, 0, -1), v3(12, 0, -1), v3(4, 0, -1), v3(0, 0, -1), v3(-6, 0, -1), v3(-14, 0, -1), v3(22, 0, 12), v3(14, 0, 12), v3(6, 0, 12), v3(-2, 0, 12), v3(-10, 0, 12), v3(-18, 0, 12)],
    };
    this.smoke = {
      cooldown: 0,
      cooldownTotal: 16,
      duration: 8,
      charges: 0,
      maxCharges: 2,
      active: [],
      chokePoints: [
        { id: 'midN', pos: v3(0, 0.9, -12), scale: v3(2.6, 1.8, 3.2) },
        { id: 'midC', pos: v3(0, 0.9, -1), scale: v3(2.6, 1.8, 3.2) },
        { id: 'midS', pos: v3(0, 0.9, 11), scale: v3(2.6, 1.8, 3.2) },
        { id: 'Adoor', pos: v3(8, 0.9, -13), scale: v3(2.6, 1.8, 3.2) },
        { id: 'Bdoor', pos: v3(8, 0.9, 13), scale: v3(2.6, 1.8, 3.2) },
      ],
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
      bombPos: v3(10, 0.05, -13),
      sitePos: v3(10, 0.05, -13),
      siteRadius: 2.8,
      sites: [
        { key: 'A', pos: v3(10, 0.05, -13), radius: 2.8 },
        { key: 'B', pos: v3(10, 0.05, 13), radius: 2.8 },
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
    return this.weapons[this.weaponIndex];
  }

  switchWeapon(i) {
    this.weaponIndex = clamp(i, 0, this.weapons.length - 1);
    const w = this.getWeapon();
    weaponNameEl.textContent = w.def.name;
    tipText.textContent = w.def.tip;
  }

  buildMap() {
    this.boxes.length = 0;
    this.colliders.length = 0;
    this.targets.length = 0;
    this.bots.length = 0;

    const wallColor = v3(0.18, 0.2, 0.27);
    const coverColor = v3(0.2, 0.23, 0.29);
    this.boxes.push(makeBox(v3(0, -0.5, 0), v3(56, 1, 56), v3(0.12, 0.14, 0.18), true));
    this.boxes.push(makeBox(v3(0, 2, -28), v3(56, 6, 1), wallColor, true));
    this.boxes.push(makeBox(v3(0, 2, 28), v3(56, 6, 1), wallColor, true));
    this.boxes.push(makeBox(v3(-28, 2, 0), v3(1, 6, 56), wallColor, true));
    this.boxes.push(makeBox(v3(28, 2, 0), v3(1, 6, 56), wallColor, true));

    this.boxes.push(makeBox(v3(0, 1.5, -19), v3(2.4, 3, 9.5), wallColor, true));
    this.boxes.push(makeBox(v3(0, 1.5, -7), v3(2.4, 3, 6), wallColor, true));
    this.boxes.push(makeBox(v3(0, 1.5, 6), v3(2.4, 3, 6), wallColor, true));
    this.boxes.push(makeBox(v3(0, 1.5, 18), v3(2.4, 3, 10), wallColor, true));

    this.boxes.push(makeBox(v3(-13, 1.2, -16), v3(6, 2.4, 3), coverColor, true));
    this.boxes.push(makeBox(v3(13, 1.2, -16), v3(6, 2.4, 3), coverColor, true));
    this.boxes.push(makeBox(v3(-7, 1.0, -11), v3(4, 2, 2.6), coverColor, true));
    this.boxes.push(makeBox(v3(7, 1.0, -11), v3(4, 2, 2.6), coverColor, true));

    this.boxes.push(makeBox(v3(-10, 1.0, -1), v3(5, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(10, 1.0, -1), v3(5, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(-4, 0.9, 4), v3(3.4, 1.8, 2.4), coverColor, true));
    this.boxes.push(makeBox(v3(4, 0.9, 4), v3(3.4, 1.8, 2.4), coverColor, true));

    this.boxes.push(makeBox(v3(-14, 1.0, 14), v3(6, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(14, 1.0, 14), v3(6, 2, 3), coverColor, true));
    this.boxes.push(makeBox(v3(-8, 1.2, 18), v3(3, 2.4, 5), coverColor, true));
    this.boxes.push(makeBox(v3(8, 1.2, 18), v3(3, 2.4, 5), coverColor, true));

    this.boxes.push(makeBox(v3(0, 1.2, -1), v3(7.5, 2.4, 4.2), v3(0.24, 0.24, 0.3), true));
    this.boxes.push(makeBox(v3(-5.3, 0.45, -1), v3(2.6, 0.9, 2.6), coverColor, true));
    this.boxes.push(makeBox(v3(5.3, 0.45, -1), v3(2.6, 0.9, 2.6), coverColor, true));
    this.boxes.push(makeBox(v3(7.3, 1.1, -13), v3(3.8, 2.2, 2.6), coverColor, true));
    this.boxes.push(makeBox(v3(7.3, 1.1, 13), v3(3.8, 2.2, 2.6), coverColor, true));
    this.boxes.push(makeBox(v3(13.2, 1.1, -9.2), v3(2.8, 2.2, 4.8), coverColor, true));
    this.boxes.push(makeBox(v3(13.2, 1.1, 9.2), v3(2.8, 2.2, 4.8), coverColor, true));

    this.boxes.push(makeBox(v3(-21, 1.5, -2), v3(4, 3, 20), v3(0.21, 0.24, 0.31), true));
    this.boxes.push(makeBox(v3(21, 1.5, -2), v3(4, 3, 20), v3(0.21, 0.24, 0.31), true));
    this.boxes.push(makeBox(v3(-17, 1.0, -18), v3(4, 2, 2), coverColor, true));
    this.boxes.push(makeBox(v3(-17, 1.0, 14), v3(4, 2, 2), coverColor, true));
    this.boxes.push(makeBox(v3(17, 1.0, -18), v3(4, 2, 2), coverColor, true));
    this.boxes.push(makeBox(v3(17, 1.0, 14), v3(4, 2, 2), coverColor, true));

    this.boxes.push(makeBox(v3(-22, 0.25, -12), v3(2, 0.5, 2), v3(0.2, 0.45, 0.85), false));
    this.boxes.push(makeBox(v3(22, 0.25, 10), v3(2, 0.5, 2), v3(0.86, 0.42, 0.18), false));

    rebuildGameplayColliders();

    const siteA = v3(10, 0.05, -13);
    const siteB = v3(10, 0.05, 13);
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

const game = new Game();

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

function applyDifficultyToBots() {
  const d = game.difficulty;
  let rpm = 200;
  let spreadDeg = 3.2;
  let dmg = 4;
  if (d === 'normal') {
    rpm = 240;
    spreadDeg = 2.2;
    dmg = 5;
  }
  if (d === 'hard') {
    rpm = 300;
    spreadDeg = 1.7;
    dmg = 6;
  }
  for (const b of game.bots) {
    b.weapon.rpm = rpm;
    b.weapon.spreadDeg = spreadDeg;
    b.weapon.damage = dmg;
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
}

function isRoundFrozen() {
  return game.round.state === 'freeze';
}

function addMoney(amount) {
  game.econ.money = clamp(Math.floor(game.econ.money + amount), 0, game.econ.maxMoney);
}

function spendMoney(cost) {
  if (game.econ.money < cost) return false;
  game.econ.money -= cost;
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
  game.smoke.charges = 1;
  rebuildGameplayColliders();
  resetRoundEntities();
}

function endBombRound(winnerTeam, reason) {
  if (game.round.state === 'post') return;
  game.round.winner = winnerTeam;
  game.round.reason = reason;
  game.round.state = 'post';
  game.round.postLeft = game.round.postTotal;
  if (winnerTeam === 'ct') game.score.ct += 1;
  else game.score.t += 1;
  roundAward(winnerTeam);
  setStatus(`${winnerTeam.toUpperCase()} win: ${reason}`, false);
}

function tryBuy(item) {
  if (game.round.state !== 'freeze') {
    setStatus('Buy only during freeze', true);
    return;
  }
  if (!game.playerAlive) {
    setStatus('Cannot buy while dead', true);
    return;
  }
  if (item === 'armor') {
    if (game.armor >= 100) {
      setStatus('Armor full', true);
      return;
    }
    if (!spendMoney(game.econ.buy.armor)) {
      setStatus('Not enough money', true);
      return;
    }
    game.armor = 100;
    setStatus(`Bought armor ($${game.econ.buy.armor})`, false);
    return;
  }
  if (item === 'rifle') {
    if (!spendMoney(game.econ.buy.rifle)) {
      setStatus('Not enough money', true);
      return;
    }
    game.weaponIndex = 1;
    const w = game.getWeapon();
    w.mag = w.def.magSize;
    w.reserve = w.def.reserveMax;
    weaponNameEl.textContent = w.def.name;
    tipText.textContent = w.def.tip;
    setStatus(`Bought rifle ($${game.econ.buy.rifle})`, false);
    return;
  }
  if (item === 'smoke') {
    if (game.smoke.charges >= game.smoke.maxCharges) {
      setStatus('Smoke full', true);
      return;
    }
    if (!spendMoney(game.econ.buy.smoke)) {
      setStatus('Not enough money', true);
      return;
    }
    game.smoke.charges += 1;
    setStatus(`Bought smoke ($${game.econ.buy.smoke})`, false);
  }
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

function deploySmokeWall() {
  if (game.mode !== 'ai') {
    setStatus('Smoke available in AI mode only', true);
    return;
  }
  if (game.smoke.cooldown > 0) {
    setStatus(`Smoke cooldown ${game.smoke.cooldown.toFixed(1)}s`, true);
    return;
  }
  if (game.smoke.charges <= 0) {
    setStatus('No smoke charge', true);
    return;
  }
  if (!game.playerAlive) {
    setStatus('Cannot use smoke while dead', true);
    return;
  }

  const p = v3(game.pos.x, 0.9, game.pos.z);
  let best = null;
  let bestD = Infinity;
  for (const cp of game.smoke.chokePoints) {
    const d = v3len(v3sub(p, cp.pos));
    if (d < bestD) {
      bestD = d;
      best = cp;
    }
  }
  if (!best) return;

  for (const s of game.smoke.active) {
    if (s.id === best.id) {
      setStatus(`Smoke already active at ${best.id}`, true);
      return;
    }
  }

  const half = v3(best.scale.x * 0.5, best.scale.y * 0.5, best.scale.z * 0.5);
  game.smoke.active.push({
    id: best.id,
    pos: v3(best.pos.x, best.pos.y, best.pos.z),
    scale: v3(best.scale.x, best.scale.y, best.scale.z),
    aabb: aabbFromCenter(best.pos, half),
    expiresAt: nowMs() + game.smoke.duration * 1000,
  });
  game.smoke.cooldown = game.smoke.cooldownTotal;
  game.smoke.charges = Math.max(0, game.smoke.charges - 1);
  rebuildGameplayColliders();
  setStatus(`Smoke deployed: ${best.id}`, false);
}

function updateSmoke(dt) {
  if (game.smoke.cooldown > 0) {
    game.smoke.cooldown = Math.max(0, game.smoke.cooldown - dt);
  }

  const t = nowMs();
  const keep = [];
  let changed = false;
  for (const s of game.smoke.active) {
    if (t < s.expiresAt) keep.push(s);
    else changed = true;
  }
  if (changed) {
    game.smoke.active = keep;
    rebuildGameplayColliders();
  } else {
    game.smoke.active = keep;
  }
}

function randomSpawnFromTeam(team) {
  const spots = game.spawnZones[team] || game.spawnZones.ct;
  const idx = Math.floor(Math.random() * spots.length) % spots.length;
  const base = spots[idx];
  const jitter = v3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4);
  return v3add(base, jitter);
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
  game.playerAlive = true;
  respawnPlayer();
  game.vel = v3(0, 0, 0);
  game.crouchT = 0;
  game.landKick = 0;
  game.ending = false;
  game.stats.kills = 0;
  game.stats.deaths = 0;
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
  game.smoke.active = [];
  game.smoke.cooldown = 0;
  game.smoke.charges = 1;
  rebuildGameplayColliders();
  rebuildBots(game.botCount);
  game.econ.money = 800;

  prepareNewBombRound();

  for (const ws of game.weapons) {
    ws.mag = ws.def.magSize;
    ws.reserve = ws.def.reserveMax;
    ws.reloading = false;
    ws.reloadLeft = 0;
    ws.cooldown = 0;
    ws.kick = 0;
    ws.shot = 0;
    ws.flash = 0;
  }

  lockPointer();
}

function returnToLobby() {
  game.mode = 'lobby';
  unlockPointer();
  setOverlayVisible(true);
  showScreen('lobby');
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
uniform vec3 uLightDir;
out vec3 vColor;
void main() {
  vec3 n = normalize(mat3(uModel) * aNor);
  float ndl = clamp(dot(n, normalize(-uLightDir)), 0.0, 1.0);
  float lit = 0.32 + ndl * 0.68;
  vColor = uColor * lit;
  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
}
`;

const FS = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 fragColor;
void main() {
  fragColor = vec4(vColor, 1.0);
}
`;

const program = glsys.createProgram(VS, FS);
gl.useProgram(program);

const uProj = gl.getUniformLocation(program, 'uProj');
const uView = gl.getUniformLocation(program, 'uView');
const uModel = gl.getUniformLocation(program, 'uModel');
const uColor = gl.getUniformLocation(program, 'uColor');
const uLightDir = gl.getUniformLocation(program, 'uLightDir');
if (!uProj || !uView || !uModel || !uColor || !uLightDir) throw new Error('Uniforms missing');

const cube = buildCubeMesh();
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

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);

game.buildMap();
game.switchWeapon(0);

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
  hpText.textContent = String(Math.max(0, Math.floor(game.hp)));
  arText.textContent = String(Math.max(0, Math.floor(game.armor)));
  hpBar.style.width = `${clamp01(game.hp / 100) * 100}%`;
  arBar.style.width = `${clamp01(game.armor / 100) * 100}%`;
  const w = game.getWeapon();
  ammoText.textContent = `${w.mag} / ${w.reserve}`;
  if (fireModeHintEl) {
    fireModeHintEl.textContent = `[B] ${game.autoFire ? 'AUTO' : 'SEMI'}`;
  }

  if (ctAliveEl) ctAliveEl.textContent = String(teamAliveCount('ct'));
  if (tAliveEl) tAliveEl.textContent = String(teamAliveCount('t'));

  const isReloading = w.reloading;
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

  const speed = Math.hypot(game.vel.x, game.vel.z);
  const moving = clamp01(speed / 6);
  const firing = clamp01(w.kick);
  const crouch = clamp01(game.crouchT);
  const air = game.onGround ? 0 : 1;
  const land = clamp01(game.landKick);
  const gap = 9 + moving * 22 + firing * 10 - crouch * 6 + air * 16 + land * 14;
  const len = 8 + moving * 4;
  const host = crosshairEl || hud;
  host.style.setProperty('--ch-gap', `${gap.toFixed(1)}px`);
  host.style.setProperty('--ch-len', `${len.toFixed(1)}px`);

  const r = game.round;
  const showObj = game.mode === 'ai';
  objectiveEl.classList.toggle('hidden', !showObj);
  if (showObj) {
    const siteLabel = r.activeSite || 'A/B';
    const plantedLabel = r.plantSite || siteLabel;
    if (r.state === 'freeze') {
      objectiveText.textContent = `Freeze ${r.freezeLeft.toFixed(1)}s  $${game.econ.money}`;
      objectiveTimer.textContent = `Buy: U armor / I rifle / O smoke`;
      objectiveFill.style.width = `${clamp01(r.freezeLeft / Math.max(0.1, r.freezeTotal)) * 100}%`;
    } else if (r.state === 'post') {
      objectiveText.textContent = `${(r.winner || '').toUpperCase()} win - ${r.reason}`;
      objectiveTimer.textContent = `Next round ${r.postLeft.toFixed(1)}s`;
      objectiveFill.style.width = `${clamp01(r.postLeft / Math.max(0.1, r.postTotal)) * 100}%`;
    } else if (!r.bombPlanted) {
      objectiveText.textContent = game.team === 't' ? `Plant at ${siteLabel} (E hold)` : `Defend site ${siteLabel}`;
      objectiveTimer.textContent = `R ${r.roundLeft.toFixed(1)}s  $${game.econ.money}  SMK ${game.smoke.charges}`;
      objectiveFill.style.width = `${clamp01(r.progress) * 100}%`;
    } else {
      objectiveText.textContent = game.team === 'ct' ? `Defuse ${plantedLabel} (E hold)` : `Bomb planted ${plantedLabel}`;
      objectiveTimer.textContent = `${Math.max(0, r.bombTimer).toFixed(1)}s  $${game.econ.money}`;
      objectiveFill.style.width = `${clamp01(r.bombTimer / r.bombTotal) * 100}%`;
    }
  }
}

function lockPointer() {
  audio.ensure();
  canvas.requestPointerLock();
}

function unlockPointer() {
  document.exitPointerLock();
}

canvas.addEventListener('click', () => {
  if (!game.pointerLocked && game.mode === 'ai') lockPointer();
});

document.addEventListener('pointerlockchange', () => {
  game.pointerLocked = document.pointerLockElement === canvas;
  setOverlayVisible(!game.pointerLocked);
  if (!game.pointerLocked && game.mode === 'ai') {
    if (!game.ending && game.uiScreen !== 'result') {
      showScreen('pause');
      setStatus('Paused', false);
    }
  }
  if (game.pointerLocked) {
    setStatus('In game', false);
  }
  game.keys.clear();
  game.mouseDown = false;
  game.firePressed = false;
  if (game.pointerLocked) canvas.focus();
});

document.addEventListener('pointerlockerror', () => {
  setStatus('Pointer lock failed (try click canvas)', true);
});

document.addEventListener('keydown', (e) => {
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
      e.code === 'KeyR' ||
      e.code === 'KeyG' ||
      e.code === 'Digit1' ||
      e.code === 'Digit2'
    ) {
      e.preventDefault();
    }
  }
  game.keys.add(e.code);
  if (e.code === 'Digit1') game.switchWeapon(0);
  if (e.code === 'Digit2') game.switchWeapon(1);
  if (e.code === 'KeyR') tryReload();
  if (e.code === 'KeyG') deploySmokeWall();
  if (e.code === 'KeyU') tryBuy('armor');
  if (e.code === 'KeyI') tryBuy('rifle');
  if (e.code === 'KeyO') tryBuy('smoke');
  if (e.code === 'KeyB') {
    game.autoFire = !game.autoFire;
    setStatus(`Firing toggled (${game.autoFire ? 'AUTO' : 'SEMI'})`, false);
  }
  if (e.code === 'Escape' && game.pointerLocked) unlockPointer();
});

window.addEventListener(
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
  true
);


document.addEventListener('keyup', (e) => {
  game.keys.delete(e.code);
});

document.addEventListener('mousedown', (e) => {
  if (!game.pointerLocked) return;
  if (e.button === 0) {
    game.mouseDown = true;
    game.firePressed = true;
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0) game.mouseDown = false;
});

document.addEventListener('contextmenu', (e) => {
  if (!game.pointerLocked) return;
  e.preventDefault();
});

window.addEventListener('blur', () => {
  game.keys.clear();
  game.mouseDown = false;
  game.firePressed = false;
  game.mouseDX = 0;
  game.mouseDY = 0;
});

btnModeAI.addEventListener('click', () => {
  showScreen('ai');
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

document.addEventListener('mousemove', (e) => {
  if (!game.pointerLocked) return;
  const sens = 0.0022;
  game.yaw += e.movementX * sens;
  game.pitch -= e.movementY * sens;
  game.mouseDX = game.mouseDX * 0.6 + e.movementX * 0.4;
  game.mouseDY = game.mouseDY * 0.6 + e.movementY * 0.4;
  const maxPitch = Math.PI / 2 - 0.02;
  game.pitch = clamp(game.pitch, -maxPitch, maxPitch);
});

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

  const fireHeld = game.mouseDown && game.pointerLocked;
  const wantsFire = game.autoFire ? fireHeld || game.firePressed : game.firePressed;
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
  const recoil = game.autoFire ? recoilBase * 1.25 : recoilBase;
  game.pitch += recoil * 0.012;
  game.yaw += (Math.random() - 0.5) * recoil * 0.007;
  w.kick = Math.min(1, w.kick + 0.35);

  const spread = ((game.autoFire ? w.def.spreadDeg * 1.15 : w.def.spreadDeg) * Math.PI) / 180;
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

  const finalAcc = spreadAcc * airAcc * landAcc;
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

  for (const bot of game.bots) {
    if (!bot.alive) continue;
    const up = v3(0, 1, 0);
    const f = v3norm(forwardFromYawPitch(bot.yaw, 0));
    const r = v3norm(v3cross(up, f));
    const u = up;
    const base = v3(bot.pos.x, bot.pos.y, bot.pos.z);
    const hip = v3add(base, v3(0, 0.95, 0));

    const hitboxes = [
      { zone: 'head', mult: 4.0, c: v3add(hip, v3(0, 1.18, 0.02)), h: v3(0.16, 0.16, 0.16) },
      { zone: 'upper', mult: 1.25, c: v3add(hip, v3(0, 0.78, 0.02)), h: v3(0.25, 0.22, 0.16) },
      { zone: 'lower', mult: 1.0, c: v3add(hip, v3(0, 0.25, 0)), h: v3(0.28, 0.38, 0.15) },
      { zone: 'arm', mult: 0.75, c: v3add(hip, v3(0.42, 0.78, 0.02)), h: v3(0.09, 0.28, 0.09) },
      { zone: 'arm', mult: 0.75, c: v3add(hip, v3(-0.42, 0.78, 0.02)), h: v3(0.09, 0.28, 0.09) },
      { zone: 'leg', mult: 0.75, c: v3add(base, v3(0.18, 0.45, 0)), h: v3(0.11, 0.45, 0.11) },
      { zone: 'leg', mult: 0.75, c: v3add(base, v3(-0.18, 0.45, 0)), h: v3(0.11, 0.45, 0.11) },
    ];

    for (const hb of hitboxes) {
      const t = rayObbLocal(roAim, rdAim, hb.c, r, u, f, hb.h);
      if (t === null) continue;
      if (t > 0 && t < bestT) {
        bestT = t;
        bestTarget = bot;
        bestZone = hb.zone;
        bestMult = hb.mult;
      }
    }
  }

  if (bestTarget) {
    const dmg = Math.floor(w.def.damage * bestMult);
    bestTarget.hp -= dmg;
    audio.hit();
    game.lastStatusAt = nowMs();
    game.hitmarker.t = 0.12;
    game.hitmarker.head = bestZone === 'head';
    if (bestTarget.hp <= 0) {
      bestTarget.alive = false;
      bestTarget.respawnAt = nowMs() + 2500;
      setStatus('Bot down', false);
      game.stats.kills += 1;
      if (bestTarget.team !== game.team) addMoney(game.econ.rewardKill);
    } else {
      const z = bestZone ? ` ${bestZone}` : '';
      setStatus(`Hit${z}: -${dmg}`, false);
    }
  } else {
    setStatus('Miss', false);
  }

  const endAim = bestT < Infinity ? v3add(roAim, v3scale(rdAim, Math.min(bestT, 80))) : v3add(roAim, v3scale(rdAim, 80));
  const endTrace = endAim;
  game.tracers.push({
    a: roTrace,
    b: endTrace,
    travel: 0,
    speed: 110,
    life: 0.32,
    hue: 0.55,
  });

  const shellPos = v3add(
    camPos,
    v3add(v3scale(rightCam, 0.42), v3add(v3scale(camUp, -0.22), v3scale(fwdCam, 0.62)))
  );
  const rv = 2.4 + Math.random() * 1.2;
  const uv = 1.6 + Math.random() * 1.0;
  const fv = 0.8 + Math.random() * 0.7;
  const shellVel = v3add(v3scale(rightCam, rv), v3add(v3scale(camUp, uv), v3scale(fwdCam, fv)));
  game.shells.push({ pos: shellPos, vel: shellVel, life: 1.6 });
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
  game.shells = game.shells.filter((s) => s.life > 0);
}

function updateTracers(dt) {
  for (const t of game.tracers) {
    t.life -= dt;
    t.travel = Math.min(1, (t.travel || 0) + dt * (t.speed || 120) / Math.max(0.001, v3len(v3sub(t.b, t.a))));
  }
  game.tracers = game.tracers.filter((t) => t.life > 0);
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
  const baseSpeed = sprint ? 6.8 : 4.8;
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
  const tNow = nowMs();
  for (const tgt of game.targets) {
    if (!tgt.alive) {
      if (tNow >= tgt.respawnAt) {
        tgt.alive = true;
        tgt.hp = tgt.maxHp;
      }
      continue;
    }
    const phase = (tNow * 0.001 + tgt.id * 0.77) % (Math.PI * 2);
    const targetX = tgt.id % 2 === 0 ? 8 : -8;
    tgt.pos.x = lerp(tgt.pos.x, targetX + Math.sin(phase) * 1.5, clamp01(dt * 0.8));
  }
}

function updateBots(dt) {
  if (isRoundFrozen()) return;

  const tNow = nowMs();
  const playerEye = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);
  const aliveBots = game.bots.filter((x) => x.alive);
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

    let wish = v3(0, 0, 0);
    if (b.state === 'chase') {
      wish = v3(dir.x, 0, dir.z);
      if (dist < 4.2) wish = v3scale(wish, -0.25);
    } else {
      const nodes = game.routeNodes[b.team] || game.routeNodes.ct;
      const targetNode = nodes[b.patrolNode % nodes.length];
      const toNode = v3sub(targetNode, v3(b.pos.x, 0, b.pos.z));
      const distNode = v3len(toNode);
      if (distNode < 1.5) {
        b.patrolNode = (b.patrolNode + 1 + Math.floor(Math.random() * 2)) % nodes.length;
      }
      wish = v3norm(toNode);
      if (distNode < 0.25) {
        const phase = (tNow * 0.001 + b.patrolPhase) % (Math.PI * 2);
        wish = v3(Math.sin(phase), 0, Math.cos(phase));
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

    if (shouldChase && dist < 24 && !occluded && b.shootCooldown <= 0 && targetType !== 'site') {
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

        game.tracers.push({ a: muzzle, b: end, travel: 0, speed: 95, life: 0.32, hue: 0.02 });

        const hitChance = clamp01((26 - dist) / 26);
        if (Math.random() < 0.02 + 0.11 * hitChance) {
          if (targetType === 'player') {
            if (game.team === b.team) {
              b.shootCooldown = 0.18;
              continue;
            }
            game.hp -= bw.damage;
            if (game.hp <= 0) {
              game.playerAlive = false;
              game.hp = 0;
              game.vel = v3(0, 0, 0);
              setStatus('You died', true);
              game.stats.deaths += 1;
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

function drawWorld() {
  glsys.resize();
  const aspect = glsys.width / Math.max(1, glsys.height);
  mat4Perspective(proj, (70 * Math.PI) / 180, aspect, 0.05, 120);

  const camPos = v3(game.pos.x, game.pos.y + 1.6 - game.crouchT * 0.55, game.pos.z);
  const fwd = forwardFromYawPitch(game.yaw, game.pitch);
  const camTarget = v3add(camPos, fwd);
  mat4LookAt(view, camPos, camTarget, v3(0, 1, 0));

  const tSky = nowMs() * 0.00005;
  const skyA = v3(0.78, 0.88, 1.0);
  const skyB = v3(0.92, 0.96, 1.0);
  gl.clearColor(lerp(skyA.x, skyB.x, 0.7), lerp(skyA.y, skyB.y, 0.7), lerp(skyA.z, skyB.z, 0.7), 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniformMatrix4fv(uProj, false, proj);
  gl.uniformMatrix4fv(uView, false, view);
  gl.uniform3f(uLightDir, -0.35, -1.0, 0.25);
  gl.bindVertexArray(glsys.vao);

  function drawBox(pos, scale, color) {
    mat4FromTranslation(tmpA, pos);
    mat4FromScale(tmpB, scale);
    mat4Mul(model, tmpA, tmpB);
    gl.uniformMatrix4fv(uModel, false, model);
    gl.uniform3f(uColor, color.x, color.y, color.z);
    gl.drawElements(gl.TRIANGLES, glsys.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  function drawOrientedBox(pos, right, up, forward, scale, color) {
    mat4FromBasisTRS(model, right, up, forward, pos, scale);
    gl.uniformMatrix4fv(uModel, false, model);
    gl.uniform3f(uColor, color.x, color.y, color.z);
    gl.drawElements(gl.TRIANGLES, glsys.indexCount, gl.UNSIGNED_SHORT, 0);
  }

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

  for (const b of game.boxes) drawBox(b.pos, b.scale, b.color);

  for (let i = 0; i < 22; i++) {
    const x = -game.mapBounds + ((i * 9) % (game.mapBounds * 2));
    const z = -game.mapBounds + ((i * 13) % (game.mapBounds * 2));
    const y = 10.5 + Math.sin(tSky + i) * 0.25;
    const puff = 1.2 + ((i % 3) * 0.45);
    const c = v3(0.96, 0.98, 1.0);
    drawBox(v3(x, y, z), v3(3.6 * puff, 0.6, 2.2 * puff), c);
  }

  if (game.mode === 'ai') {
    const planted = game.round.bombPlanted;
    for (const site of game.round.sites) {
      const active = site.key === game.round.activeSite;
      const plantedHere = site.key === game.round.plantSite;
      const neutral = v3(0.9, 0.92, 0.98);
      const activeCol = site.key === 'A' ? v3(0.58, 0.72, 1.0) : v3(0.92, 0.78, 0.52);
      const plantedCol = v3(1.0, 0.58, 0.45);
      const padCol = plantedHere ? plantedCol : active ? activeCol : neutral;
      drawBox(v3(site.pos.x, site.pos.y, site.pos.z), v3(1.8, 0.06, 1.8), padCol);
    }
    if (planted) {
      drawBox(v3(game.round.bombPos.x, game.round.bombPos.y + 0.12, game.round.bombPos.z), v3(0.22, 0.16, 0.36), v3(1.0, 0.35, 0.25));
    }
  }

  if (game.mode === 'ai' && game.smoke.active.length > 0) {
    for (const s of game.smoke.active) {
      drawBox(v3(s.pos.x, s.pos.y, s.pos.z), v3(s.scale.x, s.scale.y, s.scale.z), v3(0.62, 0.66, 0.72));
      drawBox(v3(s.pos.x, s.pos.y + 0.95, s.pos.z), v3(s.scale.x * 0.7, s.scale.y * 0.6, s.scale.z * 0.7), v3(0.78, 0.8, 0.84));
    }
  }

  function drawHumanoid(pos, yaw, hp, maxHp, palette) {
    const hurt = 1 - clamp01(hp / maxHp);
    const baseCol = v3(
      lerp(palette.body.x, palette.hurt.x, hurt),
      lerp(palette.body.y, palette.hurt.y, hurt),
      lerp(palette.body.z, palette.hurt.z, hurt)
    );
    const up = v3(0, 1, 0);
    const f = v3norm(forwardFromYawPitch(yaw, 0));
    const r = v3norm(v3cross(up, f));
    const u = v3(0, 1, 0);

    const base = v3(pos.x, pos.y, pos.z);
    const hip = v3add(base, v3(0, 0.95, 0));

    drawOrientedBox(v3add(hip, v3(0, 0.25, 0)), r, u, f, v3(0.55, 0.75, 0.3), baseCol);
    drawOrientedBox(v3add(hip, v3(0, 0.78, 0.02)), r, u, f, v3(0.5, 0.45, 0.32), baseCol);

    const headCol = palette.head;
    drawOrientedBox(v3add(hip, v3(0, 1.18, 0.02)), r, u, f, v3(0.32, 0.32, 0.32), headCol);

    const armCol = palette.arm;
    drawOrientedBox(v3add(hip, v3(0.42, 0.78, 0.02)), r, u, f, v3(0.18, 0.55, 0.18), armCol);
    drawOrientedBox(v3add(hip, v3(-0.42, 0.78, 0.02)), r, u, f, v3(0.18, 0.55, 0.18), armCol);

    const legCol = palette.leg;
    drawOrientedBox(v3add(base, v3(0.18, 0.45, 0)), r, u, f, v3(0.22, 0.9, 0.22), legCol);
    drawOrientedBox(v3add(base, v3(-0.18, 0.45, 0)), r, u, f, v3(0.22, 0.9, 0.22), legCol);

    const gunCol = palette.gun;
    drawOrientedBox(v3add(hip, v3(0.18, 0.78, 0.48)), r, u, f, v3(0.16, 0.12, 0.62), gunCol);
  }

  for (const bot of game.bots) {
    if (!bot.alive) continue;
    const pal =
      bot.team === 'ct'
        ? {
            body: v3(0.2, 0.34, 0.75),
            hurt: v3(0.95, 0.2, 0.22),
            head: v3(0.14, 0.18, 0.28),
            arm: v3(0.18, 0.26, 0.58),
            leg: v3(0.14, 0.2, 0.42),
            gun: v3(0.12, 0.12, 0.14),
          }
        : {
            body: v3(0.78, 0.62, 0.16),
            hurt: v3(0.95, 0.2, 0.22),
            head: v3(0.28, 0.22, 0.1),
            arm: v3(0.58, 0.46, 0.12),
            leg: v3(0.42, 0.34, 0.1),
            gun: v3(0.12, 0.12, 0.14),
          };
    drawHumanoid(bot.pos, bot.yaw, bot.hp, bot.maxHp, pal);
  }

  const playerPalette = {
    body: v3(0.22, 0.22, 0.4),
    hurt: v3(0.95, 0.2, 0.22),
    head: v3(0.16, 0.18, 0.2),
    arm: v3(0.2, 0.2, 0.35),
    leg: v3(0.16, 0.16, 0.28),
    gun: v3(0.12, 0.12, 0.14),
  };

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

  if (w.def.kind === 0) {
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

  for (const s of game.shells) {
    const c = v3(0.65, 0.55, 0.2);
    drawBox(s.pos, v3(0.06, 0.04, 0.1), c);
  }

  for (const t of game.tracers) {
    const k = clamp01(t.life / 0.32);
    const hue = t.hue || 0.55;
    const baseCol =
      hue < 0.1
        ? v3(1.0 * k, 0.25 + 0.25 * k, 0.22)
        : v3(0.25 + 0.7 * k, 0.9 * k, 1.0 * k);

    const travel = clamp01(t.travel || 0);
    const segLen = 1.4;
    const dir = v3sub(t.b, t.a);
    const L = v3len(dir);
    if (L > 0.001) {
      const f = v3scale(dir, 1 / L);
      const tip = v3add(t.a, v3scale(f, L * travel));
      const tail = v3add(tip, v3scale(f, -Math.min(segLen, L * travel)));
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

let last = nowMs();
function frame() {
  const t = nowMs();
  let dt = (t - last) / 1000;
  last = t;
  dt = Math.min(0.033, Math.max(0, dt));

  updateSmoke(dt);

  if (game.pointerLocked) {
    updatePlayer(dt);
    updateTargets(dt);
    updateWeapon(dt);
    updateBots(dt);
    updateShells(dt);
    updateTracers(dt);
    updateHitmarker(dt);
    updateBombMode(dt);
  }

  if (t - game.lastStatusAt > 2500 && game.pointerLocked) {
    statusEl.textContent = `Pos ${game.pos.x.toFixed(1)}, ${game.pos.z.toFixed(1)}`;
  }

  updateHud();
  drawWorld();
  requestAnimationFrame(frame);
}

setOverlayVisible(true);
setStatus('Lobby', false);
requestAnimationFrame(frame);
