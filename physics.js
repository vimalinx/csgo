/**
 * physics.js
 * 物理工具函数模块 - 碰撞检测与几何计算
 * 
 * 提供 AABB（轴对齐包围盒）碰撞检测、射线求交等物理计算功能。
 * 所有函数都是纯函数，不依赖外部状态。
 * 
 * @module Physics
 * @version 1.0.0
 * @requires MathUtils (math-utils.js)
 */

// ============================================================================
// AABB 碰撞检测 (Axis-Aligned Bounding Box)
// ============================================================================

/**
 * 从中心点和半尺寸创建 AABB
 * @param {{x: number, y: number, z: number}} center - 中心点
 * @param {{x: number, y: number, z: number}} half - 半尺寸（各轴向的一半长度）
 * @returns {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} AABB 对象
 * @example
 * const aabb = Physics.aabbFromCenter({x: 0, y: 1, z: 0}, {x: 0.5, y: 1, z: 0.5});
 * // {min: {x: -0.5, y: 0, z: -0.5}, max: {x: 0.5, y: 2, z: 0.5}}
 */
function aabbFromCenter(center, half) {
  return {
    min: { x: center.x - half.x, y: center.y - half.y, z: center.z - half.z },
    max: { x: center.x + half.x, y: center.y + half.y, z: center.z + half.z },
  };
}

/**
 * 测试两个 AABB 是否相交
 * @param {{min: {x,y,z}, max: {x,y,z}}} a - AABB a
 * @param {{min: {x,y,z}, max: {x,y,z}}} b - AABB b
 * @returns {boolean} 是否相交
 * @example
 * const a = {min: {x: 0, y: 0, z: 0}, max: {x: 2, y: 2, z: 2}};
 * const b = {min: {x: 1, y: 1, z: 1}, max: {x: 3, y: 3, z: 3}};
 * Physics.aabbIntersects(a, b); // true
 */
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

/**
 * 测试点是否在 AABB 内
 * @param {{x: number, y: number, z: number}} point - 测试点
 * @param {{min: {x,y,z}, max: {x,y,z}}} aabb - AABB
 * @returns {boolean} 点是否在 AABB 内（包含边界）
 * @example
 * const aabb = {min: {x: 0, y: 0, z: 0}, max: {x: 2, y: 2, z: 2}};
 * Physics.pointInAABB({x: 1, y: 1, z: 1}, aabb); // true
 * Physics.pointInAABB({x: 3, y: 1, z: 1}, aabb); // false
 */
function pointInAABB(point, aabb) {
  return (
    point.x >= aabb.min.x &&
    point.x <= aabb.max.x &&
    point.y >= aabb.min.y &&
    point.y <= aabb.max.y &&
    point.z >= aabb.min.z &&
    point.z <= aabb.max.z
  );
}

/**
 * 找到 AABB 上距离给定点最近的点
 * @param {{x: number, y: number, z: number}} point - 目标点
 * @param {{min: {x,y,z}, max: {x,y,z}}} aabb - AABB
 * @returns {{x: number, y: number, z: number}} AABB 上距离 point 最近的点
 * @example
 * const aabb = {min: {x: 0, y: 0, z: 0}, max: {x: 2, y: 2, z: 2}};
 * Physics.closestPointOnAABB({x: 3, y: 1, z: 1}, aabb);
 * // {x: 2, y: 1, z: 1}
 */
function closestPointOnAABB(point, aabb) {
  return {
    x: Math.max(aabb.min.x, Math.min(aabb.max.x, point.x)),
    y: Math.max(aabb.min.y, Math.min(aabb.max.y, point.y)),
    z: Math.max(aabb.min.z, Math.min(aabb.max.z, point.z)),
  };
}

// ============================================================================
// 射线求交 (Ray Intersection)
// ============================================================================

/**
 * 射线与 AABB 求交测试（slab 方法）
 * @param {{x: number, y: number, z: number}} origin - 射线原点
 * @param {{x: number, y: number, z: number}} dir - 射线方向（需归一化）
 * @param {{min: {x,y,z}, max: {x,y,z}}} aabb - AABB
 * @returns {number|null} 相交参数 t（origin + t * dir 为交点），不相交返回 null
 * @example
 * const ray = {origin: {x: 0, y: 0, z: 0}, dir: {x: 1, y: 0, z: 0}};
 * const aabb = {min: {x: 2, y: -1, z: -1}, max: {x: 4, y: 1, z: 1}};
 * const t = Physics.rayAABBIntersect(ray.origin, ray.dir, aabb);
 * // t = 2（交点在 {x: 2, y: 0, z: 0}）
 */
