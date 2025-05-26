const pool = require('../config/database')
const bcrypt = require('bcryptjs')

class User {
  static async create(userData) {
    const { phone, password, name } = userData

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const query = `
      INSERT INTO users (phone, password, name)
      VALUES ($1, $2, $3)
      RETURNING id, phone, name, created_at, updated_at
    `
    
    const result = await pool.query(query, [phone, hashedPassword, name])
    return result.rows[0]
  }

  static async findByPhone(phone) {
    const query = `
      SELECT id, phone, name, password, created_at, updated_at
      FROM users
      WHERE phone = $1
    `
    
    const result = await pool.query(query, [phone])
    return result.rows[0] || null
  }

  static async findById(id) {
    const query = `
      SELECT id, phone, name, created_at, updated_at
      FROM users
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }

  static async update(id, updates) {
    const fields = []
    const values = []
    let paramIndex = 1

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        if (key === 'password') {
          // Hash new password
          const saltRounds = 10
          updates[key] = bcrypt.hashSync(updates[key], saltRounds)
        }
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
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, phone, name, created_at, updated_at
    `

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *'
    const result = await pool.query(query, [id])
    return result.rows[0]
  }

  static async getUserBookings(userId, status = null) {
    let query = `
      SELECT 
        b.*,
        l.name as lounger_name,
        l.type as lounger_type,
        l.row_number,
        l.seat_number,
        l.class as lounger_class,
        l.umbrella,
        l.sun_position,
        bch.name as beach_name,
        bch.description as beach_description
      FROM bookings b
      JOIN loungers l ON b.lounger_id = l.id
      JOIN beaches bch ON l.beach_id = bch.id
      WHERE b.user_id = $1
    `
    
    const values = [userId]
    
    if (status) {
      query += ` AND b.status = $2`
      values.push(status)
    }
    
    query += ` ORDER BY b.start_time DESC`

    const result = await pool.query(query, values)
    return result.rows
  }
}

module.exports = User