const pool = require('../config/database')
const AdminUser = require('../models/AdminUser')

class AdminBookingController {
  // Получение бронирований пляжа
  static async getBeachBookings(req, res) {
    try {
      const { beachId } = req.params
      const { 
        status, 
        date, 
        start_date, 
        end_date, 
        limit = 50, 
        offset = 0 
      } = req.query

      let query = `
        SELECT b.*, l.name as lounger_name, l.row_number, l.seat_number,
               checkin_admin.name as checked_in_by_name,
               cancel_admin.name as cancelled_by_name
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        LEFT JOIN admin_users checkin_admin ON b.checked_in_by = checkin_admin.id
        LEFT JOIN admin_users cancel_admin ON b.cancelled_by = cancel_admin.id
        WHERE l.beach_id = $1
      `

      const values = [beachId]

      // Фильтры
      if (status) {
        query += ` AND b.status = $${values.length + 1}`
        values.push(status)
      }

      if (date) {
        query += ` AND DATE(b.start_time) = $${values.length + 1}`
        values.push(date)
      }

      if (start_date && end_date) {
        query += ` AND b.start_time >= $${values.length + 1} AND b.start_time <= $${values.length + 2}`
        values.push(start_date, end_date)
      }

      query += ` ORDER BY b.start_time DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
      values.push(limit, offset)

      const result = await pool.query(query, values)

      res.json({
        bookings: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      })

    } catch (error) {
      console.error('Ошибка получения бронирований:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Создание ручного бронирования
  static async createBooking(req, res) {
    try {
      const { beachId } = req.params
      const {
        lounger_id,
        customer_name,
        customer_phone,
        customer_email,
        start_time,
        end_time,
        admin_notes
      } = req.body

      const admin = req.admin

      // Валидация
      if (!lounger_id || !customer_name || !customer_phone || !start_time || !end_time) {
        return res.status(400).json({
          error: 'Обязательные поля: lounger_id, customer_name, customer_phone, start_time, end_time',
          code: 'MISSING_REQUIRED_FIELDS'
        })
      }

      // Проверяем, что шезлонг принадлежит указанному пляжу
      const loungerQuery = `
        SELECT l.*, l.price_per_hour 
        FROM loungers l 
        WHERE l.id = $1 AND l.beach_id = $2
      `
      
      const loungerResult = await pool.query(loungerQuery, [lounger_id, beachId])

      if (loungerResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Шезлонг не найден на этом пляже',
          code: 'LOUNGER_NOT_FOUND'
        })
      }

      const lounger = loungerResult.rows[0]

      // Проверяем доступность шезлонга на указанное время
      const conflictQuery = `
        SELECT id FROM bookings 
        WHERE lounger_id = $1 
          AND status IN ('confirmed', 'pending')
          AND (
            (start_time <= $2 AND end_time > $2) OR
            (start_time < $3 AND end_time >= $3) OR
            (start_time >= $2 AND end_time <= $3)
          )
      `

      const conflictResult = await pool.query(conflictQuery, [
        lounger_id, start_time, end_time
      ])

      if (conflictResult.rows.length > 0) {
        return res.status(400).json({
          error: 'Шезлонг занят на указанное время',
          code: 'LOUNGER_NOT_AVAILABLE'
        })
      }

      // Рассчитываем стоимость
      const startDate = new Date(start_time)
      const endDate = new Date(end_time)
      const hours = Math.ceil((endDate - startDate) / (1000 * 60 * 60))
      const total_price = hours * parseFloat(lounger.price_per_hour)

      // Создаем бронирование
      const bookingQuery = `
        INSERT INTO bookings (
          lounger_id, customer_name, customer_phone, customer_email,
          start_time, end_time, total_price, status, admin_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8)
        RETURNING *
      `

      const bookingValues = [
        lounger_id, customer_name, customer_phone, customer_email || '',
        start_time, end_time, total_price, admin_notes
      ]

      const bookingResult = await pool.query(bookingQuery, bookingValues)
      const booking = bookingResult.rows[0]

      // Обновляем доступность шезлонга
      const Lounger = require('../models/Lounger')
      await Lounger.updateAvailability(lounger_id)

      res.status(201).json({
        message: 'Бронирование создано успешно',
        booking: {
          ...booking,
          lounger_name: lounger.name,
          row_number: lounger.row_number,
          seat_number: lounger.seat_number
        }
      })

    } catch (error) {
      console.error('Ошибка создания бронирования:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение конкретного бронирования
  static async getBooking(req, res) {
    try {
      const { bookingId } = req.params
      const admin = req.admin

      const query = `
        SELECT b.*, l.name as lounger_name, l.row_number, l.seat_number,
               l.beach_id, beach.name as beach_name,
               checkin_admin.name as checked_in_by_name,
               cancel_admin.name as cancelled_by_name,
               qs.scan_result, qs.client_arrived, qs.scanned_at,
               scan_admin.name as scanned_by_name
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        INNER JOIN beaches beach ON l.beach_id = beach.id
        LEFT JOIN admin_users checkin_admin ON b.checked_in_by = checkin_admin.id
        LEFT JOIN admin_users cancel_admin ON b.cancelled_by = cancel_admin.id
        LEFT JOIN qr_scans qs ON b.id = qs.booking_id
        LEFT JOIN admin_users scan_admin ON qs.scanned_by = scan_admin.id
        WHERE b.id = $1
      `

      const result = await pool.query(query, [bookingId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Бронирование не найдено',
          code: 'BOOKING_NOT_FOUND'
        })
      }

      const booking = result.rows[0]

      // Проверяем доступ к пляжу
      const hasAccess = await AdminUser.hasAccessToBeach(admin.id, booking.beach_id)
      
      if (!hasAccess && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет доступа к этому бронированию',
          code: 'NO_ACCESS'
        })
      }

      res.json({ booking })

    } catch (error) {
      console.error('Ошибка получения бронирования:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Обновление бронирования
  static async updateBooking(req, res) {
    try {
      const { bookingId } = req.params
      const { admin_notes, status } = req.body
      const admin = req.admin

      // Получаем текущее бронирование для проверки доступа
      const currentBookingQuery = `
        SELECT b.*, l.beach_id 
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE b.id = $1
      `

      const currentResult = await pool.query(currentBookingQuery, [bookingId])

      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Бронирование не найдено',
          code: 'BOOKING_NOT_FOUND'
        })
      }

      const currentBooking = currentResult.rows[0]

      // Проверяем доступ к пляжу
      const hasAccess = await AdminUser.hasAccessToBeach(admin.id, currentBooking.beach_id)
      
      if (!hasAccess && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет доступа к этому бронированию',
          code: 'NO_ACCESS'
        })
      }

      const query = `
        UPDATE bookings 
        SET admin_notes = COALESCE($1, admin_notes),
            status = COALESCE($2, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `

      const result = await pool.query(query, [admin_notes, status, bookingId])

      res.json({
        message: 'Бронирование обновлено',
        booking: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка обновления бронирования:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Отмена бронирования
  static async cancelBooking(req, res) {
    try {
      const { bookingId } = req.params
      const { reason } = req.body
      const admin = req.admin

      // Используем модель Booking для отмены
      const Booking = require('../models/Booking')
      
      const booking = await Booking.findById(bookingId)

      if (!booking) {
        return res.status(404).json({
          error: 'Бронирование не найдено',
          code: 'BOOKING_NOT_FOUND'
        })
      }

      // Проверяем доступ к пляжу через lounger
      const loungerQuery = `SELECT beach_id FROM loungers WHERE id = $1`
      const loungerResult = await pool.query(loungerQuery, [booking.lounger_id])
      
      if (loungerResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Шезлонг не найден',
          code: 'LOUNGER_NOT_FOUND'
        })
      }

      const beachId = loungerResult.rows[0].beach_id
      const hasAccess = await AdminUser.hasAccessToBeach(admin.id, beachId)
      
      if (!hasAccess && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет доступа к этому бронированию',
          code: 'NO_ACCESS'
        })
      }

      // Отменяем бронирование с указанием админа
      const cancelQuery = `
        UPDATE bookings 
        SET status = 'cancelled',
            cancelled_by = $1,
            cancelled_at = CURRENT_TIMESTAMP,
            admin_notes = CASE 
              WHEN admin_notes IS NULL OR admin_notes = '' THEN $2
              ELSE admin_notes || ' | ' || $2
            END
        WHERE id = $3
        RETURNING *
      `

      const cancelNote = `Отменено администратором: ${reason || 'Без причины'}`
      const result = await pool.query(cancelQuery, [admin.id, cancelNote, bookingId])

      // Обновляем доступность шезлонга
      const Lounger = require('../models/Lounger')
      await Lounger.updateAvailability(booking.lounger_id)

      res.json({
        message: 'Бронирование отменено',
        booking: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка отмены бронирования:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Отметка о прибытии клиента
  static async checkInBooking(req, res) {
    try {
      const { bookingId } = req.params
      const { notes } = req.body
      const admin = req.admin

      const query = `
        UPDATE bookings 
        SET checked_in_by = $1,
            qr_used_at = COALESCE(qr_used_at, CURRENT_TIMESTAMP),
            admin_notes = COALESCE(admin_notes || ' | ', '') || 'Регистрация: ' || COALESCE($2, 'Клиент прибыл')
        WHERE id = $3
        RETURNING *
      `

      const result = await pool.query(query, [admin.id, notes, bookingId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Бронирование не найдено',
          code: 'BOOKING_NOT_FOUND'
        })
      }

      res.json({
        message: 'Клиент зарегистрирован',
        booking: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка регистрации клиента:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение всех бронирований (для админ-панели)
  static async getAllBookings(req, res) {
    try {
      const admin = req.admin
      const { 
        status, 
        beach_id,
        limit = 50, 
        offset = 0 
      } = req.query

      let query = `
        SELECT 
          b.id, b.lounger_id, b.customer_name, b.customer_phone, b.customer_email,
          b.start_time, b.end_time, b.total_price, b.status, b.created_at,
          l.name as lounger_name, l.row_number, l.seat_number,
          beach.name as beach_name
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        INNER JOIN beaches beach ON l.beach_id = beach.id
      `

      const values = []
      let whereConditions = []

      // Фильтр по роли администратора
      if (admin.role !== 'super_admin') {
        // Для админа пляжа - только его пляжи
        const accessibleBeaches = await AdminUser.getAccessibleBeaches(admin.id)
        if (accessibleBeaches.length === 0) {
          return res.json([])
        }
        
        const beachIds = accessibleBeaches.map(b => b.id)
        whereConditions.push(`beach.id = ANY($${values.length + 1})`)
        values.push(beachIds)
      }

      // Фильтры
      if (status) {
        whereConditions.push(`b.status = $${values.length + 1}`)
        values.push(status)
      }

      if (beach_id) {
        whereConditions.push(`beach.id = $${values.length + 1}`)
        values.push(beach_id)
      }

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`
      }

      query += ` ORDER BY b.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
      values.push(limit, offset)

      const result = await pool.query(query, values)

      res.json(result.rows)

    } catch (error) {
      console.error('Ошибка получения бронирований:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Обновление статуса бронирования
  static async updateBookingStatus(req, res) {
    try {
      const { bookingId } = req.params
      const { status } = req.body
      const admin = req.admin

      // Валидация статуса
      const validStatuses = ['active', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Неверный статус бронирования',
          code: 'INVALID_STATUS'
        })
      }

      // Получение бронирования
      const bookingQuery = `
        SELECT b.*, l.beach_id
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE b.id = $1
      `
      
      const bookingResult = await pool.query(bookingQuery, [bookingId])
      
      if (bookingResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Бронирование не найдено',
          code: 'BOOKING_NOT_FOUND'
        })
      }

      const booking = bookingResult.rows[0]

      // Проверка прав доступа к пляжу
      if (admin.role !== 'super_admin') {
        const hasAccess = await AdminUser.hasAccessToBeach(admin.id, booking.beach_id)
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Нет доступа к этому бронированию',
            code: 'NO_BEACH_ACCESS'
          })
        }
      }

      // Обновление статуса
      const updateQuery = `
        UPDATE bookings 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, customer_name, status, start_time, end_time, total_price
      `

      const result = await pool.query(updateQuery, [status, bookingId])

      res.json({
        message: 'Статус бронирования обновлен',
        booking: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка обновления статуса бронирования:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }
}

module.exports = AdminBookingController