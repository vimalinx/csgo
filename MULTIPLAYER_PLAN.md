# CSGO 多人在线前端改造计划

## 📋 当前状态

**已有功能**：
- ✅ Three.js 3D 场景
- ✅ 玩家移动控制（WASD）
- ✅ 射击系统
- ✅ 跑射散布系统
- ✅ 购买系统
- ✅ 准星系统

**待添加**：
- ⏸️ Socket.io 客户端连接
- ⏸️ 注册/登录界面
- ⏸️ 房间列表
- ⏸️ 多玩家同步
- ⏸️ 其他玩家可视化

---

## 🎯 改造步骤

### Step 1: 添加 Socket.io 客户端

**安装依赖**：
```bash
cd /home/vimalinx/Projects/game/csgo
npm install socket.io-client
```

**创建连接模块** ` multiplayer.js`:
```javascript
import { io } from 'socket.io-client'

class MultiplayerClient {
  constructor(serverUrl) {
    this.socket = io(serverUrl)
    this.roomId = null
    this.playerId = null

    this.socket.on('connect', () => {
      console.log('已连接到服务器')
      this.playerId = this.socket.id
    })

    this.socket.on('disconnect', () => {
      console.log('断开连接')
    })
  }

  register(username) {
    return new Promise((resolve) => {
      this.socket.emit('register', username)
      this.socket.on('registered', resolve)
    })
  }

  createRoom(roomName) {
    return new Promise((resolve) => {
      this.socket.emit('createRoom', roomName)
      this.socket.on('roomCreated', resolve)
    })
  }

  joinRoom(roomId) {
    return new Promise((resolve) => {
      this.socket.emit('joinRoom', roomId)
      this.socket.on('playerJoined', resolve)
    })
  }

  sendMove(position, rotation) {
    if (this.roomId) {
      this.socket.emit('move', {
        roomId: this.roomId,
        position,
        rotation
      })
    }
  }

  onPlayerMove(callback) {
    this.socket.on('playerMove', callback)
  }
}

export default MultiplayerClient
```

---

### Step 2: 创建登录界面

**LoginUI.jsx**:
```jsx
import React, { useState } from 'react'

export default function LoginUI({ onLogin }) {
  const [username, setUsername] = useState('')

  const handleLogin = () => {
    if (username.trim()) {
      onLogin(username)
    }
  }

  return (
    <div className="login-ui">
      <h1>CSGO 多人在线</h1>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="输入用户名"
        maxLength={20}
      />
      <button onClick={handleLogin}>进入游戏</button>
    </div>
  )
}
```

---

### Step 3: 创建房间列表

**RoomList.jsx**:
```jsx
import React, { useState } from 'react'

export default function RoomList({ rooms, onCreateRoom, onJoinRoom }) {
  const [newRoomName, setNewRoomName] = useState('')

  return (
    <div className="room-list">
      <h2>房间列表</h2>

      <div className="create-room">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="房间名"
        />
        <button onClick={() => onCreateRoom(newRoomName)}>
          创建房间
        </button>
      </div>

      <div className="rooms">
        {rooms.map(room => (
          <div key={room.id} className="room-item">
            <span>{room.name}</span>
            <span>{room.players.length}/{room.maxPlayers}</span>
            <button onClick={() => onJoinRoom(room.id)}>
              加入
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Step 4: 改造主游戏逻辑

**main.js 修改**（添加多人同步）:

```javascript
// 导入多人客户端
import MultiplayerClient from './multiplayer.js'

// 初始化多人客户端
const multiplayer = new MultiplayerClient('http://localhost:3000')

// 玩家注册后
multiplayer.register('Player1').then(() => {
  console.log('注册成功')
})

// 玩家移动时发送位置
function updatePlayerMovement() {
  // ... 原有的移动逻辑 ...

  // 发送位置到服务器
  multiplayer.sendMove(
    camera.position,
    camera.rotation
  )
}

// 接收其他玩家位置
multiplayer.onPlayerMove((data) => {
  const { playerId, position, rotation } = data

  // 更新其他玩家的位置
  if (!otherPlayers[playerId]) {
    // 创建其他玩家模型
    otherPlayers[playerId] = createPlayerModel()
  }

  // 更新位置和旋转
  otherPlayers[playerId].position.copy(position)
  otherPlayers[playerId].rotation.copy(rotation)
})
```

---

### Step 5: 其他玩家可视化

**创建其他玩家模型**:
```javascript
function createPlayerModel() {
  // 简单的胶囊体模型
  const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8)
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000 // 红色区分
  })
  const player = new THREE.Mesh(geometry, material)

  scene.add(player)
  return player
}
```

---

## 📊 改动文件清单

| 文件 | 改动 | 说明 |
|------|------|------|
| `multiplayer.js` | 新增 | Socket.io 客户端 |
| `LoginUI.jsx` | 新增 | 登录界面 |
| `RoomList.jsx` | 新增 | 房间列表 |
| `main.js` | 修改 | 添加多人同步 |
| `package.json` | 修改 | 添加 socket.io-client |
| `index.html` | 修改 | 添加登录/房间 UI |

---

## 🎯 功能清单

### 基础功能（第一阶段）
- [x] 用户注册（简单）
- [x] 创建房间
- [x] 加入房间
- [x] 玩家移动同步
- [x] 其他玩家可视化

### 进阶功能（第二阶段）
- [ ] 射击同步
- [ ] 伤害计算
- [ ] 购买系统同步
- [ ] 聊天系统

### 优化功能（第三阶段）
- [ ] 延迟补偿
- [ ] 预测算法
- [ ] 房间密码
- [ ] 观战模式

---

## 🚀 部署方案

### 前端（GitHub Pages）
```bash
cd /home/vimalinx/Projects/game/csgo
npm run build
# 推送到 GitHub
git add .
git commit -m "feat: 添加多人在线功能"
git push
# 在 GitHub Settings → Pages 启用
```

**访问地址**:
```
https://vimalinx.github.io/csgo
```

### 后端（你的服务器）
```bash
# 在服务器上
cd /path/to/csgo-server
npm install
npm start

# 或使用 PM2（推荐）
npm install -g pm2
pm2 start server.js --name csgo-server
```

---

## 📝 测试流程

1. **启动后端服务器**
   ```bash
   cd ~/Projects/csgo-server
   npm start
   ```

2. **启动前端**
   ```bash
   cd ~/Projects/game/csgo
   npm run dev
   ```

3. **打开两个浏览器窗口**
   - 窗口 1：注册用户 A，创建房间
   - 窗口 2：注册用户 B，加入房间

4. **测试同步**
   - 窗口 1 移动，窗口 2 应该看到红色胶囊体移动
   - 窗口 2 移动，窗口 1 应该看到红色胶囊体移动

---

## ⚠️ 注意事项

1. **CORS 配置**
   - 后端需要允许 GitHub Pages 的域名
   - 开发时允许 localhost

2. **性能优化**
   - 限制同步频率（30-60 FPS）
   - 使用插值平滑移动

3. **安全考虑**
   - 验证所有输入
   - 限制房间数量
   - 防止恶意连接

---

**创建日期**: 2026-03-03
**状态**: 准备实施
