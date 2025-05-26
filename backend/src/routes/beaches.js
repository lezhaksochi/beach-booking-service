const express = require('express')
const router = express.Router()

const {
  getAllBeaches,
  getBeachById,
  getBeachLayout,
  createBeach,
  updateBeach,
  deleteBeach
} = require('../controllers/beachController')

const {
  validateUUID
} = require('../middleware/validation')

// Получить все пляжи
router.get('/', getAllBeaches)

// Получить пляж по ID
router.get('/:id', validateUUID('id'), getBeachById)

// Получить схему расположения пляжа
router.get('/:id/layout', validateUUID('id'), getBeachLayout)

// Создать новый пляж (для администраторов)
router.post('/', createBeach)

// Обновить пляж (для администраторов)
router.put('/:id', validateUUID('id'), updateBeach)

// Удалить пляж (для администраторов)
router.delete('/:id', validateUUID('id'), deleteBeach)

module.exports = router