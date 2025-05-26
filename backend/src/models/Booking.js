const pool = require('../config/database')

class Booking {
  static async create(bookingData) {
    const {
      lounger_id,
      user_id,
      customer_name,
      customer_phone,
      customer_email,
      start_time,
      end_time,
      total_price
    } = bookingData

    const query = `
      INSERT INTO bookings (
        lounger_id, user_id, customer_name, customer_phone, customer_email,
        start_time, end_time, total_price, status, simple_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, generate_simple_code())
      RETURNING *
    `
    
    const result = await pool.query(query, [
      lounger_id, user_id, customer_name, customer_phone, customer_email,
      start_time, end_time, total_price, 'confirmed'
    ])
    
    return result.rows[0]
  }

  static async findById(id) {
    const query = `
      SELECT 
        b.*,
        l.name as lounger_name,
        l.type as lounger_type,
        l.row_number,
        l.seat_number,
        l.class as lounger_class,
        l.umbrella,
        l.sun_position,
        beaches.name as beach_name,
        beaches.description as beach_description
      FROM bookings b
      LEFT JOIN loungers l ON b.lounger_id = l.id
      LEFT JOIN beaches ON l.beach_id = beaches.id
      WHERE b.id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        b.*,
        l.name as lounger_name,
        l.beach_name
      FROM bookings b
      LEFT JOIN loungers l ON b.lounger_id = l.id
    `
    
    const conditions = []
    const values = []
    let paramIndex = 1

    if (filters.lounger_id) {
      conditions.push(`b.lounger_id = $${paramIndex}`)
      values.push(filters.lounger_id)
      paramIndex++
    }

    if (filters.status) {
      conditions.push(`b.status = $${paramIndex}`)
      values.push(filters.status)
      paramIndex++
    }

    if (filters.customer_email) {
      conditions.push(`b.customer_email = $${paramIndex}`)
      values.push(filters.customer_email)
      paramIndex++
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY b.created_at DESC`

    const result = await pool.query(query, values)
    return result.rows
  }

  static async update(id, updates) {
    const fields = []
    const values = []
    let paramIndex = 1

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`)
        values.push(updates[key])
        paramIndex++
      }
    })

    if (fields.length === 0) {
      throw new Error('Нет полей для обновления')
    }

    values.push(id)
    const query = `
      UPDATE bookings 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  static async cancel(id, cancelledBy = null) {
    const query = `
      UPDATE bookings 
      SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $2
      WHERE id = $1 AND status IN ('confirmed', 'pending')
      RETURNING *
    `
    
    const result = await pool.query(query, [id, cancelledBy])
    return result.rows[0]
  }

  static async delete(id) {
    const query = 'DELETE FROM bookings WHERE id = $1 RETURNING *'
    const result = await pool.query(query, [id])
    return result.rows[0]
  }

  // Автоматически обновляет статусы завершенных бронирований
  static async updateExpiredBookings() {
    const query = `
      UPDATE bookings 
      SET status = 'completed'
      WHERE status IN ('confirmed', 'pending') 
        AND end_time <= NOW()
      RETURNING id, status, end_time
    `
    
    const result = await pool.query(query)
    return result.rows
  }

  static async getActiveBookingsForLounger(loungerId) {
    const query = `
      SELECT * FROM bookings 
      WHERE lounger_id = $1 AND status = 'active'
      ORDER BY start_time ASC
    `
    
    const result = await pool.query(query, [loungerId])
    return result.rows
  }

  // Получение простого кода для бронирования
  static async getSimpleCode(id) {
    const query = `SELECT simple_code FROM bookings WHERE id = $1`
    const result = await pool.query(query, [id])
    return result.rows[0]?.simple_code || null
  }

  // Поиск бронирования по простому коду
  static async findBySimpleCode(simpleCode) {
    const query = `
      SELECT 
        b.*,
        l.name as lounger_name,
        l.type as lounger_type,
        l.row_number,
        l.seat_number,
        l.class as lounger_class,
        l.umbrella,
        l.sun_position,
        beaches.name as beach_name,
        beaches.description as beach_description
      FROM bookings b
      LEFT JOIN loungers l ON b.lounger_id = l.id
      LEFT JOIN beaches ON l.beach_id = beaches.id
      WHERE b.simple_code = $1
      AND b.status IN ('confirmed', 'pending')
      AND b.end_time > NOW()
    `
    
    const result = await pool.query(query, [simpleCode])
    return result.rows[0] || null
  }

  // Отметка использования простого кода
  static async markCodeUsed(id, usedBy) {
    const query = `
      UPDATE bookings 
      SET qr_used_at = NOW(), checked_in_by = $2
      WHERE id = $1 AND qr_used_at IS NULL
      RETURNING *
    `
    
    const result = await pool.query(query, [id, usedBy])
    return result.rows[0]
  }
}

module.exports = Booking