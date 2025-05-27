'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

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
  loungers: Lounger[]
}

interface LoungerGridProps {
  sector: Sector
  selectedLounger: string | null
  onLoungerSelect: (loungerId: string) => void
  loading?: boolean
}

export default function LoungerGrid({ sector, selectedLounger, onLoungerSelect, loading }: LoungerGridProps) {
  const [hoveredLounger, setHoveredLounger] = useState<string | null>(null)

  const handleLoungerClick = (lounger: Lounger) => {
    if (lounger.status === 'occupied') return
    onLoungerSelect(lounger.id)
  }

  const getLoungerImage = (lounger: Lounger) => {
    return lounger.imageUrl || '/images/shez.png'
  }

  const getLoungerClass = (lounger: Lounger) => {
    const baseClass = "relative transition-all duration-300 cursor-pointer"
    
    if (lounger.status === 'occupied') {
      return `${baseClass} cursor-not-allowed filter grayscale opacity-50`
    }
    
    if (selectedLounger === lounger.id || lounger.status === 'selected') {
      return `${baseClass} border-3 border-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse`
    }
    
    if (hoveredLounger === lounger.id) {
      return `${baseClass} transform scale-110 z-10`
    }
    
    return `${baseClass} hover:transform hover:scale-110 hover:z-10`
  }

  // Группируем шезлонги по рядам для создания дорожек
  const groupedLoungers = sector.loungers.reduce((acc, lounger) => {
    const row = lounger.row || Math.floor(parseInt(lounger.number) / 10) + 1
    if (!acc[row]) acc[row] = []
    acc[row].push(lounger)
    return acc
  }, {} as Record<number, Lounger[]>)

  const rows = Object.keys(groupedLoungers).map(Number).sort()

  return (
    <div className="w-full">
      {/* Заголовок сектора */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {sector.name} - {sector.zoneName}
        </h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Всего мест: {sector.loungers.length}</span>
          <span>Свободно: {sector.loungers.filter(l => l.status === 'free').length}</span>
          <span>Занято: {sector.loungers.filter(l => l.status === 'occupied').length}</span>
        </div>
      </div>

      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="spinner"></div>
          <span className="ml-3 text-gray-600">Загрузка шезлонгов...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Море (вверху) */}
          <div className="mb-8 h-20 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-300/60 via-blue-200/80 to-blue-300/60 animate-pulse"></div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white font-semibold">
              🌊 МОРЕ
            </div>
          </div>

          {/* Сетка шезлонгов по рядам */}
          <div className="space-y-6">
            {rows.map((rowNumber, rowIndex) => (
              <div key={rowNumber} className="relative">
                {/* Номер ряда */}
                <div className="absolute -left-12 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-500 writing-vertical">
                  Ряд {rowNumber}
                </div>

                {/* Ряд шезлонгов */}
                <div className="flex flex-wrap justify-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
                  {groupedLoungers[rowNumber].map((lounger, index) => (
                    <div key={lounger.id} className="relative">
                      {/* Шезлонг */}
                      <div
                        className={getLoungerClass(lounger)}
                        onClick={() => handleLoungerClick(lounger)}
                        onMouseEnter={() => setHoveredLounger(lounger.id)}
                        onMouseLeave={() => setHoveredLounger(null)}
                      >
                        {/* Изображение шезлонга */}
                        <div className="relative w-12 h-16 sm:w-14 sm:h-18 md:w-16 md:h-20">
                          <Image
                            src={getLoungerImage(lounger)}
                            alt={`Шезлонг ${lounger.number}`}
                            fill
                            className="object-contain"
                            sizes="(max-width: 640px) 48px, (max-width: 768px) 56px, 64px"
                          />
                          
                          {/* Оверлей для занятых */}
                          {lounger.status === 'occupied' && (
                            <div className="absolute inset-0 bg-red-500/30 rounded"></div>
                          )}
                          
                          {/* Номер шезлонга */}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                            {lounger.number}
                          </div>
                        </div>

                        {/* Тултип при наведении */}
                        {hoveredLounger === lounger.id && (
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap z-20">
                            {lounger.status === 'occupied' ? 'Занято' : `₽${lounger.price}/день`}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                          </div>
                        )}
                      </div>

                      {/* Дорожка между рядами (кроме последнего) */}
                      {rowIndex < rows.length - 1 && index === groupedLoungers[rowNumber].length - 1 && (
                        <div className="absolute -bottom-3 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Дорожка между рядами */}
                {rowIndex < rows.length - 1 && (
                  <div className="h-2 bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2"></div>
                )}
              </div>
            ))}
          </div>

          {/* Легенда */}
          <div className="mt-8 p-4 bg-white rounded-lg border">
            <h4 className="text-lg font-semibold mb-4">Обозначения:</h4>
            <div className="flex flex-wrap gap-6">
              {/* Свободный */}
              <div className="flex items-center space-x-2">
                <div className="relative w-8 h-10">
                  <Image
                    src="/images/shez.png"
                    alt="Свободный"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm text-gray-700">Свободно</span>
              </div>

              {/* Занятый */}
              <div className="flex items-center space-x-2">
                <div className="relative w-8 h-10">
                  <Image
                    src="/images/shez.png"
                    alt="Занятый"
                    fill
                    className="object-contain filter grayscale opacity-50"
                  />
                  <div className="absolute inset-0 bg-red-500/30 rounded"></div>
                </div>
                <span className="text-sm text-gray-700">Занято</span>
              </div>

              {/* Выбранный */}
              <div className="flex items-center space-x-2">
                <div className="relative w-8 h-10 border-2 border-yellow-400 rounded">
                  <Image
                    src="/images/shez.png"
                    alt="Выбранный"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm text-gray-700">Выбрано</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}