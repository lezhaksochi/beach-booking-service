const express = require('express')
const router = express.Router()

const {
  createBooking,
  getBookingById,
  getAllBookings,
  cancelBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/bookingController')

const {
  generateQR,
  getQRImage
} = require('../controllers/qrController')

const {
  validateBooking,
  validateUUID
} = require('../middleware/validation')

const { optionalAuthMiddleware, authMiddleware } = require('../middleware/auth')

// Создать новое бронирование
router.post('/', optionalAuthMiddleware, validateBooking, createBooking)

// Получить все бронирования (с фильтрами)
router.get('/', getAllBookings)

// Получить бронирование по ID (только владелец)
router.get('/:id', validateUUID('id'), authMiddleware, getBookingById)

// Отменить бронирование (только владелец)
router.patch('/:id/cancel', validateUUID('id'), authMiddleware, cancelBooking)

// Обновить бронирование (для администраторов)
router.put('/:id', validateUUID('id'), updateBooking)

// Удалить бронирование (для администраторов)
router.delete('/:id', validateUUID('id'), deleteBooking)

// QR-код для бронирования (JSON данные)
router.get('/:id/qr', validateUUID('id'), authMiddleware, generateQR)

// QR-код как изображение
router.get('/:id/qr.png', validateUUID('id'), authMiddleware, getQRImage)

module.exports = router