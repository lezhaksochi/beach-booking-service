const express = require('express')
const router = express.Router()

// Импорт контроллеров
const AdminAuthController = require('../controllers/adminAuthController')
const AdminBeachController = require('../controllers/adminBeachController')
const AdminUserController = require('../controllers/adminUserController')
const AdminBookingController = require('../controllers/adminBookingController')
const AdminQRController = require('../controllers/adminQRController')
const AdminCodeController = require('../controllers/adminCodeController')
const AdminStatsController = require('../controllers/adminStatsController')
const CronController = require('../controllers/cronController')

// Импорт middleware
const { adminAuth, requireRole, requireBeachAccess, logAdminAction } = require('../middleware/adminAuth')
const rateLimit = require('../middleware/rateLimit')

// === АУТЕНТИФИКАЦИЯ ===
router.post('/auth/login', AdminAuthController.login)
router.get('/auth/profile', adminAuth, AdminAuthController.getProfile)
router.put('/auth/profile', adminAuth, logAdminAction('UPDATE_PROFILE', 'admin_user'), AdminAuthController.updateProfile)
router.post('/auth/change-password', adminAuth, logAdminAction('CHANGE_PASSWORD', 'admin_user'), AdminAuthController.changePassword)
router.get('/auth/verify', adminAuth, AdminAuthController.verifyToken)

// === УПРАВЛЕНИЕ ПЛЯЖАМИ ===
// Получение пляжей (с учетом прав доступа)
router.get('/beaches', adminAuth, AdminBeachController.getBeaches)

// Создание пляжа (только админы и супер-админы)
router.post('/beaches', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']), 
  logAdminAction('CREATE_BEACH', 'beach'),
  AdminBeachController.createBeach
)

// Получение конкретного пляжа
router.get('/beaches/:beachId', 
  adminAuth, 
  requireBeachAccess, 
  AdminBeachController.getBeach
)

// Обновление пляжа
router.put('/beaches/:beachId', 
  adminAuth, 
  requireBeachAccess,
  logAdminAction('UPDATE_BEACH', 'beach'),
  AdminBeachController.updateBeach
)

// Удаление пляжа (только создатель или супер-админ)
router.delete('/beaches/:beachId', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']),
  logAdminAction('DELETE_BEACH', 'beach'),
  AdminBeachController.deleteBeach
)

// Получение пользователей пляжа
router.get('/beaches/:beachId/users', 
  adminAuth, 
  requireBeachAccess,
  AdminBeachController.getBeachUsers
)

// Предоставление доступа к пляжу
router.post('/beaches/:beachId/users', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']),
  requireBeachAccess,
  logAdminAction('GRANT_BEACH_ACCESS', 'beach_access'),
  AdminBeachController.grantBeachAccess
)

// Отзыв доступа к пляжу
router.delete('/beaches/:beachId/users/:userId', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']),
  requireBeachAccess,
  logAdminAction('REVOKE_BEACH_ACCESS', 'beach_access'),
  AdminBeachController.revokeBeachAccess
)

// === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ===
// Получение списка обычных пользователей
router.get('/users', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']), 
  AdminUserController.getUsers
)

// Получение списка администраторов
router.get('/admin-users', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']), 
  AdminUserController.getAdminUsers
)

// Получение всех бронирований (для страницы бронирований)
router.get('/bookings', 
  adminAuth, 
  AdminBookingController.getAllBookings
)

// Создание администратора/модератора
router.post('/admin-users', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']),
  logAdminAction('CREATE_ADMIN_USER', 'admin_user'),
  AdminUserController.createAdminUser
)

// Обновление статуса обычного пользователя
router.patch('/users/:userId', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']),
  logAdminAction('UPDATE_USER_STATUS', 'user'),
  AdminUserController.updateUserStatus
)

// Обновление статуса администратора
router.patch('/admin-users/:userId', 
  adminAuth, 
  requireRole(['super_admin']),
  logAdminAction('UPDATE_ADMIN_STATUS', 'admin_user'),
  AdminUserController.updateAdminStatus
)

// Обновление статуса бронирования
router.patch('/bookings/:bookingId', 
  adminAuth,
  logAdminAction('UPDATE_BOOKING_STATUS', 'booking'),
  AdminBookingController.updateBookingStatus
)

