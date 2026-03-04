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
    // 确保是数组
    if (Array.isArray(roomList)) {
      rooms = roomList
    } else {
      console.warn('⚠️ roomList is not an array:', roomList)
      rooms = []
    }
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
      // Pass true for isHost when creating room
      onJoinRoom(data.roomId, roomName, true)
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
      // Pass false for isHost when joining room
      onJoinRoom(roomId, roomName, false)
    } catch (err) {
      alert(err.message)
    }
  }

  function renderRoomList() {
    // 防御性检查
    if (!Array.isArray(rooms)) {
      console.warn('⚠️ rooms is not an array, using empty array')
      rooms = []
    }

    if (!roomListContainer) {
      console.error('❌ roomListContainer not found')
      return
    }

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

/**
 * Create room waiting UI
 */
export function createRoomWaitingUI(multiplayer, roomInfo, onStartGame, onLeaveRoom) {
  // Remove old room list overlay
  const oldOverlay = document.getElementById('roomListOverlay')
  if (oldOverlay) {
    oldOverlay.remove()
  }

  // Create waiting overlay
  const overlay = document.createElement('div')
  overlay.id = 'roomWaitingOverlay'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    color: white;
    font-family: Arial, sans-serif;
  `

  // Create container
  const container = document.createElement('div')
  container.style.cssText = `
    background: rgba(30, 30, 30, 0.95);
    padding: 40px;
    border-radius: 15px;
    min-width: 400px;
    max-width: 600px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  `

  // Room info
  const roomInfoDiv = document.createElement('div')
  roomInfoDiv.innerHTML = `
    <h2 style="margin-top: 0; color: #4CAF50;">🎮 房间等待中</h2>
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 5px 0;"><strong>房间名:</strong> ${roomInfo.name}</p>
      <p style="margin: 5px 0;"><strong>房间 ID:</strong> <span style="font-family: monospace; color: #2196F3;">${roomInfo.id}</span></p>
      <p style="margin: 5px 0;"><strong>你是房主:</strong> ${roomInfo.isHost ? '✅ 是' : '❌ 否'}</p>
    </div>
  `

  // Player list title
  const playerListTitle = document.createElement('h3')
  playerListTitle.textContent = '👥 玩家列表'
  playerListTitle.style.marginTop = '20px'

  // Player list container
  const playerList = document.createElement('div')
  playerList.id = 'waitingPlayerList'
  playerList.style.cssText = `
    background: rgba(255,255,255,0.05);
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    min-height: 100px;
  `

  // Initial player (just yourself)
  playerList.innerHTML = `
    <div style="padding: 10px; background: rgba(76, 175, 80, 0.2); border-radius: 5px; margin-bottom: 10px;">
      <span style="color: #4CAF50;">👑</span> ${multiplayer.username} (你) ${roomInfo.isHost ? '- 房主' : ''}
    </div>
    <div style="text-align: center; color: #888; padding: 20px;">
      等待其他玩家加入...
    </div>
  `

  // Waiting message
  const waitingMessage = document.createElement('div')
  waitingMessage.id = 'waitingMessage'
  waitingMessage.style.cssText = `
    text-align: center;
    color: #888;
    margin-bottom: 20px;
    font-style: italic;
  `
  waitingMessage.textContent = roomInfo.isHost
    ? '等待玩家加入后，点击"开始游戏"'
    : '等待房主开始游戏...'

  // Button container
  const buttonContainer = document.createElement('div')
  buttonContainer.style.cssText = `
    display: flex;
    gap: 10px;
    justify-content: center;
  `

  // Start game button (only for host)
  if (roomInfo.isHost) {
    const startButton = document.createElement('button')
    startButton.textContent = '🎮 开始游戏'
    startButton.id = 'startGameButton'
    startButton.style.cssText = `
      padding: 12px 30px;
      font-size: 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s;
    `
    startButton.onmouseover = () => startButton.style.background = '#45a049'
    startButton.onmouseout = () => startButton.style.background = '#4CAF50'
    startButton.onclick = () => {
      onStartGame()
      overlay.remove()
    }
    buttonContainer.appendChild(startButton)
  }

  // Leave room button
  const leaveButton = document.createElement('button')
  leaveButton.textContent = '🚪 离开房间'
  leaveButton.style.cssText = `
    padding: 12px 30px;
    font-size: 16px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.3s;
  `
  leaveButton.onmouseover = () => leaveButton.style.background = '#da190b'
  leaveButton.onmouseout = () => leaveButton.style.background = '#f44336'
  leaveButton.onclick = () => {
    onLeaveRoom()
    overlay.remove()
  }
  buttonContainer.appendChild(leaveButton)

  // Assemble UI
  container.appendChild(roomInfoDiv)
  container.appendChild(playerListTitle)
  container.appendChild(playerList)
  container.appendChild(waitingMessage)
  container.appendChild(buttonContainer)
  overlay.appendChild(container)
  document.body.appendChild(overlay)

  return overlay
}

/**
 * Update waiting room player list
 */
export function updateWaitingPlayerList(multiplayer, players) {
  const playerList = document.getElementById('waitingPlayerList')
  if (!playerList) return

  if (!Array.isArray(players) || players.length === 0) {
    playerList.innerHTML = `
      <div style="text-align: center; color: #888; padding: 20px;">
        等待其他玩家加入...
      </div>
    `
    return
  }

  // Clear list
  playerList.innerHTML = ''

  // Add each player
  players.forEach((player, index) => {
    const playerDiv = document.createElement('div')
    playerDiv.style.cssText = `
      padding: 10px;
      background: ${index === 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
      border-radius: 5px;
      margin-bottom: 10px;
    `

    const isCurrentPlayer = player.id === multiplayer.playerId || player.playerId === multiplayer.playerId
    const isPlayerHost = index === 0 // First player is host

    playerDiv.innerHTML = `
      <span style="color: ${isPlayerHost ? '#4CAF50' : '#2196F3'};">
        ${isPlayerHost ? '👑' : '👤'}
      </span>
      ${player.username || 'Unknown'}
      ${isCurrentPlayer ? '(你)' : ''}
      ${isPlayerHost ? '- 房主' : ''}
      ${player.ready ? '✅ 准备' : '⏳ 等待'}
    `

    playerList.appendChild(playerDiv)
  })
}

/**
 * Create scoreboard UI
 */
export function createScoreboard(scoreboardData) {
  // Remove existing scoreboard
  const existingScoreboard = document.getElementById('scoreboard')
  if (existingScoreboard) {
    existingScoreboard.remove()
  }

  // Create scoreboard container
  const scoreboard = document.createElement('div')
  scoreboard.id = 'scoreboard'
  scoreboard.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid #444;
    border-radius: 10px;
    padding: 20px;
    z-index: 10001;
    color: white;
    font-family: Arial, sans-serif;
    display: none;
  `

  // Title
  const title = document.createElement('div')
  title.textContent = 'CSGO 计分板'
  title.style.cssText = `
    font-size: 20px;
    color: #4CAF50;
    font-weight: bold;
    text-align: center;
    padding-bottom: 15px;
    border-bottom: 1px solid #444;
    margin-bottom: 15px;
  `
  scoreboard.appendChild(title)

  // Table header
  const header = document.createElement('div')
  header.style.cssText = `
    display: flex;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 0;
    font-weight: bold;
    font-size: 12px;
    border-radius: 3px;
    margin-bottom: 10px;
  `
  header.innerHTML = `
    <div style="width: 150px; padding-left: 10px;">玩家名</div>
    <div style="width: 50px; text-align: center;">K</div>
    <div style="width: 50px; text-align: center;">D</div>
    <div style="width: 50px; text-align: center;">A</div>
    <div style="width: 60px; text-align: center;">KDA</div>
    <div style="width: 80px; text-align: center;">金钱</div>
    <div style="width: 60px; text-align: center;">延迟</div>
  `
  scoreboard.appendChild(header)

  // Teams container
  const teamsContainer = document.createElement('div')
  teamsContainer.id = 'scoreboardTeams'
  scoreboard.appendChild(teamsContainer)

  document.body.appendChild(scoreboard)

  return scoreboard
}

/**
 * Update scoreboard data
 */
export function updateScoreboard(scoreboardData) {
  const teamsContainer = document.getElementById('scoreboardTeams')
  if (!teamsContainer) return

  teamsContainer.innerHTML = ''

  // Helper function to get money color
  function getMoneyColor(money) {
    if (money >= 1000) return '#4CAF50'
    if (money >= 500) return '#FFC107'
    return '#F44336'
  }

  // Helper function to get ping color
  function getPingColor(ping) {
    if (ping < 50) return '#4CAF50'
    if (ping < 100) return '#FFC107'
    return '#F44336'
  }

  // Helper function to calculate KDA
  function calculateKDA(kills, deaths, assists) {
    if (deaths === 0) return kills.toFixed(2)
    return ((kills + assists / 2) / deaths).toFixed(2)
  }

  // Helper function to render team
  function renderTeam(teamName, teamData, teamColor) {
    if (!teamData || teamData.length === 0) return

    // Team header
    const teamHeader = document.createElement('div')
    teamHeader.style.cssText = `
      color: ${teamColor};
      font-weight: bold;
      font-size: 14px;
      padding: 8px 0 5px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `
    teamHeader.textContent = teamName === 'ct' ? 'CT (反恐精英)' : 'T (恐怖分子)'
    teamsContainer.appendChild(teamHeader)

    // Sort players by KDA (descending)
    const sortedPlayers = [...teamData].sort((a, b) => {
      const kdaA = parseFloat(calculateKDA(a.kills || 0, a.deaths || 0, a.assists || 0))
      const kdaB = parseFloat(calculateKDA(b.kills || 0, b.deaths || 0, b.assists || 0))
      return kdaB - kdaA
    })

    // Render players
    sortedPlayers.forEach(player => {
      const playerRow = document.createElement('div')
      playerRow.style.cssText = `
        display: flex;
        padding: 6px 0;
        font-size: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      `

      const kda = calculateKDA(player.kills || 0, player.deaths || 0, player.assists || 0)
      const moneyColor = getMoneyColor(player.money || 0)
      const pingColor = getPingColor(player.ping || 0)

      playerRow.innerHTML = `
        <div style="width: 150px; padding-left: 10px; color: white;">${player.name || 'Unknown'}</div>
        <div style="width: 50px; text-align: center; color: white;">${player.kills || 0}</div>
        <div style="width: 50px; text-align: center; color: white;">${player.deaths || 0}</div>
        <div style="width: 50px; text-align: center; color: white;">${player.assists || 0}</div>
        <div style="width: 60px; text-align: center; color: #4CAF50;">${kda}</div>
        <div style="width: 80px; text-align: center; color: ${moneyColor};">$${player.money || 0}</div>
        <div style="width: 60px; text-align: center; color: ${pingColor};">${player.ping || 0}ms</div>
      `

      teamsContainer.appendChild(playerRow)
    })
  }

  // Render CT team
  renderTeam('ct', scoreboardData.ct, '#2196F3')

  // Render T team
  renderTeam('t', scoreboardData.t, '#F44336')
}

/**
 * Show/hide scoreboard
 */
export function toggleScoreboard(visible) {
  const scoreboard = document.getElementById('scoreboard')
  if (!scoreboard) return

  scoreboard.style.display = visible ? 'block' : 'none'
}

/**
 * Create chat system UI
 */
export function createChatUI() {
  // 聊天容器
  const chatContainer = document.createElement('div')
  chatContainer.id = 'chatContainer'
  chatContainer.style.cssText = `
    position: fixed;
    bottom: 50px;
    left: 10px;
    width: 300px;
    z-index: 10000;
    font-family: Arial, sans-serif;
  `

  // 聊天历史
  const chatHistory = document.createElement('div')
  chatHistory.id = 'chatHistory'
  chatHistory.style.cssText = `
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.5);
    padding: 5px;
    margin-bottom: 5px;
    border-radius: 3px;
  `
  chatContainer.appendChild(chatHistory)

  // 聊天输入框
  const chatInput = document.createElement('input')
  chatInput.id = 'chatInput'
  chatInput.type = 'text'
  chatInput.placeholder = '按 Enter 发送消息 (全局)'
  chatInput.maxLength = 100
  chatInput.style.cssText = `
    width: 100%;
    padding: 8px;
    font-size: 14px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #444;
    border-radius: 3px;
    color: white;
    display: none;
  `
  chatContainer.appendChild(chatInput)

  document.body.appendChild(chatContainer)

  return chatContainer
}

/**
 * Add chat message to history
 */
export function addChatMessage(channel, playerName, message) {
  const chatHistory = document.getElementById('chatHistory')
  if (!chatHistory) return

  const messageEl = document.createElement('div')
  messageEl.style.cssText = `
    padding: 3px 0;
    font-size: 12px;
    opacity: 1;
    transition: opacity 0.5s ease-in-out;
  `

  // 格式化时间
  const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  // 根据频道设置颜色
  let channelColor = 'white'
  if (channel === 'team') {
    channelColor = '#4A90E2' // CT蓝色（简化，实际应根据玩家阵营）
  }

  messageEl.innerHTML = `<span style="color: #888;">[${time}]</span> <span style="color: ${channelColor};">[${channel === 'global' ? '全局' : '队伍'}]</span> <span style="color: white;">${playerName}:</span> <span style="color: #ddd;">${message}</span>`

  chatHistory.appendChild(messageEl)

  // 自动滚动到底部
  chatHistory.scrollTop = chatHistory.scrollHeight

  // 5秒后淡出
  setTimeout(() => {
    messageEl.style.opacity = '0.5'
  }, 5000)

  // 保持最近10条消息
  while (chatHistory.children.length > 10) {
    chatHistory.removeChild(chatHistory.firstChild)
  }
}

/**
 * Toggle chat input visibility
 */
export function toggleChatInput(visible) {
  const chatInput = document.getElementById('chatInput')
  if (!chatInput) return

  chatInput.style.display = visible ? 'block' : 'none'
  if (visible) {
    chatInput.focus()
  }
}

