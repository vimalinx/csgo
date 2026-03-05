/**
 * bot-targeting.js
 * Bot 目标选择模块 - 负责敌人的目标评估与选择
 * 
 * 提供目标选择、优先级评估、可见性检测等功能。
 * 所有函数都是纯函数或半纯函数（依赖传入的游戏状态）。
 * 
 * @module BotTargeting
 * @version 1.0.0
 */

// ============================================================================
// 依赖导入 (Dependencies)
// ============================================================================

const MathUtils = window.MathUtils;
const Physics = window.Physics;

// 向量运算函数
const { v3, v3add, v3sub, v3scale, v3dot, v3cross, v3len, v3norm } = MathUtils;
// 物理碰撞函数
const { rayAabb } = Physics;

// ============================================================================
// 目标选择核心函数 (Core Targeting Functions)
// ============================================================================

/**
 * 选择目标（综合评估）
 * 综合评估 Bot 敌人、玩家、目标点，选择最优目标
 * 
 * @param {Object} bot - 当前 Bot
 * @param {Array} enemies - 所有敌人列表（Bot）
 * @param {Object} player - 玩家信息 { alive, eye }
 * @param {Object} roundState - 回合状态
 * @param {Object} gameState - 游戏状态（包含 getSiteByKey, setRoundSite 等）
 * @returns {Object} { targetType, targetBot, targetPos, dist }
 *   - targetType: 'none' | 'bot' | 'player' | 'site'
 *   - targetBot: 目标 Bot 对象或 null
 *   - targetPos: 目标位置 {x, y, z}
 *   - dist: 到目标的距离
 */
export function selectTarget(bot, enemies, player, roundState, gameState) {
  const lookFrom = v3(bot.pos.x, bot.pos.y + 1.6, bot.pos.z);
  
  // 1. 首先寻找最近的敌对 Bot
  const bestEnemy = getBestTarget(bot, enemies);
  let bestEnemyDist = Infinity;
  let bestEnemyPos = null;
  
  if (bestEnemy) {
    bestEnemyPos = v3(bestEnemy.pos.x, bestEnemy.pos.y + 1.6, bestEnemy.pos.z);
    bestEnemyDist = v3len(v3sub(bestEnemyPos, lookFrom));
  }
  
  // 2. 初始化目标为最近的 Bot 敌人
  let targetType = 'none';
  let targetBot = null;
  let targetPos = null;
  let dist = Infinity;
  
  if (bestEnemy) {
    targetType = 'bot';
    targetBot = bestEnemy;
    targetPos = bestEnemyPos;
    dist = bestEnemyDist;
  }
  
  // 3. 检查玩家是否更近（如果不是队友）
  if (player.alive && gameState.team !== bot.team) {
    const dPlayer = v3len(v3sub(player.eye, lookFrom));
    if (dPlayer < dist) {
      targetType = 'player';
      targetBot = null;
      targetPos = player.eye;
      dist = dPlayer;
    }
  }
  
  // 4. T 队伍在炸弹未安放时，优先移动到目标点
  if (!roundState.bombPlanted && bot.team === 't') {
    const pick = gameState.getSiteByKey(bot.objectiveSite) || 
                 gameState.getSiteByKey(roundState.activeSite) || 
                 gameState.getSiteByKey('A');
    
    if (pick && !roundState.activeSite) {
      roundState.activeSite = pick.key;
    }
    if (pick) {
      bot.objectiveSite = pick.key;
    }
    if (pick) {
      gameState.setRoundSite(pick);
    }
    
    const site = pick ? pick.pos : roundState.sitePos;
    const dSite = v3len(v3sub(v3(site.x, lookFrom.y, site.z), lookFrom));
    
    if (dSite < dist) {
      targetType = 'site';
      targetBot = null;
      targetPos = v3(site.x, lookFrom.y, site.z);
      dist = dSite;
    }
  }
  
  // 5. CT 队伍在炸弹安放后，前往拆弹点
  if (roundState.bombPlanted && bot.team === 'ct') {
    const defSite = gameState.getSiteByKey(roundState.plantSite) || 
                    gameState.getSiteByKey(roundState.activeSite) || 
                    gameState.getSiteByKey('A');
    
    if (defSite) {
      gameState.setRoundSite(defSite);
    }
    
    const site = defSite ? defSite.pos : roundState.sitePos;
    const dSite = v3len(v3sub(v3(site.x, lookFrom.y, site.z), lookFrom));
    
    if (dSite < dist) {
      targetType = 'site';
      targetBot = null;
      targetPos = v3(site.x, lookFrom.y, site.z);
      dist = dSite;
    }
  }
  
  return { targetType, targetBot, targetPos, dist };
}

