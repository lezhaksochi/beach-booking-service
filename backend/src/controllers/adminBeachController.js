const pool = require('../config/database')
const AdminUser = require('../models/AdminUser')
const AdminBeach = require('../models/AdminBeach')

class AdminBeachController {
  // Получение списка пляжей с учетом прав доступа
  static async getBeaches(req, res) {
    try {
      const admin = req.admin
      
      // Для супер-админа - все пляжи, для остальных - доступные через beach_access
      let query, params = []
      
      if (admin.role === 'super_admin') {
        query = `
          SELECT b.*, 
                 COUNT(l.id) as loungers_count,
                 COUNT(CASE WHEN l.available = true THEN 1 END) as available_loungers
          FROM beaches b
          LEFT JOIN loungers l ON b.id = l.beach_id
          GROUP BY b.id
          ORDER BY b.created_at DESC
        `
      } else {
        query = `
          SELECT b.*, 
                 COUNT(l.id) as loungers_count,
                 COUNT(CASE WHEN l.available = true THEN 1 END) as available_loungers
          FROM beaches b
          INNER JOIN beach_access ba ON b.id = ba.beach_id
          LEFT JOIN loungers l ON b.id = l.beach_id
          WHERE ba.admin_user_id = $1
          GROUP BY b.id
          ORDER BY b.created_at DESC
        `
        params = [admin.id]
      }

      const result = await pool.query(query, params)
      
      res.json(result.rows)

    } catch (error) {
      console.error('Ошибка получения пляжей:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение конкретного пляжа
  static async getBeach(req, res) {
    try {
      const { beachId } = req.params
      const beach = await AdminBeach.findById(beachId)

      if (!beach) {
        return res.status(404).json({
          error: 'Пляж не найден',
          code: 'BEACH_NOT_FOUND'
        })
      }

      // Получаем сегодняшние бронирования
      const todayBookings = await AdminBeach.getTodayBookings(beachId)

      res.json({
        beach,
        todayBookings
      })

    } catch (error) {
      console.error('Ошибка получения пляжа:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Создание нового пляжа
  static async createBeach(req, res) {
    try {
      const admin = req.admin
      const beachData = req.body

      // Валидация обязательных полей
      const requiredFields = ['name', 'location_lat', 'location_lng']
      for (const field of requiredFields) {
        if (!beachData[field]) {
          return res.status(400).json({
            error: `Поле "${field}" обязательно`,
            code: 'MISSING_REQUIRED_FIELD',
            field
          })
        }
      }

      // Проверка уникальности названия
      const pool = require('../config/database')
      const existingBeach = await pool.query(
        'SELECT id FROM beaches WHERE name = $1', 
        [beachData.name]
      )

      if (existingBeach.rows.length > 0) {
        return res.status(400).json({
          error: 'Пляж с таким названием уже существует',
          code: 'BEACH_NAME_EXISTS'
        })
      }

      // Создание пляжа
      const createQuery = `
        INSERT INTO beaches (name, description, location_lat, location_lng, image_url, amenities, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      
      const values = [
        beachData.name,
        beachData.description || '',
        beachData.location_lat,
        beachData.location_lng,
        beachData.image_url || '',
        beachData.amenities || [],
        admin.id
      ]
      
      const result = await pool.query(createQuery, values)
      const beach = result.rows[0]

      res.status(201).json({
        message: 'Пляж создан успешно',
        beach
      })

    } catch (error) {
      console.error('Ошибка создания пляжа:', error)
      
      if (error.constraint === 'beaches_name_key') {
        return res.status(400).json({
          error: 'Пляж с таким названием уже существует',
          code: 'BEACH_NAME_EXISTS'
        })
      }

      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Обновление пляжа
  static async updateBeach(req, res) {
    try {
      const { beachId } = req.params
      const admin = req.admin
      const updateData = req.body

      // Проверка прав на управление пляжем
      const canManage = await AdminBeach.canManageBeach(admin.id, beachId, admin.role)
      
      if (!canManage) {
        return res.status(403).json({
          error: 'Нет прав на управление этим пляжем',
          code: 'NO_MANAGE_PERMISSION'
        })
      }

      // Сохраняем старые данные для логирования
      const oldBeach = await AdminBeach.findById(beachId)
      req.originalData = oldBeach

      const updatedBeach = await AdminBeach.update(beachId, updateData)

      if (!updatedBeach) {
        return res.status(404).json({
          error: 'Пляж не найден',
          code: 'BEACH_NOT_FOUND'
        })
      }

      res.json({
        message: 'Пляж обновлен успешно',
        beach: updatedBeach
      })

    } catch (error) {
      console.error('Ошибка обновления пляжа:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Удаление пляжа
  static async deleteBeach(req, res) {
    try {
      const { beachId } = req.params
      const admin = req.admin

      // Проверка прав на управление пляжем
      const canManage = await AdminBeach.canManageBeach(admin.id, beachId, admin.role)
      
      if (!canManage) {
        return res.status(403).json({
          error: 'Нет прав на управление этим пляжем',
          code: 'NO_MANAGE_PERMISSION'
        })
      }

      const deletedBeach = await AdminBeach.delete(beachId)

      if (!deletedBeach) {
        return res.status(404).json({
          error: 'Пляж не найден',
          code: 'BEACH_NOT_FOUND'
        })
      }

      res.json({
        message: 'Пляж удален успешно',
        beach: deletedBeach
      })

    } catch (error) {
      console.error('Ошибка удаления пляжа:', error)

      if (error.message.includes('активных бронирований')) {
        return res.status(400).json({
          error: error.message,
          code: 'HAS_ACTIVE_BOOKINGS'
        })
      }

      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение пользователей пляжа
  static async getBeachUsers(req, res) {
    try {
      const { beachId } = req.params
      const users = await AdminBeach.getBeachUsers(beachId)

      res.json({
        users
      })

    } catch (error) {
      console.error('Ошибка получения пользователей пляжа:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Предоставление доступа к пляжу
  static async grantBeachAccess(req, res) {
    try {
      const { beachId } = req.params
      const { userId } = req.body
      const admin = req.admin

      if (!userId) {
        return res.status(400).json({
          error: 'ID пользователя обязателен',
          code: 'USER_ID_REQUIRED'
        })
      }

      // Проверяем, что пользователь существует
      const user = await AdminUser.findById(userId)
      if (!user) {
        return res.status(404).json({
          error: 'Пользователь не найден',
          code: 'USER_NOT_FOUND'
        })
      }

      // Проверяем права на управление пользователем
      const canManage = await AdminUser.canManageUser(admin.id, userId)
      
      if (!canManage && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет прав на управление этим пользователем',
          code: 'NO_USER_MANAGE_PERMISSION'
        })
      }

      const access = await AdminBeach.grantAccess(userId, beachId, admin.id)

      res.json({
        message: 'Доступ к пляжу предоставлен',
        access
      })

    } catch (error) {
      console.error('Ошибка предоставления доступа:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Отзыв доступа к пляжу
  static async revokeBeachAccess(req, res) {
    try {
      const { beachId, userId } = req.params
      const admin = req.admin

      // Проверяем права на управление пользователем
      const canManage = await AdminUser.canManageUser(admin.id, userId)
      
      if (!canManage && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Нет прав на управление этим пользователем',
          code: 'NO_USER_MANAGE_PERMISSION'
        })
      }

      const revokedAccess = await AdminBeach.revokeAccess(userId, beachId)

      if (!revokedAccess) {
        return res.status(404).json({
          error: 'Доступ не найден',
          code: 'ACCESS_NOT_FOUND'
        })
      }

      res.json({
        message: 'Доступ к пляжу отозван',
        access: revokedAccess
      })

    } catch (error) {
      console.error('Ошибка отзыва доступа:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }
}

module.exports = AdminBeachController