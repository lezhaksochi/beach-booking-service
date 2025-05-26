const pool = require('../config/database')

class Lounger {
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        l.id,
        l.beach_id,
        l.name,
        l.type,
        l.row_number,
        l.seat_number,
        l.price_per_hour,
        l.umbrella,
        l.sun_position,
        l.class,
        l.available,
        l.created_at,
        l.updated_at,
        b.name as beach_name,
        b.description as beach_description
      FROM loungers l
      LEFT JOIN beaches b ON l.beach_id = b.id
    `
    
    const conditions = []
    const values = []
    let paramIndex = 1

    if (filters.beach_id) {
      conditions.push(`l.beach_id = $${paramIndex}`)
      values.push(filters.beach_id)
      paramIndex++
    }

    if (filters.type) {
      conditions.push(`l.type = $${paramIndex}`)
      values.push(filters.type)
      paramIndex++
    }

    if (filters.available !== undefined) {
      conditions.push(`l.available = $${paramIndex}`)
      values.push(filters.available)
      paramIndex++
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY l.row_number ASC, l.seat_number ASC`
    
    const result = await pool.query(query, values)
    return result.rows
  }

  static async findById(id) {
    const query = `
      SELECT 
        l.id,
        l.beach_id,
        l.name,
        l.type,
        l.row_number,
        l.seat_number,
        l.price_per_hour,
        l.umbrella,
        l.sun_position,
        l.class,
        l.available,
        l.created_at,
        l.updated_at,
        b.name as beach_name,
        b.description as beach_description
      FROM loungers l
      LEFT JOIN beaches b ON l.beach_id = b.id
      WHERE l.id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async checkAvailability(loungerId, startTime, endTime) {
    const query = `
      SELECT COUNT(*) 
      FROM bookings 
      WHERE lounger_id = $1 
        AND status IN ('confirmed', 'pending')
        AND (
          (start_time <= $2 AND end_time > $2) OR
          (start_time < $3 AND end_time >= $3) OR
          (start_time >= $2 AND end_time <= $3)
        )
    `
    
    const result = await pool.query(query, [loungerId, startTime, endTime])
    const conflictCount = parseInt(result.rows[0].count)
    
    return conflictCount === 0
  }

  // Проверяет есть ли активные бронирования для шезлонга в будущем
  static async hasActiveBookings(loungerId) {
    const query = `
      SELECT COUNT(*) 
      FROM bookings 
      WHERE lounger_id = $1 
        AND status IN ('confirmed', 'pending')
        AND end_time > NOW()
    `
    
    const result = await pool.query(query, [loungerId])
    const activeCount = parseInt(result.rows[0].count)
    
    return activeCount > 0
  }

  // Обновляет доступность шезлонга на основе активных бронирований
  static async updateAvailability(loungerId) {
    const hasActiveBookings = await this.hasActiveBookings(loungerId)
    const available = !hasActiveBookings
    
    await this.update(loungerId, { available })
    return available
  }

  static async create(loungerData) {
    const {
      beach_id,
      name,
      type,
      row_number,
      seat_number,
      price_per_hour,
      umbrella,
      sun_position,
      class: loungerClass
    } = loungerData

    const query = `
      INSERT INTO loungers (
        beach_id, name, type, row_number, seat_number,
        price_per_hour, umbrella, sun_position, class
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `
    
    const result = await pool.query(query, [
      beach_id, name, type, row_number, seat_number,
      price_per_hour, umbrella, sun_position, loungerClass
    ])
    
    return result.rows[0]
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
      UPDATE loungers 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  static async delete(id) {
    const query = 'DELETE FROM loungers WHERE id = $1 RETURNING *'
    const result = await pool.query(query, [id])
    return result.rows[0]
  }
}

module.exports = Lounger