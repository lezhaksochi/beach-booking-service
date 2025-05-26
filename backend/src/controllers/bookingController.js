const Booking = require('../models/Booking')
const Lounger = require('../models/Lounger')

const createBooking = async (req, res, next) => {
  try {
    const {
      lounger_id,
      customer_name,
      customer_phone,
      customer_email,
      start_time,
      end_time
    } = req.validatedData
    
    const user_id = req.user ? req.user.id : null
    
    // Проверяем существование шезлонга
    const lounger = await Lounger.findById(lounger_id)
    if (!lounger) {
      return res.status(404).json({
        error: 'Шезлонг не найден'
      })
    }
    
    if (!lounger.available) {
      return res.status(400).json({
        error: 'Шезлонг недоступен для бронирования'
      })
    }
    
    // Проверяем доступность на указанное время
    const available = await Lounger.checkAvailability(lounger_id, start_time, end_time)
    if (!available) {
      return res.status(409).json({
        error: 'Шезлонг уже забронирован на указанное время'
      })
    }
    
    // Вычисляем общую стоимость
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)
    const durationHours = (endDate - startDate) / (1000 * 60 * 60)
    const total_price = durationHours * lounger.price_per_hour
    
    // Создаем бронирование
    const booking = await Booking.create({
      lounger_id,
      user_id,
      customer_name,
      customer_phone,
      customer_email,
      start_time,
      end_time,
      total_price
    })

    // Обновляем доступность шезлонга
    const loungerAvailable = await Lounger.updateAvailability(lounger_id)

    // Отправляем WebSocket уведомления
    if (global.wsServer) {
      global.wsServer.notifyBookingUpdate(booking)
      global.wsServer.notifyLoungerUpdate({
        ...lounger,
        available: loungerAvailable
      })
    }
    
    res.status(201).json(booking)
  } catch (error) {
    next(error)
  }
}

const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const booking = await Booking.findById(id)
    
    if (!booking) {
      return res.status(404).json({
        error: 'Бронирование не найдено'
      })
    }
    
    // Проверяем принадлежность бронирования пользователю
    if (booking.user_id && booking.user_id !== userId) {
      return res.status(403).json({
        error: 'Доступ запрещен'
      })
    }
    
    res.json(booking)
  } catch (error) {
    next(error)
  }
}

const getAllBookings = async (req, res, next) => {
  try {
    const { lounger_id, status, customer_email } = req.query
    
    const filters = {}
    if (lounger_id) filters.lounger_id = lounger_id
    if (status) filters.status = status
    if (customer_email) filters.customer_email = customer_email
    
    const bookings = await Booking.findAll(filters)
    res.json(bookings)
  } catch (error) {
    next(error)
  }
}

const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    
    const booking = await Booking.findById(id)
    if (!booking) {
      return res.status(404).json({
        error: 'Бронирование не найдено'
      })
    }
    
    // Проверяем принадлежность бронирования пользователю
    if (booking.user_id && booking.user_id !== userId) {
      return res.status(403).json({
        error: 'Доступ запрещен'
      })
    }
    
    if (!['confirmed', 'pending'].includes(booking.status)) {
      return res.status(400).json({
        error: 'Можно отменить только активные бронирования'
      })
    }
    
    const cancelled = await Booking.cancel(id, userId)
    
    // Обновляем доступность шезлонга на основе оставшихся активных бронирований
    const loungerAvailable = await Lounger.updateAvailability(booking.lounger_id)

    // Отправляем WebSocket уведомления
    if (global.wsServer) {
      global.wsServer.notifyBookingUpdate(cancelled)
      
      // Получаем обновленную информацию о шезлонге
      const lounger = await Lounger.findById(booking.lounger_id)
      if (lounger) {
        global.wsServer.notifyLoungerUpdate({
          ...lounger,
          available: loungerAvailable
        })
      }
    }
    
    res.json(cancelled)
  } catch (error) {
    next(error)
  }
}

const updateBooking = async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const existing = await Booking.findById(id)
    if (!existing) {
      return res.status(404).json({
        error: 'Бронирование не найдено'
      })
    }
    
    // Ограничиваем возможность изменения определенных полей
    const allowedUpdates = ['status']
    const filteredUpdates = {}
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'Нет разрешенных полей для обновления'
      })
    }
    
    const updated = await Booking.update(id, filteredUpdates)
    res.json(updated)
  } catch (error) {
    next(error)
  }
}

const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const deleted = await Booking.delete(id)
    if (!deleted) {
      return res.status(404).json({
        error: 'Бронирование не найдено'
      })
    }
    
    res.json({ message: 'Бронирование удалено' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createBooking,
  getBookingById,
  getAllBookings,
  cancelBooking,
  updateBooking,
  deleteBooking
}