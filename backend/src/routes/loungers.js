const express = require('express')
const router = express.Router()

const {
  getAllLoungers,
  getLoungerById,
  checkLoungerAvailability,
  createLounger,
  updateLounger,
  deleteLounger
} = require('../controllers/loungerController')

const {
  validateLounger,
  validateLoungerUpdate,
  validateUUID
} = require('../middleware/validation')

// Получить все шезлонги
router.get('/', getAllLoungers)

// Получить шезлонг по ID
router.get('/:id', validateUUID('id'), getLoungerById)

// Проверить доступность шезлонга
router.get('/:id/availability', validateUUID('id'), checkLoungerAvailability)

// Создать новый шезлонг (для администраторов)
router.post('/', validateLounger, createLounger)

// Обновить шезлонг (для администраторов)
router.put('/:id', validateUUID('id'), validateLoungerUpdate, updateLounger)

// Удалить шезлонг (для администраторов)
router.delete('/:id', validateUUID('id'), deleteLounger)

module.exports = router