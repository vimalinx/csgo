/**
 * HUD Updater Module
 * 负责 HUD 元素更新的独立模块
 * 
 * 包含以下更新函数：
 * - 血量/护甲
 * - 弹药
 * - 金钱
 * - 回合状态
 * - 记分板（存活人数）
 * - 准星
 * - 击中标记
 */

/**
 * 将值限制在 0-1 范围内
 * @param {number} value - 要限制的值
 * @returns {number} 限制后的值
 */
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * 更新血量和护甲 HUD
 * @param {Object} player - 玩家状态对象
 * @param {number} player.hp - 当前血量
 * @param {number} player.armor - 当前护甲
 * @param {Object} elements - HUD DOM 元素
 * @param {HTMLElement} elements.hpText - 血量文本元素
 * @param {HTMLElement} elements.hpBar - 血量条元素
 * @param {HTMLElement} elements.arText - 护甲文本元素
 * @param {HTMLElement} elements.arBar - 护甲条元素
 * @param {Object} state - 状态管理对象
 * @param {Object} state.hudDirtyFlags - 脏标志对象
 * @param {boolean} state.hudDirtyFlags.health - 血量脏标志
 * @param {boolean} state.hudDirtyFlags.armor - 护甲脏标志
 * @param {Object} state.lastHudValues - 上一次的 HUD 值缓存
 * @param {number} state.lastHudValues.hp - 上次血量值
 * @param {number} state.lastHudValues.armor - 上次护甲值
 */
export function updateHealthHUD(player, elements, state) {
  const currentHp = Math.max(0, Math.floor(player.hp));
  const currentArmor = Math.max(0, Math.floor(player.armor));
  
  if (state.hudDirtyFlags.health || state.lastHudValues.hp !== currentHp) {
    elements.hpText.textContent = String(currentHp);
    elements.hpBar.style.width = `${clamp01(player.hp / 100) * 100}%`;
    state.lastHudValues.hp = currentHp;
    state.hudDirtyFlags.health = false;
  }
  
  if (state.hudDirtyFlags.armor || state.lastHudValues.armor !== currentArmor) {
    elements.arText.textContent = String(currentArmor);
    elements.arBar.style.width = `${clamp01(player.armor / 100) * 100}%`;
    state.lastHudValues.armor = currentArmor;
    state.hudDirtyFlags.armor = false;
  }
}

/**
 * 更新弹药 HUD
 * @param {Object|null} weapon - 当前武器对象
 * @param {number} weapon.mag - 弹匣弹药
 * @param {number} weapon.reserve - 后备弹药
 * @param {boolean} weapon.reloading - 是否正在换弹
 * @param {number} weapon.reloadLeft - 剩余换弹时间
 * @param {number} weapon.reloadTotal - 总换弹时间
 * @param {Object} elements - HUD DOM 元素
 * @param {HTMLElement} elements.ammoText - 弹药文本元素
 * @param {HTMLElement} elements.reloadWrap - 换弹进度包装元素
 * @param {HTMLElement} elements.reloadBar - 换弹进度条元素
 * @param {HTMLElement} elements.reloadText - 换弹文本元素
 * @param {Object} state - 状态管理对象
 * @param {Object} state.hudDirtyFlags - 脏标志对象
 * @param {boolean} state.hudDirtyFlags.ammo - 弹药脏标志
 * @param {Object} state.lastHudValues - 上一次的 HUD 值缓存
 * @param {number} state.lastHudValues.ammoMag - 上次弹匣弹药
 * @param {number} state.lastHudValues.ammoReserve - 上次后备弹药
 */
export function updateAmmoHUD(weapon, elements, state) {
  if (weapon) {
    if (state.hudDirtyFlags.ammo || 
        state.lastHudValues.ammoMag !== weapon.mag || 
        state.lastHudValues.ammoReserve !== weapon.reserve) {
      elements.ammoText.textContent = `${weapon.mag} / ${weapon.reserve}`;
      state.lastHudValues.ammoMag = weapon.mag;
      state.lastHudValues.ammoReserve = weapon.reserve;
      state.hudDirtyFlags.ammo = false;
    }
  } else {
    elements.ammoText.textContent = '-- / --';
  }
  
  // 换弹进度
  const isReloading = !!weapon && weapon.reloading;
  elements.reloadWrap.classList.toggle('show', isReloading);
  if (isReloading) {
    const p = clamp01(1 - weapon.reloadLeft / Math.max(0.0001, weapon.reloadTotal));
    elements.reloadBar.style.width = `${p * 100}%`;
    elements.reloadText.textContent = `Reloading ${Math.ceil(weapon.reloadLeft * 10) / 10}s`;
  }
}

