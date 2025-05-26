'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface UserBooking {
  id: string
  lounger_id: string
  lounger_name: string
  lounger_type: 'chair' | 'bungalow'
  row_number: number
  seat_number: number
  lounger_class: 'standard' | 'premium'
  umbrella: 'with_umbrella' | 'without_umbrella'
  sun_position: 'sunny' | 'shaded'
  beach_name: string
  beach_description: string
  start_time: string
  end_time: string
  total_price: number
  status: 'active' | 'completed' | 'cancelled' | 'confirmed' | 'pending'
  created_at: string
  simple_code?: string
}

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [selectedBooking, setSelectedBooking] = useState<UserBooking | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/'
      return
    }
    fetchBookings()
  }, [isAuthenticated])

  // Removed QR code generation

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3001/api/auth/my-bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      } else {
        setError('Ошибка загрузки бронирований')
      }
    } catch (err) {
      setError('Ошибка подключения к серверу')
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`http://localhost:3001/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Refresh bookings
        fetchBookings()
        setSelectedBooking(null)
      } else {
        alert('Ошибка отмены бронирования')
      }
    } catch (err) {
      alert('Ошибка подключения к серверу')
    }
  }

  // Removed downloadQRCode function

  const getFilteredBookings = () => {
    const now = new Date()
    return bookings.filter(booking => {
      if (activeTab === 'active') {
        // Активные: дата бронирования >= текущей даты И статус IN ('confirmed', 'pending')
        return ['confirmed', 'pending'].includes(booking.status) && new Date(booking.end_time) > now
      } else {
        // История: завершенные (прошедшие) или отмененные
        return booking.status === 'cancelled' || 
               (booking.status === 'confirmed' && new Date(booking.end_time) <= now) ||
               booking.status === 'completed'
      }
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Требуется авторизация</h1>
          <p className="text-gray-600 mb-4">Для доступа к личному кабинету необходимо войти в систему</p>
          <Link href="/" className="btn-primary">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Загрузка профиля...</div>
        </div>
      </div>
    )
  }

  const filteredBookings = getFilteredBookings()

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="glass-card mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.phone.slice(-2)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">Личный кабинет</h1>
                <p className="text-gray-600">{user?.phone}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="glass-button px-4 py-2 text-red-600 hover:text-red-800"
            >
              🚪 Выйти
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="glass-card mb-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-white/30'
              }`}
            >
              🟢 Активные бронирования
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-white/30'
              }`}
            >
              📋 История
            </button>
          </div>
        </div>

        {/* Bookings Grid */}
        {filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => {
              const startDate = new Date(booking.start_time)
              const endDate = new Date(booking.end_time)
              const now = new Date()
              const isUpcoming = now < startDate
              const isActive = ['confirmed', 'pending'].includes(booking.status) && now >= startDate && now <= endDate

              return (
                <div key={booking.id} className="card-hover">
                  <div className="relative">
                    {/* Status Badge */}
                    <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-semibold ${
                      ['confirmed', 'pending'].includes(booking.status) && isActive ? 'bg-green-100 text-green-800' :
                      ['confirmed', 'pending'].includes(booking.status) && isUpcoming ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {['confirmed', 'pending'].includes(booking.status) && isActive ? '🟢 Активно' :
                       ['confirmed', 'pending'].includes(booking.status) && isUpcoming ? '🔵 Предстоящее' :
                       booking.status === 'cancelled' ? '🔴 Отменено' :
                       '✅ Завершено'}
                    </div>

                    {/* Beach and Lounger Info */}
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        🏖️ {booking.beach_name}
                      </h3>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-2xl">
                          {booking.lounger_type === 'bungalow' ? '🏠' : '🏖️'}
                        </span>
                        <span className="font-medium">
                          {booking.lounger_name}
                        </span>
                        {booking.lounger_class === 'premium' && (
                          <span className="text-yellow-500">⭐</span>
                        )}
                      </div>

                      {/* Time */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">📅</span>
                          {format(startDate, 'dd MMMM yyyy', { locale: ru })}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">⏰</span>
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-2xl font-bold text-gradient mb-4">
                        {booking.total_price}₽
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="w-full glass-button py-2"
                        >
                          🔑 Показать код
                        </button>
                        <Link
                          href={`/booking/${booking.id}`}
                          className="block w-full text-center glass-button py-2"
                        >
                          📋 Подробнее
                        </Link>
                        {['confirmed', 'pending'].includes(booking.status) && (
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
                          >
                            ❌ Отменить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass-card text-center py-12">
            <div className="text-6xl mb-4">
              {activeTab === 'active' ? '📅' : '📋'}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {activeTab === 'active' ? 'Нет активных бронирований' : 'История пуста'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'active' 
                ? 'Забронируйте место на любом из наших пляжей'
                : 'Здесь будут отображаться завершенные бронирования'
              }
            </p>
            <Link href="/" className="btn-primary">
              🏖️ Забронировать место
            </Link>
          </div>
        )}

        {/* Simple Code Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="glass-card max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">🔑 Код бронирования</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="text-center">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800">{selectedBooking.beach_name}</h4>
                  <p className="text-gray-600">{selectedBooking.lounger_name}</p>
                </div>

                {selectedBooking.simple_code ? (
                  <div className="bg-white p-6 rounded-lg shadow-inner mb-4">
                    <div className="text-6xl font-mono font-bold text-blue-600 tracking-widest">
                      {selectedBooking.simple_code}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-6 rounded-lg mb-4">
                    <div className="text-gray-600">Код генерируется...</div>
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-4">
                  Назовите этот код администратору пляжа
                </p>

                <button
                  onClick={() => {
                    if (selectedBooking.simple_code) {
                      navigator.clipboard.writeText(selectedBooking.simple_code)
                      alert('Код скопирован в буфер обмена')
                    }
                  }}
                  disabled={!selectedBooking.simple_code}
                  className="w-full glass-button py-2 disabled:opacity-50"
                >
                  📋 Скопировать код
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}