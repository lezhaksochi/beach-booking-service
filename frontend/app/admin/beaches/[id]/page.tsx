'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminApi } from '@/lib/adminApi'
import { Beach } from '@/types'

export default function BeachManagePage() {
  const params = useParams()
  const router = useRouter()
  const beachId = params.id as string

  const [beach, setBeach] = useState<Beach | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    location_lat: '',
    location_lng: '',
    image_url: '',
    is_active: true
  })

  useEffect(() => {
    if (beachId) {
      loadBeach()
    }
  }, [beachId])

  const loadBeach = async () => {
    try {
      setError(null)
      const data = await adminApi.beaches.getById(beachId)
      
      if (data.beach) {
        setBeach(data.beach)
        setEditForm({
          name: data.beach.name || '',
          description: data.beach.description || '',
          location_lat: String(data.beach.location_lat || ''),
          location_lng: String(data.beach.location_lng || ''),
          image_url: data.beach.imageUrl || '',
          is_active: data.beach.is_active ?? true
        })
      } else {
        setError('Пляж не найден')
      }
    } catch (error) {
      console.error('Ошибка загрузки пляжа:', error)
      setError((error as Error).message || 'Ошибка загрузки пляжа')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const updateData = {
        ...editForm,
        location_lat: parseFloat(editForm.location_lat),
        location_lng: parseFloat(editForm.location_lng)
      }
      
      await adminApi.beaches.update(beachId, updateData)
      setEditing(false)
      loadBeach()
    } catch (error) {
      console.error('Ошибка обновления пляжа:', error)
      alert('Ошибка обновления: ' + (error as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот пляж? Это действие нельзя отменить.')) {
      return
    }

    try {
      await adminApi.beaches.delete(beachId)
      router.push('/admin/beaches')
    } catch (error) {
      console.error('Ошибка удаления пляжа:', error)
      alert('Ошибка удаления: ' + (error as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка пляжа...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 className="text-red-800 font-medium">Ошибка</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <div className="mt-3 space-x-2">
          <button 
            onClick={loadBeach}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Попробовать снова
          </button>
          <Link 
            href="/admin/beaches"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 inline-block"
          >
            Назад к списку
          </Link>
        </div>
      </div>
    )
  }

  if (!beach) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Пляж не найден</p>
        <Link 
          href="/admin/beaches"
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 inline-block"
        >
          Назад к списку
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link 
            href="/admin/beaches"
            className="text-indigo-600 hover:text-indigo-900 mb-2 inline-block"
          >
            ← Назад к списку пляжей
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {editing ? 'Редактирование пляжа' : beach.name}
          </h1>
        </div>
        <div className="flex space-x-2">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Редактировать
              </button>
              <Link
                href={`/admin/beaches/${beachId}/stats`}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Статистика
              </Link>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Удалить
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Название</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Статус</label>
                <select
                  value={editForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditForm({...editForm, is_active: e.target.value === 'active'})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="active">Активный</option>
                  <option value="inactive">Неактивный</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Описание</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Широта</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.location_lat}
                  onChange={(e) => setEditForm({...editForm, location_lat: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Долгота</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.location_lng}
                  onChange={(e) => setEditForm({...editForm, location_lng: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">URL изображения</label>
                <input
                  type="url"
                  value={editForm.image_url}
                  onChange={(e) => setEditForm({...editForm, image_url: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-2">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium"
              >
                Сохранить изменения
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Основная информация</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Название:</span>
                  <p className="text-gray-900">{beach.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Описание:</span>
                  <p className="text-gray-900">{beach.description || 'Не указано'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Статус:</span>
                  <span className={`inline-block px-2 py-1 rounded text-sm ${
                    beach.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {beach.is_active ? 'Активный' : 'Неактивный'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Местоположение</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Координаты:</span>
                  <p className="text-gray-900">{beach.location_lat}, {beach.location_lng}</p>
                </div>
                {beach.loungers_count && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Шезлонги:</span>
                    <p className="text-gray-900">
                      {beach.available_loungers} доступно из {beach.loungers_count}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {beach.imageUrl && (
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium mb-4">Изображение</h3>
                <img 
                  src={beach.imageUrl} 
                  alt={beach.name}
                  className="w-64 h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {beach.amenities && beach.amenities.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium mb-4">Удобства</h3>
                <div className="flex flex-wrap gap-2">
                  {beach.amenities.map((amenity, index) => (
                    <span 
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}