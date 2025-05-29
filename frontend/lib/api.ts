import axios from 'axios'
import { Beach, Lounger, Booking, BookingRequest, BeachLayoutData } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://89.111.169.184:3001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Add auth interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Функции для пляжей
export const fetchBeaches = async (): Promise<Beach[]> => {
  try {
    const response = await api.get('/beaches')
    return response.data
  } catch (error) {
    console.error('Ошибка при получении пляжей:', error)
    throw error
  }
}

export const fetchBeachById = async (id: string): Promise<Beach> => {
  try {
    const response = await api.get(`/beaches/${id}`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при получении пляжа ${id}:`, error)
    throw error
  }
}

export const fetchBeachLayout = async (beachId: string): Promise<BeachLayoutData> => {
  try {
    const response = await api.get(`/beaches/${beachId}/layout`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при получении схемы пляжа ${beachId}:`, error)
    throw error
  }
}

// Функции для шезлонгов
export const fetchLoungers = async (beachId?: string): Promise<Lounger[]> => {
  try {
    const url = beachId ? `/loungers?beach_id=${beachId}` : '/loungers'
    const response = await api.get(url)
    return response.data
  } catch (error) {
    console.error('Ошибка при получении шезлонгов:', error)
    throw error
  }
}

export const fetchLoungerById = async (id: string): Promise<Lounger> => {
  try {
    const response = await api.get(`/loungers/${id}`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при получении шезлонга ${id}:`, error)
    throw error
  }
}

// Функции для бронирований
export const createBooking = async (bookingData: BookingRequest): Promise<Booking> => {
  try {
    const response = await api.post('/bookings', bookingData)
    return response.data
  } catch (error) {
    console.error('Ошибка при создании бронирования:', error)
    throw error
  }
}

export const getBookingById = async (id: string): Promise<Booking> => {
  try {
    const response = await api.get(`/bookings/${id}`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при получении бронирования ${id}:`, error)
    throw error
  }
}

// Дополнительные функции (для расширенного функционала)
export const checkLoungerAvailability = async (
  loungerId: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean }> => {
  try {
    const response = await api.get(`/loungers/${loungerId}/availability`, {
      params: { start_time: startTime, end_time: endTime }
    })
    return response.data
  } catch (error) {
    console.error('Ошибка при проверке доступности:', error)
    throw error
  }
}

export const cancelBooking = async (id: string): Promise<Booking> => {
  try {
    const response = await api.patch(`/bookings/${id}/cancel`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при отмене бронирования ${id}:`, error)
    throw error
  }
}

// Legacy API объекты для обратной совместимости
export const beachAPI = {
  getAll: fetchBeaches,
  getById: fetchBeachById,
  getLayout: fetchBeachLayout,
}

export const loungerAPI = {
  getAll: fetchLoungers,
  getById: fetchLoungerById,
  checkAvailability: checkLoungerAvailability,
}

export const bookingAPI = {
  create: createBooking,
  getById: getBookingById,
  cancel: cancelBooking,
}

// Функции для работы с секторами
export const fetchBeachSectors = async (beachId: string) => {
  try {
    const response = await api.get(`/beaches/${beachId}/sectors`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при получении секторов пляжа ${beachId}:`, error)
    throw error
  }
}

export const fetchSectorLoungers = async (beachId: string, sectorId: string) => {
  try {
    const response = await api.get(`/beaches/${beachId}/sectors/${sectorId}/loungers`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при получении шезлонгов сектора ${sectorId}:`, error)
    throw error
  }
}

export const selectLounger = async (loungerId: string) => {
  try {
    const response = await api.post(`/loungers/${loungerId}/select`)
    return response.data
  } catch (error) {
    console.error(`Ошибка при выборе шезлонга ${loungerId}:`, error)
    throw error
  }
}

// API объекты для секторов
export const sectorAPI = {
  getSectors: fetchBeachSectors,
  getSectorLoungers: fetchSectorLoungers,
  selectLounger: selectLounger,
}

// Экспортируем api объект для админ-панели
export { api }