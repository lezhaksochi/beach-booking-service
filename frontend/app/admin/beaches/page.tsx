'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/adminApi'

interface Beach {
  id: string
  name: string
  description: string
  location_lat: number
  location_lng: number
  imageUrl: string
  amenities: string[]
  created_at: string
}

export default function BeachesPage() {
  const [beaches, setBeaches] = useState<Beach[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newBeach, setNewBeach] = useState({
    name: '',
    description: '',
    location_lat: '',
    location_lng: '',
    imageUrl: '',
    amenities: []
  })

  useEffect(() => {
    loadBeaches()
  }, [])

  const loadBeaches = async () => {
    try {
      setError(null)
      console.log('Начинаем загрузку пляжей...')
      
      const data = await adminApi.beaches.getAll()
      console.log('Загруженные пляжи:', data)
      
      // Проверяем, что data - это массив
      if (Array.isArray(data)) {
        setBeaches(data)
        console.log('Пляжи успешно установлены в state:', data.length)
      } else {
        console.error('Ответ API не является массивом:', data)
        setError('Неожиданный формат данных от сервера')
        setBeaches([])
      }
    } catch (error) {
      console.error('Ошибка загрузки пляжей:', error)
      setError((error as Error).message || 'Ошибка загрузки пляжей')
      setBeaches([]) // Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBeach = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Создание пляжа...', newBeach)
    
    try {
      const beachData = {
        ...newBeach,
        location_lat: parseFloat(newBeach.location_lat),
        location_lng: parseFloat(newBeach.location_lng)
      }
      
      console.log('Отправка данных:', beachData)
      const result = await adminApi.beaches.create(beachData)
      console.log('Пляж создан:', result)
      
      setShowCreateForm(false)
      setNewBeach({
        name: '',
        description: '',
        location_lat: '',
        location_lng: '',
        imageUrl: '',
        amenities: []
      })
      loadBeaches()
    } catch (error) {
      console.error('Ошибка создания пляжа:', error)
      alert('Ошибка создания пляжа: ' + (error as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка пляжей...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 className="text-red-800 font-medium">Ошибка загрузки данных</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={loadBeaches}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление пляжами</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Создать пляж
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Создать новый пляж</h2>
            <form onSubmit={handleCreateBeach}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Название</label>
                <input
                  type="text"
                  value={newBeach.name}
                  onChange={(e) => setNewBeach({...newBeach, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={newBeach.description}
                  onChange={(e) => setNewBeach({...newBeach, description: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Широта</label>
                  <input
                    type="number"
                    step="any"
                    value={newBeach.location_lat}
                    onChange={(e) => setNewBeach({...newBeach, location_lat: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Долгота</label>
                  <input
                    type="number"
                    step="any"
                    value={newBeach.location_lng}
                    onChange={(e) => setNewBeach({...newBeach, location_lng: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">URL изображения</label>
                <input
                  type="url"
                  value={newBeach.imageUrl}
                  onChange={(e) => setNewBeach({...newBeach, imageUrl: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {!Array.isArray(beaches) || beaches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {!Array.isArray(beaches) ? 'Ошибка загрузки данных' : 'Пляжи не найдены'}
          </div>
        ) : (
          beaches.map((beach) => (
            <div key={beach.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{beach.name}</h3>
                  <p className="text-gray-600 mt-1">{beach.description}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span>Координаты: {beach.location_lat}, {beach.location_lng}</span>
                  </div>
                  {Array.isArray(beach.amenities) && beach.amenities.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Удобства: </span>
                      {beach.amenities.map((amenity, index) => (
                        <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {beach.imageUrl && (
                  <img 
                    src={beach.imageUrl} 
                    alt={beach.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}