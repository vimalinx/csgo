# CSGO 观战模式文档

## 📋 概述

完整的死亡视角/观战模式系统，支持三种视角模式和实时观战目标切换。

**实现文件**：`spectator-mode.js`
**集成状态**：✅ 已完全集成到 `main.js`

---

## 🎮 核心功能

### 1. 三种视角模式

#### 第一人称视角 (First Person)
- 完全跟随队友的视角
- 显示队友看到的画面
- 眼睛高度：1.6米（真实视角）

#### 第三人称视角 (Third Person)
- 俯视视角，在队友身后
- 距离：5米，高度：3米
- 轻微向下俯视角度

#### 自由视角 (Free Camera)
- 完全自由的飞行摄像头
- WASD + 鼠标控制
- Space 上升，Shift 下降
- 移动速度：10 单位/秒
- 支持地图边界限制

---

## 🎯 控制键位

### 死亡后观战控制

| 按键 | 功能 | 可用模式 |
|------|------|---------|
| **空格** | 切换观战目标（下一个队友） | 第一人称、第三人称 |
| **Q** | 切换视角模式 | 所有模式 |
| **W** | 向前移动 | 自由视角 |
| **A** | 向左移动 | 自由视角 |
| **S** | 向后移动 | 自由视角 |
| **D** | 向右移动 | 自由视角 |
| **Space** | 向上移动 | 自由视角 |
| **Shift** | 向下移动 | 自由视角 |
| **鼠标移动** | 控制视角方向 | 自由视角 |

---

## 🔧 技术实现

### 核心类

#### 1. SpectatorState
```javascript
class SpectatorState {
  enabled: boolean           // 是否启用观战
  mode: SPECTATOR_MODE       // 当前视角模式
  targetPlayerId: string     // 当前观战目标
  transitioning: boolean     // 是否正在过渡动画
  deathPosition: {x, y, z}   // 死亡位置
  killerId: string           // 击杀者ID
  killerName: string         // 击杀者名字
  killerTeam: string         // 击杀者队伍
  startDelayActive: boolean  // 是否在延迟启动阶段
  freeCameraPos: {x, y, z}   // 自由视角位置
  freeCameraYaw: number      // 自由视角偏航
  freeCameraPitch: number    // 自由视角俯仰
}
```

#### 2. SpectatorManager
主要方法：
- `start(deathData)` - 启动观战模式
- `stop()` - 停止观战模式
- `update(dt, keys, mouseDX, mouseDY)` - 更新摄像机
- `cycleMode()` - 切换视角模式
- `nextTarget()` - 切换下一个目标
- `getTargetInfo()` - 获取目标信息
- `getDeathInfo()` - 获取死亡信息

#### 3. SpectatorUI
UI组件：
- `showDeathOverlay()` - 显示死亡覆盖层
- `updateTargetInfo()` - 更新目标信息面板
- `updateModeIndicator()` - 更新模式指示器

---

## 📊 观战目标选择逻辑

### AI 模式
```javascript
// 从 game.bots 中选择存活的队友
for (const bot of game.bots) {
  if (bot.alive && bot.team === myTeam) {
    targets.push({
      id: `bot_${bot.id}`,
      name: bot.name,
      hp: bot.hp,
      weapon: bot.weapon?.def?.id,
      ...
    })
  }
}
```

### 多人模式
```javascript
// 从 otherPlayers 中选择存活的队友
for (const [playerId, playerData] of otherPlayers) {
  if (playerData.team === myTeam && playerData.alive !== false) {
    targets.push({
      id: playerId,
      name: playerData.name,
      hp: playerData.hp,
      weapon: playerData.weapon,
      ...
    })
  }
}
```

---

## 🎨 UI 显示

### 死亡覆盖层
- 半透明红色背景
- 显示"你已阵亡"
- 显示击杀者信息（名字 + 队伍颜色）
- 倒计时：3秒后进入观战模式
- 控制提示：[空格] 切换目标 · [Q] 切换视角

### 目标信息面板
- 底部居中显示
- 玩家名字（队伍颜色）
- 血量条（动态颜色）
  - > 50%: 绿色
  - 25-50%: 黄色
  - < 25%: 红色
- 当前武器显示

### 模式指示器
- 顶部居中显示
- 当前模式名称
  - 第一人称
  - 第三人称
  - 自由视角
- 当前观战目标名字
- 控制提示

---

## ⚙️ 配置参数

```javascript
const SPECTATOR_MODE = Object.freeze({
  FIRST_PERSON: 'firstPerson',   // 第一人称
  THIRD_PERSON: 'thirdPerson',   // 第三人称
  FREE_CAMERA: 'freeCamera'      // 自由视角
})

const SPECTATOR_TRANSITION_DURATION = 800  // 过渡时间（毫秒）
const SPECTATOR_START_DELAY = 3000         // 死亡后延迟启动
const FREE_CAMERA_SPEED = 10              // 自由视角移动速度
const FREE_CAMERA_SENSITIVITY = 0.003     // 鼠标灵敏度
```

---

## 🔄 工作流程

### 1. 玩家死亡
```
玩家HP ≤ 0
  ↓
handleLocalPlayerDeath()
  ↓
spectatorManager.start({deathPosition, killerInfo})
  ↓
显示死亡覆盖层（3秒倒计时）
```

### 2. 进入观战
```
3秒后
  ↓
隐藏死亡覆盖层
  ↓
自动选择第一个队友
  ↓
显示目标信息面板
  ↓
显示模式指示器
```

### 3. 观战操作
```
按键: 空格
  ↓
spectatorManager.nextTarget()
  ↓
切换到下一个队友
  ↓
平滑过渡动画（800ms）
  ↓
更新UI显示
```

