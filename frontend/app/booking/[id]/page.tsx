'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Booking } from '@/types'
import { bookingAPI } from '@/lib/api'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function BookingPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await bookingAPI.getById(params.id)
        setBooking(data)
      } catch (err) {
        setError('Бронирование не найдено')
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [params.id])

  // Removed QR code generation - now using simple 4-digit codes

  const handleCancel = async () => {
    if (!booking || booking.status !== 'active') return
    
    setCancelling(true)
    try {
      const updatedBooking = await bookingAPI.cancel(booking.id)
      setBooking(updatedBooking)
    } catch (err) {
      setError('Ошибка при отмене бронирования')
    } finally {
      setCancelling(false)
    }
  }

  const shareBooking = () => {
    if (!booking) return

    const startDate = new Date(booking.start_time)
    const endDate = new Date(booking.end_time)
    
    const shareText = `Бронирование пляжа:
🏖️ ${booking.beach_name || 'Пляж'}
🪑 ${booking.lounger_name || `Место ${booking.lounger_id}`}
📅 ${format(startDate, 'dd.MM.yyyy HH:mm')} - ${format(endDate, 'HH:mm')}
💰 ${booking.total_price}₽
🔑 Код для входа: ${booking.simple_code}
🎫 ID: ${booking.id}`

    if (navigator.share) {
      navigator.share({
        title: 'Бронирование пляжа',
        text: shareText
      })
    } else {
      navigator.clipboard.writeText(shareText)
      alert('Информация скопирована в буфер обмена')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Загрузка бронирования...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <div className="text-xl text-red-600 mb-4">{error}</div>
          <Link href="/" className="btn-primary">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const startDate = new Date(booking.start_time)
  const endDate = new Date(booking.end_time)

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Banner */}
        {isSuccess && (
          <div className="glass-card mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center">
              <div className="text-6xl mr-4">🎉</div>
              <div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">
                  Бронирование успешно создано!
                </h3>
                <p className="text-green-700 text-lg">
                  Ваше место забронировано. Назовите 4-значный код администратору на входе.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="glass-card text-center">
              <div className="text-4xl mb-4">🏖️</div>
              <h1 className="text-3xl font-bold text-gradient mb-4">
                Подтверждение бронирования
              </h1>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                ['confirmed', 'pending'].includes(booking.status)
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : booking.status === 'cancelled'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  ['confirmed', 'pending'].includes(booking.status) ? 'bg-green-500' :
                  booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                {['confirmed', 'pending'].includes(booking.status) ? 'Активное бронирование' : 
                 booking.status === 'cancelled' ? 'Отменено' : 'Завершено'}
              </div>
            </div>

            {/* Booking ID */}
            <div className="glass-card">
              <h3 className="text-lg font-bold text-gray-800 mb-3">🎫 Номер бронирования</h3>
              <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-blue-300 rounded-lg p-4 text-center">
                <code className="text-2xl font-mono font-bold text-blue-600">
                  {booking.id}
                </code>
              </div>
            </div>

            {/* Location Details */}
            <div className="glass-card">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📍 Детали места</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Пляж</div>
                  <div className="font-semibold text-gray-800">
                    {booking.beach_name || 'Пляж Сочи'}
                  </div>
                </div>
                <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Место</div>
                  <div className="font-semibold text-gray-800">
                    {booking.lounger_name || `Место #${booking.lounger_id}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Time Details */}
            <div className="glass-card">
              <h3 className="text-lg font-bold text-gray-800 mb-4">⏰ Время бронирования</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white/30 backdrop-blur-sm rounded-lg p-4">
                  <div>
                    <div className="text-sm text-gray-600">Начало</div>
                    <div className="font-semibold text-gray-800">
                      {format(startDate, 'dd MMMM yyyy', { locale: ru })}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {format(startDate, 'HH:mm')}
                    </div>
                  </div>
                  <div className="text-2xl">→</div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Окончание</div>
                    <div className="font-semibold text-gray-800">
                      {format(endDate, 'dd MMMM yyyy', { locale: ru })}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {format(endDate, 'HH:mm')}
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  Продолжительность: <span className="font-semibold">
                    {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))} часов
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="glass-card">
              <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Контактная информация</h3>
              <div className="space-y-3">
                <div className="flex items-center bg-white/30 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-lg mr-3">👤</div>
                  <div>
                    <div className="text-sm text-gray-600">Имя</div>
                    <div className="font-semibold">{booking.customer_name}</div>
                  </div>
                </div>
                <div className="flex items-center bg-white/30 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-lg mr-3">📞</div>
                  <div>
                    <div className="text-sm text-gray-600">Телефон</div>
                    <div className="font-semibold">{booking.customer_phone}</div>
                  </div>
                </div>
                <div className="flex items-center bg-white/30 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-lg mr-3">📧</div>
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-semibold">{booking.customer_email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="glass-card bg-gradient-to-r from-blue-50 to-cyan-50">
              <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Стоимость</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-gradient mb-2">
                  {booking.total_price}₽
                </div>
                <div className="text-sm text-gray-600">
                  К оплате на месте
                </div>
              </div>
            </div>
          </div>

          {/* Simple Code Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Simple Code */}
              <div className="glass-card text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🔑 Код для входа</h3>
                {booking.simple_code ? (
                  <div className="bg-white p-6 rounded-lg shadow-inner mb-4">
                    <div className="text-6xl font-mono font-bold text-blue-600 tracking-widest">
                      {booking.simple_code}
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      Покажите этот код администратору
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-8 rounded-lg mb-4">
                    <div className="text-sm text-gray-600">Код генерируется...</div>
                  </div>
                )}
                
                <p className="text-sm text-gray-600 mb-4">
                  Назовите этот код администратору пляжа для регистрации
                </p>

                <div className="space-y-2">
                  <button
                    onClick={shareBooking}
                    className="w-full glass-button"
                  >
                    📤 Поделиться
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="glass-card">
                <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Действия</h3>
                <div className="space-y-3">
                  {['confirmed', 'pending'].includes(booking.status) && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {cancelling ? 'Отмена...' : '❌ Отменить бронирование'}
                    </button>
                  )}
                  
                  <Link
                    href="/"
                    className="block w-full btn-primary text-center"
                  >
                    🏖️ Забронировать ещё
                  </Link>
                  
                  <Link
                    href="/"
                    className="block w-full glass-button text-center"
                  >
                    🏠 На главную
                  </Link>
                </div>
              </div>

              {/* Help */}
              <div className="glass-card bg-gradient-to-br from-yellow-50 to-orange-50">
                <h3 className="text-lg font-bold text-gray-800 mb-3">🆘 Нужна помощь?</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <span className="mr-2">📞</span>
                    <span>+7 (862) 123-45-67</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">📧</span>
                    <span>help@sochibeach.ru</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🕒</span>
                    <span>Круглосуточно</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}