/**
 * bot-combat.js
 * Bot 战斗模块 - 负责射击、装弹、瞄准和战斗决策
 * 
 * 提供战斗决策、射击执行、装弹管理、友军伤害检测等功能。
 * 所有函数都是纯函数或半纯函数（依赖传入的游戏状态）。
 * 
 * @module BotCombat
 * @version 1.0.0
 */

// ============================================================================
// 依赖导入 (Dependencies)
// ============================================================================

const MathUtils = window.MathUtils;
const Physics = window.Physics;

// 向量运算函数
const { v3, v3add, v3sub, v3scale, v3norm, v3cross, v3len, clamp, clamp01 } = MathUtils;
// 物理碰撞函数
const { rayAabb, aabbFromCenter } = Physics;

// ============================================================================
// 装弹函数 (Reload Functions)
// ============================================================================

/**
 * 判断 Bot 是否需要装弹
 * 
 * @param {Object} bot - Bot 对象
 * @param {Object} weapon - Bot 武器对象
 * @returns {boolean} 是否需要装弹
 * @example
 * const needsReload = shouldBotReload(bot, bot.weapon);
 * // true 或 false
 */
export function shouldBotReload(bot, weapon) {
  // 弹匣为空且不在装弹中，且还有储备弹药
  return !weapon.reloading && weapon.mag <= 0 && weapon.reserve > 0;
}

/**
 * 开始装弹
 * 
 * @param {Object} bot - Bot 对象
 * @param {Object} weapon - Bot 武器对象
 * @returns {void}
 * @example
 * startBotReload(bot, bot.weapon);
 * // weapon.reloading = true
 */
export function startBotReload(bot, weapon) {
  if (weapon.reloading) return;
  
  weapon.reloading = true;
  weapon.reloadTotal = weapon.reloadSec;
  weapon.reloadLeft = weapon.reloadSec;
}

/**
 * 更新装弹进度
 * 处理装弹计时和弹药补充
 * 
 * @param {Object} bot - Bot 对象
 * @param {Object} weapon - Bot 武器对象
 * @param {number} dt - 时间增量（秒）
 * @returns {void}
 * @example
 * updateBotReload(bot, bot.weapon, 0.016);
 * // 如果装弹完成，weapon.reloading = false, weapon.mag 填满
 */
export function updateBotReload(bot, weapon, dt) {
  if (!weapon.reloading) return;
  
  weapon.reloadLeft -= dt;
  
  if (weapon.reloadLeft <= 0) {
    // 装弹完成，补充弹药
    const take = Math.min(weapon.magSize - weapon.mag, weapon.reserve);
    weapon.mag += take;
    weapon.reserve -= take;
    weapon.reloading = false;
  }
}

// ============================================================================
// 射击冷却函数 (Shoot Cooldown Functions)
// ============================================================================

/**
 * 更新射击冷却
 * 
 * @param {Object} bot - Bot 对象
 * @param {number} dt - 时间增量（秒）
 * @returns {void}
 * @example
 * updateShootCooldown(bot, 0.016);
 */
export function updateShootCooldown(bot, dt) {
  if (bot.shootCooldown > 0) {
    bot.shootCooldown = Math.max(0, bot.shootCooldown - dt);
  }
}

// ============================================================================
// 瞄准计算函数 (Aim Calculation Functions)
// ============================================================================

/**
 * 计算瞄准偏移
 * 根据距离和武器散布计算瞄准偏移角度
 * 
 * @param {Object} bot - Bot 对象
 * @param {Object} targetPos - 目标位置 {x, y, z}
 * @param {number} dist - 到目标的距离
 * @param {Object} weapon - 武器对象（包含 spreadDeg 属性）
 * @returns {{sx: number, sy: number}} 偏移角度（弧度）
 * @example
 * const offset = calculateAimOffset(bot, targetPos, 10, bot.weapon);
 * // {sx: 0.02, sy: -0.01}
 */
export function calculateAimOffset(bot, targetPos, dist, weapon) {
  const spread = (weapon.spreadDeg * Math.PI) / 180;
  const sx = (Math.random() - 0.5) * spread;
  const sy = (Math.random() - 0.5) * spread;
  return { sx, sy };
}

// ============================================================================
// 友军伤害检测函数 (Friendly Fire Detection Functions)
// ============================================================================

/**
 * 检测友军伤害
 * 检查射击射线是否会击中队友
 * 
 * @param {Object} bot - 当前 Bot
 * @param {{x: number, y: number, z: number}} muzzle - 枪口位置
 * @param {{x: number, y: number, z: number}} shotDir - 射击方向
 * @param {number} dist - 到目标的距离
 * @param {Array} aliveBots - 所有存活的 Bot 列表
 * @param {Object} player - 玩家信息 { alive, pos, team }
 * @param {Function} playerAabbFn - 玩家 AABB 创建函数
 * @returns {boolean} 是否会击中友军（true = 被阻挡）
 * @example
 * const blocked = checkFriendlyFire(bot, muzzle, shotDir, 10, aliveBots, player, playerAabb);
 * // true 或 false
 */
