const jwt = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Токен доступа не предоставлен'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({
        error: 'Пользователь не найден'
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Недействительный токен'
      })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Токен истек'
      })
    }
    
    res.status(500).json({
      error: 'Ошибка проверки авторизации'
    })
  }
}

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null
      return next()
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.userId)

    req.user = user || null
    next()
  } catch (error) {
    req.user = null
    next()
  }
}

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  generateToken,
  JWT_SECRET
}