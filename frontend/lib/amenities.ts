export interface AmenityInfo {
  name: string
  icon: string
  color: string
  bgColor: string
  bgClass: string
}

export const amenityTranslations: Record<string, AmenityInfo> = {
  wifi: {
    name: 'Wi-Fi',
    icon: '📶',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    bgClass: 'bg-blue-500'
  },
  restaurant: {
    name: 'Ресторан',
    icon: '🍽️',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    bgClass: 'bg-orange-500'
  },
  shower: {
    name: 'Душ',
    icon: '🚿',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    bgClass: 'bg-cyan-500'
  },
  parking: {
    name: 'Парковка',
    icon: '🚗',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    bgClass: 'bg-gray-500'
  },
  volleyball: {
    name: 'Волейбол',
    icon: '🏐',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    bgClass: 'bg-yellow-500'
  },
  cafe: {
    name: 'Кафе',
    icon: '☕',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    bgClass: 'bg-amber-500'
  },
  jetski: {
    name: 'Водные лыжи',
    icon: '🏄',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    bgClass: 'bg-blue-600'
  },
  rental: {
    name: 'Прокат',
    icon: '🏖️',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    bgClass: 'bg-teal-500'
  },
  playground: {
    name: 'Детская площадка',
    icon: '🎪',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    bgClass: 'bg-pink-500'
  },
  vip_zone: {
    name: 'VIP зона',
    icon: '👑',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    bgClass: 'bg-purple-500'
  },
  water_sports: {
    name: 'Водные виды спорта',
    icon: '🌊',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    bgClass: 'bg-indigo-500'
  }
}

export const getAmenityInfo = (amenity: string): AmenityInfo => {
  return amenityTranslations[amenity] || {
    name: amenity,
    icon: '🏖️',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    bgClass: 'bg-gray-500'
  }
}