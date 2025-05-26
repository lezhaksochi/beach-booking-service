const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // PostgreSQL ошибки
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        return res.status(409).json({
          error: 'Конфликт данных',
          message: 'Запись с такими данными уже существует'
        })
      
      case '23503': // Foreign key constraint violation
        return res.status(400).json({
          error: 'Ошибка связи',
          message: 'Связанная запись не найдена'
        })
      
      case '23502': // Not null constraint violation
        return res.status(400).json({
          error: 'Отсутствуют обязательные поля',
          message: 'Заполните все обязательные поля'
        })
      
      case '22P02': // Invalid input syntax
        return res.status(400).json({
          error: 'Неверный формат данных',
          message: 'Проверьте корректность введенных данных'
        })
      
      default:
        return res.status(500).json({
          error: 'Ошибка базы данных',
          message: 'Произошла ошибка при обращении к базе данных'
        })
    }
  }

  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: err.details.map(detail => detail.message)
    })
  }

  // Стандартные HTTP ошибки
  if (err.status) {
    return res.status(err.status).json({
      error: err.message || 'Произошла ошибка'
    })
  }

  // Ошибки по умолчанию
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Что-то пошло не так'
  })
}

const notFound = (req, res) => {
  res.status(404).json({
    error: 'Не найдено',
    message: `Маршрут ${req.originalUrl} не найден`
  })
}

module.exports = {
  errorHandler,
  notFound
}