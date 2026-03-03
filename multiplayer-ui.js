/**
 * CSGO Multiplayer UI Components
 * Vanilla JavaScript UI components for multiplayer functionality
 */

/**
 * Create login UI overlay
 */
export function createLoginUI(multiplayer, onLogin) {
  // Create overlay
  const overlay = document.createElement('div')
  overlay.id = 'loginOverlay'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `

  // Create container
  const container = document.createElement('div')
  container.style.cssText = `
    background: rgba(30, 30, 30, 0.95);
    padding: 40px;
    border-radius: 10px;
    text-align: center;
    color: white;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `

  // Title
  const title = document.createElement('h1')
  title.textContent = '🎮 CSGO 多人在线'
  title.style.cssText = 'margin-bottom: 30px; font-size: 28px;'
  container.appendChild(title)

  // Username input
  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = '输入用户名（3-20字符）'
  input.maxLength = 20
  input.style.cssText = `
    padding: 12px;
    font-size: 16px;
    width: 100%;
    margin-bottom: 20px;
    border: 2px solid #444;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    box-sizing: border-box;
  `
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  })
  container.appendChild(input)

  // Error message
  const errorMsg = document.createElement('p')
  errorMsg.style.cssText = `
    color: #ff4444;
    margin-bottom: 15px;
    min-height: 20px;
    font-size: 14px;
  `
  container.appendChild(errorMsg)

  // Button
  const button = document.createElement('button')
  button.textContent = '进入游戏'
  button.style.cssText = `
    padding: 12px 40px;
    font-size: 16px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.3s;
  `
  button.addEventListener('mouseenter', () => {
    if (!button.disabled) {
      button.style.background = '#45a049'
    }
  })
  button.addEventListener('mouseleave', () => {
    if (!button.disabled) {
      button.style.background = '#4CAF50'
    }
  })
  button.addEventListener('click', handleLogin)
  container.appendChild(button)

  overlay.appendChild(container)
  document.body.appendChild(overlay)

  // Focus input
  input.focus()

  async function handleLogin() {
    const username = input.value.trim()
    
    if (!username) {
      errorMsg.textContent = '请输入用户名'
      return
    }

    if (username.length < 3 || username.length > 20) {
      errorMsg.textContent = '用户名长度必须在3-20字符之间'
      return
    }

    button.disabled = true
    button.textContent = '连接中...'
    button.style.background = '#666'
    errorMsg.textContent = ''

    try {
      await multiplayer.register(username)
      // Success - remove overlay and callback
      document.body.removeChild(overlay)
      onLogin(username)
    } catch (err) {
      errorMsg.textContent = err.message || '注册失败'
      button.disabled = false
      button.textContent = '进入游戏'
      button.style.background = '#4CAF50'
    }
  }

  return overlay
}

/**
 * Create room list UI
 */
export function createRoomListUI(multiplayer, onJoinRoom, onBack) {
  // Create overlay
  const overlay = document.createElement('div')
  overlay.id = 'roomListOverlay'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `

  // Create container
  const container = document.createElement('div')
  container.style.cssText = `
    background: rgba(30, 30, 30, 0.95);
    padding: 40px;
    border-radius: 10px;
    color: white;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `

  // Title
  const title = document.createElement('h2')
  title.textContent = '房间列表'
  title.style.cssText = 'margin-bottom: 20px;'
  container.appendChild(title)

  // Create room section
  const createSection = document.createElement('div')
  createSection.style.cssText = 'margin-bottom: 20px;'

  const roomInput = document.createElement('input')
  roomInput.type = 'text'
  roomInput.placeholder = '输入房间名'
  roomInput.maxLength = 50
  roomInput.style.cssText = `
    padding: 10px;
    font-size: 14px;
    width: 60%;
    border: 2px solid #444;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    box-sizing: border-box;
  `
  createSection.appendChild(roomInput)

  const createBtn = document.createElement('button')
  createBtn.textContent = '创建房间'
  createBtn.style.cssText = `
    margin-left: 10px;
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `
  createBtn.addEventListener('click', handleCreateRoom)
  createSection.appendChild(createBtn)

  container.appendChild(createSection)

  // Room list container
  const roomListContainer = document.createElement('div')
  roomListContainer.id = 'roomListContainer'
  roomListContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    margin-bottom: 20px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 5px;
    min-height: 200px;
    max-height: 400px;
  `
  container.appendChild(roomListContainer)

  // Loading message
  const loadingMsg = document.createElement('p')
  loadingMsg.textContent = '正在加载房间列表...'
  loadingMsg.style.cssText = 'color: #888; text-align: center;'
  roomListContainer.appendChild(loadingMsg)

  // Back button
  const backBtn = document.createElement('button')
  backBtn.textContent = '返回'
  backBtn.style.cssText = `
    padding: 10px 30px;
    background: #666;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `
  backBtn.addEventListener('click', () => {
    document.body.removeChild(overlay)
    onBack()
  })
  container.appendChild(backBtn)

  overlay.appendChild(container)
  document.body.appendChild(overlay)

  // Focus room input
  roomInput.focus()

  // Room list storage
  let rooms = []

  // Setup room list listener
  multiplayer.onRoomList((roomList) => {
    rooms = roomList || []
    renderRoomList()
  })

  // Request room list
  multiplayer.getRooms()

  async function handleCreateRoom() {
    const roomName = roomInput.value.trim()
    
    if (!roomName) {
      alert('请输入房间名')
      return
    }

    createBtn.disabled = true
    createBtn.textContent = '创建中...'

    try {
      const data = await multiplayer.createRoom(roomName)
      document.body.removeChild(overlay)
      onJoinRoom(data.roomId, roomName)
    } catch (err) {
      alert(err.message)
      createBtn.disabled = false
      createBtn.textContent = '创建房间'
    }
  }

  async function handleJoinRoom(roomId, roomName) {
    try {
      await multiplayer.joinRoom(roomId)
      document.body.removeChild(overlay)
      onJoinRoom(roomId, roomName)
    } catch (err) {
      alert(err.message)
    }
  }

  function renderRoomList() {
    roomListContainer.innerHTML = ''

    if (rooms.length === 0) {
      const emptyMsg = document.createElement('p')
      emptyMsg.textContent = '暂无房间，创建一个吧！'
      emptyMsg.style.cssText = 'color: #888; text-align: center;'
      roomListContainer.appendChild(emptyMsg)
      return
    }

    rooms.forEach(room => {
      const roomCard = document.createElement('div')
      roomCard.style.cssText = `
        padding: 15px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `

      const roomInfo = document.createElement('div')
      
      const roomName = document.createElement('div')
      roomName.textContent = room.name
      roomName.style.cssText = 'font-weight: bold; margin-bottom: 5px;'
      roomInfo.appendChild(roomName)

      const roomPlayers = document.createElement('div')
      roomPlayers.textContent = `玩家: ${room.playerCount}/${room.maxPlayers || 10}`
      roomPlayers.style.cssText = 'font-size: 12px; color: #888;'
      roomInfo.appendChild(roomPlayers)

      roomCard.appendChild(roomInfo)

      const joinBtn = document.createElement('button')
      joinBtn.textContent = room.playerCount >= (room.maxPlayers || 10) ? '已满' : '加入'
      joinBtn.disabled = room.playerCount >= (room.maxPlayers || 10)
      joinBtn.style.cssText = `
        padding: 8px 20px;
        background: ${room.playerCount >= (room.maxPlayers || 10) ? '#666' : '#2196F3'};
        color: white;
        border: none;
        border-radius: 5px;
        cursor: ${room.playerCount >= (room.maxPlayers || 10) ? 'not-allowed' : 'pointer'};
        font-size: 14px;
      `
      
      if (room.playerCount < (room.maxPlayers || 10)) {
        joinBtn.addEventListener('click', () => handleJoinRoom(room.id, room.name))
      }

      roomCard.appendChild(joinBtn)
      roomListContainer.appendChild(roomCard)
    })
  }

  return overlay
}

