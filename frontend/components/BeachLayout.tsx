'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Lounger, LoungerBooking, LoungerType, LoungerClass, UmbrellaType, SunPosition } from '@/types'
import { useWebSocket } from '@/lib/websocket'

interface BeachLayoutProps {
  loungers: Lounger[]
  onLoungerSelect: (lounger: Lounger | null) => void
  onLoungersUpdate?: (loungers: Lounger[]) => void
  selectedLounger: Lounger | null
  maxRows: number
  maxSeatsPerRow: number
  beachId?: string
}

interface LoungerIconProps {
  lounger: Lounger
  isSelected: boolean
  onClick: () => void
}

const LoungerIcon = ({ lounger, isSelected, onClick }: LoungerIconProps) => {
  const getIcon = () => {
    if (lounger.type === 'bungalow') {
      return (
        <Image 
          src="/images/bung.png" 
          alt="Бунгало" 
          width={32} 
          height={32}
          className="w-6 h-6 md:w-8 md:h-8"
        />
      )
    }
    return (
      <Image 
        src="/images/shez.png" 
        alt="Шезлонг" 
        width={32} 
        height={32}
        className="w-6 h-6 md:w-8 md:h-8"
      />
    )
  }

  const getStatusClass = () => {
    if (isSelected) return 'lounger-selected'
    if (!lounger.available) return 'lounger-occupied'
    if (lounger.class === 'premium') return 'lounger-premium'
    return 'lounger-available'
  }

  const getTooltipContent = () => {
    const features = []
    if (lounger.umbrella === 'with_umbrella') features.push('☂️ С зонтом')
    if (lounger.sun_position === 'shaded') features.push('🌳 Тень')
    if (lounger.sun_position === 'sunny') features.push('☀️ Солнце')
    if (lounger.class === 'premium') features.push('⭐ Премиум')
    
    const formatBookingTime = (startTime: string, endTime: string) => {
      const start = new Date(startTime)
      const end = new Date(endTime)
      return `${start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    }
    
    return {
      name: lounger.name,
      price: `${lounger.price_per_hour}₽/час`,
      features,
      type: lounger.type === 'bungalow' ? 'Бунгало' : 'Шезлонг',
      bookings: lounger.current_bookings?.map(booking => ({
        time: formatBookingTime(booking.start_time, booking.end_time),
        status: booking.status
      })) || []
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={!lounger.available}
        className={`lounger-icon ${getStatusClass()} relative flex items-center justify-center`}
      >
        {getIcon()}
        
        {/* Зонт */}
        {lounger.umbrella === 'with_umbrella' && (
          <div className="absolute -top-1 -right-1 text-xs">☂️</div>
        )}
        
        {/* Индикатор премиум */}
        {lounger.class === 'premium' && (
          <div className="absolute -top-1 -left-1 text-xs">⭐</div>
        )}
        
        {/* Номер места */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold bg-white/80 rounded px-1">
          {lounger.seat_number}
        </div>
      </button>
      
      {/* Enhanced Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
        <div className="glass-card min-w-48 text-center shadow-xl">
          <div className="text-sm font-bold text-gray-800 mb-1">
            {getTooltipContent().type} #{lounger.seat_number}
          </div>
          <div className="text-lg font-bold text-gradient mb-2">
            {getTooltipContent().price}
          </div>
          <div className="flex flex-wrap gap-1 justify-center mb-2">
            {getTooltipContent().features.map((feature, idx) => (
              <span key={idx} className="text-xs bg-white/30 backdrop-blur-sm px-2 py-1 rounded-full text-gray-700">
                {feature}
              </span>
            ))}
          </div>
          
          {/* Информация о бронированиях */}
          {getTooltipContent().bookings.length > 0 && (
            <div className="border-t border-white/20 pt-2 mt-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">
                📅 Забронировано:
              </div>
              {getTooltipContent().bookings.map((booking, idx) => (
                <div key={idx} className="text-xs text-gray-600 mb-1">
                  <div className="font-medium">🕐 {booking.time}</div>
                </div>
              ))}
            </div>
          )}
          
          {!lounger.available && getTooltipContent().bookings.length === 0 && (
            <div className="mt-2 text-xs text-red-600 font-medium">
              🚫 Занято
            </div>
          )}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/80"></div>
      </div>
    </div>
  )
}

export default function BeachLayout({ 
  loungers: initialLoungers, 
  onLoungerSelect, 
  onLoungersUpdate,
  selectedLounger, 
  maxRows, 
  maxSeatsPerRow,
  beachId
}: BeachLayoutProps) {
  const [loungers, setLoungers] = useState(initialLoungers)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const { ws, subscribe, connect } = useWebSocket()

  // Обновляем локальные шезлонги при изменении пропсов
  useEffect(() => {
    setLoungers(initialLoungers)
  }, [initialLoungers])

  // WebSocket подключение и подписки
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        setConnectionStatus('connecting')
        await connect()
        setConnectionStatus('connected')
        
        // Подписываемся на пляж если указан ID
        if (beachId) {
          ws.send({
            type: 'subscribe_beach',
            data: { beachId }
          })
        }
      } catch (error) {
        console.error('Ошибка WebSocket подключения:', error)
        setConnectionStatus('disconnected')
      }
    }

    connectWebSocket()

    // Подписываемся на события
    const unsubscribeLoungerUpdate = subscribe('lounger_update', (data: any) => {
      const updatedLounger = data.lounger
      setLoungers(prev => prev.map(lounger => 
        lounger.id === updatedLounger.id 
          ? { ...lounger, ...updatedLounger }
          : lounger
      ))
      
      // Уведомляем родительский компонент
      if (onLoungersUpdate) {
        setLoungers(prev => {
          const updated = prev.map(lounger => 
            lounger.id === updatedLounger.id 
              ? { ...lounger, ...updatedLounger }
              : lounger
          )
          onLoungersUpdate(updated)
          return updated
        })
      }
    })

    const unsubscribeBookingUpdate = subscribe('booking_update', (data: any) => {
      console.log('Получено обновление бронирования:', data)
      // Можно добавить уведомления пользователю
    })

    const unsubscribeConnected = subscribe('connected', () => {
      setConnectionStatus('connected')
    })

    const unsubscribeDisconnected = subscribe('disconnected', () => {
      setConnectionStatus('disconnected')
    })

    return () => {
      unsubscribeLoungerUpdate()
      unsubscribeBookingUpdate()
      unsubscribeConnected()
      unsubscribeDisconnected()
    }
  }, [beachId, connect, subscribe, ws, onLoungersUpdate])

  // Организуем шезлонги по рядам
  const loungersByRow = loungers.reduce((acc, lounger) => {
    if (!acc[lounger.row_number]) {
      acc[lounger.row_number] = []
    }
    acc[lounger.row_number].push(lounger)
    return acc
  }, {} as Record<number, Lounger[]>)

  // Сортируем шезлонги в каждом ряду по номеру места
  Object.keys(loungersByRow).forEach(rowKey => {
    loungersByRow[parseInt(rowKey)].sort((a, b) => a.seat_number - b.seat_number)
  })

  const getRowLabel = (rowNumber: number) => {
    const firstLounger = loungersByRow[rowNumber]?.[0]
    if (!firstLounger) return `Ряд ${rowNumber}`
    
    if (firstLounger.type === 'bungalow') return 'Бунгало'
    if (firstLounger.class === 'premium') return `Премиум ряд ${rowNumber}`
    return `Ряд ${rowNumber}`
  }

  const getRowStats = (rowNumber: number) => {
    const rowLoungers = loungersByRow[rowNumber] || []
    const available = rowLoungers.filter(l => l.available).length
    const total = rowLoungers.length
    return { available, total }
  }

  return (
    <div className="w-full">
      {/* Статус подключения */}
      <div className="glass-card mb-4 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <div 
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
            <span>
              {connectionStatus === 'connected' ? 'Подключено к реальному времени' :
               connectionStatus === 'connecting' ? 'Подключение...' :
               'Нет подключения'}
            </span>
          </div>
          {connectionStatus === 'connected' && (
            <div className="text-xs text-gray-500">
              Обновления в реальном времени
            </div>
          )}
        </div>
      </div>

      {/* Легенда */}
      <div className="glass-card mb-8">
        <h3 className="text-lg font-semibold mb-4 text-center">Обозначения</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="lounger-icon lounger-available relative flex items-center justify-center">
              <Image src="/images/shez.png" alt="Доступно" width={24} height={24} className="w-6 h-6" />
            </div>
            <span>Доступно</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="lounger-icon lounger-occupied relative flex items-center justify-center">
              <Image src="/images/shez.png" alt="Занято" width={24} height={24} className="w-6 h-6" />
            </div>
            <span>Занято</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="lounger-icon lounger-premium relative flex items-center justify-center">
              <Image src="/images/shez.png" alt="Премиум" width={24} height={24} className="w-6 h-6" />
              <div className="absolute -top-1 -left-1 text-xs">⭐</div>
            </div>
            <span>Премиум</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="lounger-icon relative flex items-center justify-center">
              <Image src="/images/bung.png" alt="Бунгало" width={24} height={24} className="w-6 h-6" />
            </div>
            <span>Бунгало</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center justify-center space-x-2">
            <span>☂️</span>
            <span>С зонтом</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span>☀️</span>
            <span>Солнечная сторона</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span>🌥️</span>
            <span>Теневая сторона</span>
          </div>
        </div>
      </div>

      {/* Схема пляжа */}
      <div className="glass-card p-6">
        {/* Красивое море с анимированными волнами */}
        <div className="relative mb-8 overflow-hidden rounded-xl">
          {/* Градиентный фон моря */}
          <div className="h-24 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 relative">
            {/* Анимированные волны */}
            <div className="absolute inset-0">
              {/* Первая волна */}
              <div 
                className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-r from-blue-300/60 via-blue-200/80 to-blue-300/60 animate-wave-1"
                style={{
                  clipPath: 'polygon(0% 80%, 15% 60%, 30% 70%, 45% 50%, 60% 65%, 75% 45%, 90% 60%, 100% 40%, 100% 100%, 0% 100%)'
                }}
              />
              {/* Вторая волна */}
              <div 
                className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-r from-white/40 via-blue-100/60 to-white/40 animate-wave-2"
                style={{
                  clipPath: 'polygon(0% 70%, 20% 50%, 40% 60%, 60% 40%, 80% 55%, 100% 35%, 100% 100%, 0% 100%)'
                }}
              />
              {/* Третья волна */}
              <div 
                className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-r from-white/60 via-white/80 to-white/60 animate-wave-3"
                style={{
                  clipPath: 'polygon(0% 60%, 25% 40%, 50% 50%, 75% 30%, 100% 45%, 100% 100%, 0% 100%)'
                }}
              />
            </div>
            
            {/* Пена и блики */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            
            {/* Текст МОРЕ */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white font-bold text-lg tracking-wider drop-shadow-lg">
                М О Р Е
              </div>
            </div>
          </div>
          
          {/* Пляжная линия */}
          <div className="h-2 bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-200" />
        </div>

        <div className="space-y-6">
          {Array.from({ length: maxRows }, (_, i) => i + 1).map((rowNumber) => {
            const rowLoungers = loungersByRow[rowNumber] || []
            const { available, total } = getRowStats(rowNumber)
            
            if (rowLoungers.length === 0) return null

            return (
              <div
                key={rowNumber}
                className={`transition-all duration-300 ${
                  hoveredRow === rowNumber ? 'scale-105' : ''
                }`}
                onMouseEnter={() => setHoveredRow(rowNumber)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Заголовок ряда */}
                <div className="flex items-center justify-between mb-3">
                  <div className="glass-button px-4 py-2 text-sm font-medium">
                    {getRowLabel(rowNumber)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {available} / {total} доступно
                  </div>
                </div>

                {/* Места в ряду */}
                <div 
                  className="lounger-grid justify-center"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(rowLoungers.length, 12)}, 1fr)`,
                    gap: rowLoungers[0]?.type === 'bungalow' ? '2rem' : '1rem'
                  }}
                >
                  {rowLoungers.map((lounger) => (
                    <LoungerIcon
                      key={lounger.id}
                      lounger={lounger}
                      isSelected={selectedLounger?.id === lounger.id}
                      onClick={() => {
                        if (lounger.available) {
                          onLoungerSelect(
                            selectedLounger?.id === lounger.id ? null : lounger
                          )
                        }
                      }}
                    />
                  ))}
                </div>

                {/* Прогресс бар доступности */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(available / total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Индикатор выбранного места */}
        {selectedLounger && (
          <div className="mt-8 p-4 glass border-l-4 border-blue-500 rounded-r-xl">
            <h4 className="font-semibold text-gray-800 mb-2">Выбранное место:</h4>
            <div className="space-y-1 text-sm">
              <div><strong>Место:</strong> {selectedLounger.name}</div>
              <div><strong>Тип:</strong> {selectedLounger.type === 'bungalow' ? 'Бунгало' : 'Шезлонг'}</div>
              <div><strong>Класс:</strong> {selectedLounger.class === 'premium' ? 'Премиум' : 'Стандарт'}</div>
              <div><strong>Зонт:</strong> {selectedLounger.umbrella === 'with_umbrella' ? 'Есть' : 'Нет'}</div>
              <div><strong>Расположение:</strong> {selectedLounger.sun_position === 'sunny' ? 'Солнечная сторона' : 'Теневая сторона'}</div>
              <div><strong>Цена:</strong> <span className="text-lg font-bold text-blue-600">{selectedLounger.price_per_hour}₽/час</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}