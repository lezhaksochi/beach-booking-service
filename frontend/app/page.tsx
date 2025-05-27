'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Beach } from '@/types'
import { fetchBeaches } from '@/lib/api'
import { getAmenityInfo } from '@/lib/amenities'

export default function Home() {
  const [beaches, setBeaches] = useState<Beach[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBeach, setSelectedBeach] = useState<Beach | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  useEffect(() => {
    const loadBeaches = async () => {
      try {
        const data = await fetchBeaches()
        setBeaches(data)
      } catch (error) {
        console.error('Ошибка загрузки пляжей:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBeaches()
  }, [])

  const buildRouteWithGeolocation = async (beach: Beach) => {
    setGeoLoading(true)
    setGeoError(null)

    if (!navigator.geolocation) {
      setGeoError('Геолокация не поддерживается вашим браузером')
      setGeoLoading(false)
      // Fallback to default route
      window.open(`https://yandex.ru/maps/?rtext=~${beach.location_lat},${beach.location_lng}&rtt=auto`, '_blank')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const routeUrl = `https://yandex.ru/maps/?rtext=${latitude},${longitude}~${beach.location_lat},${beach.location_lng}&rtt=auto`
        window.open(routeUrl, '_blank')
        setGeoLoading(false)
      },
      (error) => {
        console.error('Ошибка геолокации:', error)
        let errorMessage = 'Не удалось определить ваше местоположение'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещен'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Местоположение недоступно'
            break
          case error.TIMEOUT:
            errorMessage = 'Время ожидания истекло'
            break
        }
        
        setGeoError(errorMessage)
        setGeoLoading(false)
        
        // Fallback to default route after 3 seconds
        setTimeout(() => {
          window.open(`https://yandex.ru/maps/?rtext=~${beach.location_lat},${beach.location_lng}&rtt=auto`, '_blank')
          setGeoError(null)
        }, 3000)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="bounce-in">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6">
              🏖️ Пляжи Сочи
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 leading-relaxed px-4">
              Забронируйте лучшие места на самых красивых пляжах Сочи.
              <br className="hidden sm:block" />
              <span className="block sm:inline">Современный сервис с реальным временем и удобной оплатой.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#beaches" 
                className="btn-primary inline-flex items-center justify-center"
              >
                <span>Выбрать пляж</span>
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
              <button className="glass-button text-white">
                <span>Как это работает</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient mb-4">
              Почему выбирают нас?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Мы предлагаем самый удобный способ бронирования мест на пляжах Сочи
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-hover text-center">
              <div className="text-5xl mb-6">🎯</div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Реальное время</h3>
              <p className="text-gray-600">
                Мгновенные обновления о доступности мест через WebSocket подключение
              </p>
            </div>
            
            <div className="card-hover text-center">
              <div className="text-5xl mb-6">🏆</div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Лучшие пляжи</h3>
              <p className="text-gray-600">
                5 популярных пляжей Сочи с разными типами мест и удобствами
              </p>
            </div>
            
            <div className="card-hover text-center">
              <div className="text-5xl mb-6">⚡</div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Быстро и просто</h3>
              <p className="text-gray-600">
                Бронирование за пару кликов без регистрации и сложных форм
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Beaches Map Section */}
      <section id="beaches" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-16 fade-in">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient mb-4">
              Карта пляжей Сочи
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Выберите пляж и посмотрите доступные места
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="spinner"></div>
              <span className="ml-3 text-gray-600">Загрузка пляжей...</span>
            </div>
          ) : (
            <div className="beach-grid">
              {beaches.map((beach, index) => (
                <div 
                  key={beach.id} 
                  className="card-hover group"
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className="relative overflow-hidden rounded-t-2xl h-48 bg-gradient-to-br from-blue-400 to-cyan-500">
                    {beach.imageUrl ? (
                      <img 
                        src={beach.imageUrl} 
                        alt={beach.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-6xl opacity-50">🏖️</div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <h3 className="text-white text-xl font-bold">{beach.name}</h3>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {beach.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {beach.amenities.slice(0, 3).map((amenity) => {
                        const amenityInfo = getAmenityInfo(amenity);
                        return (
                          <span 
                            key={amenity}
                            className="px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-sm font-semibold text-gray-800 shadow-sm border border-white/50"
                          >
                            {amenityInfo.icon} {amenityInfo.name}
                          </span>
                        );
                      })}
                      {beach.amenities.length > 3 && (
                        <span className="px-3 py-1 bg-white/95 backdrop-blur-sm text-gray-700 rounded-full text-sm font-semibold shadow-sm border border-white/50">
                          +{beach.amenities.length - 3}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href={`/beaches/${beach.id}`}
                        className="btn-primary flex-1 text-center py-3 text-sm sm:text-base"
                      >
                        🏖️ Выбрать места
                      </Link>
                      <button 
                        onClick={() => setSelectedBeach(beach)}
                        className="glass-button px-4 py-3 text-sm sm:text-base sm:px-4"
                      >
                        📍 Карта
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-12">
              Цифры говорят сами за себя
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">200+</div>
                <div className="text-gray-600">Шезлонгов</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient-orange mb-2">5</div>
                <div className="text-gray-600">Пляжей</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient-purple mb-2">24/7</div>
                <div className="text-gray-600">Поддержка</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">100%</div>
                <div className="text-gray-600">Гарантия</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beach Info Modal */}
      {selectedBeach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gradient">{selectedBeach.name}</h3>
              <button
                onClick={() => setSelectedBeach(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-600 mb-6 text-lg leading-relaxed">{selectedBeach.description}</p>
            
            {/* Beach amenities */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">🏖️ Удобства пляжа</h4>
              <div className="flex flex-wrap gap-2">
                {selectedBeach.amenities.map((amenity) => {
                  const amenityInfo = getAmenityInfo(amenity);
                  return (
                    <span 
                      key={amenity}
                      className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${amenityInfo.bgClass} backdrop-blur-sm`}
                    >
                      {amenityInfo.icon} {amenityInfo.name}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Yandex Maps integration */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">🗺️ Местоположение</h4>
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <div className="text-gray-600 mb-3">г. Сочи, Краснодарский край</div>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => buildRouteWithGeolocation(selectedBeach)}
                    disabled={geoLoading}
                    className="glass-button text-sm px-4 py-2 disabled:opacity-50"
                  >
                    {geoLoading ? (
                      <>
                        <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Определение...
                      </>
                    ) : (
                      '🚗 Построить маршрут'
                    )}
                  </button>
                  <a 
                    href={`https://yandex.ru/maps/?ll=${selectedBeach.location_lng},${selectedBeach.location_lat}&z=16&l=map`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-button text-sm px-4 py-2"
                  >
                    📍 Открыть карту
                  </a>
                </div>
                
                {/* Geolocation error notification */}
                {geoError && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
                    <div className="flex items-center">
                      <span className="mr-2">⚠️</span>
                      {geoError}
                    </div>
                    <div className="mt-1 text-xs text-red-600">
                      Через 3 секунды откроется стандартный маршрут
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Link
                href={`/beaches/${selectedBeach.id}`}
                className="btn-primary flex-1 text-center py-3"
                onClick={() => setSelectedBeach(null)}
              >
                🏖️ Перейти к бронированию
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}