```
按键: Q
  ↓
spectatorManager.cycleMode()
  ↓
循环: 第一人称 → 第三人称 → 自由视角 → 第一人称
  ↓
平滑过渡动画
  ↓
更新模式指示器
```

### 4. 玩家重生
```
玩家重生
  ↓
spectatorManager.stop()
  ↓
隐藏所有UI
  ↓
恢复正常游戏视角
```

---

## 🎬 过渡动画

### 实现
使用 **Ease In-Out Cubic** 缓动函数：
```javascript
_easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}
```

### 特点
- 开始和结束时缓慢
- 中间加速
- 总时间：800ms
- 同时插值位置、偏航角、俯仰角

---

## 🚀 性能优化

### 1. 目标缓存
- 每次调用 `_getValidTargets()` 时重新计算
- 只包含存活队友

### 2. UI 更新频率
- 仅在观战模式启用时更新
- 使用 requestAnimationFrame 同步

### 3. 过渡动画优化
- 使用时间戳而非帧计数
- 避免卡顿和跳帧

---

## 🐛 已知问题与解决方案

### 问题1：没有队友可观战
**现象**：所有队友都死亡
**解决**：保持死亡位置视角，显示"无队友可观战"

### 问题2：自由视角越界
**现象**：摄像头飞出地图
**解决**：
- Y轴限制：0.5 - 50米
- X/Z轴限制：mapBounds（27.5米）

### 问题3：多人模式同步延迟
**现象**：观战目标位置延迟
**解决**：直接读取 otherPlayers Map，使用最新同步数据

---

## 📝 代码集成位置

### main.js 集成点

1. **导入模块**（第16行）
```javascript
import { SPECTATOR_MODE, SpectatorManager, SpectatorUI } from './spectator-mode.js'
```

2. **初始化**（第2136-2160行）
```javascript
const spectatorManager = new SpectatorManager(game, null);
const spectatorUI = new SpectatorUI();
spectatorUI.init();
// ... 设置回调
```

3. **死亡处理**（第2357行）
```javascript
function handleLocalPlayerDeath(reason, deathData) {
  // ...
  spectatorManager.start({
    deathPosition: { ...game.pos },
    killerId: deathData.killerId || null,
    killerName: deathData.killerName || 'Unknown',
    killerTeam: deathData.killerTeam || ''
  });
}
```

4. **键盘输入**（第4304-4320行）
```javascript
if (spectatorManager.isEnabled()) {
  if (e.code === 'Space') {
    e.preventDefault();
    spectatorManager.nextTarget();
    return;
  }
  if (e.code === 'KeyQ') {
    e.preventDefault();
    spectatorManager.cycleMode();
    return;
  }
}
```

5. **鼠标输入**（第4674-4687行）
```javascript
if (spectatorManager.isEnabled() && spectatorManager.getMode() === SPECTATOR_MODE.FREE_CAMERA) {
  const sens = 0.0022;
  game.yaw += e.movementX * sens;
  game.pitch -= e.movementY * sens;
  // ...
  return;
}
```

6. **摄像机更新**（第5879-5890行）
```javascript
if (spectatorManager.isEnabled()) {
  const spectatorCam = spectatorManager.update(0, game.keys, game.mouseDX, game.mouseDY);
  camPos = v3(spectatorCam.pos.x, spectatorCam.pos.y, spectatorCam.pos.z);
  fwd = forwardFromYawPitch(spectatorCam.yaw, spectatorCam.pitch);
  camTarget = v3add(camPos, fwd);
}
```

7. **UI更新**（第6644-6659行）
```javascript
if (spectatorManager.isEnabled()) {
  const deathInfo = spectatorManager.getDeathInfo();
  if (deathInfo.startDelay) {
    spectatorUI.showDeathOverlay(deathInfo);
  } else {
    spectatorUI.hideDeathOverlay();
    const targetInfo = spectatorManager.getTargetInfo();
    spectatorUI.updateTargetInfo(targetInfo);
    spectatorUI.updateModeIndicator(spectatorManager.getMode(), targetInfo?.name);
  }
}
```

---

## 🎯 测试清单

### 功能测试
- [ ] 死亡后自动启动观战
- [ ] 3秒延迟后切换到目标
- [ ] 空格键切换队友
- [ ] Q键切换视角模式
- [ ] 第一人称视角正常
- [ ] 第三人称视角正常
- [ ] 自由视角移动正常
- [ ] 自由视角鼠标控制正常
- [ ] UI显示正确（死亡覆盖层）
- [ ] UI显示正确（目标信息）
- [ ] UI显示正确（模式指示器）
- [ ] 重生后正确退出观战
- [ ] 没有队友时的处理

### 性能测试
- [ ] 过渡动画流畅
- [ ] UI更新不卡顿
- [ ] 多人模式下同步正常

### 边界测试
- [ ] 自由视角地图边界限制
- [ ] 自由视角高度限制
- [ ] 所有队友死亡时的处理

---

## 🔮 未来改进方向

### 短期
1. 添加上一个目标切换（反向循环）
2. 观战目标死亡时自动切换
3. 显示观战目标的准星

### 中期
1. 添加死亡回放（KillCam）
2. 支持观战敌人（比赛结束后）
3. 添加观战目标列表（Tab键）

### 长期
1. 录制精彩回放
2. 分享观战视角
3. 导播模式（多视角切换）

---

## 📚 相关文档

- [主游戏文档](README.md)
- [多人模式文档](MULTIPLAYER.md)
- [AI模式文档](AI_MODE.md)

---

**创建日期**：2026-03-05
**版本**：1.0.0
**作者**：Wilson (AI Assistant)
**状态**：✅ 已完成并集成
