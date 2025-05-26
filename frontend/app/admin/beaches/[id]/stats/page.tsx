'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminApi } from '@/lib/adminApi'

interface BeachStats {
  beach: {
    id: string
    name: string
    description?: string
  }
  today: {
    bookings: number
    revenue: number
    qr_scans: number
    active_bookings: number
  }
  week: {
    bookings: number
    revenue: number
    average_daily_bookings: number
  }
  month: {
    bookings: number
    revenue: number
    average_daily_bookings: number
  }
  loungers: {
    total: number
    available: number
    occupied: number
    utilization_rate: number
  }
  popular_times: Array<{
    hour: number
    bookings: number
  }>
  recent_bookings: Array<{
    id: string
    customer_name: string
    customer_phone: string
    start_time: string
    end_time: string
    status: string
    total_price: number
  }>
}

export default function BeachStatsPage() {
  const params = useParams()
  const beachId = params.id as string

  const [stats, setStats] = useState<BeachStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    if (beachId) {
      loadStats()
    }
  }, [beachId])

  const loadStats = async () => {
    try {
      setError(null)
      const data = await adminApi.stats.getBeachStats(beachId)
      setStats(data)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
      setError((error as Error).message || 'Ошибка загрузки статистики')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка статистики...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 className="text-red-800 font-medium">Ошибка загрузки статистики</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <div className="mt-3 space-x-2">
          <button 
            onClick={loadStats}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Попробовать снова
          </button>
          <Link 
            href={`/admin/beaches/${beachId}`}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 inline-block"
          >
            Назад к пляжу
          </Link>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Статистика не найдена</p>
        <Link 
          href={`/admin/beaches/${beachId}`}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 inline-block"
        >
          Назад к пляжу
        </Link>
      </div>
    )
  }

  const currentStats = stats[timeRange]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link 
            href={`/admin/beaches/${beachId}`}
            className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block"
          >
            ← Назад к пляжу
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Статистика: {stats.beach.name}
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="today">Сегодня</option>
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
          </select>
          <button
            onClick={loadStats}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Обновить
          </button>
        </div>
      </div>

      {/* Основные показатели */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Бронирований {timeRange === 'today' ? 'сегодня' : timeRange === 'week' ? 'за неделю' : 'за месяц'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">{currentStats.bookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Доход</p>
              <p className="text-2xl font-semibold text-gray-900">{currentStats.revenue.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>
        </div>

        {timeRange === 'today' && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">QR сканирований</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.today.qr_scans}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Активные брони</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.today.active_bookings}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Использование шезлонгов */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-medium mb-4">Использование шезлонгов</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{stats.loungers.total}</p>
            <p className="text-sm text-gray-600">Всего</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-green-600">{stats.loungers.available}</p>
            <p className="text-sm text-gray-600">Доступно</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-red-600">{stats.loungers.occupied}</p>
            <p className="text-sm text-gray-600">Занято</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-purple-600">{stats.loungers.utilization_rate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Загрузка</p>
          </div>
        </div>
        
        {/* Прогресс-бар */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full" 
              style={{ width: `${stats.loungers.utilization_rate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Недавние бронирования */}
      {stats.recent_bookings && stats.recent_bookings.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Недавние бронирования</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recent_bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{booking.customer_name}</div>
                        <div className="text-sm text-gray-500">{booking.customer_phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(booking.start_time).toLocaleString('ru-RU', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - {new Date(booking.end_time).toLocaleString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status === 'confirmed' ? 'Подтверждено' :
                         booking.status === 'cancelled' ? 'Отменено' : booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.total_price.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}