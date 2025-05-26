import { WebSocketMessage } from '@/types'

export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private listeners: Map<string, Function[]> = new Map()

  constructor() {
    this.url = process.env.NODE_ENV === 'production' 
      ? `wss://${window.location.host}/ws` 
      : 'ws://localhost:3001/ws'
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket подключен')
          this.reconnectAttempts = 0
          this.emit('connected', {})
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.emit(message.type, message.data)
          } catch (error) {
            console.error('Ошибка парсинга WebSocket сообщения:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket отключен:', event.code, event.reason)
          this.emit('disconnected', { code: event.code, reason: event.reason })
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket ошибка:', error)
          this.emit('error', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Закрытие клиентом')
      this.ws = null
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket не подключен, сообщение не отправлено')
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) return

    if (callback) {
      const callbacks = this.listeners.get(event)!
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    } else {
      this.listeners.delete(event)
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Ошибка в WebSocket callback:', error)
        }
      })
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
    
    setTimeout(() => {
      this.connect().catch(() => {
        console.log('Переподключение не удалось')
      })
    }, this.reconnectInterval * this.reconnectAttempts)
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }
}

// Синглтон для глобального использования
let wsInstance: WebSocketService | null = null

export const getWebSocketService = (): WebSocketService => {
  if (!wsInstance) {
    wsInstance = new WebSocketService()
  }
  return wsInstance
}

// Хук для использования в React компонентах
export const useWebSocket = () => {
  const ws = getWebSocketService()
  
  const subscribe = (event: string, callback: Function) => {
    ws.on(event, callback)
    return () => ws.off(event, callback)
  }

  return {
    ws,
    subscribe,
    isConnected: ws.isConnected,
    connect: () => ws.connect(),
    disconnect: () => ws.disconnect(),
    send: (message: WebSocketMessage) => ws.send(message)
  }
}