export function checkFriendlyFire(bot, muzzle, shotDir, dist, aliveBots, player, playerAabbFn) {
  // 检查是否会击中队友 Bot
  for (const ally of aliveBots) {
    if (!ally.alive) continue;
    if (ally.id === bot.id) continue;
    if (ally.team !== bot.team) continue;
    
    const center = v3(ally.pos.x, ally.pos.y + ally.half.y, ally.pos.z);
    const aabb = aabbFromCenter(center, ally.half);
    const tHit = rayAabb(muzzle, shotDir, aabb);
    
    if (tHit !== null && tHit > 0 && tHit < dist) {
      return true; // 会击中队友
    }
  }
  
  // 检查是否会击中玩家（如果是队友）
  if (player.alive && player.team === bot.team) {
    const pAabb = playerAabbFn(player.pos);
    const tHit = rayAabb(muzzle, shotDir, pAabb);
    
    if (tHit !== null && tHit > 0 && tHit < dist) {
      return true; // 会击中玩家队友
    }
  }
  
  return false; // 不会击中友军
}

// ============================================================================
// 伤害计算函数 (Damage Calculation Functions)
// ============================================================================

/**
 * 计算伤害
 * 应用护甲减伤和实际伤害计算
 * 
 * @param {number} baseDamage - 基础伤害
 * @param {Object} target - 目标对象（包含 hp, armor 等属性）
 * @returns {{actualDamage: number, armorAbsorb: number}} 实际伤害和护甲吸收量
 * @example
 * const result = calculateDamage(30, target);
 * // {actualDamage: 21, armorAbsorb: 9}
 */
export function calculateDamage(baseDamage, target) {
  let actualDamage = baseDamage;
  let armorAbsorb = 0;
  
  const hasArmor = target.armor > 0;
  
  if (hasArmor && baseDamage > 0) {
    // 护甲吸收 30% 伤害
    armorAbsorb = Math.min(target.armor, baseDamage * 0.3);
    actualDamage = baseDamage - armorAbsorb;
    
    // 护甲消耗为吸收量的一半
    target.armor = Math.max(0, target.armor - armorAbsorb * 0.5);
  }
  
  return { actualDamage, armorAbsorb };
}

/**
 * 应用伤害到目标
 * 
 * @param {Object} target - 目标对象
 * @param {number} damage - 伤害值
 * @param {string} targetType - 目标类型 ('player' | 'bot')
 * @param {Object} game - 游戏状态（用于处理玩家死亡）
 * @returns {boolean} 目标是否死亡
 * @example
 * const died = applyDamage(target, 30, 'player', game);
 * // true 或 false
 */
export function applyDamage(target, damage, targetType, game) {
  target.hp -= damage;
  
  if (target.hp <= 0) {
    if (targetType === 'player') {
      // 玩家死亡处理
      if (game.mode === 'online') {
        // 在线模式：由服务器处理
        handleLocalPlayerDeath('You died');
      } else {
        // 单机模式：直接处理
        game.playerAlive = false;
        game.hp = 0;
        game.vel = v3(0, 0, 0);
        setStatus('You died', true);
        game.stats.deaths += 1;
      }
    } else if (targetType === 'bot') {
      // Bot 死亡处理
      target.alive = false;
      game.aliveBotsCacheDirty = true;
    }
    
    return true; // 目标死亡
  }
  
  return false; // 目标存活
}

/**
 * 执行 Bot 射击
 * 处理弹药消耗、冷却、散布、方向计算、友军检测、曳光弹生成、命中判定
 * 
 * @param {Object} bot - Bot 对象
 * @param {Object} weapon - 武器对象
 * @param {Object} lookFrom - Bot 眼睛位置 {x, y, z}
 * @param {number} dist - 距离
 * @param {string} targetType - 目标类型 ('player' | 'bot' | 'site')
 * @param {Object} targetBot - 目标 Bot 对象（如果 targetType === 'bot'）
 * @param {Array} aliveBots - 存活的 Bot 列表
 * @param {Object} player - 玩家信息 {alive, pos, team}
 * @param {Object} game - 游戏状态
 * @param {Function} playerAabbFn - 玩家 AABB 创建函数
 * @param {Function} obtainTracerFn - 获取曳光弹对象的函数
 * @param {Function} setStatusFn - 设置状态消息的函数
 * @param {Function} forwardFromYawPitchFn - 从 yaw/pitch 计算前方向量的函数
 * @returns {Object} 射击结果 {shot: boolean, hit: boolean, blocked: boolean}
 */