function rayAABBIntersect(origin, dir, aabb) {
  const invX = 1 / (Math.abs(dir.x) < 1e-8 ? 1e-8 : dir.x);
  const invY = 1 / (Math.abs(dir.y) < 1e-8 ? 1e-8 : dir.y);
  const invZ = 1 / (Math.abs(dir.z) < 1e-8 ? 1e-8 : dir.z);

  let tmin = (aabb.min.x - origin.x) * invX;
  let tmax = (aabb.max.x - origin.x) * invX;
  if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

  let tymin = (aabb.min.y - origin.y) * invY;
  let tymax = (aabb.max.y - origin.y) * invY;
  if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
  if (tmin > tymax || tymin > tmax) return null;
  tmin = Math.max(tmin, tymin);
  tmax = Math.min(tmax, tymax);

  let tzmin = (aabb.min.z - origin.z) * invZ;
  let tzmax = (aabb.max.z - origin.z) * invZ;
  if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
  if (tmin > tzmax || tzmin > tmax) return null;
  tmin = Math.max(tmin, tzmin);
  tmax = Math.min(tmax, tzmax);

  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : tmax;
}

/**
 * 射线与 AABB 求交（rayAABBIntersect 的别名，保持与 main.js 兼容）
 * @param {{x: number, y: number, z: number}} ro - 射线原点
 * @param {{x: number, y: number, z: number}} rd - 射线方向
 * @param {{min: {x,y,z}, max: {x,y,z}}} box - AABB
 * @returns {number|null} 相交参数 t
 */
function rayAabb(ro, rd, box) {
  return rayAABBIntersect(ro, rd, box);
}

// ============================================================================
// 辅助几何函数 (Utility Geometry Functions)
// ============================================================================

/**
 * 计算 AABB 的中心点
 * @param {{min: {x,y,z}, max: {x,y,z}}} aabb - AABB
 * @returns {{x: number, y: number, z: number}} 中心点
 */
function aabbCenter(aabb) {
  return {
    x: (aabb.min.x + aabb.max.x) * 0.5,
    y: (aabb.min.y + aabb.max.y) * 0.5,
    z: (aabb.min.z + aabb.max.z) * 0.5,
  };
}

/**
 * 计算 AABB 的尺寸（各轴向长度）
 * @param {{min: {x,y,z}, max: {x,y,z}}} aabb - AABB
 * @returns {{x: number, y: number, z: number}} 尺寸向量
 */
function aabbSize(aabb) {
  return {
    x: aabb.max.x - aabb.min.x,
    y: aabb.max.y - aabb.min.y,
    z: aabb.max.z - aabb.min.z,
  };
}

/**
 * 计算 AABB 的半尺寸
 * @param {{min: {x,y,z}, max: {x,y,z}}} aabb - AABB
 * @returns {{x: number, y: number, z: number}} 半尺寸向量
 */
function aabbHalf(aabb) {
  const size = aabbSize(aabb);
  return {
    x: size.x * 0.5,
    y: size.y * 0.5,
    z: size.z * 0.5,
  };
}

/**
 * 计算点到 AABB 的距离
 * @param {{x: number, y: number, z: number}} point - 目标点
 * @param {{min: {x,y,z}, max: {x,y,z}}} aabb - AABB
 * @returns {number} 距离（点在 AABB 内时返回 0）
 */
function distanceToAABB(point, aabb) {
  const closest = closestPointOnAABB(point, aabb);
  const dx = point.x - closest.x;
  const dy = point.y - closest.y;
  const dz = point.z - closest.z;
  // 如果点在 AABB 内，返回 0
  if (pointInAABB(point, aabb)) return 0;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 合并两个 AABB，生成包含两者的最小 AABB
 * @param {{min: {x,y,z}, max: {x,y,z}}} a - AABB a
 * @param {{min: {x,y,z}, max: {x,y,z}}} b - AABB b
 * @returns {{min: {x,y,z}, max: {x,y,z}}} 合并后的 AABB
 */
function aabbMerge(a, b) {
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  };
}

// ============================================================================
// 全局导出 (Global Export)
// ============================================================================

// 将所有函数挂载到全局 Physics 对象上，避免与 main.js 中的函数冲突
const Physics = {
  // AABB 碰撞检测
  aabbFromCenter,
  aabbIntersects,
  pointInAABB,
  closestPointOnAABB,
  // 射线求交
  rayAABBIntersect,
  rayAabb,
  // 辅助函数
  aabbCenter,
  aabbSize,
  aabbHalf,
  distanceToAABB,
  aabbMerge,
};

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.Physics = Physics;
}

// ES Module 导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Physics;
}
