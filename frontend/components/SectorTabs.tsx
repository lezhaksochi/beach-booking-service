'use client'

import { useState, useEffect } from 'react'

interface Sector {
  id: string
  name: string
  zoneName: string
  totalLoungers: number
  freeLoungers: number
  isPremium?: boolean
  isVip?: boolean
}

interface SectorTabsProps {
  sectors: Sector[]
  activeSector: string
  onSectorChange: (sectorId: string) => void
  loading?: boolean
}

export default function SectorTabs({ sectors, activeSector, onSectorChange, loading }: SectorTabsProps) {
  return (
    <div className="w-full mb-6">
      {/* Заголовок */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Выберите сектор пляжа</h3>
        <p className="text-gray-600">Каждый сектор имеет свою зону и уровень комфорта</p>
      </div>

      {/* Табы секторов */}
      <div className="flex overflow-x-auto scrollbar-hide pb-2">
        <div className="flex space-x-2 min-w-max">
          {sectors.map((sector) => (
            <button
              key={sector.id}
              onClick={() => onSectorChange(sector.id)}
              disabled={loading}
              className={`
                relative flex flex-col items-center min-w-[140px] px-4 py-3 rounded-t-lg transition-all duration-300
                ${activeSector === sector.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${sector.isPremium ? 'border-2 border-amber-400' : ''}
                ${sector.isVip ? 'border-2 border-purple-400' : ''}
              `}
            >
              {/* Название сектора */}
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {sector.isPremium ? '⭐ Премиум' : sector.isVip ? '👑 VIP' : sector.name}
                </span>
                
                {/* Бейдж доступности */}
                <div className={`
                  absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold
                  ${sector.freeLoungers > 0
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  }
                `}>
                  {sector.freeLoungers}/{sector.totalLoungers}
                </div>
              </div>

              {/* Название зоны */}
              <span className="text-xs mt-1 opacity-80">
                {sector.zoneName}
              </span>

              {/* Индикатор загрузки */}
              {loading && activeSector === sector.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-t-lg">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Индикатор активной зоны */}
      <div className={`
        h-1 bg-blue-500 rounded-b-lg transition-all duration-300
        ${activeSector ? 'opacity-100' : 'opacity-0'}
      `}></div>
    </div>
  )
}