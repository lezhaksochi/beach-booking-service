export type LoungerType = 'chair' | 'bungalow'
export type UmbrellaType = 'with_umbrella' | 'without_umbrella'
export type SunPosition = 'sunny' | 'shaded'
export type LoungerClass = 'standard' | 'premium'

export interface Beach {
  id: string
  name: string
  description: string
  location_lat: number
  location_lng: number
  image_url?: string
  amenities: string[]
  created_at: string
  updated_at: string
  created_by?: string
  is_active?: boolean
  loungers_count?: string | number
  available_loungers?: string | number
  creator_name?: string
}

export interface LoungerBooking {
  id: string
  customer_name: string
  start_time: string
  end_time: string
  status: string
}

export interface Lounger {
  id: string
  beach_id: string
  name: string
  type: LoungerType
  row_number: number
  seat_number: number
  price_per_hour: number
  umbrella: UmbrellaType
  sun_position: SunPosition
  class: LoungerClass
  available: boolean
  created_at: string
  updated_at: string
  current_bookings?: LoungerBooking[]
  // Для отображения
  beach?: Beach
}

export interface Booking {
  id: string
  lounger_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  start_time: string
  end_time: string
  total_price: number
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  simple_code?: string
  // Для отображения
  lounger?: Lounger
  lounger_name?: string
  beach_name?: string
}

export interface BookingRequest {
  lounger_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  start_time: string
  end_time: string
}

export interface BeachLayoutData {
  beach: Beach
  loungers: Lounger[]
  maxRows: number
  maxSeatsPerRow: number
}

export interface WebSocketMessage {
  type: 'booking_update' | 'lounger_update' | 'availability_update' | 'subscribe_beach'
  data: any
}