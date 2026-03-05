# COLLISION_OPTIMIZATION

## 目标
在 `main.js` 中实现以下能力并落地到射击流程：

1. 精确部位碰撞盒：`head / torso / legs`
2. 爆头伤害倍率：`x4`
3. 基于 `AABB` 的四叉树空间分区（广相位）
4. 可视化命中反馈（爆头与部位区分）

## 已实现内容

### 1) 三段式部位判定（窄相位）
使用 `buildPlayerHitboxes(basePos, yaw)` 构建多 OBB 命中盒，部位映射如下：

- `head`：头部命中盒，倍率 `4.0`
- `torso`：上/下躯干 + 手臂命中盒，倍率 `1.0`（手臂使用 `0.75`）
- `legs`：左右腿命中盒，倍率 `0.75`

命中测试使用 `rayObbLocal(...)`，内部转到局部坐标后走 `rayAabb(...)`。

### 2) 爆头 x4 伤害
`HITZONE_CONFIG` 配置：

```js
const HITZONE_CONFIG = {
  head: { mult: 4.0, priority: 1 },
  torso: { mult: 1.0, priority: 2 },
  legs: { mult: 0.75, priority: 3 }
}
```

最终伤害计算：

```txt
damage = floor(weaponBaseDamage * hitZoneMultiplier * falloffMultiplier)
```

其中 `head` 的 `hitZoneMultiplier = 4.0`。

### 3) AABB 四叉树空间分区（广相位）
新增 `AabbQuadtreeNode / AabbQuadtree`（XZ 平面）：

- 插入：将 bot / online 玩家按“角色整体 AABB 投影”插入四叉树
- 查询：用“射线扫掠 AABB”作为查询范围，快速获取候选目标
- 去重：查询结果用 `Set` 聚合

关键辅助函数：

- `makeAabb2(...)`
- `aabb2Intersects(...)`
- `aabb2Contains(...)`
- `aabb3To2(...)`
- `raySweepAabb2(ro, rd, maxDist, pad)`
- `playerBroadPhaseAabb(basePos)`

射击流程变为：

1. 先求静态场景阻挡 `bestT`
2. 计算 `queryAabb = raySweepAabb2(...)`
3. 从四叉树取 `broadCandidates`
4. 对候选做 OBB 部位命中检测
5. 命中头部时对当前目标早退

### 4) 视觉反馈
新增 `HITZONE_FEEDBACK` + `getHitZoneFeedback(zone)`：

- `head`：`HEADSHOT`，红色飘字
- `torso`：`TORSO`，黄白色飘字
- `legs`：`LEGS`，蓝色飘字

反馈路径：

- 命中标记：`game.hitmarker.head = (zone === 'head')`
- 在线玩家：`spawnDamageNumberForPlayer(..., { crit, color })`
- Bot：`spawnDamageNumber(..., { crit, color })`
- 状态文本：`Hit [HEADSHOT/TORSO/LEGS]: -dmg`

## 性能侧说明

`collisionPerf` 统计保留并继续计数：

- `rayCasts`
- `broadPhaseCandidates`
- `narrowPhaseTests`
- `earlyExits`

四叉树减少了“全量目标逐个窄相测试”的成本，尤其在多人和高 bot 数量时更明显。

## 关键代码位置

- 四叉树与 AABB 工具：`main.js` 前部（`aabbFromCenter` 后）
- 命中倍率与反馈配置：`HITZONE_CONFIG` / `HITZONE_FEEDBACK`
- 射击命中主流程：`updateWeapon(dt)` 内

## 可调参数建议

- `COLLISION_QUADTREE_BOUNDS`：世界边界
- `AabbQuadtree(..., maxDepth, capacity)`：树深与节点容量
- `raySweepAabb2(..., pad)`：射线查询外扩半径
- `playerBroadPhaseAabb(...)`：角色广相位包围盒大小

---

更新时间：2026-03-05
