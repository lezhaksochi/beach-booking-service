const jwt = require('jsonwebtoken')
const AdminUser = require('../models/AdminUser')

// Проверка JWT токена для админов
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Нет токена авторизации',
        code: 'NO_TOKEN'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    
    // Проверяем, что это админский токен
    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        error: 'Недостаточно прав доступа',
        code: 'NOT_ADMIN'
      })
    }

    const admin = await AdminUser.findById(decoded.userId)
    
    if (!admin || !admin.is_active) {
      return res.status(401).json({ 
        error: 'Неверный токен или пользователь деактивирован',
        code: 'INVALID_USER'
      })
    }

    req.admin = admin
    next()
  } catch (error) {
    console.error('Ошибка авторизации админа:', error)
    res.status(401).json({ 
      error: 'Неверный токен',
      code: 'INVALID_TOKEN'
    })
  }
}

// Проверка роли администратора
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ 
        error: 'Пользователь не авторизован',
        code: 'UNAUTHORIZED'
      })
    }

    const userRole = req.admin.role
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Недостаточно прав для выполнения этого действия',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      })
    }

    next()
  }
}

// Проверка доступа к пляжу
const requireBeachAccess = async (req, res, next) => {
  try {
    const beachId = req.params.beachId || req.body.beach_id
    
    if (!beachId) {
      return res.status(400).json({ 
        error: 'ID пляжа не указан',
        code: 'BEACH_ID_REQUIRED'
      })
    }

    // Супер-админ имеет доступ ко всем пляжам
    if (req.admin.role === 'super_admin') {
      return next()
    }

    const hasAccess = await AdminUser.hasAccessToBeach(req.admin.id, beachId)
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Нет доступа к этому пляжу',
        code: 'NO_BEACH_ACCESS'
      })
    }

    next()
  } catch (error) {
    console.error('Ошибка проверки доступа к пляжу:', error)
    res.status(500).json({ 
      error: 'Ошибка сервера при проверке доступа',
      code: 'SERVER_ERROR'
    })
  }
}

// Логирование административных действий
const logAdminAction = (action, resourceType) => {
  return async (req, res, next) => {
    // Сохраняем оригинальные методы
    const originalSend = res.send
    const originalJson = res.json

    // Переопределяем методы для логирования после выполнения
    res.send = function(data) {
      logAction()
      return originalSend.call(this, data)
    }

    res.json = function(data) {
      logAction()
      return originalJson.call(this, data)
    }

    async function logAction() {
      try {
        if (res.statusCode < 400 && req.admin) {
          const pool = require('../config/database')
          
          const logQuery = `
            INSERT INTO admin_audit_log (
              admin_user_id, action, resource_type, resource_id,
              old_values, new_values, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `
          
          const resourceId = req.params.id || req.params.beachId || req.body.id || null
          const oldValues = req.originalData ? JSON.stringify(req.originalData) : null
          const newValues = req.body ? JSON.stringify(req.body) : null
          const ipAddress = req.ip || req.connection.remoteAddress
          const userAgent = req.get('User-Agent')

          await pool.query(logQuery, [
            req.admin.id,
            action,
            resourceType,
            resourceId,
            oldValues,
            newValues,
            ipAddress,
            userAgent
          ])
        }
      } catch (error) {
        console.error('Ошибка логирования действия:', error)
      }
    }

    next()
  }
}

module.exports = {
  adminAuth,
  requireRole,
  requireBeachAccess,
  logAdminAction
}