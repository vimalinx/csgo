# 阶段五：效果绘制函数提取任务

## 背景
阶段四已完成武器动画计算辅助函数的提取，现在需要继续提取效果绘制函数。

## 目标

### 提取的函数

#### 1. drawMuzzleFlash()
提取枪口火光绘制逻辑：
```javascript
/**
 * 绘制枪口火光
 * @param {Object} wmOrigin - 武器模型原点
 * @param {Object} camRight - 摄像机右向量
 * @param {Object} camUp - 摄像机上向量
 * @param {Object} fwd - 前向向量
 * @param {Object} swayRight - 摇摆右向量
 * @param {Object} swayUp - 摇摆上向量
 * @param {Object} swayFwd - 摇摆前向量
 * @param {number} flash - 闪光强度 (0-1)
 * @param {Object} offset - 火光位置偏移 {x, y, z}
 * @param {Object} scale - 火光大小 {x, y, z}
 */
function drawMuzzleFlash(wmOrigin, camRight, camUp, fwd, swayRight, swayUp, swayFwd, flash, offset, scale)
```

#### 2. drawTracerGlow()
提取曳光弹发光绘制逻辑：
```javascript
/**
 * 绘制曳光弹发光效果
 * @param {Object} tail - 曳光弹尾部位置
 * @param {Object} tip - 曳光弹头部位置
 * @param {Object} dir - 曳光弹方向
 * @param {Object} glowColor - 发光颜色
 * @param {number} segLen - 线段长度
 */
function drawTracerGlow(tail, tip, dir, glowColor, segLen)
```

## 预期效果
- 减少 drawWorld 函数约 15-20 行
- 提高代码可读性
- 便于维护和扩展

## 注意事项
- 保持功能完全不变
- 添加完整的 JSDoc 注释
- 测试验证所有视觉效果

## 执行方式
使用 CODEX 进行重构，不要手动编辑。
