'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Beach, Lounger, BeachLayoutData, BookingRequest, LoungerType, LoungerClass, UmbrellaType, SunPosition } from '@/types'
import { fetchBeachLayout, createBooking, fetchBeachById } from '@/lib/api'
import BeachLayout from '@/components/BeachLayout'
import BeachSectorView from '@/components/BeachSectorView'
import { format, addHours } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/AuthModal'

interface FilterState {
  types: LoungerType[]
  umbrellas: UmbrellaType[]
  sunPositions: SunPosition[]
  classes: LoungerClass[]
  availability: 'all' | 'available'
}

export default function BeachPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [beach, setBeach] = useState<Beach | null>(null)
  const [layoutData, setLayoutData] = useState<BeachLayoutData | null>(null)
  const [selectedLounger, setSelectedLounger] = useState<Lounger | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [booking, setBooking] = useState(false)
  const [viewMode, setViewMode] = useState<'sectors' | 'classic'>('sectors')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showAuthSelection, setShowAuthSelection] = useState(false)
  const [pendingBooking, setPendingBooking] = useState<{
    lounger: Lounger
    form: any
  } | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    umbrellas: [],
    sunPositions: [],
    classes: [],
    availability: 'all'
  })

  const [bookingForm, setBookingForm] = useState({
    customer_name: user?.name || '',
    customer_phone: user?.phone || '',
    customer_email: '',
    start_time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    duration: 2,
  })

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setBookingForm(prev => ({
        ...prev,
        customer_name: user.name || '',
        customer_phone: user.phone || ''
      }))
    }
  }, [user])

  useEffect(() => {
    const loadBeachData = async () => {
      try {
        // Загружаем основную информацию о пляже
        const beachData = await fetchBeachById(params.id)
        setBeach(beachData)
        
        // Загружаем схему для классического режима
        if (viewMode === 'classic') {
          const layoutData = await fetchBeachLayout(params.id)
          setLayoutData(layoutData)
        }
      } catch (err) {
        setError('Ошибка при загрузке данных пляжа')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadBeachData()
  }, [params.id, viewMode])

  const handleLoungerSelect = (lounger: Lounger | null) => {
    if (lounger && !isAuthenticated) {
      // Save the selected lounger and show auth selection
      setSelectedLounger(lounger)
      setPendingBooking({
        lounger,
        form: bookingForm
      })
      setShowAuthSelection(true)
      return
    }

    setSelectedLounger(lounger)
    if (lounger) {
      setShowBookingForm(true)
    } else {
      setShowBookingForm(false)
    }
  }

  const handleAuthOptionClick = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setShowAuthSelection(false)
    setShowAuthModal(true)
  }

  // Watch for authentication changes
  useEffect(() => {
    if (isAuthenticated && pendingBooking) {
      // User just authenticated, continue with booking
      setSelectedLounger(pendingBooking.lounger)
      setBookingForm(pendingBooking.form)
      setShowBookingForm(true)
      setPendingBooking(null)
      setShowAuthModal(false)
      setShowAuthSelection(false)
    }
  }, [isAuthenticated, pendingBooking])

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLounger) return

    setBooking(true)
    setError(null)

    try {
      const startTime = new Date(bookingForm.start_time)
      const endTime = addHours(startTime, bookingForm.duration)

      const bookingRequest: BookingRequest = {
        lounger_id: selectedLounger.id,
        customer_name: bookingForm.customer_name,
        customer_phone: bookingForm.customer_phone,
        customer_email: bookingForm.customer_email,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      }

      const newBooking = await createBooking(bookingRequest)
      router.push(`/booking/${newBooking.id}?success=true`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при создании бронирования')
    } finally {
      setBooking(false)
    }
  }

  const getTotalPrice = () => {
    if (!selectedLounger) return 0
    return selectedLounger.price_per_hour * bookingForm.duration
  }

  const getFilteredLoungers = () => {
    if (!layoutData) return []
    
    return layoutData.loungers.filter(lounger => {
      // Availability filter
      if (filters.availability === 'available' && !lounger.available) return false
      
      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(lounger.type)) return false
      
      // Umbrella filter
      if (filters.umbrellas.length > 0 && !filters.umbrellas.includes(lounger.umbrella)) return false
      
      // Sun position filter
      if (filters.sunPositions.length > 0 && !filters.sunPositions.includes(lounger.sun_position)) return false
      
      // Class filter
      if (filters.classes.length > 0 && !filters.classes.includes(lounger.class)) return false
      
      return true
    })
  }

  const toggleFilter = (category: keyof FilterState, value: any) => {
    setFilters(prev => {
      if (category === 'availability') {
        return { ...prev, [category]: value as 'all' | 'available' }
      }
      
      const currentArray = prev[category] as any[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      
      return { ...prev, [category]: newArray }
    })
  }

  const resetFilters = () => {
    setFilters({
      types: [],
      umbrellas: [],
      sunPositions: [],
      classes: [],
      availability: 'all'
    })
  }

  const hasActiveFilters = () => {
    return filters.types.length > 0 || 
           filters.umbrellas.length > 0 || 
           filters.sunPositions.length > 0 || 
           filters.classes.length > 0 || 
           filters.availability !== 'all'
  }

  const getAvailableStats = () => {
    if (!layoutData) return { available: 0, total: 0, premium: 0, bungalows: 0 }
    
    const filteredLoungers = getFilteredLoungers()
    const available = filteredLoungers.filter(l => l.available).length
    const premium = filteredLoungers.filter(l => l.class === 'premium' && l.available).length
    const bungalows = filteredLoungers.filter(l => l.type === 'bungalow' && l.available).length
    
    return {
      available,
      total: filteredLoungers.length,
      premium,
      bungalows
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Загрузка схемы пляжа...</div>
        </div>
      </div>
    )
  }

  if (error && !layoutData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <Link href="/" className="btn-primary">
            Вернуться на главную
          </Link>
        </div>
      </div>
    )
  }

  if (!layoutData) return null

  const stats = getAvailableStats()

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Хлебные крошки */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="text-gray-600 hover:text-blue-600">
                Главная
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-800 font-medium">{layoutData.beach.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Переключатель режимов просмотра */}
        <div className="mb-8 flex justify-center">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setViewMode('sectors')}
              className={`
                px-6 py-2 rounded-md font-medium transition-all duration-200
                ${viewMode === 'sectors'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              🏖️ Секторы
            </button>
            <button
              onClick={() => setViewMode('classic')}
              className={`
                px-6 py-2 rounded-md font-medium transition-all duration-200
                ${viewMode === 'classic'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
                }
              `}
            >
              🗺️ Схема
            </button>
          </div>
        </div>

        {/* Режим с секторами */}
        {viewMode === 'sectors' && beach && (
          <BeachSectorView 
            beachId={params.id} 
            beachName={beach.name} 
          />
        )}

        {/* Классический режим */}
        {viewMode === 'classic' && layoutData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Главный контент */}
          <div className="lg:col-span-2">
            {/* Заголовок пляжа */}
            <div className="glass-card mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gradient mb-2">
                    🏖️ {layoutData.beach.name}
                  </h1>
                  <p className="text-gray-600 mb-4">{layoutData.beach.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {layoutData.beach.amenities.map((amenity) => (
                      <span 
                        key={amenity}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-gradient mb-1">{stats.available}</div>
                <div className="text-sm text-gray-600">Доступно</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-gradient-orange mb-1">{stats.premium}</div>
                <div className="text-sm text-gray-600">Премиум</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-gradient-purple mb-1">{stats.bungalows}</div>
                <div className="text-sm text-gray-600">Бунгало</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-gray-800 mb-1">{stats.total}</div>
                <div className="text-sm text-gray-600">Всего мест</div>
              </div>
            </div>

            {/* Фильтры */}
            <div className="glass-card mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">🔍 Фильтры</h3>
                {hasActiveFilters() && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Сбросить все
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Доступность */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Доступность</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFilter('availability', 'all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.availability === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Все
                    </button>
                    <button
                      onClick={() => toggleFilter('availability', 'available')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.availability === 'available'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Только свободные
                    </button>
                  </div>
                </div>

                {/* Тип */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Тип</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFilter('types', 'chair')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.types.includes('chair')
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🏖️ Шезлонг
                    </button>
                    <button
                      onClick={() => toggleFilter('types', 'bungalow')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.types.includes('bungalow')
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🏠 Бунгало
                    </button>
                  </div>
                </div>

                {/* Зонт */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Зонт</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFilter('umbrellas', 'with_umbrella')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.umbrellas.includes('with_umbrella')
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ☂️ С зонтом
                    </button>
                    <button
                      onClick={() => toggleFilter('umbrellas', 'without_umbrella')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.umbrellas.includes('without_umbrella')
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🌞 Без зонта
                    </button>
                  </div>
                </div>

                {/* Расположение */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Расположение</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFilter('sunPositions', 'sunny')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.sunPositions.includes('sunny')
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ☀️ Солнце
                    </button>
                    <button
                      onClick={() => toggleFilter('sunPositions', 'shaded')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.sunPositions.includes('shaded')
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🌳 Тень
                    </button>
                  </div>
                </div>

                {/* Класс */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Класс</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFilter('classes', 'standard')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.classes.includes('standard')
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Стандарт
                    </button>
                    <button
                      onClick={() => toggleFilter('classes', 'premium')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.classes.includes('premium')
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ⭐ Премиум
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Найдено мест: <span className="font-semibold text-blue-600">{getFilteredLoungers().length}</span>
                </div>
              </div>
            </div>

            {/* Схема расположения */}
            <BeachLayout
              loungers={getFilteredLoungers()}
              onLoungerSelect={handleLoungerSelect}
              onLoungersUpdate={(updatedLoungers) => {
                setLayoutData(prev => prev ? { ...prev, loungers: updatedLoungers } : null)
              }}
              selectedLounger={selectedLounger}
              maxRows={layoutData.maxRows}
              maxSeatsPerRow={layoutData.maxSeatsPerRow}
              beachId={params.id}
            />
          </div>

          {/* Боковая панель */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Форма бронирования */}
              {showBookingForm && selectedLounger ? (
                <div className="glass-card">
                  <h3 className="text-xl font-bold mb-4 text-center">
                    Бронирование места
                  </h3>

                  {isAuthenticated && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span className="text-sm text-green-800">
                          Данные заполнены автоматически из вашего профиля
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ваше имя *
                      </label>
                      <input
                        type="text"
                        required
                        value={bookingForm.customer_name}
                        onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                        readOnly={isAuthenticated}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isAuthenticated ? 'bg-gray-100 cursor-not-allowed' : 'bg-white/50'
                        }`}
                        placeholder="Введите ваше имя"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Телефон *
                      </label>
                      <input
                        type="tel"
                        required
                        value={bookingForm.customer_phone}
                        onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })}
                        readOnly={isAuthenticated}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isAuthenticated ? 'bg-gray-100 cursor-not-allowed' : 'bg-white/50'
                        }`}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>

                    {!isAuthenticated && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={bookingForm.customer_email}
                          onChange={(e) => setBookingForm({ ...bookingForm, customer_email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50"
                          placeholder="your@email.com"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Начало бронирования *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={bookingForm.start_time}
                        onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Продолжительность *
                      </label>
                      <select
                        value={bookingForm.duration}
                        onChange={(e) => setBookingForm({ ...bookingForm, duration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(hours => (
                          <option key={hours} value={hours}>
                            {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="glass border-l-4 border-blue-500 rounded-r-lg p-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Итого:</span>
                        <span className="text-blue-600">{getTotalPrice()}₽</span>
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    <div className="space-y-3">
                      <button
                        type="submit"
                        disabled={booking}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {booking ? 'Создание бронирования...' : 'Забронировать место'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleLoungerSelect(null)}
                        className="w-full glass-button"
                      >
                        Отменить выбор
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="glass-card text-center py-8">
                  <div className="text-4xl mb-4">👆</div>
                  <h3 className="text-lg font-semibold mb-2">Выберите место</h3>
                  <p className="text-gray-600">
                    Нажмите на свободное место на схеме пляжа для бронирования
                  </p>
                </div>
              )}

              {/* Информация о ценах */}
              <div className="glass-card">
                <h3 className="text-lg font-bold mb-4">Цены</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Стандарт (1-3 ряд)</span>
                    <span className="font-semibold">300-400₽/час</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Премиум (4 ряд)</span>
                    <span className="font-semibold">600₽/час</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Бунгало (5 ряд)</span>
                    <span className="font-semibold">1000₽/час</span>
                  </div>
                </div>
              </div>

              {/* Контакты */}
              <div className="glass-card">
                <h3 className="text-lg font-bold mb-4">Нужна помощь?</h3>
                <div className="space-y-2 text-sm">
                  <div>📞 +7 (862) 123-45-67</div>
                  <div>📧 help@sochibeach.ru</div>
                  <div>🕒 Круглосуточно</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Selection Modal */}
        {showAuthSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="glass-card max-w-md w-full">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-bold text-gradient mb-2">
                  Для бронирования необходимо войти в систему
                </h3>
                <p className="text-gray-600">
                  Выберите способ входа или зарегистрируйтесь, чтобы продолжить
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleAuthOptionClick('login')}
                  className="w-full btn-primary py-3"
                >
                  🔓 Войти
                </button>
                <button
                  onClick={() => handleAuthOptionClick('register')}
                  className="w-full glass-button py-3"
                >
                  📝 Зарегистрироваться
                </button>
                <button
                  onClick={() => {
                    setShowAuthSelection(false)
                    setPendingBooking(null)
                    setSelectedLounger(null)
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 py-2"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            mode={authMode}
            onClose={() => {
              setShowAuthModal(false)
              setPendingBooking(null)
              setSelectedLounger(null)
            }}
            onSwitchMode={(mode) => setAuthMode(mode)}
          />
        )}
      </div>
    </div>
  )
}