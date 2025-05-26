const pool = require('../config/database')
const AdminUser = require('../models/AdminUser')

class AdminStatsController {
  // Общий дашборд
  static async getDashboard(req, res) {
    try {
      const admin = req.admin

      // Получаем доступные пляжи
      let beachIds = []
      
      if (admin.role === 'super_admin') {
        // Супер-админ видит все пляжи
        const allBeachesQuery = 'SELECT id FROM beaches'
        const allBeachesResult = await pool.query(allBeachesQuery)
        beachIds = allBeachesResult.rows.map(b => b.id)
      } else {
        // Другие админы видят только доступные пляжи
        const accessibleBeachesQuery = `
          SELECT beach_id FROM beach_access WHERE admin_user_id = $1
        `
        const accessibleResult = await pool.query(accessibleBeachesQuery, [admin.id])
        beachIds = accessibleResult.rows.map(b => b.beach_id)
      }

      if (beachIds.length === 0) {
        return res.json({
          summary: {
            total_bookings_today: 0,
            total_revenue_today: 0,
            active_bookings: 0,
            total_beaches: 0
          },
          beaches: []
        })
      }

      // Общая статистика
      const summaryQuery = `
        SELECT 
          COUNT(CASE WHEN DATE(b.start_time) = CURRENT_DATE THEN 1 END) as total_bookings_today,
          SUM(CASE WHEN DATE(b.start_time) = CURRENT_DATE AND b.status = 'active' THEN b.total_price ELSE 0 END) as total_revenue_today,
          COUNT(CASE WHEN b.status = 'active' AND b.end_time > NOW() THEN 1 END) as active_bookings
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE l.beach_id = ANY($1)
      `

      const summaryResult = await pool.query(summaryQuery, [beachIds])
      const summary = {
        ...summaryResult.rows[0],
        total_beaches: beachIds.length,
        total_revenue_today: parseFloat(summaryResult.rows[0].total_revenue_today || 0)
      }

      // Статистика по пляжам
      const beachStatsQuery = `
        SELECT 
          beach.id,
          beach.name,
          COUNT(CASE WHEN DATE(b.start_time) = CURRENT_DATE THEN b.id END) as bookings_today,
          SUM(CASE WHEN DATE(b.start_time) = CURRENT_DATE AND b.status = 'active' THEN b.total_price ELSE 0 END) as revenue_today,
          COUNT(CASE WHEN b.status = 'active' AND b.end_time > NOW() THEN b.id END) as active_bookings,
          COUNT(l.id) as total_loungers,
          COUNT(CASE WHEN l.available = true THEN l.id END) as available_loungers
        FROM beaches beach
        LEFT JOIN loungers l ON beach.id = l.beach_id
        LEFT JOIN bookings b ON l.id = b.lounger_id
        WHERE beach.id = ANY($1)
        GROUP BY beach.id, beach.name
        ORDER BY beach.name
      `

      const beachStatsResult = await pool.query(beachStatsQuery, [beachIds])

      res.json({
        summary,
        beaches: beachStatsResult.rows.map(beach => ({
          ...beach,
          revenue_today: parseFloat(beach.revenue_today || 0),
          bookings_today: parseInt(beach.bookings_today || 0),
          active_bookings: parseInt(beach.active_bookings || 0),
          total_loungers: parseInt(beach.total_loungers || 0),
          available_loungers: parseInt(beach.available_loungers || 0)
        }))
      })

    } catch (error) {
      console.error('Ошибка получения дашборда:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Статистика конкретного пляжа
  static async getBeachStats(req, res) {
    try {
      const { beachId } = req.params

      // Получаем информацию о пляже
      const beachQuery = `
        SELECT id, name, description
        FROM beaches 
        WHERE id = $1
      `
      const beachResult = await pool.query(beachQuery, [beachId])
      
      if (beachResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Пляж не найден',
          code: 'BEACH_NOT_FOUND'
        })
      }

      // Статистика на сегодня
      const todayQuery = `
        SELECT 
          COUNT(*) as bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as revenue,
          COUNT(CASE WHEN b.status = 'active' AND b.end_time > NOW() THEN 1 END) as active_bookings,
          0 as qr_scans
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE l.beach_id = $1 
          AND DATE(b.start_time) = CURRENT_DATE
      `

      const todayResult = await pool.query(todayQuery, [beachId])

      // Статистика за неделю
      const weekQuery = `
        SELECT 
          COUNT(*) as bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as revenue,
          ROUND(COUNT(*) / 7.0, 1) as average_daily_bookings
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE l.beach_id = $1 
          AND b.start_time >= CURRENT_DATE - INTERVAL '7 days'
      `

      const weekResult = await pool.query(weekQuery, [beachId])

      // Статистика за месяц
      const monthQuery = `
        SELECT 
          COUNT(*) as bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as revenue,
          ROUND(COUNT(*) / 30.0, 1) as average_daily_bookings
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE l.beach_id = $1 
          AND b.start_time >= CURRENT_DATE - INTERVAL '30 days'
      `

      const monthResult = await pool.query(monthQuery, [beachId])

      // Статистика по шезлонгам
      const loungerStatsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN available = true THEN 1 END) as available,
          COUNT(CASE WHEN available = false THEN 1 END) as occupied
        FROM loungers 
        WHERE beach_id = $1
      `

      const loungerStatsResult = await pool.query(loungerStatsQuery, [beachId])
      const loungerStats = loungerStatsResult.rows[0]
      const utilization_rate = loungerStats.total > 0 ? 
        (loungerStats.occupied / loungerStats.total * 100) : 0

      // Популярные часы
      const hourlyStatsQuery = `
        SELECT 
          EXTRACT(HOUR FROM b.start_time) as hour,
          COUNT(*) as bookings
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE l.beach_id = $1 
          AND b.start_time >= CURRENT_DATE - INTERVAL '7 days'
          AND b.status = 'confirmed'
        GROUP BY EXTRACT(HOUR FROM b.start_time)
        ORDER BY hour
      `

      const hourlyStatsResult = await pool.query(hourlyStatsQuery, [beachId])

      // Недавние бронирования
      const recentBookingsQuery = `
        SELECT 
          b.id,
          b.customer_name,
          b.customer_phone,
          b.start_time,
          b.end_time,
          b.status,
          b.total_price
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE l.beach_id = $1
        ORDER BY b.created_at DESC
        LIMIT 10
      `

      const recentBookingsResult = await pool.query(recentBookingsQuery, [beachId])

      res.json({
        beach: beachResult.rows[0],
        today: {
          bookings: parseInt(todayResult.rows[0].bookings || 0),
          revenue: parseFloat(todayResult.rows[0].revenue || 0),
          qr_scans: parseInt(todayResult.rows[0].qr_scans || 0),
          active_bookings: parseInt(todayResult.rows[0].active_bookings || 0)
        },
        week: {
          bookings: parseInt(weekResult.rows[0].bookings || 0),
          revenue: parseFloat(weekResult.rows[0].revenue || 0),
          average_daily_bookings: parseFloat(weekResult.rows[0].average_daily_bookings || 0)
        },
        month: {
          bookings: parseInt(monthResult.rows[0].bookings || 0),
          revenue: parseFloat(monthResult.rows[0].revenue || 0),
          average_daily_bookings: parseFloat(monthResult.rows[0].average_daily_bookings || 0)
        },
        loungers: {
          total: parseInt(loungerStats.total || 0),
          available: parseInt(loungerStats.available || 0),
          occupied: parseInt(loungerStats.occupied || 0),
          utilization_rate: parseFloat(utilization_rate.toFixed(1))
        },
        popular_times: hourlyStatsResult.rows.map(row => ({
          hour: parseInt(row.hour),
          bookings: parseInt(row.bookings)
        })),
        recent_bookings: recentBookingsResult.rows.map(row => ({
          id: row.id,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          start_time: row.start_time,
          end_time: row.end_time,
          status: row.status,
          total_price: parseFloat(row.total_price)
        }))
      })

    } catch (error) {
      console.error('Ошибка получения статистики пляжа:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Отчет по бронированиям
  static async getBookingReport(req, res) {
    try {
      const admin = req.admin
      const { 
        start_date, 
        end_date, 
        beach_id, 
        status,
        format = 'json'
      } = req.query

      if (!start_date || !end_date) {
        return res.status(400).json({
          error: 'Параметры start_date и end_date обязательны',
          code: 'DATE_RANGE_REQUIRED'
        })
      }

      // Проверяем доступ к пляжу
      let beachFilter = ''
      const values = [start_date, end_date]

      if (beach_id) {
        const hasAccess = await AdminUser.hasAccessToBeach(admin.id, beach_id)
        if (!hasAccess && admin.role !== 'super_admin') {
          return res.status(403).json({
            error: 'Нет доступа к этому пляжу',
            code: 'NO_BEACH_ACCESS'
          })
        }
        beachFilter = ` AND l.beach_id = $${values.length + 1}`
        values.push(beach_id)
      } else {
        // Ограничиваем доступными пляжами
        const beaches = await AdminUser.getAccessibleBeaches(admin.id)
        const beachIds = beaches.map(b => b.id)
        if (beachIds.length > 0) {
          beachFilter = ` AND l.beach_id = ANY($${values.length + 1})`
          values.push(beachIds)
        }
      }

      let statusFilter = ''
      if (status) {
        statusFilter = ` AND b.status = $${values.length + 1}`
        values.push(status)
      }

      const query = `
        SELECT 
          b.*,
          beach.name as beach_name,
          l.name as lounger_name,
          l.type as lounger_type,
          l.row_number,
          l.seat_number,
          checkin_admin.name as checked_in_by_name,
          cancel_admin.name as cancelled_by_name
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        INNER JOIN beaches beach ON l.beach_id = beach.id
        LEFT JOIN admin_users checkin_admin ON b.checked_in_by = checkin_admin.id
        LEFT JOIN admin_users cancel_admin ON b.cancelled_by = cancel_admin.id
        WHERE b.start_time >= $1 AND b.start_time <= $2
        ${beachFilter}
        ${statusFilter}
        ORDER BY b.start_time DESC
      `

      const result = await pool.query(query, values)

      res.json({
        period: { start_date, end_date },
        filters: { beach_id, status },
        bookings: result.rows,
        total: result.rows.length
      })

    } catch (error) {
      console.error('Ошибка получения отчета по бронированиям:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Отчет по доходам
  static async getRevenueReport(req, res) {
    try {
      const admin = req.admin
      const { 
        start_date, 
        end_date, 
        beach_id,
        group_by = 'day' // day, week, month
      } = req.query

      if (!start_date || !end_date) {
        return res.status(400).json({
          error: 'Параметры start_date и end_date обязательны',
          code: 'DATE_RANGE_REQUIRED'
        })
      }

      let beachFilter = ''
      const values = [start_date, end_date]

      if (beach_id) {
        const hasAccess = await AdminUser.hasAccessToBeach(admin.id, beach_id)
        if (!hasAccess && admin.role !== 'super_admin') {
          return res.status(403).json({
            error: 'Нет доступа к этому пляжу',
            code: 'NO_BEACH_ACCESS'
          })
        }
        beachFilter = ` AND l.beach_id = $${values.length + 1}`
        values.push(beach_id)
      } else {
        const beaches = await AdminUser.getAccessibleBeaches(admin.id)
        const beachIds = beaches.map(b => b.id)
        if (beachIds.length > 0) {
          beachFilter = ` AND l.beach_id = ANY($${values.length + 1})`
          values.push(beachIds)
        }
      }

      let dateGrouping
      switch (group_by) {
        case 'week':
          dateGrouping = "DATE_TRUNC('week', b.start_time)"
          break
        case 'month':
          dateGrouping = "DATE_TRUNC('month', b.start_time)"
          break
        default:
          dateGrouping = "DATE(b.start_time)"
      }

      const query = `
        SELECT 
          ${dateGrouping} as period,
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as revenue,
          AVG(CASE WHEN b.status = 'confirmed' THEN b.total_price END) as avg_price
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE b.start_time >= $1 AND b.start_time <= $2
        ${beachFilter}
        GROUP BY ${dateGrouping}
        ORDER BY period
      `

      const result = await pool.query(query, values)

      // Итоговые суммы
      const totalQuery = `
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_revenue,
          AVG(CASE WHEN b.status = 'confirmed' THEN b.total_price END) as avg_price
        FROM bookings b
        INNER JOIN loungers l ON b.lounger_id = l.id
        WHERE b.start_time >= $1 AND b.start_time <= $2
        ${beachFilter}
      `

      const totalResult = await pool.query(totalQuery, values)

      res.json({
        period: { start_date, end_date },
        group_by,
        filters: { beach_id },
        summary: {
          ...totalResult.rows[0],
          total_revenue: parseFloat(totalResult.rows[0].total_revenue || 0),
          avg_price: parseFloat(totalResult.rows[0].avg_price || 0)
        },
        data: result.rows.map(row => ({
          ...row,
          revenue: parseFloat(row.revenue || 0),
          avg_price: parseFloat(row.avg_price || 0)
        }))
      })

    } catch (error) {
      console.error('Ошибка получения отчета по доходам:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Логи административных действий (только для супер-админа)
  static async getAuditLog(req, res) {
    try {
      const { 
        admin_user_id, 
        action, 
        resource_type, 
        start_date, 
        end_date,
        limit = 100,
        offset = 0
      } = req.query

      let query = `
        SELECT al.*, au.name as admin_name, au.email as admin_email
        FROM admin_audit_log al
        INNER JOIN admin_users au ON al.admin_user_id = au.id
        WHERE 1=1
      `

      const values = []

      if (admin_user_id) {
        query += ` AND al.admin_user_id = $${values.length + 1}`
        values.push(admin_user_id)
      }

      if (action) {
        query += ` AND al.action = $${values.length + 1}`
        values.push(action)
      }

      if (resource_type) {
        query += ` AND al.resource_type = $${values.length + 1}`
        values.push(resource_type)
      }

      if (start_date) {
        query += ` AND al.created_at >= $${values.length + 1}`
        values.push(start_date)
      }

      if (end_date) {
        query += ` AND al.created_at <= $${values.length + 1}`
        values.push(end_date)
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
      values.push(limit, offset)

      const result = await pool.query(query, values)

      res.json({
        logs: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      })

    } catch (error) {
      console.error('Ошибка получения логов:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }
}

module.exports = AdminStatsController