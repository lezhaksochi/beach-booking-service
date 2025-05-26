const express = require('express')
const router = express.Router()

const {
  register,
  login,
  me,
  logout,
  getMyBookings
} = require('../controllers/authController')

const { authMiddleware } = require('../middleware/auth')

// Public routes
router.post('/register', register)
router.post('/login', login)

// Protected routes
router.get('/me', authMiddleware, me)
router.post('/logout', authMiddleware, logout)
router.get('/my-bookings', authMiddleware, getMyBookings)

module.exports = router