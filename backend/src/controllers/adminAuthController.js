const jwt = require('jsonwebtoken')
const AdminUser = require('../models/AdminUser')
const Logger = require('../utils/logger')

class AdminAuthController {
  // Вход в админ-панель
  static async login(req, res) {
    try {
      Logger.debug('ADMIN LOGIN', 'Запрос на вход', {
        method: req.method,
        url: req.url,
        body: req.body ? { email: req.body.email, password: req.body.password ? '[СКРЫТ]' : 'НЕТ' } : 'НЕТ ТЕЛА',
        headers: {
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent']
        }
      })

      const { email, password } = req.body

      if (!email || !password) {
        Logger.warn('ADMIN LOGIN', 'Отсутствуют учетные данные')
        return res.status(400).json({
          error: 'Email и пароль обязательны',
          code: 'MISSING_CREDENTIALS'
        })
      }

      Logger.debug('ADMIN LOGIN', `Поиск админа по email: ${email}`)

      // Поиск админа по email
      const admin = await AdminUser.findByEmail(email)
      
      if (!admin) {
        Logger.security('ADMIN LOGIN', `Неудачная попытка входа - админ не найден`, { email, ip: req.ip })
        return res.status(401).json({
          error: 'Неверный email или пароль',
          code: 'INVALID_CREDENTIALS'
        })
      }

      Logger.debug('ADMIN LOGIN', 'Админ найден', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        is_active: admin.is_active
      })

      // Проверка пароля
      Logger.debug('ADMIN LOGIN', 'Проверка пароля...')
      const isValidPassword = await AdminUser.verifyPassword(password, admin.password_hash)
      
      if (!isValidPassword) {
        Logger.security('ADMIN LOGIN', `Неудачная попытка входа - неверный пароль`, { email, ip: req.ip })
        return res.status(401).json({
          error: 'Неверный email или пароль',
          code: 'INVALID_CREDENTIALS'
        })
      }

      Logger.debug('ADMIN LOGIN', 'Пароль корректен')

      // Обновление времени последнего входа
      Logger.debug('ADMIN LOGIN', 'Обновление времени последнего входа...')
      await AdminUser.updateLastLogin(admin.id)

      // Генерация JWT токена
      Logger.debug('ADMIN LOGIN', 'Генерация JWT токена...')
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
      Logger.debug('ADMIN LOGIN', `JWT_SECRET доступен: ${!!process.env.JWT_SECRET}`)
      
      const token = jwt.sign(
        { 
          userId: admin.id, 
          email: admin.email,
          role: admin.role,
          isAdmin: true
        },
        jwtSecret,
        { expiresIn: '8h' }
      )

      Logger.debug('ADMIN LOGIN', `JWT токен создан, длина: ${token.length}`)

      // Получение доступных пляжей
      Logger.debug('ADMIN LOGIN', 'Получение доступных пляжей...')
      const accessibleBeaches = await AdminUser.getAccessibleBeaches(admin.id)
      
      Logger.debug('ADMIN LOGIN', `Найдено пляжей: ${accessibleBeaches.length}`)

      const response = {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          phone: admin.phone,
          role: admin.role,
          last_login: admin.last_login
        },
        beaches: accessibleBeaches
      }

      Logger.success('ADMIN LOGIN', `Успешная авторизация для: ${admin.email}`)
      Logger.security('ADMIN LOGIN', `Успешный вход в систему`, { email: admin.email, role: admin.role, ip: req.ip })

      res.json(response)

    } catch (error) {
      Logger.error('ADMIN LOGIN', 'Критическая ошибка входа в админ-панель', error, { 
        body: req.body,
        ip: req.ip 
      })
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение информации о текущем админе
  static async getProfile(req, res) {
    try {
      const admin = req.admin
      const accessibleBeaches = await AdminUser.getAccessibleBeaches(admin.id)

      res.json({
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          phone: admin.phone,
          role: admin.role,
          last_login: admin.last_login,
          created_at: admin.created_at
        },
        beaches: accessibleBeaches
      })

    } catch (error) {
      console.error('Ошибка получения профиля:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Обновление профиля админа
  static async updateProfile(req, res) {
    try {
      const { name, phone } = req.body
      const adminId = req.admin.id

      const pool = require('../config/database')
      
      const query = `
        UPDATE admin_users 
        SET name = COALESCE($1, name), 
            phone = COALESCE($2, phone),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, email, name, phone, role, last_login, created_at
      `

      const result = await pool.query(query, [name, phone, adminId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Администратор не найден',
          code: 'ADMIN_NOT_FOUND'
        })
      }

      res.json({
        message: 'Профиль обновлен',
        admin: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка обновления профиля:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Смена пароля
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body
      const adminId = req.admin.id

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Текущий и новый пароль обязательны',
          code: 'MISSING_PASSWORDS'
        })
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Новый пароль должен содержать минимум 6 символов',
          code: 'PASSWORD_TOO_SHORT'
        })
      }

      // Получение текущего хеша пароля
      const admin = await AdminUser.findByEmail(req.admin.email)
      
      // Проверка текущего пароля
      const isValidPassword = await AdminUser.verifyPassword(currentPassword, admin.password_hash)
      
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Неверный текущий пароль',
          code: 'INVALID_CURRENT_PASSWORD'
        })
      }

      // Хеширование нового пароля
      const bcrypt = require('bcryptjs')
      const newPasswordHash = await bcrypt.hash(newPassword, 12)

      // Обновление пароля
      const pool = require('../config/database')
      const query = `
        UPDATE admin_users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `

      await pool.query(query, [newPasswordHash, adminId])

      res.json({
        message: 'Пароль успешно изменен'
      })

    } catch (error) {
      console.error('Ошибка смены пароля:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Проверка токена
  static async verifyToken(req, res) {
    try {
      res.json({
        valid: true,
        admin: {
          id: req.admin.id,
          email: req.admin.email,
          name: req.admin.name,
          role: req.admin.role
        }
      })
    } catch (error) {
      res.status(401).json({
        valid: false,
        error: 'Неверный токен'
      })
    }
  }
}

module.exports = AdminAuthController