/**
 * 更新金钱 HUD
 * @param {number} money - 当前金钱数量
 * @param {Object} elements - HUD DOM 元素
 * @param {HTMLElement} elements.moneyTextEl - 金钱文本元素
 * @param {Object} state - 状态管理对象
 * @param {Object} state.hudDirtyFlags - 脏标志对象
 * @param {boolean} state.hudDirtyFlags.money - 金钱脏标志
 * @param {Object} state.lastHudValues - 上一次的 HUD 值缓存
 * @param {number} state.lastHudValues.money - 上次金钱值
 */
export function updateMoneyHUD(money, elements, state) {
  const currentMoney = Math.floor(money);
  if (state.hudDirtyFlags.money || state.lastHudValues.money !== currentMoney) {
    if (elements.moneyTextEl) {
      elements.moneyTextEl.textContent = `$${currentMoney}`;
    }
    state.lastHudValues.money = currentMoney;
    state.hudDirtyFlags.money = false;
  }
}

/**
 * 更新回合状态 HUD
 * @param {Object} round - 回合状态对象
 * @param {string} round.state - 回合状态 (freeze/post/active)
 * @param {number} round.freezeLeft - 冻结时间剩余
 * @param {number} round.freezeTotal - 总冻结时间
 * @param {number} round.postLeft - 回合结束剩余时间
 * @param {number} round.postTotal - 总回合结束时间
 * @param {number} round.roundLeft - 回合剩余时间
 * @param {number} round.progress - 回合进度
 * @param {boolean} round.bombPlanted - 是否已埋弹
 * @param {number} round.bombTimer - 炸弹计时器
 * @param {number} round.bombTotal - 炸弹总时间
 * @param {string} round.activeSite - 当前活跃点位
 * @param {string} round.plantSite - 埋弹点位
 * @param {string} round.winner - 获胜方
 * @param {string} round.reason - 获胜原因
 * @param {Object} game - 游戏状态对象
 * @param {string} game.team - 玩家阵营 (t/ct)
 * @param {string} game.mode - 游戏模式
 * @param {Object} game.econ - 经济状态
 * @param {number} game.econ.money - 当前金钱
 * @param {Object} game.smoke - 烟雾弹状态
 * @param {number} game.smoke.charges - 烟雾弹数量
 * @param {Object} game.flashbang - 闪光弹状态
 * @param {number} game.flashbang.charges - 闪光弹数量
 * @param {Object} elements - HUD DOM 元素
 * @param {HTMLElement} elements.objectiveEl - 目标容器元素
 * @param {HTMLElement} elements.objectiveText - 目标文本元素
 * @param {HTMLElement} elements.objectiveTimer - 目标计时器元素
 * @param {HTMLElement} elements.objectiveFill - 目标进度条元素
 * @param {Object} options - 可选参数
 * @param {Object} options.weapon - 当前武器
 * @param {Function} options.calculateSpread - 计算散布的函数
 * @param {Function} options.getMovementState - 获取移动状态的函数
 */
export function updateRoundHUD(round, game, elements, options = {}) {
  const showObj = game.mode === 'ai';
  elements.objectiveEl.classList.toggle('hidden', !showObj);
  
  // 添加散布信息到 HUD
  const { weapon, calculateSpread, getMovementState } = options;
  const movementState = getMovementState ? getMovementState() : '';
  const spreadValue = weapon && calculateSpread ? calculateSpread() : 0;
  const spreadInfo = weapon ? `  散布: ${spreadValue.toFixed(2)}° (${movementState})` : '';
  
  if (!showObj) return;
  
  const siteLabel = round.activeSite || 'A/B';
  const plantedLabel = round.plantSite || siteLabel;
  
  if (round.state === 'freeze') {
    elements.objectiveText.textContent = `Freeze ${round.freezeLeft.toFixed(1)}s  $${game.econ.money}`;
    elements.objectiveTimer.textContent = `Buy: B打开菜单 / 1-0购买枪械 / Q闪 W烟 E甲${spreadInfo}`;
    elements.objectiveFill.style.width = `${clamp01(round.freezeLeft / Math.max(0.1, round.freezeTotal)) * 100}%`;
  } else if (round.state === 'post') {
    elements.objectiveText.textContent = `${(round.winner || '').toUpperCase()} win - ${round.reason}`;
    elements.objectiveTimer.textContent = `Next round ${round.postLeft.toFixed(1)}s${spreadInfo}`;
    elements.objectiveFill.style.width = `${clamp01(round.postLeft / Math.max(0.1, round.postTotal)) * 100}%`;
  } else if (!round.bombPlanted) {
    elements.objectiveText.textContent = game.team === 't' 
      ? `Plant at ${siteLabel} (E hold)` 
      : `Defend site ${siteLabel}`;
    elements.objectiveTimer.textContent = `R ${round.roundLeft.toFixed(1)}s  $${game.econ.money}  SMK ${game.smoke.charges}  FLSH ${game.flashbang.charges}${spreadInfo}`;
    elements.objectiveFill.style.width = `${clamp01(round.progress) * 100}%`;
  } else {
    elements.objectiveText.textContent = game.team === 'ct' 
      ? `Defuse ${plantedLabel} (E hold)` 
      : `Bomb planted ${plantedLabel}`;
    elements.objectiveTimer.textContent = `${Math.max(0, round.bombTimer).toFixed(1)}s  $${game.econ.money}${spreadInfo}`;
    elements.objectiveFill.style.width = `${clamp01(round.bombTimer / round.bombTotal) * 100}%`;
  }
}

