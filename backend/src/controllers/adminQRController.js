const pool = require('../config/database')
const AdminUser = require('../models/AdminUser')

class AdminQRController {
  // Сканирование QR-кода бронирования
  static async scanQR(req, res) {
    try {
      const { qrToken, beachId, notes } = req.body
      const admin = req.admin

      if (!qrToken) {
        return res.status(400).json({
          error: 'QR токен обязателен',
          code: 'QR_TOKEN_REQUIRED'
        })
      }

      // Поиск бронирования по QR токену
      const bookingQuery = `
        SELECT b.*, l.beach_id, l.name as lounger_name, 
               l.row_number, l.seat_number, beach.name as beach_name
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        INNER JOIN beaches beach ON l.beach_id = beach.id
        WHERE b.qr_token = $1
      `

      const bookingResult = await pool.query(bookingQuery, [qrToken])

      if (bookingResult.rows.length === 0) {
        // Логируем неудачное сканирование
        await AdminQRController.logQRScan(null, admin.id, beachId, 'invalid', false, notes, {
          error: 'QR код не найден',
          token: qrToken
        })

        return res.status(404).json({
          error: 'QR код не найден или недействителен',
          code: 'INVALID_QR_CODE',
          result: 'invalid'
        })
      }

      const booking = bookingResult.rows[0]

      // Проверка доступа к пляжу
      if (beachId && booking.beach_id !== beachId) {
        // Для super_admin разрешаем сканирование любых QR кодов
        if (admin.role !== 'super_admin') {
          await AdminQRController.logQRScan(booking.id, admin.id, beachId, 'invalid', false, notes, {
            error: 'QR код принадлежит другому пляжу',
            bookingBeachId: booking.beach_id,
            requestedBeachId: beachId
          })

          return res.status(403).json({
            error: 'Этот QR код не принадлежит вашему пляжу',
            code: 'WRONG_BEACH',
            result: 'invalid',
            message: `QR код принадлежит пляжу "${booking.beach_name}", а вы выбрали другой пляж. Выберите правильный пляж или обратитесь к администратору.`
          })
        }
      }

      const hasAccess = await AdminUser.hasAccessToBeach(admin.id, booking.beach_id)
      
      if (!hasAccess && admin.role !== 'super_admin') {
        await AdminQRController.logQRScan(booking.id, admin.id, booking.beach_id, 'invalid', false, notes, {
          error: 'Нет доступа к пляжу'
        })

        return res.status(403).json({
          error: 'Нет доступа к этому пляжу',
          code: 'NO_BEACH_ACCESS',
          result: 'invalid'
        })
      }

      // Проверка статуса бронирования
      if (booking.status === 'cancelled') {
        await AdminQRController.logQRScan(booking.id, admin.id, booking.beach_id, 'invalid', false, notes, {
          error: 'Бронирование отменено',
          status: booking.status
        })

        return res.status(400).json({
          error: 'Бронирование отменено',
          code: 'BOOKING_CANCELLED',
          result: 'invalid',
          booking: AdminQRController.formatBookingInfo(booking)
        })
      }

      // Проверка времени бронирования
      const now = new Date()
      const startTime = new Date(booking.start_time)
      const endTime = new Date(booking.end_time)

      if (now > endTime) {
        await AdminQRController.logQRScan(booking.id, admin.id, booking.beach_id, 'expired', false, notes, {
          error: 'Время бронирования истекло',
          endTime: booking.end_time,
          currentTime: now.toISOString()
        })

        return res.status(400).json({
          error: 'Время бронирования истекло',
          code: 'BOOKING_EXPIRED',
          result: 'expired',
          booking: AdminQRController.formatBookingInfo(booking)
        })
      }

      // Проверка, не рано ли для заезда (можно заезжать за 30 минут до начала)
      const earliestCheckin = new Date(startTime.getTime() - 30 * 60 * 1000)
      
      if (now < earliestCheckin) {
        await AdminQRController.logQRScan(booking.id, admin.id, booking.beach_id, 'invalid', false, notes, {
          error: 'Слишком рано для заезда',
          startTime: booking.start_time,
          earliestCheckin: earliestCheckin.toISOString(),
          currentTime: now.toISOString()
        })

        return res.status(400).json({
          error: 'Слишком рано для заезда. Заезд возможен за 30 минут до начала бронирования',
          code: 'TOO_EARLY',
          result: 'invalid',
          booking: AdminQRController.formatBookingInfo(booking),
          canCheckinAt: earliestCheckin.toISOString()
        })
      }

      // Проверка, не использовался ли уже QR код
      if (booking.qr_used_at) {
        await AdminQRController.logQRScan(booking.id, admin.id, booking.beach_id, 'already_used', false, notes, {
          error: 'QR код уже использован',
          usedAt: booking.qr_used_at
        })

        return res.status(400).json({
          error: 'QR код уже был использован',
          code: 'QR_ALREADY_USED',
          result: 'already_used',
          booking: AdminQRController.formatBookingInfo(booking),
          usedAt: booking.qr_used_at
        })
      }

      // Успешное сканирование - отмечаем прибытие
      const updateQuery = `
        UPDATE bookings 
        SET qr_used_at = CURRENT_TIMESTAMP,
            checked_in_by = $1
        WHERE id = $2
        RETURNING *
      `

      await pool.query(updateQuery, [admin.id, booking.id])

      // Логируем успешное сканирование
      await AdminQRController.logQRScan(booking.id, admin.id, booking.beach_id, 'success', true, notes, {
        checkinTime: now.toISOString()
      })

      res.json({
        message: 'QR код успешно отсканирован, клиент зарегистрирован',
        result: 'success',
        booking: AdminQRController.formatBookingInfo(booking),
        checkedInAt: now.toISOString(),
        checkedInBy: {
          id: admin.id,
          name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
          email: admin.email
        }
      })

    } catch (error) {
      console.error('Ошибка сканирования QR:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR',
        result: 'error'
      })
    }
  }

  // История сканирований для пляжа
  static async getScanHistory(req, res) {
    try {
      const { beachId } = req.params
      const { limit = 50, offset = 0, date } = req.query

      let query = `
        SELECT qs.*, 
               b.customer_name, b.customer_phone, 
               l.name as lounger_name, l.row_number, l.seat_number,
               CONCAT(au.first_name, ' ', au.last_name) as scanned_by_name
        FROM qr_scans qs
        LEFT JOIN bookings b ON qs.booking_id = b.id
        LEFT JOIN loungers l ON b.lounger_id = l.id
        INNER JOIN admin_users au ON qs.scanned_by = au.id
        WHERE qs.beach_id = $1
      `

      const values = [beachId]

      if (date) {
        query += ` AND DATE(qs.scanned_at) = $${values.length + 1}`
        values.push(date)
      }

      query += ` ORDER BY qs.scanned_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
      values.push(limit, offset)

      const result = await pool.query(query, values)

      // Получаем общее количество для пагинации
      let countQuery = `
        SELECT COUNT(*) as total
        FROM qr_scans qs
        WHERE qs.beach_id = $1
      `

      const countValues = [beachId]

      if (date) {
        countQuery += ` AND DATE(qs.scanned_at) = $2`
        countValues.push(date)
      }

      const countResult = await pool.query(countQuery, countValues)

      res.json({
        scans: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      })

    } catch (error) {
      console.error('Ошибка получения истории сканирований:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Приватные методы
  static async logQRScan(bookingId, scannedBy, beachId, result, clientArrived, notes, scanData) {
    try {
      const query = `
        INSERT INTO qr_scans (
          booking_id, scanned_by, beach_id, scan_result, 
          client_arrived, notes, scan_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `

      await pool.query(query, [
        bookingId, scannedBy, beachId, result, 
        clientArrived, notes, JSON.stringify(scanData)
      ])
    } catch (error) {
      console.error('Ошибка логирования сканирования:', error)
    }
  }

  static formatBookingInfo(booking) {
    return {
      id: booking.id,
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
        seat: booking.seat_number
      },
      beach_name: booking.beach_name,
      qr_used_at: booking.qr_used_at
    }
  }
}

module.exports = AdminQRController