const AdminUser = require('../models/AdminUser')
const bcrypt = require('bcryptjs')
const pool = require('../config/database')

class AdminUserController {
  // Получение списка пользователей
  static async getUsers(req, res) {
    try {
      const admin = req.admin
      const { role } = req.query

      let users = []

      if (admin.role === 'super_admin') {
        // Супер-админ видит всех
        const query = role ? 
          `SELECT id, email, name, phone, role, is_active, last_login, created_at 
           FROM admin_users WHERE role = $1 ORDER BY created_at DESC` :
          `SELECT id, email, name, phone, role, is_active, last_login, created_at 
           FROM admin_users ORDER BY role, created_at DESC`
        
        const pool = require('../config/database')
        const result = role ? 
          await pool.query(query, [role]) : 
          await pool.query(query)
        
        users = result.rows
      } else if (admin.role === 'beach_admin') {
        // Админ пляжа видит только созданных им модераторов
        users = await AdminUser.getUsersByRole('moderator', admin.id)
      }

      res.json({ users })

    } catch (error) {
      console.error('Ошибка получения пользователей:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Создание пользователя
  static async createUser(req, res) {
    try {
      const { email, password, name, phone, role } = req.body
      const admin = req.admin

      // Валидация
      if (!email || !password || !name || !role) {
        return res.status(400).json({
          error: 'Email, пароль, имя и роль обязательны',
          code: 'MISSING_REQUIRED_FIELDS'
        })
      }

      // Проверка прав на создание пользователей с данной ролью
      if (admin.role === 'beach_admin' && role !== 'moderator') {
        return res.status(403).json({
          error: 'Вы можете создавать только модераторов',
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      }

      if (role === 'super_admin' && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Только супер-админ может создавать супер-админов',
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      }

      const userData = {
        email,
        password,
        name,
        phone,
        role,
        created_by: admin.id
      }

      const newUser = await AdminUser.create(userData)

      res.status(201).json({
        message: 'Пользователь создан успешно',
        user: newUser
      })

    } catch (error) {
      console.error('Ошибка создания пользователя:', error)
      
      if (error.constraint === 'admin_users_email_key') {
        return res.status(400).json({
          error: 'Пользователь с таким email уже существует',
          code: 'EMAIL_EXISTS'
        })
      }

      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение пользователя
  static async getUser(req, res) {
    try {
      const { userId } = req.params
      const admin = req.admin

      const user = await AdminUser.findById(userId)

      if (!user) {
        return res.status(404).json({
          error: 'Пользователь не найден',
          code: 'USER_NOT_FOUND'
        })
      }

      // Проверка прав доступа
      const canView = await AdminUser.canManageUser(admin.id, userId)
      
      if (!canView && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет прав на просмотр этого пользователя',
          code: 'NO_VIEW_PERMISSION'
        })
      }

      // Получаем доступные пляжи для пользователя
      const beaches = await AdminUser.getAccessibleBeaches(userId)

      res.json({
        user,
        beaches
      })

    } catch (error) {
      console.error('Ошибка получения пользователя:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Обновление пользователя
  static async updateUser(req, res) {
    try {
      const { userId } = req.params
      const { name, phone, is_active } = req.body
      const admin = req.admin

      const canManage = await AdminUser.canManageUser(admin.id, userId)
      
      if (!canManage && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет прав на управление этим пользователем',
          code: 'NO_MANAGE_PERMISSION'
        })
      }

      const pool = require('../config/database')
      
      const query = `
        UPDATE admin_users 
        SET name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            is_active = COALESCE($3, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, email, name, phone, role, is_active, last_login, created_at
      `

      const result = await pool.query(query, [name, phone, is_active, userId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Пользователь не найден',
          code: 'USER_NOT_FOUND'
        })
      }

      res.json({
        message: 'Пользователь обновлен успешно',
        user: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка обновления пользователя:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Деактивация пользователя
  static async deactivateUser(req, res) {
    try {
      const { userId } = req.params
      const admin = req.admin

      // Нельзя деактивировать самого себя
      if (userId === admin.id) {
        return res.status(400).json({
          error: 'Нельзя деактивировать самого себя',
          code: 'CANNOT_DEACTIVATE_SELF'
        })
      }

      const canManage = await AdminUser.canManageUser(admin.id, userId)
      
      if (!canManage && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет прав на управление этим пользователем',
          code: 'NO_MANAGE_PERMISSION'
        })
      }

      await AdminUser.deactivate(userId)

      res.json({
        message: 'Пользователь деактивирован'
      })

    } catch (error) {
      console.error('Ошибка деактивации пользователя:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение списка обычных пользователей (переопределяем для обычных пользователей)
  static async getUsers(req, res) {
    try {
      // Получаем обычных пользователей из таблицы users
      const query = `
        SELECT id, phone, name, is_active, created_at,
               COALESCE(email, '') as email,
               COALESCE(first_name, SPLIT_PART(name, ' ', 1), '') as first_name,
               COALESCE(last_name, SPLIT_PART(name, ' ', 2), '') as last_name,
               last_login
        FROM users 
        ORDER BY created_at DESC
      `
      
      const result = await pool.query(query)
      res.json(result.rows)

    } catch (error) {
      console.error('Ошибка получения пользователей:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение списка администраторов
  static async getAdminUsers(req, res) {
    try {
      const admin = req.admin
      
      let query
      let params = []
      
      if (admin.role === 'super_admin') {
        query = `
          SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
          FROM admin_users 
          ORDER BY created_at DESC
        `
      } else {
        // Админ пляжа видит только себя и созданных им модераторов
        query = `
          SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
          FROM admin_users 
          WHERE id = $1 OR (role = 'moderator' AND created_by = $1)
          ORDER BY created_at DESC
        `
        params = [admin.id]
      }

      const result = await pool.query(query, params)
      res.json(result.rows)

    } catch (error) {
      console.error('Ошибка получения администраторов:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Создание администратора
  static async createAdminUser(req, res) {
    try {
      const { email, password, first_name, last_name, role } = req.body
      const admin = req.admin

      // Валидация
      if (!email || !password || !first_name || !last_name || !role) {
        return res.status(400).json({
          error: 'Все поля обязательны',
          code: 'MISSING_FIELDS'
        })
      }

      // Проверка прав на создание роли
      if (role === 'super_admin' && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Недостаточно прав для создания супер-администратора',
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      }

      // Хеширование пароля
      const passwordHash = await bcrypt.hash(password, 12)

      // Создание администратора
      const query = `
        INSERT INTO admin_users (email, password_hash, first_name, last_name, role, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, role, is_active, created_at
      `

      const result = await pool.query(query, [
        email, passwordHash, first_name, last_name, role, admin.id
      ])

      res.status(201).json({
        message: 'Администратор создан успешно',
        admin: result.rows[0]
      })

    } catch (error) {
      if (error.code === '23505') { // Уникальное ограничение
        return res.status(400).json({
          error: 'Пользователь с таким email уже существует',
          code: 'EMAIL_EXISTS'
        })
      }
      
      console.error('Ошибка создания администратора:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Обновление статуса обычного пользователя
  static async updateUserStatus(req, res) {
    try {
      const { userId } = req.params
      const { is_active } = req.body

      const query = `
        UPDATE users 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, first_name, last_name, is_active
      `

      const result = await pool.query(query, [is_active, userId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Пользователь не найден',
          code: 'USER_NOT_FOUND'
        })
      }

      res.json({
        message: 'Статус пользователя обновлен',
        user: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка обновления статуса пользователя:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Обновление статуса администратора
  static async updateAdminStatus(req, res) {
    try {
      const { userId } = req.params
      const { is_active } = req.body
      const admin = req.admin

      // Нельзя изменить статус самого себя
      if (userId === admin.id) {
        return res.status(400).json({
          error: 'Нельзя изменить свой собственный статус',
          code: 'CANNOT_MODIFY_SELF'
        })
      }

      const query = `
        UPDATE admin_users 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, first_name, last_name, role, is_active
      `

      const result = await pool.query(query, [is_active, userId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Администратор не найден',
          code: 'ADMIN_NOT_FOUND'
        })
      }

      res.json({
        message: 'Статус администратора обновлен',
        admin: result.rows[0]
      })

    } catch (error) {
      console.error('Ошибка обновления статуса администратора:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }
}

module.exports = AdminUserController