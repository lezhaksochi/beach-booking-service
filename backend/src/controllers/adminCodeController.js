const Booking = require('../models/Booking')
const AdminUser = require('../models/AdminUser')

class AdminCodeController {
  // Проверка простого кода бронирования
  static async checkCode(req, res) {
    try {
      const { code, notes } = req.body
      const admin = req.admin

      if (!code) {
        return res.status(400).json({
          error: 'Код обязателен',
          code: 'CODE_REQUIRED'
        })
      }

      // Поиск бронирования по простому коду
      const booking = await Booking.findBySimpleCode(code.toString().padStart(4, '0'))

      if (!booking) {
        return res.status(404).json({
          error: 'Код не найден или истек срок действия',
          code: 'INVALID_CODE',
          result: 'invalid'
        })
      }

      // Проверка доступа к пляжу (для обычных админов)
      if (admin.role !== 'super_admin') {
        const hasAccess = await AdminUser.hasAccessToBeach(admin.id, booking.beach_id)
        
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Нет доступа к этому пляжу',
            code: 'NO_BEACH_ACCESS',
            result: 'invalid'
          })
        }
      }

      // Проверка, не использовался ли уже код
      if (booking.qr_used_at) {
        return res.status(400).json({
          error: 'Код уже был использован',
          code: 'CODE_ALREADY_USED',
          result: 'already_used',
          booking: AdminCodeController.formatBookingInfo(booking),
          usedAt: booking.qr_used_at
        })
      }

      // Проверка времени бронирования
      const now = new Date()
      const startTime = new Date(booking.start_time)
      const endTime = new Date(booking.end_time)

      if (now > endTime) {
        return res.status(400).json({
          error: 'Время бронирования истекло',
          code: 'BOOKING_EXPIRED',
          result: 'expired',
          booking: AdminCodeController.formatBookingInfo(booking)
        })
      }

      // Проверка, не рано ли для заезда (можно заезжать за 30 минут до начала)
      const earliestCheckin = new Date(startTime.getTime() - 30 * 60 * 1000)
      
      if (now < earliestCheckin) {
        return res.status(400).json({
          error: 'Слишком рано для заезда. Заезд возможен за 30 минут до начала бронирования',
          code: 'TOO_EARLY',
          result: 'invalid',
          booking: AdminCodeController.formatBookingInfo(booking),
          canCheckinAt: earliestCheckin.toISOString()
        })
      }

      // Успешная проверка - отмечаем прибытие
      await Booking.markCodeUsed(booking.id, admin.id)

      res.json({
        message: 'Код успешно проверен, клиент зарегистрирован',
        result: 'success',
        booking: AdminCodeController.formatBookingInfo(booking),
        checkedInAt: now.toISOString(),
        checkedInBy: {
          id: admin.id,
          name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
          email: admin.email
        }
      })

    } catch (error) {
      console.error('Ошибка проверки кода:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR',
        result: 'error'
      })
    }
  }

  // Поиск бронирования по коду (без регистрации прибытия)
  static async findByCode(req, res) {
    try {
      const { code } = req.params
      const admin = req.admin

      if (!code) {
        return res.status(400).json({
          error: 'Код обязателен',
          code: 'CODE_REQUIRED'
        })
      }

      const booking = await Booking.findBySimpleCode(code.toString().padStart(4, '0'))

      if (!booking) {
        return res.status(404).json({
          error: 'Код не найден или истек срок действия',
          code: 'INVALID_CODE'
        })
      }

      // Проверка доступа к пляжу (для обычных админов)
      if (admin.role !== 'super_admin') {
        const hasAccess = await AdminUser.hasAccessToBeach(admin.id, booking.beach_id)
        
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Нет доступа к этому пляжу',
            code: 'NO_BEACH_ACCESS'
          })
        }
      }

      res.json({
        booking: AdminCodeController.formatBookingInfo(booking)
      })

    } catch (error) {
      console.error('Ошибка поиска по коду:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  static formatBookingInfo(booking) {
    return {
      id: booking.id,
      simple_code: booking.simple_code,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email,
      start_time: booking.start_time,
      end_time: booking.end_time,
      total_price: booking.total_price,
      status: booking.status,
      lounger: {
        name: booking.lounger_name,
        row: booking.row_number,
        seat: booking.seat_number,
        type: booking.lounger_type,
        class: booking.lounger_class
      },
      beach_name: booking.beach_name,
      used_at: booking.qr_used_at
    }
  }
}

module.exports = AdminCodeController