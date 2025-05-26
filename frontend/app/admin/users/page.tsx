'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/adminApi'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  is_active: boolean
  created_at: string
  last_login?: string
}

interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'super_admin' | 'beach_admin' | 'moderator'
  is_active: boolean
  created_at: string
  last_login?: string
}

export default function UsersPage() {
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'regular' | 'admin'>('regular')
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'moderator' as 'super_admin' | 'beach_admin' | 'moderator'
  })

  useEffect(() => {
    // Получаем текущего пользователя из localStorage
    const userData = localStorage.getItem('adminUser')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    
    loadUsers()
    loadAdminUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await adminApi.users.getAll()
      console.log('Загруженные пользователи:', data)
      
      if (Array.isArray(data.users)) {
        setUsers(data.users)
      } else if (Array.isArray(data)) {
        setUsers(data)
      } else {
        console.error('Ответ API пользователей не является массивом:', data)
        setUsers([])
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
      setUsers([])
    }
  }

  const loadAdminUsers = async () => {
    try {
      const data = await adminApi.adminUsers.getAll()
      console.log('Загруженные администраторы:', data)
      
      if (Array.isArray(data.adminUsers)) {
        setAdminUsers(data.adminUsers)
      } else if (Array.isArray(data)) {
        setAdminUsers(data)
      } else {
        console.error('Ответ API администраторов не является массивом:', data)
        setAdminUsers([])
      }
    } catch (error) {
      console.error('Ошибка загрузки администраторов:', error)
      setAdminUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminApi.adminUsers.create(newAdmin)
      setShowCreateAdminForm(false)
      setNewAdmin({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'moderator'
      })
      loadAdminUsers()
    } catch (error) {
      console.error('Ошибка создания администратора:', error)
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await adminApi.users.updateStatus(userId, !isActive)
      loadUsers()
    } catch (error) {
      console.error('Ошибка изменения статуса пользователя:', error)
    }
  }

  const toggleAdminStatus = async (adminId: string, isActive: boolean) => {
    try {
      await adminApi.users.updateStatus(adminId, !isActive)
      loadAdminUsers()
    } catch (error) {
      console.error('Ошибка изменения статуса администратора:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Супер-админ'
      case 'beach_admin': return 'Админ пляжа'
      case 'moderator': return 'Модератор'
      default: return role
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Управление пользователями</h1>
        {activeTab === 'admin' && user?.role === 'super_admin' && (
          <button
            onClick={() => setShowCreateAdminForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Создать администратора
          </button>
        )}
      </div>

      {/* Табы */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('regular')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'regular'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Обычные пользователи ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admin'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Администраторы ({adminUsers.length})
          </button>
        </nav>
      </div>

      {/* Форма создания администратора */}
      {showCreateAdminForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Создать администратора</h2>
            <form onSubmit={handleCreateAdmin}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Пароль</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Имя</label>
                  <input
                    type="text"
                    value={newAdmin.first_name}
                    onChange={(e) => setNewAdmin({...newAdmin, first_name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Фамилия</label>
                  <input
                    type="text"
                    value={newAdmin.last_name}
                    onChange={(e) => setNewAdmin({...newAdmin, last_name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Роль</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value as any})}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="moderator">Модератор</option>
                  <option value="beach_admin">Админ пляжа</option>
                  {user?.role === 'super_admin' && (
                    <option value="super_admin">Супер-админ</option>
                  )}
                </select>
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
                  onClick={() => setShowCreateAdminForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Контент табов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {activeTab === 'regular' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Контакты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Регистрация
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Последний вход
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
                {Array.isArray(users) && users.map((regularUser) => (
                  <tr key={regularUser.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {regularUser.first_name} {regularUser.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{regularUser.email}</div>
                      <div className="text-sm text-gray-500">{regularUser.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(regularUser.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {regularUser.last_login ? formatDate(regularUser.last_login) : 'Никогда'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        regularUser.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {regularUser.is_active ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleUserStatus(regularUser.id, regularUser.is_active)}
                        className={`${
                          regularUser.is_active 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {regularUser.is_active ? 'Заблокировать' : 'Разблокировать'}
                      </button>
                    </td>
                  </tr>
                ))}
                {(!Array.isArray(users) || users.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {!Array.isArray(users) ? 'Ошибка загрузки данных' : 'Обычные пользователи не найдены'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Администратор
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создан
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Последний вход
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
                {Array.isArray(adminUsers) && adminUsers.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.first_name} {admin.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getRoleText(admin.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(admin.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.last_login ? formatDate(admin.last_login) : 'Никогда'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        admin.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.is_active ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {admin.id !== user?.id && (
                        <button
                          onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                          className={`${
                            admin.is_active 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {admin.is_active ? 'Заблокировать' : 'Разблокировать'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!Array.isArray(adminUsers) || adminUsers.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {!Array.isArray(adminUsers) ? 'Ошибка загрузки данных' : 'Администраторы не найдены'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}