const pool = require('../config/database')

class Beach {
  static async findAll() {
    const query = `
      SELECT 
        id,
        name,
        description,
        location_lat,
        location_lng,
        image_url,
        amenities,
        created_at,
        updated_at
      FROM beaches 
      ORDER BY name ASC
    `
    
    const result = await pool.query(query)
    return result.rows
  }

  static async findById(id) {
    const query = `
      SELECT 
        id,
        name,
        description,
        location_lat,
        location_lng,
        image_url,
        amenities,
        created_at,
        updated_at
      FROM beaches 
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async getLayout(beachId) {
    // Получаем информацию о пляже
    const beach = await this.findById(beachId)
    if (!beach) return null

    // Получаем все шезлонги пляжа с информацией о текущих бронированиях
    const loungerQuery = `
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
        b.id as booking_id,
        b.customer_name,
        b.start_time,
        b.end_time,
        b.status as booking_status
      FROM loungers l
      LEFT JOIN bookings b ON l.id = b.lounger_id 
        AND b.status IN ('confirmed', 'active', 'pending')
        AND b.end_time > CURRENT_TIMESTAMP
        AND b.start_time <= CURRENT_TIMESTAMP + INTERVAL '24 hours'
      WHERE l.beach_id = $1
      ORDER BY l.row_number ASC, l.seat_number ASC
    `
    
    const loungerResult = await pool.query(loungerQuery, [beachId])
    
    // Группируем бронирования по шезлонгам
    const loungerMap = new Map()
    
    loungerResult.rows.forEach(row => {
      const loungerId = row.id
      
      if (!loungerMap.has(loungerId)) {
        loungerMap.set(loungerId, {
          id: row.id,
          beach_id: row.beach_id,
          name: row.name,
          type: row.type,
          row_number: row.row_number,
          seat_number: row.seat_number,
          price_per_hour: row.price_per_hour,
          umbrella: row.umbrella,
          sun_position: row.sun_position,
          class: row.class,
          available: row.available,
          created_at: row.created_at,
          updated_at: row.updated_at,
          current_bookings: []
        })
      }
      
      // Добавляем информацию о бронировании, если оно есть
      if (row.booking_id) {
        loungerMap.get(loungerId).current_bookings.push({
          id: row.booking_id,
          customer_name: row.customer_name,
          start_time: row.start_time,
          end_time: row.end_time,
          status: row.booking_status
        })
      }
    })
    
    const loungers = Array.from(loungerMap.values())

    // Вычисляем максимальные значения для схемы
    const maxRows = Math.max(...loungers.map(l => l.row_number), 0)
    const maxSeatsPerRow = Math.max(...loungers.map(l => l.seat_number), 0)

    return {
      beach,
      loungers,
      maxRows,
      maxSeatsPerRow
    }
  }

  static async create(beachData) {
    const {
      name,
      description,
      location_lat,
      location_lng,
      image_url,
      amenities
    } = beachData

    const query = `
      INSERT INTO beaches (
        name, description, location_lat, location_lng, image_url, amenities
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `
    
    const result = await pool.query(query, [
      name, description, location_lat, location_lng, image_url, amenities
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
      UPDATE beaches 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0]
  }

  static async delete(id) {
    const query = 'DELETE FROM beaches WHERE id = $1 RETURNING *'
    const result = await pool.query(query, [id])
    return result.rows[0]
  }
}

module.exports = Beach