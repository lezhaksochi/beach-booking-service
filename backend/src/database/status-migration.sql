-- Миграция для унификации статусов бронирований и добавления логирования отмен

BEGIN;

-- Добавляем новые статусы в enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending'; 
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no-show';

-- Добавляем поля для логирования отмен
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id);

-- Обновляем существующие записи: переименовываем 'active' в 'confirmed'
UPDATE bookings SET status = 'confirmed' WHERE status = 'active';

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by ON bookings(cancelled_by);

-- Создаем функцию для автоматического завершения старых бронирований
CREATE OR REPLACE FUNCTION update_booking_status_to_completed()
RETURNS void AS $$
BEGIN
    UPDATE bookings 
    SET status = 'completed'
    WHERE status = 'confirmed' 
      AND end_time < NOW()
      AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

COMMIT;