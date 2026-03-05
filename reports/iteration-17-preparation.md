# 第十七轮迭代准备：bot-combat.js 模块评估

**日期**：2026-03-06
**评估人**：子代理（项目经理）
**项目路径**：`/home/vimalinx/Projects/game/csgo/`

## 目标

评估 Bot 战斗 AI 相关代码，为第十七轮提取 `bot-combat.js` 模块做准备。

## 当前项目状态

- **main.js 行数**：7373行（第十六轮提取前）
- **累计模块**：6个（第十六轮后预计 7个）
- **第十六轮目标**：提取 bot-movement.js（预计减少 50-100行）

## 战斗 AI 相关代码分析

### 1. 射击逻辑核心代码

**位置**：main.js 6224-6370行（`updateBotsMainThread()` 函数内）

**功能模块**：

#### 1.1 射击条件判断
```javascript
if (shouldChase && dist < 24 && !occluded && b.shootCooldown <= 0 && targetType !== 'site' && canShoot) {
  // 射击执行逻辑
}
```

**包含**：
- 距离检查（< 24米）
- 可见性检查（!occluded）
- 冷却时间检查（shootCooldown <= 0）
- 目标类型检查（targetType !== 'site'）
- 反应时间检查（canShoot）

#### 1.2 弹药管理
```javascript
if (!bw.reloading && bw.mag <= 0) {
  bw.reloading = true;
  bw.reloadTotal = bw.reloadSec;
  bw.reloadLeft = bw.reloadSec;
}
```

**包含**：
- 弹夹检查
- 自动装填逻辑

#### 1.3 射击精度计算
```javascript
const spread = (bw.spreadDeg * Math.PI) / 180;
const sx = (Math.random() - 0.5) * spread;
const sy = (Math.random() - 0.5) * spread;
const shotDir = v3norm(forwardFromYawPitch(b.yaw + sx, sy));
```

**包含**：
- 散布角度计算
- 随机偏移
- 射击方向计算

#### 1.4 友军伤害检测
```javascript
// 检测是否击中队友 Bot
for (const ally of aliveBots) { ... }

// 检测是否击中队友玩家
if (!blocked && game.playerAlive && game.team === b.team) { ... }
```

**包含**：
- Bot 友军检测
- 玩家友军检测
- 射线碰撞检测

#### 1.5 伤害计算和应用
```javascript
// 玩家伤害
if (targetType === 'player') {
  // 护甲减伤逻辑
  const botDamage = bw.damage
  let actualDamage = botDamage
  const hasArmor = game.armor > 0
  if (hasArmor && botDamage > 0) {
    const armorAbsorb = Math.min(game.armor, botDamage * 0.3)
    actualDamage = botDamage - armorAbsorb
    game.armor = Math.max(0, game.armor - armorAbsorb * 0.5)
  }
  game.hp -= actualDamage;
}

// Bot 伤害
else if (targetType === 'bot' && targetBot) {
  targetBot.hp -= bw.damage;
  if (targetBot.hp <= 0) {
    targetBot.alive = false;
    game.aliveBotsCacheDirty = true;
  }
}
```

**包含**：
- 护甲减伤机制
- 玩家伤害应用
- Bot 伤害应用
- 死亡处理

#### 1.6 视觉效果
```javascript
// 曳光弹
const botTracer = obtainTracer();
botTracer.a = muzzle;
botTracer.b = end;
botTracer.travel = 0;
botTracer.speed = 95;
botTracer.life = 0.32;
botTracer.hue = 0.02;
game.tracers.push(botTracer);
```

**包含**：
- 曳光弹生成
- 弹道视觉效果

### 2. 辅助函数

#### 2.1 方向计算函数

**位置**：main.js 254-262行

```javascript
function forwardFromYawPitch(yaw, pitch) {
  const cp = Math.cos(pitch);
  return v3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
}

function rightFromYaw(yaw) {
  return v3(Math.cos(yaw), 0, -Math.sin(yaw));
}
```

**用途**：
- `forwardFromYawPitch()` - 从 yaw/pitch 计算前向向量（射击方向）
- `rightFromYaw()` - 从 yaw 计算右向向量（枪口偏移）

### 3. 相关数据结构

#### 3.1 Bot 武器属性
```javascript
bw.rpm          // 射速（每分钟射击次数）
bw.spreadDeg    // 散布角度（度）
bw.damage       // 伤害值
bw.mag          // 当前弹夹
bw.magSize      // 弹夹容量
bw.reserve      // 备弹
bw.reloading    // 是否正在装填
bw.reloadLeft   // 剩余装填时间
```

