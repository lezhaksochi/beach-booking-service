const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

class AdminApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'AdminApiError'
  }
}

async function adminRequest(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
  
  if (!token) {
    // Перенаправляем на страницу входа если нет токена
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }
    throw new AdminApiError('Не авторизован', 401)
  }

  const url = `${API_BASE_URL}/admin${endpoint}`
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  }

  console.log(`Admin API: ${config.method || 'GET'} ${url}`)

  try {
    const response = await fetch(url, config)
    
    console.log(`Admin API Response: ${response.status} ${response.statusText}`)

    if (response.status === 401) {
      // Токен истек или недействителен
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
      }
      throw new AdminApiError('Не авторизован', 401)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      throw new AdminApiError(errorData.error || `HTTP ${response.status}`, response.status)
    }

    const data = await response.json()
    console.log('Admin API Data:', data)
    
    return data
  } catch (error) {
    console.error('Admin API Error:', error)
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(error instanceof Error ? error.message : 'Ошибка сети')
  }
}

export const adminApi = {
  // Аутентификация
  auth: {
    async login(email: string, password: string) {
      const response = await adminRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      
      if (typeof window !== 'undefined' && response.token) {
        localStorage.setItem('adminToken', response.token)
      }
      
      return response
    },

    async getProfile() {
      return adminRequest('/auth/profile')
    },

    async verifyToken() {
      return adminRequest('/auth/verify')
    },

    logout() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
      }
    }
  },

  // Пляжи
  beaches: {
    async getAll() {
      return adminRequest('/beaches')
    },

    async getById(id: string) {
      return adminRequest(`/beaches/${id}`)
    },

    async create(beachData: any) {
      return adminRequest('/beaches', {
        method: 'POST',
        body: JSON.stringify(beachData),
      })
    },

    async update(id: string, beachData: any) {
      return adminRequest(`/beaches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(beachData),
      })
    },

    async delete(id: string) {
      return adminRequest(`/beaches/${id}`, {
        method: 'DELETE',
      })
    }
  },

  // Пользователи
  users: {
    async getAll() {
      return adminRequest('/users')
    },

    async updateStatus(id: string, is_active: boolean) {
      return adminRequest(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      })
    }
  },

  // Администраторы
  adminUsers: {
    async getAll() {
      return adminRequest('/admin-users')
    },

    async create(adminData: any) {
      return adminRequest('/admin-users', {
        method: 'POST',
        body: JSON.stringify(adminData),
      })
    },

    async updateStatus(id: string, is_active: boolean) {
      return adminRequest(`/admin-users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      })
    }
  },

  // Бронирования
  bookings: {
    async getAll() {
      return adminRequest('/bookings')
    },

    async updateStatus(id: string, status: string) {
      return adminRequest(`/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },

    async cancelBooking(bookingId: string, reason?: string) {
      return adminRequest(`/bookings/${bookingId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason })
      })
    }
  },

  // Статистика
  stats: {
    async getDashboard() {
      return adminRequest('/dashboard')
    },

    async getBeachStats(beachId: string) {
      return adminRequest(`/beaches/${beachId}/stats`)
    }
  },

  // QR сканирование
  qr: {
    async scan(qrToken: string, beachId?: string, notes?: string) {
      return adminRequest('/qr/scan', {
        method: 'POST',
        body: JSON.stringify({ qrToken, beachId, notes }),
      })
    },

    async getScanHistory(beachId: string, params?: any) {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      return adminRequest(`/beaches/${beachId}/qr-scans${query}`)
    }
  }
}

export default adminApi