/**
 * Create in-game multiplayer HUD
 */
export function createMultiplayerHUD(multiplayer) {
  const hud = document.createElement('div')
  hud.id = 'multiplayerHUD'
  hud.style.cssText = `
    position: fixed;
    top: 60px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    padding: 10px;
    border-radius: 5px;
    color: white;
    font-size: 12px;
    min-width: 150px;
    z-index: 100;
  `

  const title = document.createElement('div')
  title.textContent = '多人在线'
  title.style.cssText = 'font-weight: bold; margin-bottom: 5px;'
  hud.appendChild(title)

  const playerList = document.createElement('div')
  playerList.id = 'multiplayerPlayerList'
  hud.appendChild(playerList)

  // Update player list when players join/leave
  multiplayer.onPlayerJoined((data) => {
    updatePlayerList(playerList, data.players)
  })

  multiplayer.onPlayerLeft((data) => {
    updatePlayerList(playerList, data.players)
  })

  document.body.appendChild(hud)

  return hud
}

function updatePlayerList(container, players) {
  container.innerHTML = ''
  
  if (!players || players.length === 0) {
    container.textContent = '无其他玩家'
    return
  }

  players.forEach(player => {
    const playerEl = document.createElement('div')
    playerEl.textContent = `• ${player.username}`
    playerEl.style.cssText = 'margin: 3px 0;'
    container.appendChild(playerEl)
  })
}
