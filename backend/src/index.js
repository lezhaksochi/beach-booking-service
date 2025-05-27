require('dotenv').config()

const express = require('express')
const http = require('http')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')

const beachRoutes = require('./routes/beaches')
const loungerRoutes = require('./routes/loungers')
const bookingRoutes = require('./routes/bookings')
const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const { errorHandler, notFound } = require('./middleware/errorHandler')
const WebSocketServer = require('./websocket/server')
const CronController = require('./controllers/cronController')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

// Инициализация WebSocket сервера
const wsServer = new WebSocketServer(server)

// Добавляем WebSocket сервер в глобальный контекст для использования в контроллерах
global.wsServer = wsServer

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, от curl или мобильных приложений)
    if (!origin) {
      return callback(null, true)
    }
    
    // Разрешенные origins
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://89.111.169.184:3000',
      'https://89.111.169.184:3000'
    ]
    
    // В режиме разработки разрешаем все localhost и 127.0.0.1
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true)
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('CORS blocked origin:', origin)
      callback(null, true) // Временно разрешаем все для отладки
    }
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Логирование запросов в development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
    next()
  })
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API routes
app.use('/api/beaches', beachRoutes)
app.use('/api/loungers', loungerRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

// Базовый роут
app.get('/', (req, res) => {
  res.json({
    message: 'Beach Booking Service API',
    version: '1.0.0',
    endpoints: {
      beaches: '/api/beaches',
      loungers: '/api/loungers',
      bookings: '/api/bookings',
      auth: '/api/auth',
      admin: '/api/admin',
      health: '/health'
    }
  })
})

// Обработка 404
app.use(notFound)

// Обработка ошибок
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM получен, завершение работы...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT получен, завершение работы...')
  process.exit(0)
})

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏖️  Beach Booking API запущен на порту ${PORT}`)
  console.log(`📝 Режим: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`)
  console.log(`👥 WebSocket клиентов: ${wsServer.clientCount}`)
  
  // Запуск периодического обновления истекших бронирований (каждые 5 минут)
  console.log(`⏰ Настройка автоматического обновления бронирований каждые 5 минут`)
  
  // Запуск сразу после старта
  setTimeout(() => {
    CronController.updateExpiredBookings().catch(console.error)
  }, 10000) // через 10 секунд после старта
  
  // Затем каждые 5 минут
  setInterval(() => {
    CronController.updateExpiredBookings().catch(console.error)
  }, 5 * 60 * 1000) // 5 минут
})