'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/adminApi'

interface Booking {
  id: string
  lounger_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  start_time: string
  end_time: string
  total_price: number
  status: 'active' | 'completed' | 'cancelled' | 'confirmed' | 'pending'
  created_at: string
  lounger_name: string
  row_number: number
  seat_number: number
  beach_name: string
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'confirmed' | 'pending' | 'completed' | 'cancelled'>('all')
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      const data = await adminApi.bookings.getAll()
      console.log('Загруженные бронирования:', data)
      
      if (Array.isArray(data)) {
        setBookings(data)
      } else {
        console.error('Ответ API бронирований не является массивом:', data)
        setBookings([])
      }
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await adminApi.bookings.updateStatus(bookingId, status)
      loadBookings()
    } catch (error) {
      console.error('Ошибка обновления статуса:', error)
    }
  }

  const handleCancelBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setShowCancelModal(true)
  }

  const confirmCancelBooking = async () => {
    if (!selectedBookingId) return
    
    try {
      await adminApi.bookings.cancelBooking(selectedBookingId, cancelReason)
      setShowCancelModal(false)
      setCancelReason('')
      setSelectedBookingId(null)
      loadBookings()
    } catch (error) {
      console.error('Ошибка отмены бронирования:', error)
      alert('Ошибка при отмене бронирования: ' + (error as any).message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активно'
      case 'confirmed': return 'Подтверждено'
      case 'pending': return 'Ожидание'
      case 'completed': return 'Завершено'
      case 'cancelled': return 'Отменено'
      default: return status
    }
  }

  const filteredBookings = Array.isArray(bookings) ? bookings.filter(booking => 
    filter === 'all' || booking.status === filter
  ) : []

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Загрузка...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление бронированиями</h1>
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="confirmed">Подтвержденные</option>
            <option value="pending">Ожидающие</option>
            <option value="completed">Завершенные</option>
            <option value="cancelled">Отмененные</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!Array.isArray(bookings) || filteredBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {!Array.isArray(bookings) ? 'Ошибка загрузки данных' : 'Бронирования не найдены'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Шезлонг/Пляж
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.customer_email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.customer_phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.lounger_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Ряд {booking.row_number}, Место {booking.seat_number}
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {booking.beach_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>С: {formatDate(booking.start_time)}</div>
                      <div>До: {formatDate(booking.end_time)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.total_price} ₽
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {booking.status === 'active' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Завершить
                          </button>
                        )}
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Отменить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Отмена бронирования</h3>
            <p className="text-gray-600 mb-4">Укажите причину отмены бронирования:</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Причина отмены..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setSelectedBookingId(null)
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmCancelBooking}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Отменить бронирование
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}