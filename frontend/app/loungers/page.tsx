'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lounger } from '@/types'
import { loungerAPI } from '@/lib/api'

export default function LoungersPage() {
  const [loungers, setLoungers] = useState<Lounger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLoungers = async () => {
      try {
        const data = await loungerAPI.getAll()
        setLoungers(data)
      } catch (err) {
        setError('Ошибка при загрузке шезлонгов')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchLoungers()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="text-xl">Загрузка шезлонгов...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">
          <div className="text-xl">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Доступные шезлонги
        </h1>
        <p className="text-gray-600">
          Выберите подходящий шезлонг для отдыха на пляже
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loungers.map((lounger) => (
          <div key={lounger.id} className="card">
            {lounger.imageUrl && (
              <img
                src={lounger.imageUrl}
                alt={lounger.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {lounger.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                📍 {lounger.beach?.name}
              </p>
              <p className="text-gray-700 mb-4">{lounger.description}</p>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-beach-blue">
                  {lounger.price_per_hour}₽/час
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  lounger.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {lounger.available ? 'Доступен' : 'Занят'}
                </span>
              </div>

              <Link
                href={`/loungers/${lounger.id}`}
                className={`block text-center py-2 px-4 rounded font-medium transition-colors ${
                  lounger.available
                    ? 'btn-primary'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {lounger.available ? 'Забронировать' : 'Недоступен'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {loungers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-xl text-gray-600">
            Пока нет доступных шезлонгов
          </div>
        </div>
      )}
    </div>
  )
}