export function performBotShot(bot, weapon, lookFrom, dist, targetType, targetBot, aliveBots, player, game, playerAabbFn, obtainTracerFn, setStatusFn, forwardFromYawPitchFn) {
  // 1. 消耗弹药
  weapon.mag -= 1;
  
  // 2. 设置射击冷却
  const cooldown = 60 / weapon.rpm;
  bot.shootCooldown = cooldown * (1.45 + Math.random() * 0.6);
  
  // 3. 计算散布和射击方向
  const spread = (weapon.spreadDeg * Math.PI) / 180;
  const sx = (Math.random() - 0.5) * spread;
  const sy = (Math.random() - 0.5) * spread;
  const shotDir = v3norm(forwardFromYawPitchFn(bot.yaw + sx, sy));
  
  // 4. 计算枪口位置
  const muzzle = v3add(
    lookFrom,
    v3add(
      v3scale(v3norm(v3cross(v3(0, 1, 0), shotDir)), 0.18),
      v3scale(shotDir, 0.55)
    )
  );
  
  // 5. 计算射线终点
  const end = v3add(muzzle, v3scale(shotDir, Math.min(dist + 4, 80)));
  
  // 6. 友军伤害检测
  const blocked = checkFriendlyFire(bot, muzzle, shotDir, dist, aliveBots, player, playerAabbFn);
  if (blocked) {
    bot.shootCooldown = 0.18;
    return { shot: false, hit: false, blocked: true };
  }
  
  // 7. 生成曳光弹
  const tracer = obtainTracerFn();
  tracer.a = muzzle;
  tracer.b = end;
  tracer.travel = 0;
  tracer.speed = 95;
  tracer.life = 0.32;
  tracer.hue = 0.02;
  game.tracers.push(tracer);
  
  // 8. 命中判定
  const hitChance = clamp01((26 - dist) / 26);
  const hit = Math.random() < 0.02 + 0.11 * hitChance;
  
  if (!hit) {
    return { shot: true, hit: false, blocked: false };
  }
  
  // 9. 处理命中
  if (targetType === 'player') {
    // 不伤害队友
    if (game.team === bot.team) {
      bot.shootCooldown = 0.18;
      return { shot: false, hit: false, blocked: true };
    }
    
    // 使用 bot-combat 模块计算伤害
    const { actualDamage } = calculateDamage(weapon.damage, game);
    game.hp -= actualDamage;
    
    if (game.hp <= 0) {
      // 玩家死亡处理（需要 game 对象中的信息）
      return { shot: true, hit: true, blocked: false, killed: true };
    } else {
      if (setStatusFn) setStatusFn('Hit by bot', true);
      return { shot: true, hit: true, blocked: false, killed: false };
    }
  } else if (targetType === 'bot' && targetBot) {
    // 不伤害队友 Bot
    if (targetBot.team === bot.team) {
      bot.shootCooldown = 0.18;
      return { shot: false, hit: false, blocked: true };
    }
    
    targetBot.hp -= weapon.damage;
    if (targetBot.hp <= 0) {
      targetBot.alive = false;
      game.aliveBotsCacheDirty = true;
      return { shot: true, hit: true, blocked: false, killed: true };
    }
    return { shot: true, hit: true, blocked: false, killed: false };
  }
  
  return { shot: true, hit: false, blocked: false };
}

// ============================================================================
// 战斗决策函数 (Combat Decision Functions)
// ============================================================================

/**
 * 决定 Bot 战斗状态
 * 根据距离和可见性决定是追逐还是巡逻
 * 
 * @param {Object} bot - Bot 对象
 * @param {number} dist - 到目标的距离
 * @param {boolean} occluded - 目标是否被遮挡
 * @returns {boolean} 是否应该追逐
 */
export function decideBotState(bot, dist, occluded) {
  const shouldChase = dist < 18 && !occluded;
  bot.state = shouldChase ? 'chase' : 'patrol';
  return shouldChase;
}

/**
 * 检查 Bot 反应时间
 * 模拟人类反应延迟，让 Bot 行为更自然
 * 
 * @param {Object} bot - Bot 对象
 * @param {boolean} hasValidTarget - 是否有有效目标
 * @param {number} currentTime - 当前时间戳（毫秒）
 * @returns {boolean} 是否可以开火
 */
export function checkBotReactionTime(bot, hasValidTarget, currentTime) {
  // 首次发现敌人，记录时间戳
  if (hasValidTarget && bot.firstSawEnemyTime === null) {
    bot.firstSawEnemyTime = currentTime;
  }
  
  // 目标丢失，重置反应时间状态
  if (!hasValidTarget) {
    bot.firstSawEnemyTime = null;
  }
  
  // 计算是否可以开火（带随机抖动 0.7~1.3 倍）
  const reactionTime = bot.reactionTime || 180;
  const actualReactionTime = reactionTime * (0.7 + Math.random() * 0.6);
  return bot.firstSawEnemyTime !== null && (currentTime - bot.firstSawEnemyTime) >= actualReactionTime;
}
