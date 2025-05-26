const Booking = require('../models/Booking')

class CronController {
  // Обновление статусов истекших бронирований
  static async updateExpiredBookings() {
    try {
      console.log('🔄 Запуск обновления истекших бронирований...')
      
      const updatedBookings = await Booking.updateExpiredBookings()
      
      if (updatedBookings.length > 0) {
        console.log(`✅ Обновлено ${updatedBookings.length} истекших бронирований:`)
        updatedBookings.forEach(booking => {
          console.log(`  - ID: ${booking.id}, истекло: ${booking.end_time}`)
        })
      } else {
        console.log('✅ Истекших бронирований не найдено')
      }
      
      return updatedBookings
    } catch (error) {
      console.error('❌ Ошибка обновления истекших бронирований:', error)
      throw error
    }
  }

  // Запуск всех периодических задач
  static async runAllTasks() {
    try {
      console.log('🚀 Запуск всех периодических задач...')
      
      const results = {
        expiredBookings: await CronController.updateExpiredBookings()
      }
      
      console.log('🎉 Все периодические задачи выполнены успешно')
      return results
    } catch (error) {
      console.error('❌ Ошибка выполнения периодических задач:', error)
      throw error
    }
  }
}

module.exports = CronController