#### 3.2 Bot 射击状态
```javascript
b.shootCooldown      // 射击冷却时间
b.firstSawEnemyTime  // 首次发现敌人的时间戳
b.reactionTime       // 反应时间（毫秒）
```

## 模块提取建议

### 提取范围

**预计提取行数**：100-150行

#### 核心函数
1. `executeBotShot(bot, target, gameState, game)` - 执行 Bot 射击
2. `calculateShotAccuracy(bot, weapon)` - 计算射击精度
3. `checkFriendlyFire(bot, shotDir, targetDist, gameState, game)` - 检测友军伤害
4. `applyDamage(target, damage, gameState, game)` - 应用伤害
5. `manageBotAmmo(bot)` - 管理 Bot 弹药

#### 辅助函数
1. `forwardFromYawPitch(yaw, pitch)` - 方向计算
2. `rightFromYaw(yaw)` - 方向计算

### 依赖关系

**需要导入的模块**：
```javascript
import { v3, v3add, v3sub, v3scale, v3norm, v3cross, clamp01 } from './math-utils.js'
import { rayAabb, playerAabb, aabbFromCenter } from './physics.js'
```

**需要访问的 game 对象属性**：
- `game.tracers` - 曳光弹数组
- `game.pos` - 玩家位置
- `game.hp`, `game.armor` - 玩家状态
- `game.playerAlive`, `game.team` - 玩家信息
- `game.aliveBotsCacheDirty` - Bot 缓存标志

### 模块接口设计

```javascript
/**
 * bot-combat.js
 * Bot 战斗 AI 模块 - 负责射击逻辑和伤害计算
 * 
 * @module BotCombat
 * @version 1.0.0
 */

// 导出函数
export function executeBotShot(bot, target, gameState, game) { ... }
export function calculateShotAccuracy(bot, weapon) { ... }
export function checkFriendlyFire(bot, shotDir, targetDist, gameState, game) { ... }
export function applyDamage(target, damage, gameState, game) { ... }
export function manageBotAmmo(bot) { ... }
```

## 代码质量评估

### 优点
1. **逻辑完整**：包含完整的射击流程
2. **友军伤害检测**：防止 Bot 误伤队友
3. **护甲机制**：实现护甲减伤逻辑
4. **视觉效果**：生成曳光弹效果

### 需要改进
1. **代码耦合度高**：射击逻辑嵌入在 updateBotsMainThread 中
2. **函数过长**：射击逻辑约 150行，可以拆分
3. **缺少注释**：部分复杂逻辑缺少解释
4. **魔法数字**：散布系数、伤害系数等应提取为常量

### 潜在问题
1. **性能**：每帧检查所有友军碰撞，可能影响性能
2. **可维护性**：射击逻辑与其他 AI 逻辑混在一起
3. **可测试性**：难以单独测试射击逻辑

## 第十七轮执行建议

### 优先级
1. **高优先级**：提取射击核心逻辑（executeBotShot）
2. **中优先级**：提取伤害计算和应用逻辑
3. **低优先级**：提取弹药管理逻辑

### 注意事项
1. **保持射击行为一致**：提取后 Bot 射击行为不能改变
2. **完整测试**：需要测试友军伤害、护甲减伤等
3. **性能监控**：关注射击逻辑提取后的性能变化
4. **文档完善**：为所有导出函数添加 JSDoc

### 预计工作量
- **代码提取**：1-2小时
- **测试验证**：1小时
- **文档编写**：30分钟
- **总计**：2.5-3.5小时

## 后续优化建议

### 短期（第十七轮）
1. 提取 bot-combat.js 模块
2. 添加完整的 JSDoc 注释
3. 提取魔法数字为常量

### 中期（第十八-二十轮）
1. 优化友军伤害检测性能（空间分区）
2. 添加武器配置系统
3. 实现 Bot 难度分级（射击精度随难度变化）

### 长期
1. 实现 Bot 战术 AI（掩护、投掷物等）
2. 添加 Bot 学习系统（根据玩家行为调整策略）
3. 实现 Bot 协作系统（团队配合）

## 附录：代码位置索引

| 功能 | 位置（行号） | 说明 |
|------|------------|------|
| 射击逻辑 | 6224-6370 | updateBotsMainThread 内 |
| forwardFromYawPitch | 254 | 方向计算 |
| rightFromYaw | 259 | 方向计算 |
| 武器属性设置 | 3118-3120 | Bot 武器初始化 |
| 射击冷却管理 | 6087, 6141, 6224, 6235, 6268, 6285, 6314, 6327 | 多处 |

---

**评估完成时间**：2026-03-06 06:00
**下一步**：等待第十六轮完成，开始第十七轮开发
