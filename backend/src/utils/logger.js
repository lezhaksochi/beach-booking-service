/**
 * Система логирования с поддержкой различных уровней для разработки и продакшена
 */

const isDevelopment = process.env.NODE_ENV === 'development'

class Logger {
  static info(context, message, data = null) {
    const timestamp = new Date().toISOString()
    if (isDevelopment) {
      console.log(`ℹ️ [${context}] ${message}`, data ? data : '')
    } else {
      console.log(`${timestamp} - INFO - [${context}] ${message}`)
    }
  }

  static success(context, message, data = null) {
    const timestamp = new Date().toISOString()
    if (isDevelopment) {
      console.log(`✅ [${context}] ${message}`, data ? data : '')
    } else {
      console.log(`${timestamp} - SUCCESS - [${context}] ${message}`)
    }
  }

  static warn(context, message, data = null) {
    const timestamp = new Date().toISOString()
    if (isDevelopment) {
      console.warn(`⚠️ [${context}] ${message}`, data ? data : '')
    } else {
      console.warn(`${timestamp} - WARN - [${context}] ${message}`)
    }
  }

  static error(context, message, error = null, sensitiveData = null) {
    const timestamp = new Date().toISOString()
    
    if (isDevelopment) {
      console.error(`💥 [${context}] ${message}`, {
        error: error ? {
          message: error.message,
          stack: error.stack,
          code: error.code,
          name: error.name
        } : undefined,
        data: sensitiveData
      })
    } else {
      // В продакшене не выводим чувствительные данные
      console.error(`${timestamp} - ERROR - [${context}] ${message}`, {
        error: error ? error.message : undefined
      })
    }
  }

  static debug(context, message, data = null) {
    if (isDevelopment) {
      console.log(`🔍 [${context}] ${message}`, data ? data : '')
    }
    // В продакшене debug логи не выводятся
  }

  static security(context, message, data = null) {
    const timestamp = new Date().toISOString()
    // Логи безопасности всегда записываются
    console.log(`🔐 ${timestamp} - SECURITY - [${context}] ${message}`)
    
    if (isDevelopment && data) {
      console.log('Security data:', data)
    }
  }

  // Специальные методы для админ-панели
  static adminAuth(message, data = null) {
    if (isDevelopment) {
      console.log(`🔑 [ADMIN AUTH] ${message}`, data ? data : '')
    } else {
      const timestamp = new Date().toISOString()
      console.log(`${timestamp} - ADMIN_AUTH - ${message}`)
    }
  }

  static adminAction(adminEmail, action, resourceType, resourceId = null) {
    const timestamp = new Date().toISOString()
    console.log(`📝 ${timestamp} - ADMIN_ACTION - ${adminEmail} - ${action} - ${resourceType}${resourceId ? ` - ${resourceId}` : ''}`)
  }
}

module.exports = Logger