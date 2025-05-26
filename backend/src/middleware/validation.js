const Joi = require('joi')

const createBookingSchema = Joi.object({
  lounger_id: Joi.string().uuid().required(),
  customer_name: Joi.string().min(2).max(100).required(),
  customer_phone: Joi.string().min(10).max(20).required(),
  customer_email: Joi.string().email().allow('').optional(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().greater(Joi.ref('start_time')).required()
})

const createLoungerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  beach_name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000),
  price_per_hour: Joi.number().positive().required(),
  image_url: Joi.string().uri().optional(),
  location_lat: Joi.number().min(-90).max(90),
  location_lng: Joi.number().min(-180).max(180)
})

const updateLoungerSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  beach_name: Joi.string().min(2).max(255),
  description: Joi.string().max(1000),
  price_per_hour: Joi.number().positive(),
  image_url: Joi.string().uri(),
  location_lat: Joi.number().min(-90).max(90),
  location_lng: Joi.number().min(-180).max(180),
  available: Joi.boolean()
}).min(1)

const validateBooking = (req, res, next) => {
  const { error, value } = createBookingSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: error.details.map(detail => detail.message)
    })
  }
  
  // Проверяем, что время начала не в прошлом
  const now = new Date()
  const startTime = new Date(value.start_time)
  
  if (startTime < now) {
    return res.status(400).json({
      error: 'Время начала бронирования не может быть в прошлом'
    })
  }
  
  // Проверяем максимальную продолжительность (24 часа)
  const endTime = new Date(value.end_time)
  const duration = (endTime - startTime) / (1000 * 60 * 60) // в часах
  
  if (duration > 24) {
    return res.status(400).json({
      error: 'Максимальная продолжительность бронирования - 24 часа'
    })
  }
  
  req.validatedData = value
  next()
}

const validateLounger = (req, res, next) => {
  const { error, value } = createLoungerSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: error.details.map(detail => detail.message)
    })
  }
  
  req.validatedData = value
  next()
}

const validateLoungerUpdate = (req, res, next) => {
  const { error, value } = updateLoungerSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: error.details.map(detail => detail.message)
    })
  }
  
  req.validatedData = value
  next()
}

const validateUUID = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName]
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    
    if (!uuidRegex.test(uuid)) {
      return res.status(400).json({
        error: 'Неверный формат ID'
      })
    }
    
    next()
  }
}

module.exports = {
  validateBooking,
  validateLounger,
  validateLoungerUpdate,
  validateUUID
}