// Получение пользователя
router.get('/users/:userId', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']), 
  AdminUserController.getUser
)

// Обновление пользователя
router.put('/users/:userId', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']),
  logAdminAction('UPDATE_USER', 'admin_user'),
  AdminUserController.updateUser
)

// Деактивация пользователя
router.delete('/users/:userId', 
  adminAuth, 
  requireRole(['super_admin', 'beach_admin']),
  logAdminAction('DEACTIVATE_USER', 'admin_user'),
  AdminUserController.deactivateUser
)

// === УПРАВЛЕНИЕ БРОНИРОВАНИЯМИ ===
// Получение бронирований пляжа
router.get('/beaches/:beachId/bookings', 
  adminAuth, 
  requireBeachAccess,
  AdminBookingController.getBeachBookings
)

// Создание ручного бронирования
router.post('/beaches/:beachId/bookings', 
  adminAuth, 
  requireBeachAccess,
  logAdminAction('CREATE_BOOKING', 'booking'),
  AdminBookingController.createBooking
)

// Получение конкретного бронирования
router.get('/bookings/:bookingId', 
  adminAuth, 
  AdminBookingController.getBooking
)

// Обновление бронирования
router.put('/bookings/:bookingId', 
  adminAuth,
  logAdminAction('UPDATE_BOOKING', 'booking'),
  AdminBookingController.updateBooking
)

// Отмена бронирования
router.delete('/bookings/:bookingId', 
  adminAuth,
  logAdminAction('CANCEL_BOOKING', 'booking'),
  AdminBookingController.cancelBooking
)

// Отметка о прибытии клиента
router.post('/bookings/:bookingId/checkin', 
  adminAuth,
  logAdminAction('CHECKIN_BOOKING', 'booking'),
  AdminBookingController.checkInBooking
)

// === ПРОВЕРКА КОДОВ ===
// Проверка простого 4-значного кода
router.post('/code/check', 
  adminAuth,
  rateLimit(60, 1), // 60 проверок в минуту
  logAdminAction('CODE_CHECK', 'booking'),
  AdminCodeController.checkCode
)

// Поиск бронирования по коду
router.get('/code/:code', 
  adminAuth,
  AdminCodeController.findByCode
)

// === QR-СКАНИРОВАНИЕ ===
// Сканирование QR-кода
router.post('/qr/scan', 
  adminAuth,
  rateLimit(30, 1), // 30 сканирований в минуту
  logAdminAction('QR_SCAN', 'qr_scan'),
  AdminQRController.scanQR
)

// История сканирований
router.get('/beaches/:beachId/qr-scans', 
  adminAuth, 
  requireBeachAccess,
  AdminQRController.getScanHistory
)

// === СТАТИСТИКА И ОТЧЕТЫ ===
// Дашборд статистики
router.get('/dashboard', 
  adminAuth, 
  AdminStatsController.getDashboard
)

// Статистика пляжа
router.get('/beaches/:beachId/stats', 
  adminAuth, 
  requireBeachAccess,
  AdminStatsController.getBeachStats
)

// Детальные отчеты
router.get('/reports/bookings', 
  adminAuth, 
  AdminStatsController.getBookingReport
)

router.get('/reports/revenue', 
  adminAuth, 
  AdminStatsController.getRevenueReport
)

// === СИСТЕМНЫЕ ФУНКЦИИ ===
// Логи административных действий (только супер-админ)
router.get('/audit-log', 
  adminAuth, 
  requireRole('super_admin'),
  AdminStatsController.getAuditLog
)

// Обновление истекших бронирований (только супер-админ)
router.post('/system/update-expired-bookings', 
  adminAuth, 
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const updatedBookings = await CronController.updateExpiredBookings()
      res.json({
        message: 'Обновление выполнено успешно',
        updated_count: updatedBookings.length,
        updated_bookings: updatedBookings
      })
    } catch (error) {
      console.error('Ошибка обновления:', error)
      res.status(500).json({
        error: 'Ошибка обновления истекших бронирований',
        code: 'UPDATE_ERROR'
      })
    }
  }
)

module.exports = router