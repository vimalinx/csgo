/**
 * math-utils.js
 * 数学工具函数模块 - 向量与矩阵运算
 * 
 * 提供 3D 向量运算和 4x4 矩阵变换功能。
 * 所有函数都是纯函数，不依赖外部状态。
 * 
 * @module MathUtils
 * @version 1.0.0
 */

// ============================================================================
// 向量运算 (Vector Operations)
// ============================================================================

/**
 * 创建 3D 向量
 * @param {number} x - X 分量
 * @param {number} y - Y 分量
 * @param {number} z - Z 分量
 * @returns {{x: number, y: number, z: number}} 3D 向量对象
 * @example
 * const v = MathUtils.v3(1, 2, 3); // {x: 1, y: 2, z: 3}
 */
function v3(x, y, z) {
  return { x, y, z };
}

/**
 * 向量加法
 * @param {{x: number, y: number, z: number}} a - 向量 a
 * @param {{x: number, y: number, z: number}} b - 向量 b
 * @returns {{x: number, y: number, z: number}} a + b
 * @example
 * const result = MathUtils.v3add({x: 1, y: 2, z: 3}, {x: 4, y: 5, z: 6});
 * // {x: 5, y: 7, z: 9}
 */
function v3add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/**
 * 向量减法
 * @param {{x: number, y: number, z: number}} a - 向量 a
 * @param {{x: number, y: number, z: number}} b - 向量 b
 * @returns {{x: number, y: number, z: number}} a - b
 * @example
 * const result = MathUtils.v3sub({x: 4, y: 5, z: 6}, {x: 1, y: 2, z: 3});
 * // {x: 3, y: 3, z: 3}
 */
function v3sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * 向量标量乘法（别名 v3scale）
 * @param {{x: number, y: number, z: number}} a - 向量
 * @param {number} s - 标量
 * @returns {{x: number, y: number, z: number}} a * s
 * @example
 * const result = MathUtils.v3mul({x: 1, y: 2, z: 3}, 2);
 * // {x: 2, y: 4, z: 6}
 */
function v3mul(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

/**
 * 向量标量乘法（v3mul 的别名，保持向后兼容）
 * @param {{x: number, y: number, z: number}} a - 向量
 * @param {number} s - 标量
 * @returns {{x: number, y: number, z: number}} a * s
 */
function v3scale(a, s) {
  return v3mul(a, s);
}

/**
 * 向量点积（内积）
 * @param {{x: number, y: number, z: number}} a - 向量 a
 * @param {{x: number, y: number, z: number}} b - 向量 b
 * @returns {number} a · b
 * @example
 * const result = MathUtils.v3dot({x: 1, y: 0, z: 0}, {x: 1, y: 0, z: 0});
 * // 1 (单位向量点积为 1)
 */
function v3dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * 向量叉积（外积）
 * @param {{x: number, y: number, z: number}} a - 向量 a
 * @param {{x: number, y: number, z: number}} b - 向量 b
 * @returns {{x: number, y: number, z: number}} a × b（垂直于 a 和 b 的向量）
 * @example
 * const result = MathUtils.v3cross({x: 1, y: 0, z: 0}, {x: 0, y: 1, z: 0});
 * // {x: 0, y: 0, z: 1}
 */
function v3cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * 向量长度（模）
 * @param {{x: number, y: number, z: number}} a - 向量
 * @returns {number} ||a||
 * @example
 * const result = MathUtils.v3len({x: 3, y: 4, z: 0});
 * // 5
 */
function v3len(a) {
  return Math.hypot(a.x, a.y, a.z);
}

/**
 * 向量归一化（单位向量）
 * @param {{x: number, y: number, z: number}} a - 向量
 * @returns {{x: number, y: number, z: number}} a / ||a||（零向量返回零向量）
 * @example
 * const result = MathUtils.v3norm({x: 3, y: 4, z: 0});
 * // {x: 0.6, y: 0.8, z: 0}
 */
function v3norm(a) {
  const L = v3len(a);
  if (L <= 1e-8) return { x: 0, y: 0, z: 0 };
  return { x: a.x / L, y: a.y / L, z: a.z / L };
}

/**
 * 向量距离
 * @param {{x: number, y: number, z: number}} a - 向量 a
 * @param {{x: number, y: number, z: number}} b - 向量 b
 * @returns {number} ||b - a||
 * @example
 * const result = MathUtils.v3dist({x: 0, y: 0, z: 0}, {x: 3, y: 4, z: 0});
 * // 5
 */
function v3dist(a, b) {
  return v3len(v3sub(a, b));
}

// ============================================================================
// 矩阵运算 (Matrix Operations)
// ============================================================================

/**
 * 创建 4x4 单位矩阵
 * @returns {Float32Array} 4x4 单位矩阵（列主序）
 * @example
 * const m = MathUtils.mat4Identity();
 * // [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
 */
function mat4Identity() {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

/**
 * 4x4 矩阵乘法
 * @param {Float32Array} out - 输出矩阵（可以是 a 或 b）
 * @param {Float32Array} a - 矩阵 a
 * @param {Float32Array} b - 矩阵 b
 * @returns {Float32Array} out = a × b
 * @example
 * const result = MathUtils.mat4Mul(new Float32Array(16), m1, m2);
 */
function mat4Mul(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
  const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
  const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
  const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

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

/**
 * 使用 4x4 矩阵变换点
 * @param {Float32Array} m - 4x4 变换矩阵
 * @param {{x: number, y: number, z: number}} p - 3D 点
 * @returns {{x: number, y: number, z: number}} 变换后的点（自动透视除法）
 * @example
 * const transformed = MathUtils.mat4TransformPoint(matrix, {x: 1, y: 2, z: 3});
 */
function mat4TransformPoint(m, p) {
  const x = m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12];
  const y = m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13];
  const z = m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14];
  const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
  // 透视除法保护：w 接近 0 时返回会导致裁剪的点
  if (Math.abs(w) < 1e-8) return { x: 0, y: 0, z: 0 };
  return { x: x / w, y: y / w, z: z / w };
}

// ============================================================================
// 辅助函数 (Utility Functions)
// ============================================================================

/**
 * 将值限制在 [0, 1] 范围内
 * @param {number} v - 输入值
 * @returns {number} 限制后的值
 */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * 将值限制在指定范围内
 * @param {number} v - 输入值
 * @param {number} lo - 下限
 * @param {number} hi - 上限
 * @returns {number} 限制后的值
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 线性插值
 * @param {number} a - 起始值
 * @param {number} b - 结束值
 * @param {number} t - 插值参数 [0, 1]
 * @returns {number} 插值结果
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * 缓出二次缓动函数
 * @param {number} t - 输入参数 [0, 1]
 * @returns {number} 缓动后的值
 */
function easeOutQuad(t) {
  const x = clamp01(t);
  return x * (2 - x);
}

// ============================================================================
// 全局导出 (Global Export)
// ============================================================================

// 将所有函数挂载到全局 MathUtils 对象上，避免与 main.js 中的函数冲突
const MathUtils = {
  // 向量运算
  v3,
  v3add,
  v3sub,
  v3mul,
  v3scale,
  v3dot,
  v3cross,
  v3len,
  v3norm,
  v3dist,
  // 矩阵运算
  mat4Identity,
  mat4Mul,
  mat4TransformPoint,
  // 辅助函数
  clamp01,
  clamp,
  lerp,
  easeOutQuad,
};

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.MathUtils = MathUtils;
}

// ES Module 导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathUtils;
}
