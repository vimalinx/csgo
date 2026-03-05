/**
 * bot-movement.js
 * Bot 移动 AI 模块 - 负责导航、寻路和移动控制
 * 
 * 提供 A* 寻路、巡逻点选择、碰撞检测和移动更新等功能。
 * 所有函数都是纯函数或半纯函数（依赖传入的游戏状态）。
 * 
 * @module BotMovement
 * @version 1.0.0
 */

// ============================================================================
// 依赖导入 (Dependencies)
// ============================================================================

const MathUtils = window.MathUtils;
const Physics = window.Physics;

// 向量运算函数
const { v3, v3sub, v3len, v3norm, v3scale, clamp } = MathUtils;
// 物理碰撞函数
const { aabbFromCenter, rayAabb } = Physics;

// ============================================================================
// 导航网格常量 (Navigation Grid Constants)
// ============================================================================

/**
 * 导航网格尺寸（网格数量）
 * @constant {number}
 */
const NAV_GRID_SIZE = 56;

/**
 * 导航网格原点坐标
 * @constant {number}
 */
const NAV_GRID_ORIGIN = -28;

// ============================================================================
// 碰撞检测函数 (Collision Detection Functions)
// ============================================================================

/**
 * 带 epsilon 的 AABB 相交测试
 * @param {{min: {x,y,z}, max: {x,y,z}}} a - AABB a
 * @param {{min: {x,y,z}, max: {x,y,z}}} b - AABB b
 * @param {number} eps - Epsilon 值
 * @returns {boolean} 是否相交
 */
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

/**
 * 创建玩家 AABB
 * @param {{x: number, y: number, z: number}} pos - 玩家位置
 * @returns {{min: {x,y,z}, max: {x,y,z}}} 玩家 AABB
 */
export function playerAabb(pos) {
  const half = v3(0.3, 0.9, 0.3);
  const center = v3(pos.x, pos.y + half.y, pos.z);
  return aabbFromCenter(center, half);
}

// ============================================================================
// 导航辅助函数 (Navigation Helper Functions)
// ============================================================================

/**
 * 世界坐标转网格坐标
 * @param {number} x - 世界坐标 X
 * @param {number} z - 世界坐标 Z
 * @param {number} mapBounds - 地图边界大小
 * @returns {{x: number, z: number}} 网格坐标
 * @example
 * const grid = worldToGrid(10, 20, 28);
 * // {x: 5, z: 8}
 */
export function worldToGrid(x, z, mapBounds) {
  const gx = Math.floor((x - NAV_GRID_ORIGIN) / (mapBounds * 2 / NAV_GRID_SIZE));
  const gz = Math.floor((z - NAV_GRID_ORIGIN) / (mapBounds * 2 / NAV_GRID_SIZE));
  return { x: clamp(gx, 0, NAV_GRID_SIZE - 1), z: clamp(gz, 0, NAV_GRID_SIZE - 1) };
}

/**
 * 网格坐标转世界坐标
 * @param {number} gx - 网格坐标 X
 * @param {number} gz - 网格坐标 Z
 * @param {number} mapBounds - 地图边界大小
 * @returns {{x: number, y: number, z: number}} 世界坐标
 * @example
 * const world = gridToWorld(5, 8, 28);
 * // {x: 10.5, y: 0, z: 20.5}
 */
export function gridToWorld(gx, gz, mapBounds) {
  const x = NAV_GRID_ORIGIN + (gx + 0.5) * (mapBounds * 2 / NAV_GRID_SIZE);
  const z = NAV_GRID_ORIGIN + (gz + 0.5) * (mapBounds * 2 / NAV_GRID_SIZE);
  return v3(x, 0, z);
}

/**
 * 检查网格点是否可通行
 * @param {number} gx - 网格坐标 X
 * @param {number} gz - 网格坐标 Z
 * @param {Array<Array<number>>} grid - 导航网格
 * @returns {boolean} 是否可通行
 * @example
 * const walkable = isWalkable(5, 8, game.grid);
 * // true 或 false
 */
export function isWalkable(gx, gz, grid) {
  if (gx < 0 || gx >= NAV_GRID_SIZE || gz < 0 || gz >= NAV_GRID_SIZE) return false;
  return grid[gx][gz] === 0;
}

/**
 * A* 启发式函数（曼哈顿距离）
 * @param {{x: number, z: number}} a - 节点 a
 * @param {{x: number, z: number}} b - 节点 b
 * @returns {number} 曼哈顿距离
 */
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

/**
 * 获取节点的邻居（4方向）
 * @param {{x: number, z: number}} node - 当前节点
 * @param {Array<Array<number>>} grid - 导航网格
 * @returns {Array<{x: number, z: number}>} 邻居节点列表
 */
