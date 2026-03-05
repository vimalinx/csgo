# 第十轮迭代计划

## 日期
2026-03-06

## 目标
drawWorld 重构 - 阶段四和五

## 阶段四：渲染状态管理（已派孙子代理）

提取武器动画计算辅助函数：
1. calculateWeaponKick() - 后坐力计算
2. calculateWeaponSway() - 摇摆计算
3. calculateWeaponBob() - 行走摆动计算
4. calculateMuzzleFlashColor() - 枪口火光颜色

预计减少：20-30 行

## 阶段五：效果绘制函数（待派孙子代理）

提取效果绘制函数：
1. drawMuzzleFlash() - 枪口火光绘制
2. drawTracerGlow() - 曳光弹发光绘制

预计减少：15-20 行

## 总预期
- 减少代码：35-50 行
- 提高可读性
- 便于维护

## 状态
- [x] 分析代码
- [x] 派出孙子代理（阶段四）
- [ ] 等待完成
- [ ] 派出孙子代理（阶段五）
- [ ] 测试验证
- [ ] 生成报告
