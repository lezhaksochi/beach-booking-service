'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/adminApi'

interface Beach {
  id: string
  name: string
  description?: string
  is_active: boolean
  loungers_count?: number
  available_loungers?: number
}

interface DashboardStats {
  summary: {
    total_bookings_today: number
    total_revenue_today: number
    active_bookings: number
    total_beaches: number
  }
  beaches: Array<{
    id: string
    name: string
    bookings_today: number
    revenue_today: number
    active_bookings: number
    total_loungers: number
    available_loungers: number
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    const userData = localStorage.getItem('adminUser')
    
    if (userData) {
      setUser(JSON.parse(userData))
    }
    
    if (token) {
      loadDashboardStats()
    }
  }, [])

  const loadDashboardStats = async () => {
    try {
      const data = await adminApi.stats.getDashboard()
      setStats(data)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Бронирований сегодня</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.summary.total_bookings_today}</p>
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
                  <p className="text-sm font-medium text-gray-600">Доход сегодня</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.summary.total_revenue_today.toLocaleString('ru-RU')} ₽</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Активные брони</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.summary.active_bookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Всего пляжей</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.summary.total_beaches}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Beaches List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Мои пляжи</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пляж
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Бронирований сегодня
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Доход сегодня
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Активные брони
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Шезлонги
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats?.beaches.map((beach) => (
                  <tr key={beach.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{beach.name}</div>
                        <div className="text-sm text-gray-500">ID: {beach.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {beach.bookings_today}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {beach.revenue_today.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {beach.active_bookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {beach.available_loungers} / {beach.total_loungers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/admin/beaches/${beach.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Управление
                      </Link>
                      <Link 
                        href={`/admin/beaches/${beach.id}/stats`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Статистика
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!stats?.beaches || stats.beaches.length === 0) && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет доступных пляжей</h3>
              <p className="mt-1 text-sm text-gray-500">
                {user?.role === 'beach_admin' || user?.role === 'super_admin' 
                  ? 'Создайте новый пляж для начала работы' 
                  : 'Обратитесь к администратору для получения доступа'}
              </p>
              {(user?.role === 'beach_admin' || user?.role === 'super_admin') && (
                <div className="mt-6">
                  <Link
                    href="/admin/beaches"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Создать пляж
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  )
}