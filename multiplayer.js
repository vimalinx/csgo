/**
 * CSGO Multiplayer Client
 * Connects to the multiplayer server and handles real-time communication
 */

class MultiplayerClient {
  constructor(serverUrl = 'http://123.60.21.129:3000') {
    this.serverUrl = serverUrl
    this.socket = null
    this.roomId = null
    this.playerId = null
    this.username = null
    this.isConnected = false
  }

  /**
   * Connect to the multiplayer server
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling']
        })

        this.socket.on('connect', () => {
          console.log('✅ 已连接到服务器')
          this.playerId = this.socket.id
          this.isConnected = true
          resolve()
        })

        this.socket.on('disconnect', () => {
          console.log('❌ 断开连接')
          this.isConnected = false
          if (this.onDisconnectCallback) {
            this.onDisconnectCallback()
          }
        })

        this.socket.on('connect_error', (error) => {
          console.error('连接错误:', error)
          this.isConnected = false
          reject(new Error('无法连接到服务器: ' + error.message))
        })

        this.socket.on('error', (error) => {
          console.error('服务器错误:', error)
          if (this.onErrorCallback) {
            this.onErrorCallback(error)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Register a new player
   */
  async register(username) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('未连接到服务器'))
        return
      }

      if (!username || username.length < 3 || username.length > 20) {
        reject(new Error('用户名长度必须在3-20字符之间'))
        return
      }

      this.socket.emit('register', username)

      const successHandler = (data) => {
        this.socket.off('registered', successHandler)
        this.socket.off('error', errorHandler)
        
        if (data.success) {
          this.username = username
          resolve(data)
        } else {
          reject(new Error(data.error || '注册失败'))
        }
      }

      const errorHandler = (error) => {
        this.socket.off('registered', successHandler)
        this.socket.off('error', errorHandler)
        reject(new Error(error))
      }

      this.socket.on('registered', successHandler)
      this.socket.on('error', errorHandler)

      // Timeout handler
      setTimeout(() => {
        this.socket.off('registered', successHandler)
        this.socket.off('error', errorHandler)
        reject(new Error('注册超时'))
      }, 5000)
    })
  }

  /**
   * Create a new room
   */
  async createRoom(roomName) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('未连接到服务器'))
        return
      }

      this.socket.emit('createRoom', roomName)

      const createdHandler = (data) => {
        this.socket.off('roomCreated', createdHandler)
        this.socket.off('error', errorHandler)
        this.roomId = data.roomId
        resolve(data)
      }

      const errorHandler = (error) => {
        this.socket.off('roomCreated', createdHandler)
        this.socket.off('error', errorHandler)
        reject(new Error(error))
      }

      this.socket.on('roomCreated', createdHandler)
      this.socket.on('error', errorHandler)

      setTimeout(() => {
        this.socket.off('roomCreated', createdHandler)
        this.socket.off('error', errorHandler)
        reject(new Error('创建房间超时'))
      }, 5000)
    })
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('未连接到服务器'))
        return
      }

      this.socket.emit('joinRoom', roomId)

      const joinedHandler = (data) => {
        this.socket.off('joinedRoom', joinedHandler)
        this.socket.off('error', errorHandler)
        this.roomId = roomId
        resolve(data)
      }

      const errorHandler = (error) => {
        this.socket.off('joinedRoom', joinedHandler)
        this.socket.off('error', errorHandler)
        reject(new Error(error))
      }

      this.socket.on('joinedRoom', joinedHandler)
      this.socket.on('error', errorHandler)

      setTimeout(() => {
        this.socket.off('joinedRoom', joinedHandler)
        this.socket.off('error', errorHandler)
        reject(new Error('加入房间超时'))
      }, 5000)
    })
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (this.roomId && this.socket) {
      this.socket.emit('leaveRoom', this.roomId)
      this.roomId = null
    }
  }

  /**
   * Request room list
   */
  getRooms() {
    if (this.socket && this.isConnected) {
      this.socket.emit('getRooms')
    }
  }

  /**
   * Send player movement
   */
  sendMove(position, rotation, velocity) {
    if (this.roomId && this.socket && this.isConnected) {
      this.socket.emit('move', {
        roomId: this.roomId,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        velocity: velocity ? { x: velocity.x, y: velocity.y, z: velocity.z } : null
      })
    }
  }

  /**
   * Send shooting event
   */
  sendShoot(targetPosition) {
    if (this.roomId && this.socket && this.isConnected) {
      this.socket.emit('shoot', {
        roomId: this.roomId,
        targetPosition
      })
    }
  }

  /**
   * Set callback for room list updates
   */
  onRoomList(callback) {
    if (this.socket) {
      this.socket.on('roomList', callback)
    }
  }

  /**
   * Set callback for player movement
   */
  onPlayerMove(callback) {
    if (this.socket) {
      this.socket.on('playerMove', callback)
    }
  }

  /**
   * Set callback for player shooting
   */
  onPlayerShoot(callback) {
    if (this.socket) {
      this.socket.on('playerShoot', callback)
    }
  }

  /**
   * Set callback for player join
   */
  onPlayerJoined(callback) {
    if (this.socket) {
      this.socket.on('playerJoined', callback)
    }
  }

  /**
   * Set callback for player leave
   */
  onPlayerLeft(callback) {
    if (this.socket) {
      this.socket.on('playerLeft', callback)
    }
  }

  /**
   * Set callback for errors
   */
  onError(callback) {
    this.onErrorCallback = callback
  }

  /**
   * Set callback for disconnect
   */
  onDisconnect(callback) {
    this.onDisconnectCallback = callback
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.roomId = null
      this.playerId = null
      this.username = null
    }
  }
}

export default MultiplayerClient
