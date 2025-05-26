const pool = require('../config/database')
const bcrypt = require('bcryptjs')
const Logger = require('../utils/logger')

class AdminUser {
  static async create(userData) {
    const { email, password, name, phone, role, created_by } = userData
    
    // Хеширование пароля
    const password_hash = await bcrypt.hash(password, 12)
    
    const query = `
      INSERT INTO admin_users (email, password_hash, name, phone, role, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, phone, role, is_active, created_at
    `
    
    const values = [email, password_hash, name, phone, role, created_by]
    const result = await pool.query(query, values)
    
    return result.rows[0]
  }

  static async findByEmail(email) {
    try {
      Logger.debug('AdminUser.findByEmail', `Поиск админа по email: ${email}`)
      
      const query = `
        SELECT id, email, password_hash, first_name, last_name, role, is_active, 
               last_login, created_at
        FROM admin_users 
        WHERE email = $1 AND is_active = true
      `
      
      const result = await pool.query(query, [email])
      Logger.debug('AdminUser.findByEmail', 'Результат запроса', {
        email,
        found: result.rows.length > 0,
        rowCount: result.rows.length
      })
      
      return result.rows[0]
    } catch (error) {
      Logger.error('AdminUser.findByEmail', 'Ошибка поиска админа', error, { email })
      throw error
    }
  }

  static async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, role, is_active, 
             last_login, created_at
      FROM admin_users 
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0]
  }

  static async updateLastLogin(id) {
    const query = `
      UPDATE admin_users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `
    
    await pool.query(query, [id])
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      Logger.debug('AdminUser.verifyPassword', 'Проверка пароля', {
        hasPlainPassword: !!plainPassword,
        plainPasswordLength: plainPassword ? plainPassword.length : 0,
        hasHashedPassword: !!hashedPassword,
        hashedPasswordLength: hashedPassword ? hashedPassword.length : 0,
        hashFormat: hashedPassword ? hashedPassword.substring(0, 7) : 'НЕТ'
      })
      
      const result = await bcrypt.compare(plainPassword, hashedPassword)
      
      Logger.debug('AdminUser.verifyPassword', `Результат проверки: ${result}`)
      return result
    } catch (error) {
      Logger.error('AdminUser.verifyPassword', 'Ошибка проверки пароля', error)
      throw error
    }
  }

  static async getAccessibleBeaches(adminUserId) {
    const query = `
      SELECT DISTINCT b.id, b.name, b.description, b.location_lat, b.location_lng,
             b.image_url, b.amenities, ba.granted_at,
             b.created_at, b.updated_at
      FROM beaches b
      INNER JOIN beach_access ba ON b.id = ba.beach_id
      WHERE ba.admin_user_id = $1
      ORDER BY b.name
    `
    
    const result = await pool.query(query, [adminUserId])
    return result.rows
  }

  static async hasAccessToBeach(adminUserId, beachId) {
    const query = `
      SELECT 1 FROM beach_access 
      WHERE admin_user_id = $1 AND beach_id = $2
    `
    
    const result = await pool.query(query, [adminUserId, beachId])
    return result.rows.length > 0
  }

  static async getUsersByRole(role, createdBy = null) {
    let query = `
      SELECT id, email, name, phone, role, is_active, 
             last_login, created_at
      FROM admin_users 
      WHERE role = $1
    `
    
    const values = [role]
    
    if (createdBy) {
      query += ` AND created_by = $2`
      values.push(createdBy)
    }
    
    query += ` ORDER BY created_at DESC`
    
    const result = await pool.query(query, values)
    return result.rows
  }

  static async grantBeachAccess(adminUserId, beachId, grantedBy) {
    const query = `
      INSERT INTO beach_access (admin_user_id, beach_id, granted_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (admin_user_id, beach_id) DO NOTHING
      RETURNING *
    `
    
    const result = await pool.query(query, [adminUserId, beachId, grantedBy])
    return result.rows[0]
  }

  static async revokeBeachAccess(adminUserId, beachId) {
    const query = `
      DELETE FROM beach_access 
      WHERE admin_user_id = $1 AND beach_id = $2
    `
    
    await pool.query(query, [adminUserId, beachId])
  }

  static async deactivate(id) {
    const query = `
      UPDATE admin_users 
      SET is_active = false 
      WHERE id = $1
    `
    
    await pool.query(query, [id])
  }

  static async getCreatedBeaches(adminUserId) {
    const query = `
      SELECT id, name, description, location_lat, location_lng,
             image_url, amenities, created_at, updated_at
      FROM beaches 
      ORDER BY created_at DESC
    `
    
    const result = await pool.query(query)
    return result.rows
  }

  static async canManageUser(managerId, targetUserId) {
    // Супер-админ может управлять всеми
    const managerQuery = `
      SELECT role FROM admin_users WHERE id = $1
    `
    const managerResult = await pool.query(managerQuery, [managerId])
    
    if (!managerResult.rows[0]) return false
    
    const managerRole = managerResult.rows[0].role
    
    if (managerRole === 'super_admin') return true
    
    // Админ пляжа может управлять только созданными им модераторами
    if (managerRole === 'beach_admin') {
      const targetQuery = `
        SELECT created_by, role FROM admin_users WHERE id = $1
      `
      const targetResult = await pool.query(targetQuery, [targetUserId])
      
      if (!targetResult.rows[0]) return false
      
      const target = targetResult.rows[0]
      return target.created_by === managerId && target.role === 'moderator'
    }
    
    return false
  }
}

module.exports = AdminUser