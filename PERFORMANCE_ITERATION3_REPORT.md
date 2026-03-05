# CSGO 第三轮性能优化报告

**日期**: 2026-03-06  
**范围**: `main.js` 渲染与战斗主循环  
**目标**: 在不破坏现有功能前提下，推进视锥裁剪、对象池化，并评估 Web Worker AI 后台化方案。

## 结论摘要

1. 视锥裁剪可行性高，收益高，已落地（最高优先级）。
2. 对象池化可行性高，收益中高，已对 `shell/tracer` 落地第一阶段。
3. Web Worker AI 可行性中高，但当前耦合较重，建议分阶段迁移，避免行为回归。

---

## 1) 视锥裁剪（Frustum Culling）

### 可行性

- **高**。当前 `drawWorld()` 存在“全量遍历 + 全量绘制”的模式，适合加入轻量视锥快速判定。
- 地图、Bot、远端玩家、特效对象都有明确中心点和近似包围半径，可做球体裁剪。

### 本轮实现

- 新增:
  - `makeFrustumCuller(...)`
  - `isSegmentVisible(...)`
- 接入点:
  - 静态 `game.boxes`
  - 云层盒体
  - bomb site / bomb 模型
  - AI 烟雾盒体
  - Bot / online 远端玩家模型
  - 弹壳和曳光段
- 保守策略:
  - 第一人称武器模型不裁剪，避免手感/观感异常。
  - 仅影响“是否绘制”，不修改命中、碰撞、AI 等逻辑状态。

### 预期收益

- 视角变化时可显著减少无效 draw call。
- 地图遮挡场景下，CPU 侧提交和 GPU 侧无效片元均下降。

---

## 2) 对象池化（Object Pooling）

### 可行性

- **高**。射击路径中 `shell/tracer` 为高频创建/销毁对象，且原实现使用 `filter` 每帧重建数组，GC 压力明显。

### 本轮实现（第一阶段）

- 新增池:
  - `game.shellPool`
  - `game.tracerPool`
- 新增方法:
  - `obtainShell / recycleShell`
  - `obtainTracer / recycleTracer`
- 逻辑替换:
  - 射击时 `push` 改为从池获取对象
  - `updateShells/updateTracers` 改为倒序原地移除并回收（去掉 `filter` 新数组）
- 结果:
  - 显著减少短生命周期对象与数组分配次数
  - 降低高频射击场景下 GC 抖动风险

### 后续建议（第二阶段）

- 将 `SmokeParticleSystem` / `FireParticleSystem` 的粒子对象也池化。
- 将 `v3(...)` 高频临时向量改为 scratch 向量复用（谨慎，需防引用污染）。

---

## 3) Web Workers（AI 计算后台化）

### 可行性

- **中高**。`updateBots()` 内含:
  - 目标选择
  - 路径计算（A*）
  - 视线遮挡判断
  - 射击决策
- 但当前函数直接访问主线程 `game` 全状态，耦合较深，需先“快照化”再搬迁。

### 推荐分阶段方案

1. **阶段 A（低风险）**  
   仅把路径规划（A*）放入 Worker。主线程发送起终点与网格快照，Worker 返回路径。

2. **阶段 B（中风险）**  
   将目标选择 + 路径重算节奏迁移到 Worker，主线程只执行运动与开火动画。

3. **阶段 C（高收益）**  
   AI 决策全量 Worker 化，主线程按“命令流”应用结果。

### 数据协议建议

- `ai-snapshot`:
  - `time`, `player`, `bots`, `collider-lite`, `round`, `grid`
- `ai-result`:
  - 每 bot 的 `yaw`, `wishDir`, `shoot`, `navPathDelta`
- 更新频率:
  - 20Hz~30Hz（AI），渲染保持 60FPS+

### 风险与控制

- 风险: 状态延迟导致 bot 行为抖动。
- 控制: 主线程插值 + 序号对齐（tick id）+ 丢弃过期结果。

---

## 验证结果

- `node --check main.js` 通过。
- 尝试使用 `chromium --headless` 做自动化页面回归时，受当前沙箱环境限制报错并退出（Crashpad `setsockopt: Operation not permitted`），无法在本环境完成浏览器级运行验证。

---

## 本轮改动文件

- `main.js`（视锥裁剪 + shell/tracer 对象池）
- `PERFORMANCE_ITERATION3_REPORT.md`（本报告）
