/**
 * render-utils.js - 渲染工具函数模块
 * 
 * 提供 CS:GO FPS 游戏中的渲染相关工具函数：
 * - drawHumanoid: 绘制人形角色
 * - drawWeaponPart: 绘制武器部件
 * - drawWeaponPartFwd: 绘制武器部件（带前向偏移）
 * 
 * 依赖的外部函数（从 main.js 全局获取）：
 * - v3, v3add, v3scale, v3norm, v3cross（向量工具）
 * - safeNumber, clamp01, lerp, easeOutQuad（数学工具）
 * - forwardFromYawPitch（旋转工具）
 * - drawOrientedBox（绘制工具）
 */

/**
 * 绘制人形角色
 * @param {Object} pos - 位置 {x, y, z}
 * @param {number} yaw - 偏航角（弧度）
 * @param {number} hp - 当前生命值
 * @param {number} maxHp - 最大生命值
 * @param {Object} palette - 颜色配置 {
 *   body: {x, y, z},
 *   hurt: {x, y, z},
 *   head: {x, y, z},
 *   arm: {x, y, z},
 *   leg: {x, y, z},
 *   gun: {x, y, z}
 * }
 * @param {number} fallT - 倒地动画进度 (0-1)
 * @returns {boolean} 是否已完全倒地
 */
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

/**
 * 绘制武器部件
 * @param {Object} wmOrigin - 武器模型原点
 * @param {Object} camRight - 摄像机右向量
 * @param {Object} camUp - 摄像机上向量
 * @param {Object} fwd - 前向向量
 * @param {Object} swayRight - 摇摆右向量
 * @param {Object} swayUp - 摇摆上向量
 * @param {Object} swayFwd - 摇摆前向量
 * @param {Object} localPos - 局部位置 {x, y, z}
 * @param {Object} partScale - 部件尺寸 {x, y, z}
 * @param {Object} color - 颜色 {x, y, z}
 */
function drawWeaponPart(wmOrigin, camRight, camUp, fwd, swayRight, swayUp, swayFwd, localPos, partScale, color) {
  const p = v3add(
    wmOrigin,
    v3add(
      v3add(v3scale(camRight, localPos.x), v3scale(camUp, localPos.y)),
      v3scale(fwd, localPos.z)
    )
  );
  drawOrientedBox(p, swayRight, swayUp, swayFwd, partScale, color);
}

/**
 * 绘制武器部件（带前向偏移）
 * @param {Object} wmOrigin - 武器模型原点
 * @param {Object} camRight - 摄像机右向量
 * @param {Object} camUp - 摄像机上向量
 * @param {Object} fwd - 前向向量
 * @param {Object} swayRight - 摇摆右向量
 * @param {Object} swayUp - 摇摆上向量
 * @param {Object} swayFwd - 摇摆前向量
 * @param {Object} localPos - 局部位置 {x, y, z}
 * @param {Object} partScale - 部件尺寸 {x, y, z}
 * @param {Object} color - 颜色 {x, y, z}
 * @param {number} fwdExtra - 前向额外偏移
 */
function drawWeaponPartFwd(wmOrigin, camRight, camUp, fwd, swayRight, swayUp, swayFwd, localPos, partScale, color, fwdExtra) {
  const p = v3add(
    wmOrigin,
    v3add(
      v3add(v3scale(camRight, localPos.x), v3scale(camUp, localPos.y)),
      v3scale(fwd, localPos.z + fwdExtra)
    )
  );
  drawOrientedBox(p, swayRight, swayUp, swayFwd, partScale, color);
}

export { drawHumanoid, drawWeaponPart, drawWeaponPartFwd };
