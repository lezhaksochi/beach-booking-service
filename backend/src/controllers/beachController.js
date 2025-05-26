const Beach = require('../models/Beach')

const getAllBeaches = async (req, res, next) => {
  try {
    const beaches = await Beach.findAll()
    res.json(beaches)
  } catch (error) {
    next(error)
  }
}

const getBeachById = async (req, res, next) => {
  try {
    const { id } = req.params
    const beach = await Beach.findById(id)
    
    if (!beach) {
      return res.status(404).json({
        error: 'Пляж не найден'
      })
    }
    
    res.json(beach)
  } catch (error) {
    next(error)
  }
}

const getBeachLayout = async (req, res, next) => {
  try {
    const { id } = req.params
    const layout = await Beach.getLayout(id)
    
    if (!layout) {
      return res.status(404).json({
        error: 'Пляж не найден'
      })
    }
    
    res.json(layout)
  } catch (error) {
    next(error)
  }
}

const createBeach = async (req, res, next) => {
  try {
    const beach = await Beach.create(req.validatedData)
    res.status(201).json(beach)
  } catch (error) {
    next(error)
  }
}

const updateBeach = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const existing = await Beach.findById(id)
    if (!existing) {
      return res.status(404).json({
        error: 'Пляж не найден'
      })
    }
    
    const updated = await Beach.update(id, req.validatedData)
    res.json(updated)
  } catch (error) {
    next(error)
  }
}

const deleteBeach = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const deleted = await Beach.delete(id)
    if (!deleted) {
      return res.status(404).json({
        error: 'Пляж не найден'
      })
    }
    
    res.json({ message: 'Пляж удален' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllBeaches,
  getBeachById,
  getBeachLayout,
  createBeach,
  updateBeach,
  deleteBeach
}