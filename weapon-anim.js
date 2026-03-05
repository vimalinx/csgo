/**
 * weapon-anim.js - 武器动画计算模块
 * 
 * 负责计算武器的各种动画效果：
 * - 后坐力偏移
 * - 武器摇摆（跟随鼠标移动）
 * - 行走摆动
 * - 枪口火光颜色
 */

// ============================================================================
// 外部依赖（从 main.js 全局获取）
// ============================================================================

/**
 * 向量工具函数（需在 main.js 中定义）
 * @external v3
 * @external v3norm
 * @external v3add
 * @external v3scale
 */

/**
 * 数学工具函数（需在 main.js 中定义）
 * @external clamp
 * @external clamp01
 * @external lerp
 */

/**
 * 时间工具函数（需在 main.js 中定义）
 * @external nowMs
 */

// ============================================================================
// 武器动画函数
// ============================================================================

/**
 * 计算武器后坐力偏移
 * @param {Object} weapon - 武器对象
 * @returns {number} 后坐力偏移量
 */
function calculateWeaponKick(weapon) {
  return weapon.shot * 0.08; // 手枪 0.08，步枪 0.06
}

/**
 * 计算武器摇摆向量
 * @param {number} mouseDX - 鼠标X轴移动量
 * @param {number} mouseDY - 鼠标Y轴移动量
 * @param {Object} camRight - 摄像机右向量
 * @param {Object} camUp - 摄像机上向量
 * @param {Object} fwd - 前向向量
 * @returns {Object} 摇摆向量 {swayRight, swayUp, swayFwd, swayPosX, swayPosY}
 */
function calculateWeaponSway(mouseDX, mouseDY, camRight, camUp, fwd) {
  const swayX = clamp(mouseDX * 0.003, -0.06, 0.06);
  const swayY = clamp(mouseDY * 0.003, -0.06, 0.06);
  const swayPosX = clamp(mouseDX * 0.0005, -0.03, 0.03);
  const swayPosY = clamp(mouseDY * 0.0005, -0.03, 0.03);
  const swayRight = v3norm(v3add(camRight, v3scale(fwd, -swayX)));
  const swayUp = v3norm(v3add(camUp, v3scale(fwd, swayY)));
  const swayFwd = v3norm(fwd);
  return { swayRight, swayUp, swayFwd, swayPosX, swayPosY };
}

/**
 * 计算武器行走摆动
 * @param {number} speed - 玩家移动速度
 * @returns {Object} 摆动值 {bobX, bobY}
 */
function calculateWeaponBob(speed) {
  const bobT = nowMs() * 0.001;
  const bobA = 0.02 * clamp01(speed / 6);
  const bobY = Math.sin(bobT * 9.5) * bobA;
  const bobX = Math.cos(bobT * 9.5) * bobA;
  return { bobX, bobY };
}

/**
 * 计算枪口火光颜色
 * @param {number} flash - 闪光强度 (0-1)
 * @returns {Object} RGB颜色向量
 */
function calculateMuzzleFlashColor(flash) {
  return v3(lerp(0.9, 1.0, flash), lerp(0.75, 0.95, flash), 0.2);
}

// ============================================================================
// 模块导出
// ============================================================================

export { 
  calculateWeaponKick, 
  calculateWeaponSway, 
  calculateWeaponBob, 
  calculateMuzzleFlashColor 
};
