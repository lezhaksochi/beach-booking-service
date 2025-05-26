const pool = require('../config/database')

class AdminBeach {
  static async create(beachData, createdBy) {
    const { 
      name, description, location_lat, location_lng, 
      image_url, amenities, contact_phone, contact_email, 
      working_hours 
    } = beachData
    
    const query = `
      INSERT INTO beaches (
        name, description, location_lat, location_lng, image_url, 
        amenities, contact_phone, contact_email, working_hours, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `
    
    const values = [
      name, description, location_lat, location_lng, image_url,
      amenities, contact_phone, contact_email, working_hours, createdBy
    ]
    
    const result = await pool.query(query, values)
    const beach = result.rows[0]
    
    // Автоматически предоставляем доступ создателю
    await this.grantAccess(createdBy, beach.id, createdBy)
    
    return beach
  }

  static async findById(id) {
    const query = `
      SELECT b.*, 
             CONCAT(au.first_name, ' ', au.last_name) as creator_name,
             COUNT(l.id) as loungers_count,
             COUNT(CASE WHEN l.available = true THEN 1 END) as available_loungers
      FROM beaches b
      LEFT JOIN admin_users au ON b.created_by = au.id
      LEFT JOIN loungers l ON b.id = l.beach_id
      WHERE b.id = $1
      GROUP BY b.id, au.first_name, au.last_name
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0]
  }

  static async getAccessibleBeaches(adminId, role) {
    let query
    let values = []

    if (role === 'super_admin') {
      // Супер-админ видит все пляжи
      query = `
        SELECT b.*, 
               au.name as creator_name,
               COUNT(l.id) as loungers_count,
               COUNT(CASE WHEN l.available = true THEN 1 END) as available_loungers
        FROM beaches b
        LEFT JOIN admin_users au ON b.created_by = au.id
        LEFT JOIN loungers l ON b.id = l.beach_id
        GROUP BY b.id, au.name
        ORDER BY b.created_at DESC
      `
    } else {
      // Админы и модераторы видят только доступные им пляжи
      query = `
        SELECT DISTINCT b.*, 
               au.name as creator_name,
               COUNT(l.id) as loungers_count,
               COUNT(CASE WHEN l.available = true THEN 1 END) as available_loungers,
               ba.granted_at
        FROM beaches b
        INNER JOIN beach_access ba ON b.id = ba.beach_id
        LEFT JOIN admin_users au ON b.created_by = au.id
        LEFT JOIN loungers l ON b.id = l.beach_id
        WHERE ba.admin_user_id = $1
        GROUP BY b.id, au.name, ba.granted_at
        ORDER BY b.created_at DESC
      `
      values = [adminId]
    }
    
    const result = await pool.query(query, values)
    return result.rows
  }

  static async update(id, beachData) {
    const { 
      name, description, location_lat, location_lng, 
      image_url, amenities, is_active 
    } = beachData
    
    const query = `
      UPDATE beaches 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          location_lat = COALESCE($3, location_lat),
          location_lng = COALESCE($4, location_lng),
          image_url = COALESCE($5, image_url),
          amenities = COALESCE($6, amenities),
          is_active = COALESCE($7, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `
    
    const values = [
      name, description, location_lat, location_lng, image_url,
      amenities, is_active, id
    ]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  static async delete(id) {
    // Проверяем, есть ли активные бронирования
    const bookingsQuery = `
      SELECT COUNT(*) as count 
      FROM bookings b
      INNER JOIN loungers l ON b.lounger_id = l.id
      WHERE l.beach_id = $1 AND b.status IN ('confirmed', 'pending')
    `
    
    const bookingsResult = await pool.query(bookingsQuery, [id])
    const activeBookings = parseInt(bookingsResult.rows[0].count)
    
    if (activeBookings > 0) {
      throw new Error(`Невозможно удалить пляж: найдено ${activeBookings} активных бронирований`)
    }

    // Удаляем пляж (каскадно удалятся шезлонги и доступы)
    const query = `DELETE FROM beaches WHERE id = $1 RETURNING *`
    const result = await pool.query(query, [id])
    
    return result.rows[0]
  }

  static async grantAccess(adminUserId, beachId, grantedBy) {
    const query = `
      INSERT INTO beach_access (admin_user_id, beach_id, granted_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (admin_user_id, beach_id) DO NOTHING
      RETURNING *
    `
    
    const result = await pool.query(query, [adminUserId, beachId, grantedBy])
    return result.rows[0]
  }

  static async revokeAccess(adminUserId, beachId) {
    const query = `
      DELETE FROM beach_access 
      WHERE admin_user_id = $1 AND beach_id = $2
      RETURNING *
    `
    
    const result = await pool.query(query, [adminUserId, beachId])
    return result.rows[0]
  }

  static async getBeachUsers(beachId) {
    const query = `
      SELECT au.id, au.email, au.name, au.phone, au.role, 
             au.is_active, ba.granted_at, granter.name as granted_by_name
      FROM admin_users au
      INNER JOIN beach_access ba ON au.id = ba.admin_user_id
      LEFT JOIN admin_users granter ON ba.granted_by = granter.id
      WHERE ba.beach_id = $1
      ORDER BY au.role, au.name
    `
    
    const result = await pool.query(query, [beachId])
    return result.rows
  }

  static async getBeachStats(beachId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
        SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_revenue,
        AVG(b.total_price) as avg_booking_price,
        COUNT(DISTINCT DATE(b.created_at)) as booking_days
      FROM bookings b
      INNER JOIN loungers l ON b.lounger_id = l.id
      WHERE l.beach_id = $1 
        AND b.created_at >= $2 
        AND b.created_at <= $3
    `
    
    const result = await pool.query(query, [beachId, startDate, endDate])
    return result.rows[0]
  }

  static async getTodayBookings(beachId) {
    const query = `
      SELECT b.*, l.name as lounger_name, l.row_number, l.seat_number,
             qs.client_arrived, qs.scan_result, qs.scanned_at
      FROM bookings b
      INNER JOIN loungers l ON b.lounger_id = l.id
      LEFT JOIN qr_scans qs ON b.id = qs.booking_id
      WHERE l.beach_id = $1 
        AND DATE(b.start_time) = CURRENT_DATE
      ORDER BY b.start_time
    `
    
    const result = await pool.query(query, [beachId])
    return result.rows
  }

  static async canManageBeach(adminId, beachId, role) {
    if (role === 'super_admin') {
      return true
    }

    // Проверяем, создал ли админ этот пляж
    const query = `
      SELECT created_by FROM beaches WHERE id = $1
    `
    
    const result = await pool.query(query, [beachId])
    
    if (!result.rows[0]) {
      return false
    }

    return result.rows[0].created_by === adminId
  }
}

module.exports = AdminBeach