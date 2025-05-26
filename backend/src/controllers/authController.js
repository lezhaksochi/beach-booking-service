const User = require('../models/User')
const Booking = require('../models/Booking')
const { generateToken } = require('../middleware/auth')

const register = async (req, res, next) => {
  try {
    const { phone, password, name } = req.body

    // Validate input
    if (!phone || !password || !name) {
      return res.status(400).json({
        error: 'Телефон, пароль и имя обязательны'
      })
    }

    // Validate phone format (should start with +7 and have 11 digits)
    const phoneRegex = /^\+7\d{10}$/
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error: 'Неверный формат телефона. Используйте формат +7XXXXXXXXXX'
      })
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Пароль должен содержать минимум 6 символов'
      })
    }

    // Validate name
    if (name.length < 2) {
      return res.status(400).json({
        error: 'Имя должно содержать минимум 2 символа'
      })
    }

    // Validate name format (only letters, spaces, and hyphens)
    const nameRegex = /^[а-яёА-ЯЁa-zA-Z\s\-]+$/
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        error: 'Имя может содержать только буквы, пробелы и дефисы'
      })
    }

    // Check if user already exists
    const existingUser = await User.findByPhone(phone)
    if (existingUser) {
      return res.status(409).json({
        error: 'Пользователь с таким номером телефона уже существует'
      })
    }

    // Create user
    const user = await User.create({ phone, password, name })
    
    // Generate token
    const token = generateToken(user.id)

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        created_at: user.created_at
      },
      token
    })
  } catch (error) {
    next(error)
  }
}

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        error: 'Телефон и пароль обязательны'
      })
    }

    // Find user
    const user = await User.findByPhone(phone)
    if (!user) {
      return res.status(401).json({
        error: 'Неверный номер телефона или пароль'
      })
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Неверный номер телефона или пароль'
      })
    }

    // Generate token
    const token = generateToken(user.id)

    res.json({
      message: 'Вход выполнен успешно',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        created_at: user.created_at
      },
      token
    })
  } catch (error) {
    next(error)
  }
}

const me = async (req, res, next) => {
  try {
    // User is already attached to req by authMiddleware
    const user = req.user

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    })
  } catch (error) {
    next(error)
  }
}

const logout = async (req, res, next) => {
  try {
    // Since we're using stateless JWT, logout is handled on the client side
    // by removing the token from localStorage
    res.json({
      message: 'Выход выполнен успешно'
    })
  } catch (error) {
    next(error)
  }
}

const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { status } = req.query

    // Обновляем статусы завершенных бронирований перед получением
    await Booking.updateExpiredBookings()

    const bookings = await User.getUserBookings(userId, status)

    res.json(bookings)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  register,
  login,
  me,
  logout,
  getMyBookings
}