/**
 * 更新记分板 HUD（存活人数）
 * @param {Object} teams - 队伍状态对象
 * @param {Function} teams.teamAliveCount - 计算存活人数的函数
 * @param {Object} elements - HUD DOM 元素
 * @param {HTMLElement} elements.ctAliveEl - CT 存活人数元素
 * @param {HTMLElement} elements.tAliveEl - T 存活人数元素
 * @param {Object} state - 状态管理对象
 * @param {Object} state.hudDirtyFlags - 脏标志对象
 * @param {boolean} state.hudDirtyFlags.aliveCount - 存活人数脏标志
 */
export function updateScoreboardHUD(teams, elements, state) {
  if (state.hudDirtyFlags.aliveCount) {
    if (elements.ctAliveEl) {
      elements.ctAliveEl.textContent = String(teams.teamAliveCount('ct'));
    }
    if (elements.tAliveEl) {
      elements.tAliveEl.textContent = String(teams.teamAliveCount('t'));
    }
    state.hudDirtyFlags.aliveCount = false;
  }
}

/**
 * 更新准星 HUD
 * @param {Object} player - 玩家状态对象
 * @param {number} player.vel.x - X 方向速度
 * @param {number} player.vel.z - Z 方向速度
 * @param {boolean} player.onGround - 是否在地面
 * @param {number} player.crouchT - 蹲下状态
 * @param {number} player.landKick - 落地后坐力
 * @param {boolean} player.isAiming - 是否正在瞄准
 * @param {boolean} player.pointerLocked - 是否锁定鼠标
 * @param {boolean} player.playerAlive - 玩家是否存活
 * @param {Object|null} weapon - 当前武器对象
 * @param {number} weapon.kick - 武器后坐力
 * @param {number} spread - 当前散布值
 * @param {Object} elements - HUD DOM 元素
 * @param {HTMLElement} elements.crosshairEl - 准星元素
 * @param {HTMLElement} elements.hud - HUD 容器元素
 * @param {HTMLElement} elements.scopeOverlayEl - 准镜遮罩元素
 */
export function updateCrosshairHUD(player, weapon, spread, elements) {
  const speed = Math.hypot(player.vel.x, player.vel.z);
  const moving = clamp01(speed / 6);
  const firing = clamp01(weapon ? weapon.kick : 0);
  const crouch = clamp01(player.crouchT);
  const air = player.onGround ? 0 : 1;
  const land = clamp01(player.landKick);
  
  // 准星扩散 = 基础大小 + 散布影响 + 后坐力影响 + 跳跃影响
  const spreadGap = spread * 4; // 散布对准星的影响
  const gap = 9 + spreadGap + moving * 12 + firing * 10 - crouch * 6 + air * 16 + land * 14;
  const len = 8 + moving * 4 + spreadGap * 0.5;
  
  const host = elements.crosshairEl || elements.hud;
  host.style.setProperty('--ch-gap', `${gap.toFixed(1)}px`);
  host.style.setProperty('--ch-len', `${len.toFixed(1)}px`);
  
  const aimingActive = player.isAiming && player.pointerLocked && player.playerAlive;
  elements.hud.classList.toggle('hud--aiming', aimingActive);
  if (elements.scopeOverlayEl) {
    elements.scopeOverlayEl.classList.toggle('show', aimingActive);
  }
}

/**
 * 更新击中标记 HUD
 * @param {Object} hitmarker - 击中标记状态对象
 * @param {number} hitmarker.t - 击中标记显示时间
 * @param {boolean} hitmarker.head - 是否爆头
 * @param {Object} elements - HUD DOM 元素
 * @param {HTMLElement} elements.hitmarkerEl - 击中标记元素
 */
export function updateHitmarkerHUD(hitmarker, elements) {
  if (hitmarker.t > 0) {
    elements.hitmarkerEl.classList.add('show');
    elements.hitmarkerEl.classList.toggle('head', hitmarker.head);
  } else {
    elements.hitmarkerEl.classList.remove('show');
    elements.hitmarkerEl.classList.remove('head');
  }
}