function getNeighbors(node, grid) {
  const neighbors = [];
  const directions = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
  ];

  for (const dir of directions) {
    const neighbor = { x: node.x + dir.x, z: node.z + dir.z };
    if (isWalkable(neighbor.x, neighbor.z, grid)) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

// ============================================================================
// 寻路函数 (Pathfinding Functions)
// ============================================================================

/**
 * A* 寻路算法
 * 在导航网格上寻找从起点到终点的最优路径
 * 
 * @param {{x: number, z: number}} start - 起点（世界坐标）
 * @param {{x: number, z: number}} end - 终点（世界坐标）
 * @param {number} mapBounds - 地图边界大小
 * @param {Array<Array<number>>} grid - 导航网格
 * @returns {Array<{x: number, y: number, z: number}>|null} 路径点数组，找不到路径返回 null
 * @example
 * const path = findPath(
 *   {x: 0, z: 0},
 *   {x: 10, z: 10},
 *   game.mapBounds,
 *   game.grid
 * );
 * // [{x: 1, y: 0, z: 1}, {x: 2, y: 0, z: 2}, ...]
 */
export function findPath(start, end, mapBounds, grid) {
  const startGrid = worldToGrid(start.x, start.z, mapBounds);
  const endGrid = worldToGrid(end.x, end.z, mapBounds);

  // 如果终点不可达，尝试找最近的可通行点
  if (!isWalkable(endGrid.x, endGrid.z, grid)) {
    let found = false;
    for (let r = 1; r < 5 && !found; r++) {
      for (let dx = -r; dx <= r && !found; dx++) {
        for (let dz = -r; dz <= r && !found; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          if (isWalkable(endGrid.x + dx, endGrid.z + dz, grid)) {
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
        path.unshift(gridToWorld(curr.x, curr.z, mapBounds));
        curr = cameFrom.get(key(curr));
      }
      return path.length > 0 ? path : [gridToWorld(endGrid.x, endGrid.z, mapBounds)];
    }

    // 移除当前节点
    openSet.splice(openSet.indexOf(current), 1);
    closedSet.add(currentKey);

    // 检查邻居
    for (const neighbor of getNeighbors(current, grid)) {
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

  return null; // 找不到路径
}

// ============================================================================
// 巡逻函数 (Patrol Functions)
// ============================================================================

/**
 * 获取随机巡逻点
 * 在地图上随机选择一个可通行的点作为巡逻目标
 * 
 * @param {number} mapBounds - 地图边界大小
 * @param {Array<Array<number>>} grid - 导航网格
 * @returns {{x: number, y: number, z: number}} 随机巡逻点坐标
 * @example
 * const patrolPoint = getRandomPatrolPoint(game.mapBounds, game.grid);
 * // {x: 5.2, y: 0, z: -3.8}
 */
export function getRandomPatrolPoint(mapBounds, grid) {
  const attempts = 20;
  for (let i = 0; i < attempts; i++) {
    const x = (Math.random() - 0.5) * mapBounds * 1.6;
    const z = (Math.random() - 0.5) * mapBounds * 1.6;
    const gridPos = worldToGrid(x, z, mapBounds);
    if (isWalkable(gridPos.x, gridPos.z, grid)) {
      return v3(x, 0, z);
    }
  }
  // 默认返回地图中心
  return v3(0, 0, 0);
}

// ============================================================================
// 碰撞检测和移动函数 (Collision and Movement Functions)
// ============================================================================

/**
 * 移动和碰撞检测
 * 处理实体移动时的碰撞响应
 * 
 * @param {{x: number, y: number, z: number}} pos - 当前位置
 * @param {{x: number, y: number, z: number}} delta - 移动增量
 * @param {Array<{min: {x,y,z}, max: {x,y,z}}>} colliders - 碰撞体列表
 * @returns {{pos: {x: number, y: number, z: number}, onGround: boolean}} 移动结果
 * @example
 * const result = moveAndCollide(
 *   {x: 0, y: 0, z: 0},
 *   {x: 0.1, y: 0, z: 0},
 *   game.colliders
 * );
 * // {pos: {x: 0.1, y: 0, z: 0}, onGround: true}
 */
export function moveAndCollide(pos, delta, colliders) {
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

// ============================================================================
// Bot 移动更新函数 (Bot Movement Update Functions)
// ============================================================================

/**
 * 更新 Bot 移动
 * 处理 Bot 的导航、追逐、巡逻和碰撞检测
 * 
 * @param {Object} bot - 当前 Bot 对象
 * @param {Object} targetPos - 目标位置 {x, y, z}
 * @param {number} dist - 到目标的距离
 * @param {string} botState - Bot 状态 ('chase' | 'patrol')
 * @param {string} targetType - 目标类型 ('bot' | 'player' | 'site')
 * @param {Object} game - 游戏状态对象
 * @param {number} dt - 时间增量（秒）
 * @returns {Object} 更新后的 Bot 状态
 *   - wish: 移动方向向量
 *   - state: Bot 状态
 *   - navPath: 导航路径
 *   - navIndex: 当前路径点索引
 *   - navGoal: 导航目标
 *   - patrolNode: 巡逻节点索引
 * @example
 * const result = updateBotMovement(
 *   bot,
 *   targetPos,
 *   dist,
 *   'chase',
 *   'player',
 *   game,
 *   dt
 * );
 * // {wish: {x: 0.7, y: 0, z: 0.7}, state: 'chase', ...}
 */
export function updateBotMovement(bot, targetPos, dist, botState, targetType, game, dt) {
  let wish = v3(0, 0, 0);
  let state = botState;
  let navPath = bot.navPath;
  let navIndex = bot.navIndex;
  let navGoal = bot.navGoal;
  let patrolNode = bot.patrolNode;

  if (state === 'chase') {
    // 追逐模式：使用 A* 寻路追踪目标
    if (!navPath || navIndex >= navPath.length || !navGoal || v3len(v3sub(targetPos, navGoal)) > 2) {
      // 需要重新计算路径
      navGoal = targetPos;
      navPath = findPath(v3(bot.pos.x, 0, bot.pos.z), v3(targetPos.x, 0, targetPos.z), game.mapBounds, game.grid);
      navIndex = 0;
    }

    if (navPath && navIndex < navPath.length) {
      const nextPoint = navPath[navIndex];
      const toNext = v3sub(nextPoint, v3(bot.pos.x, 0, bot.pos.z));
      const distNext = v3len(toNext);

      if (distNext < 1.0) {
        navIndex++; // 到达路径点，移动到下一个
      } else {
        wish = v3norm(toNext);
      }
    } else {
      // A* 失败，直接追踪（使用简化逻辑）
      const toTarget = v3sub(targetPos, v3(bot.pos.x, bot.pos.y, bot.pos.z));
      const dir = dist > 1e-5 ? v3scale(toTarget, 1 / dist) : v3(0, 0, 1);
      wish = v3(dir.x, 0, dir.z);
    }

    // 靠近目标时后退
    if (dist < 4.2) wish = v3scale(wish, -0.25);
  } else {
    // 巡逻模式：使用 A* 寻路到随机点
    if (!navPath || navIndex >= navPath.length) {
      // 需要找到新的巡逻目标
      const target = getRandomPatrolPoint(game.mapBounds, game.grid);
      navGoal = target;
      navPath = findPath(v3(bot.pos.x, 0, bot.pos.z), target, game.mapBounds, game.grid);
      navIndex = 0;
    }

    if (navPath && navIndex < navPath.length) {
      const nextPoint = navPath[navIndex];
      const toNext = v3sub(nextPoint, v3(bot.pos.x, 0, bot.pos.z));
      const distNext = v3len(toNext);

      if (distNext < 1.0) {
        navIndex++; // 到达路径点，移动到下一个
      } else {
        wish = v3norm(toNext);
      }
    } else {
      // A* 失败，使用旧的巡逻逻辑作为后备
      const nodes = game.routeNodes[bot.team] || game.routeNodes.ct;
      const targetNode = nodes[patrolNode % nodes.length];
      const toNode = v3sub(targetNode, v3(bot.pos.x, 0, bot.pos.z));
      const distNode = v3len(toNode);
      if (distNode < 1.5) {
        patrolNode = (patrolNode + 1 + Math.floor(Math.random() * 2)) % nodes.length;
      }
      wish = v3norm(toNode);
    }
  }

  wish = v3norm(wish);

  // 计算速度
  const speed = state === 'chase' ? 2.8 : 1.6;
  const velX = wish.x * speed;
  const velZ = wish.z * speed;
  const velY = bot.vel.y + -18.5 * dt;
  const clampedVelY = Math.max(velY, -30);

  // 碰撞检测和位置更新
  const next = moveAndCollide(v3(bot.pos.x, bot.pos.y, bot.pos.z), v3scale(v3(velX, clampedVelY, velZ), dt), game.colliders);
  const newPos = next.pos;
  const newVelY = next.onGround && clampedVelY < 0 ? 0 : clampedVelY;

  // 边界限制
  const clampedPosX = clamp(newPos.x, -game.mapBounds + 0.3, game.mapBounds - 0.3);
  const clampedPosZ = clamp(newPos.z, -game.mapBounds + 0.3, game.mapBounds - 0.3);

  return {
    wish,
    state,
    navPath,
    navIndex,
    navGoal,
    patrolNode,
    pos: { x: clampedPosX, y: newPos.y, z: clampedPosZ },
    vel: { x: velX, y: newVelY, z: velZ }
  };
}