/**
 * 评估目标优先级
 * 根据距离、威胁度等因素计算目标优先级分数
 * 
 * @param {Object} bot - 当前 Bot
 * @param {Object} target - 目标对象
 * @param {string} targetType - 目标类型 ('bot' | 'player' | 'site')
 * @param {number} dist - 到目标的距离
 * @returns {number} 优先级分数（越高越优先）
 */
export function evaluateTargetPriority(bot, target, targetType, dist) {
  // 站点目标优先级最低
  if (targetType === 'site') {
    return 0;
  }
  
  // 基础分数：距离越近优先级越高
  let priority = 1000 / (dist + 1); // +1 避免除零
  
  // 玩家目标额外加分（玩家通常比 Bot 更重要）
  if (targetType === 'player') {
    priority += 100;
  }
  
  // Bot 目标的威胁度评估
  if (targetType === 'bot' && target) {
    // 如果目标正在看着我，威胁度更高
    // 这里可以添加更多威胁度评估逻辑
    // 目前简化为只考虑距离
    priority += 50;
  }
  
  return priority;
}

/**
 * 检测是否可以看到目标（射线碰撞检测）
 * 使用射线投射检测视线是否被障碍物阻挡
 * 
 * @param {Object} bot - 当前 Bot
 * @param {Object} targetPos - 目标位置 {x, y, z}
 * @param {number} dist - 到目标的距离
 * @param {Array} colliders - 碰撞体列表
 * @returns {boolean} 是否可见（true = 可见，false = 被阻挡）
 */
export function canSeeTarget(bot, targetPos, dist, colliders) {
  const lookFrom = v3(bot.pos.x, bot.pos.y + 1.6, bot.pos.z);
  const toTarget = v3sub(targetPos, lookFrom);
  const dir = dist > 1e-5 ? v3scale(toTarget, 1 / dist) : v3(0, 0, 1);
  
  // 射线碰撞检测
  for (const c of colliders) {
    const t = rayAabb(lookFrom, dir, c);
    if (t !== null && t > 0 && t < dist) {
      return false; // 被障碍物阻挡
    }
  }
  
  return true; // 可见
}

/**
 * 获取最佳目标（最近敌人）
 * 在敌对 Bot 列表中寻找距离最近的敌人
 * 
 * @param {Object} bot - 当前 Bot
 * @param {Array} enemies - 所有敌人列表（已过滤的存活 Bot）
 * @returns {Object|null} 最佳目标 Bot 或 null（如果没有敌人）
 */
export function getBestTarget(bot, enemies) {
  let bestEnemy = null;
  let bestEnemyDist = Infinity;
  
  const lookFrom = v3(bot.pos.x, bot.pos.y + 1.6, bot.pos.z);
  
  for (const other of enemies) {
    // 跳过自己和队友
    if (other.id === bot.id) continue;
    if (other.team === bot.team) continue;
    
    const oEye = v3(other.pos.x, other.pos.y + 1.6, other.pos.z);
    const d = v3sub(oEye, lookFrom);
    const L = v3len(d);
    
    if (L < bestEnemyDist) {
      bestEnemyDist = L;
      bestEnemy = other;
    }
  }
  
  return bestEnemy;
}

// ============================================================================
// 辅助函数 (Helper Functions)
// ============================================================================

/**
 * 计算 Bot 的朝向（yaw 角度）
 * 让 Bot 面向目标
 * 
 * @param {Object} bot - 当前 Bot
 * @param {Object} targetPos - 目标位置 {x, y, z}
 * @param {number} dist - 到目标的距离
 * @returns {number} yaw 角度（弧度）
 */
export function calculateYawToTarget(bot, targetPos, dist) {
  const lookFrom = v3(bot.pos.x, bot.pos.y + 1.6, bot.pos.z);
  const toTarget = v3sub(targetPos, lookFrom);
  const dir = dist > 1e-5 ? v3scale(toTarget, 1 / dist) : v3(0, 0, 1);
  
  return Math.atan2(dir.x, dir.z);
}
