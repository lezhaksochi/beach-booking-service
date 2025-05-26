-- Создание базы данных (уже создана в переменных окружения)
-- CREATE DATABASE beach_booking;

-- Подключение к базе данных (автоматически подключаемся к beach_booking)
-- \c beach_booking;

-- Создание таблицы пляжей
CREATE TABLE beaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    location_lat DECIMAL(10,8) NOT NULL,
    location_lng DECIMAL(11,8) NOT NULL,
    image_url VARCHAR(512),
    amenities TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание типов для характеристик шезлонгов
CREATE TYPE lounger_type AS ENUM ('sunbed', 'bungalow');
CREATE TYPE umbrella_type AS ENUM ('with_umbrella', 'without_umbrella');
CREATE TYPE sun_position AS ENUM ('sunny', 'shaded');
CREATE TYPE lounger_class AS ENUM ('standard', 'premium');

-- Создание таблицы шезлонгов
CREATE TABLE loungers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beach_id UUID NOT NULL REFERENCES beaches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type lounger_type NOT NULL DEFAULT 'sunbed',
    row_number INTEGER NOT NULL,
    seat_number INTEGER NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    umbrella umbrella_type NOT NULL DEFAULT 'with_umbrella',
    sun_position sun_position NOT NULL DEFAULT 'sunny',
    class lounger_class NOT NULL DEFAULT 'standard',
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(beach_id, row_number, seat_number)
);

-- Создание таблицы бронирований
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lounger_id UUID NOT NULL REFERENCES loungers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_bookings_lounger_id ON bookings(lounger_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_end_time ON bookings(end_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_loungers_available ON loungers(available);
CREATE INDEX idx_loungers_beach_id ON loungers(beach_id);
CREATE INDEX idx_loungers_row_seat ON loungers(beach_id, row_number, seat_number);
CREATE INDEX idx_beaches_location ON beaches(location_lat, location_lng);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для обновления updated_at
CREATE TRIGGER update_beaches_updated_at BEFORE UPDATE ON beaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loungers_updated_at BEFORE UPDATE ON loungers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка тестовых данных пляжей Сочи
INSERT INTO beaches (name, description, location_lat, location_lng, image_url, amenities) VALUES
('Ривьера', 'Главный городской пляж с развитой инфраструктурой и развлечениями', 43.5985, 39.7192, '/images/beaches/riviera.jpg', ARRAY['wifi', 'restaurant', 'shower', 'parking', 'volleyball']),
('Маяк', 'Живописный пляж у подножия горы с чистым морем', 43.5623, 39.7878, '/images/beaches/mayak.jpg', ARRAY['cafe', 'shower', 'parking', 'jetski']),
('Приморский', 'Центральный пляж с прокатом оборудования и кафе', 43.5889, 39.7203, '/images/beaches/primorsky.jpg', ARRAY['wifi', 'restaurant', 'shower', 'rental', 'parking']),
('Альбатрос', 'Тихий семейный пляж с мелкой галькой', 43.5756, 39.7314, '/images/beaches/albatros.jpg', ARRAY['cafe', 'shower', 'playground', 'parking']),
('Солнечный', 'Современный пляж с VIP-зонами и водными развлечениями', 43.5445, 39.7867, '/images/beaches/sunny.jpg', ARRAY['wifi', 'restaurant', 'vip_zone', 'water_sports', 'parking']);

-- Вставка тестовых шезлонгов и бунгало
DO $$
DECLARE
    beach_record RECORD;
    row_num INTEGER;
    seat_num INTEGER;
    lounger_price DECIMAL(10,2);
    lounger_type_val lounger_type;
    umbrella_val umbrella_type;
    sun_val sun_position;
    class_val lounger_class;
BEGIN
    -- Для каждого пляжа создаем схему расположения
    FOR beach_record IN SELECT id, name FROM beaches
    LOOP
        -- Ряды 1-3: стандартные шезлонги
        FOR row_num IN 1..3
        LOOP
            FOR seat_num IN 1..12
            LOOP
                lounger_price := CASE 
                    WHEN row_num = 1 THEN 400.00  -- первый ряд дороже
                    ELSE 300.00
                END;
                
                umbrella_val := CASE 
                    WHEN seat_num % 3 = 0 THEN 'without_umbrella'::umbrella_type
                    ELSE 'with_umbrella'::umbrella_type
                END;
                
                sun_val := CASE 
                    WHEN seat_num <= 6 THEN 'sunny'::sun_position
                    ELSE 'shaded'::sun_position
                END;
                
                INSERT INTO loungers (
                    beach_id, name, type, row_number, seat_number, 
                    price_per_hour, umbrella, sun_position, class
                ) VALUES (
                    beach_record.id, 
                    'Шезлонг ' || row_num || '-' || seat_num,
                    'sunbed'::lounger_type,
                    row_num, 
                    seat_num, 
                    lounger_price,
                    umbrella_val,
                    sun_val,
                    'standard'::lounger_class
                );
            END LOOP;
        END LOOP;
        
        -- Ряд 4: премиум шезлонги
        FOR seat_num IN 1..8
        LOOP
            INSERT INTO loungers (
                beach_id, name, type, row_number, seat_number, 
                price_per_hour, umbrella, sun_position, class
            ) VALUES (
                beach_record.id, 
                'Премиум ' || seat_num,
                'sunbed'::lounger_type,
                4, 
                seat_num, 
                600.00,
                'with_umbrella'::umbrella_type,
                'shaded'::sun_position,
                'premium'::lounger_class
            );
        END LOOP;
        
        -- Ряд 5: бунгало
        FOR seat_num IN 1..4
        LOOP
            INSERT INTO loungers (
                beach_id, name, type, row_number, seat_number, 
                price_per_hour, umbrella, sun_position, class
            ) VALUES (
                beach_record.id, 
                'Бунгало ' || seat_num,
                'bungalow'::lounger_type,
                5, 
                seat_num, 
                1000.00,
                'with_umbrella'::umbrella_type,
                'shaded'::sun_position,
                'premium'::lounger_class
            );
        END LOOP;
    END LOOP;
END $$;