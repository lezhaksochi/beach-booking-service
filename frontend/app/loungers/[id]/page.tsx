'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lounger, BookingRequest } from '@/types'
import { loungerAPI, bookingAPI } from '@/lib/api'
import { format, addHours } from 'date-fns'

export default function LoungerDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter()
  const [lounger, setLounger] = useState<Lounger | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    start_time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    duration: 2, // hours
  })

  useEffect(() => {
    const fetchLounger = async () => {
      try {
        const data = await loungerAPI.getById(params.id)
        setLounger(data)
      } catch (err) {
        setError('Шезлонг не найден')
      } finally {
        setLoading(false)
      }
    }

    fetchLounger()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lounger) return

    setBooking(true)
    setError(null)

    try {
      const startTime = new Date(formData.start_time)
      const endTime = addHours(startTime, formData.duration)

      const bookingRequest: BookingRequest = {
        lounger_id: lounger.id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      }

      const newBooking = await bookingAPI.create(bookingRequest)
      router.push(`/booking/${newBooking.id}?success=true`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при создании бронирования')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Загрузка...</div>
      </div>
    )
  }

  if (error && !lounger) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">{error}</div>
      </div>
    )
  }

  if (!lounger) return null

  const totalPrice = lounger.price_per_hour * formData.duration

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {lounger.imageUrl && (
            <img
              src={lounger.imageUrl}
              alt={lounger.name}
              className="w-full h-64 lg:h-80 object-cover rounded-lg"
            />
          )}
          
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {lounger.name}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              📍 {lounger.beach?.name}
            </p>
            <p className="text-gray-700 mb-6">{lounger.description}</p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-beach-blue mb-2">
                {lounger.price_per_hour}₽ за час
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                lounger.available 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {lounger.available ? 'Доступен для бронирования' : 'Недоступен'}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Забронировать шезлонг</h2>
          
          {!lounger.available ? (
            <div className="text-center py-8">
              <div className="text-gray-600 mb-4">
                Этот шезлонг сейчас недоступен для бронирования
              </div>
              <button
                onClick={() => router.back()}
                className="btn-secondary"
              >
                Вернуться назад
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ваше имя *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-beach-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Телефон *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-beach-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-beach-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Начало бронирования *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-beach-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Продолжительность (часов) *
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-beach-blue"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(hours => (
                    <option key={hours} value={hours}>
                      {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Итого к оплате:</span>
                  <span className="text-xl font-bold text-beach-blue">
                    {totalPrice}₽
                  </span>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={booking}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {booking ? 'Создание бронирования...' : 'Забронировать'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}