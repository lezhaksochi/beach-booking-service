const Lounger = require('../models/Lounger')

const getAllLoungers = async (req, res, next) => {
  try {
    const { beach_id, type, available } = req.query
    
    const filters = {}
    if (beach_id) filters.beach_id = beach_id
    if (type) filters.type = type
    if (available !== undefined) filters.available = available === 'true'
    
    const loungers = await Lounger.findAll(filters)
    res.json(loungers)
  } catch (error) {
    next(error)
  }
}

const getLoungerById = async (req, res, next) => {
  try {
    const { id } = req.params
    const lounger = await Lounger.findById(id)
    
    if (!lounger) {
      return res.status(404).json({
        error: 'Шезлонг не найден'
      })
    }
    
    res.json(lounger)
  } catch (error) {
    next(error)
  }
}

const checkLoungerAvailability = async (req, res, next) => {
  try {
    const { id } = req.params
    const { start_time, end_time } = req.query
    
    if (!start_time || !end_time) {
      return res.status(400).json({
        error: 'Необходимо указать start_time и end_time'
      })
    }
    
    const lounger = await Lounger.findById(id)
    if (!lounger) {
      return res.status(404).json({
        error: 'Шезлонг не найден'
      })
    }
    
    const available = await Lounger.checkAvailability(id, start_time, end_time)
    
    res.json({ available })
  } catch (error) {
    next(error)
  }
}

const createLounger = async (req, res, next) => {
  try {
    const lounger = await Lounger.create(req.validatedData)
    res.status(201).json(lounger)
  } catch (error) {
    next(error)
  }
}

const updateLounger = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const existing = await Lounger.findById(id)
    if (!existing) {
      return res.status(404).json({
        error: 'Шезлонг не найден'
      })
    }
    
    const updated = await Lounger.update(id, req.validatedData)
    res.json(updated)
  } catch (error) {
    next(error)
  }
}

const deleteLounger = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const deleted = await Lounger.delete(id)
    if (!deleted) {
      return res.status(404).json({
        error: 'Шезлонг не найден'
      })
    }
    
    res.json({ message: 'Шезлонг удален' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllLoungers,
  getLoungerById,
  checkLoungerAvailability,
  createLounger,
  updateLounger,
  deleteLounger
}