'use client'

import { useState, useEffect } from 'react'
import SectorTabs from './SectorTabs'
import LoungerGrid from './LoungerGrid'
import { fetchBeachSectors, fetchSectorLoungers, selectLounger } from '@/lib/api'

interface Lounger {
  id: string
  number: string
  status: 'free' | 'occupied' | 'selected'
  price: number
  imageUrl?: string
  row?: number
  position?: number
}

interface Sector {
  id: string
  name: string
  zoneName: string
  totalLoungers: number
  freeLoungers: number
  isPremium?: boolean
  isVip?: boolean
  loungers: Lounger[]
}

interface BeachSectorViewProps {
  beachId: string
  beachName: string
}

export default function BeachSectorView({ beachId, beachName }: BeachSectorViewProps) {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [activeSector, setActiveSector] = useState<string>('')
  const [currentSectorData, setCurrentSectorData] = useState<Sector | null>(null)
  const [selectedLounger, setSelectedLounger] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sectorLoading, setSectorLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Кеш для загруженных секторов
  const [sectorCache, setSectorCache] = useState<Record<string, Sector>>({})

  // Загрузка списка секторов
  useEffect(() => {
    loadSectors()
  }, [beachId])

  // Автообновление статуса каждые 30 секунд
  useEffect(() => {
    if (!activeSector) return

    const interval = setInterval(() => {
      loadSectorData(activeSector, true) // silent reload
    }, 30000)

    return () => clearInterval(interval)
  }, [activeSector])

  const loadSectors = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Временные данные для демонстрации
      const mockSectors = [
        {
          id: '1',
          name: 'Сектор 1',
          zoneName: 'Центральная зона',
          totalLoungers: 20,
          freeLoungers: 15,
          isPremium: false,
          isVip: false
        },
        {
          id: '2',
          name: 'Сектор 2',
          zoneName: 'Южная зона',
          totalLoungers: 15,
          freeLoungers: 8,
          isPremium: false,
          isVip: false
        },
        {
          id: '3',
          name: 'Премиум',
          zoneName: 'Премиум зона',
          totalLoungers: 10,
          freeLoungers: 6,
          isPremium: true,
          isVip: false
        },
        {
          id: '4',
          name: 'VIP',
          zoneName: 'VIP зона',
          totalLoungers: 8,
          freeLoungers: 3,
          isPremium: false,
          isVip: true
        }
      ]

      setSectors(mockSectors)
      
      // Автоматически выбираем первый доступный сектор
      const firstAvailable = mockSectors.find(s => s.freeLoungers > 0)
      if (firstAvailable) {
        setActiveSector(firstAvailable.id)
        loadSectorData(firstAvailable.id)
      }
    } catch (error) {
      console.error('Ошибка загрузки секторов:', error)
      setError('Не удалось загрузить секторы пляжа')
    } finally {
      setLoading(false)
    }
  }

  const loadSectorData = async (sectorId: string, silent = false) => {
    try {
      if (!silent) {
        setSectorLoading(true)
      }
      
      // Проверяем кеш
      if (sectorCache[sectorId] && !silent) {
        setCurrentSectorData(sectorCache[sectorId])
        setSectorLoading(false)
        return
      }

      // Генерируем временные данные для демонстрации
      const sector = sectors.find(s => s.id === sectorId)
      if (!sector) return

      const loungers: Lounger[] = []
      for (let i = 1; i <= sector.totalLoungers; i++) {
        const isOccupied = Math.random() > 0.7 // 30% заняты
        loungers.push({
          id: `${sectorId}-${i}`,
          number: i.toString(),
          status: isOccupied ? 'occupied' : 'free',
          price: sector.isPremium ? 800 : sector.isVip ? 1200 : 500,
          row: Math.floor((i - 1) / 5) + 1,
          position: ((i - 1) % 5) + 1
        })
      }

      const sectorData: Sector = {
        ...sector,
        loungers
      }

      setCurrentSectorData(sectorData)
      
      // Кешируем данные
      setSectorCache(prev => ({
        ...prev,
        [sectorId]: sectorData
      }))

    } catch (error) {
      console.error('Ошибка загрузки данных сектора:', error)
      if (!silent) {
        setError('Не удалось загрузить данные сектора')
      }
    } finally {
      if (!silent) {
        setSectorLoading(false)
      }
    }
  }

  const handleSectorChange = (sectorId: string) => {
    if (sectorId === activeSector) return
    
    setActiveSector(sectorId)
    setSelectedLounger(null) // Сбрасываем выбор при смене сектора
    loadSectorData(sectorId)
  }

  const handleLoungerSelect = async (loungerId: string) => {
    try {
      setSelectedLounger(loungerId)
      
      // Обновляем состояние локально
      if (currentSectorData) {
        const updatedLoungers = currentSectorData.loungers.map(lounger => ({
          ...lounger,
          status: lounger.id === loungerId ? 'selected' as const : 
                  lounger.status === 'selected' ? 'free' as const : lounger.status
        }))
        
        setCurrentSectorData({
          ...currentSectorData,
          loungers: updatedLoungers
        })
      }

      // Здесь будет вызов API для сохранения выбора
      // await selectLounger(loungerId)
      
    } catch (error) {
      console.error('Ошибка выбора шезлонга:', error)
      setError('Не удалось выбрать шезлонг')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="spinner"></div>
        <span className="ml-3 text-gray-600">Загрузка секторов пляжа...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-red-600 mb-4">❌ {error}</div>
        <button
          onClick={() => loadSectors()}
          className="btn-primary"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{beachName}</h1>
        <p className="text-gray-600">Выберите сектор и забронируйте шезлонг</p>
      </div>

      {/* Навигация по секторам */}
      <SectorTabs
        sectors={sectors}
        activeSector={activeSector}
        onSectorChange={handleSectorChange}
        loading={sectorLoading}
      />

      {/* Сетка шезлонгов */}
      {currentSectorData && (
        <LoungerGrid
          sector={currentSectorData}
          selectedLounger={selectedLounger}
          onLoungerSelect={handleLoungerSelect}
          loading={sectorLoading}
        />
      )}

      {/* Информация о выбранном шезлонге */}
      {selectedLounger && currentSectorData && (
        <div className="fixed bottom-6 right-6 bg-white shadow-2xl rounded-lg p-6 border max-w-sm">
          <h3 className="text-lg font-semibold mb-3">Выбранный шезлонг</h3>
          {(() => {
            const lounger = currentSectorData.loungers.find(l => l.id === selectedLounger)
            if (!lounger) return null
            
            return (
              <div className="space-y-2">
                <p><strong>Номер:</strong> {lounger.number}</p>
                <p><strong>Сектор:</strong> {currentSectorData.name}</p>
                <p><strong>Цена:</strong> ₽{lounger.price}/день</p>
                <div className="pt-4 space-y-2">
                  <button className="w-full btn-primary">
                    Забронировать
                  </button>
                  <button 
                    onClick={() => setSelectedLounger(null)}
                    className="w-full glass-button"
                  >
                    Отменить выбор
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}