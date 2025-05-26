const WebSocket = require('ws')

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    })
    
    this.clients = new Set()
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('Новое WebSocket подключение от', req.socket.remoteAddress)
      
      this.clients.add(ws)
      
      // Отправляем приветственное сообщение
      this.sendToClient(ws, {
        type: 'connected',
        data: { message: 'Подключение к реальному времени установлено' }
      })

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(ws, message)
        } catch (error) {
          console.error('Ошибка парсинга WebSocket сообщения:', error)
        }
      })

      ws.on('close', () => {
        console.log('WebSocket подключение закрыто')
        this.clients.delete(ws)
      })

      ws.on('error', (error) => {
        console.error('WebSocket ошибка:', error)
        this.clients.delete(ws)
      })

      // Heartbeat для поддержания соединения
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
      })
    })

    // Ping клиентов каждые 30 секунд
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate()
        }
        
        ws.isAlive = false
        ws.ping()
      })
    }, 30000)
  }

  handleMessage(ws, message) {
    console.log('Получено WebSocket сообщение:', message)
    
    switch (message.type) {
      case 'subscribe_beach':
        // Подписка на обновления конкретного пляжа
        ws.beachId = message.data.beachId
        console.log(`Клиент подписался на пляж: ${ws.beachId}`)
        break
        
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: { timestamp: Date.now() }
        })
        break
        
      default:
        console.log('Неизвестный тип сообщения:', message.type)
    }
  }

  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // Отправить сообщение всем подключенным клиентам
  broadcast(message) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message)
      }
    })
  }

  // Отправить сообщение клиентам, подписанным на конкретный пляж
  broadcastToBeach(beachId, message) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.beachId === beachId) {
        this.sendToClient(client, message)
      }
    })
  }

  // Уведомление об обновлении бронирования
  notifyBookingUpdate(booking) {
    const message = {
      type: 'booking_update',
      data: {
        booking,
        timestamp: Date.now()
      }
    }

    // Отправляем всем клиентам
    this.broadcast(message)
  }

  // Уведомление об изменении доступности шезлонга
  notifyLoungerUpdate(lounger) {
    const message = {
      type: 'lounger_update',
      data: {
        lounger,
        timestamp: Date.now()
      }
    }

    // Отправляем клиентам, подписанным на этот пляж
    if (lounger.beach_id) {
      this.broadcastToBeach(lounger.beach_id, message)
    } else {
      this.broadcast(message)
    }
  }

  // Уведомление об общем обновлении доступности
  notifyAvailabilityUpdate(beachId, stats) {
    const message = {
      type: 'availability_update',
      data: {
        beachId,
        stats,
        timestamp: Date.now()
      }
    }

    this.broadcastToBeach(beachId, message)
  }

  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    this.wss.close(() => {
      console.log('WebSocket сервер закрыт')
    })
  }

  get clientCount() {
    return this.clients.size
  }
}

module.exports = WebSocketServer