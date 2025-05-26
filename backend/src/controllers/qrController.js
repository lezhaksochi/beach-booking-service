const QRCode = require('qrcode')
const Booking = require('../models/Booking')

class QRController {
  // Генерация QR-кода для бронирования
  static async generateQR(req, res) {
    try {
      const { bookingId } = req.params
      
      // Получаем бронирование
      const booking = await Booking.findById(bookingId)
      
      if (!booking) {
        return res.status(404).json({
          error: 'Бронирование не найдено',
          code: 'BOOKING_NOT_FOUND'
        })
      }

      // Убеждаемся, что у бронирования есть QR токен
      const qrToken = await Booking.ensureQRToken(bookingId)
      
      if (!qrToken) {
        return res.status(500).json({
          error: 'Не удалось создать QR токен',
          code: 'QR_TOKEN_ERROR'
        })
      }

      // Формируем данные для QR кода
      const qrData = {
        bookingId,
        token: qrToken,
        customerName: booking.customer_name,
        startTime: booking.start_time,
        endTime: booking.end_time,
        loungerName: booking.lounger_name,
        beachName: booking.beach_name
      }

      // Генерируем QR код как Data URL
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      })

      res.json({
        qrCode: qrCodeDataURL,
        qrData,
        booking: {
          id: booking.id,
          customer_name: booking.customer_name,
          start_time: booking.start_time,
          end_time: booking.end_time,
          lounger_name: booking.lounger_name,
          beach_name: booking.beach_name,
          total_price: booking.total_price,
          status: booking.status
        }
      })

    } catch (error) {
      console.error('Ошибка генерации QR-кода:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }

  // Получение QR-кода как изображение
  static async getQRImage(req, res) {
    try {
      const { bookingId } = req.params
      
      const booking = await Booking.findById(bookingId)
      
      if (!booking) {
        return res.status(404).json({
          error: 'Бронирование не найдено',
          code: 'BOOKING_NOT_FOUND'
        })
      }

      const qrToken = await Booking.ensureQRToken(bookingId)
      
      if (!qrToken) {
        return res.status(500).json({
          error: 'Не удалось создать QR токен',
          code: 'QR_TOKEN_ERROR'
        })
      }

      // Для сканера используем только токен
      const qrBuffer = await QRCode.toBuffer(qrToken, {
        errorCorrectionLevel: 'M',
        type: 'png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      })

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': qrBuffer.length,
        'Cache-Control': 'public, max-age=3600' // Кешируем на час
      })

      res.send(qrBuffer)

    } catch (error) {
      console.error('Ошибка генерации QR-изображения:', error)
      res.status(500).json({
        error: 'Ошибка сервера',
        code: 'SERVER_ERROR'
      })
    }
  }
}

module.exports = QRController