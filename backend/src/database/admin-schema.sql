-- Admin System Schema Migration
-- Добавляет таблицы для административной панели с многоуровневой системой доступа

-- Создание типов для ролей администраторов
CREATE TYPE admin_role AS ENUM ('super_admin', 'beach_admin', 'moderator');
CREATE TYPE qr_scan_result AS ENUM ('success', 'expired', 'invalid', 'already_used', 'error');

-- Таблица администраторов и модераторов
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role admin_role NOT NULL DEFAULT 'moderator',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32)
);

-- Таблица связи пользователь-пляж (для модераторов и администраторов)
CREATE TABLE beach_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    beach_id UUID NOT NULL REFERENCES beaches(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES admin_users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_user_id, beach_id)
);

-- Расширение таблицы пляжей для административной системы
ALTER TABLE beaches ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id);
ALTER TABLE beaches ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE beaches ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE beaches ADD COLUMN IF NOT EXISTS working_hours JSONB;
ALTER TABLE beaches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE beaches ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Таблица истории сканирований QR-кодов
CREATE TABLE qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    scanned_by UUID NOT NULL REFERENCES admin_users(id),
    beach_id UUID NOT NULL REFERENCES beaches(id),
    scan_result qr_scan_result NOT NULL,
    client_arrived BOOLEAN DEFAULT false,
    notes TEXT,
    scan_data JSONB,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица логов административных действий
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Расширение таблицы бронирований для QR-кодов и админ-функций
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS qr_token VARCHAR(255) UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS qr_used_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES admin_users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES admin_users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Обновление статусов бронирований
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed', 'no_show'));

-- Функция для генерации QR токена
CREATE OR REPLACE FUNCTION generate_qr_token(booking_uuid UUID) 
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(
        digest(
            booking_uuid::text || extract(epoch from now())::text || random()::text,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания QR токена при создании бронирования
CREATE OR REPLACE FUNCTION generate_booking_qr_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_token IS NULL THEN
        NEW.qr_token := generate_qr_token(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_qr_token_trigger
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_qr_token();

-- Обновление триггера для updated_at на новых таблицах
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Индексы для оптимизации
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);
CREATE INDEX idx_beach_access_user ON beach_access(admin_user_id);
CREATE INDEX idx_beach_access_beach ON beach_access(beach_id);
CREATE INDEX idx_qr_scans_booking ON qr_scans(booking_id);
CREATE INDEX idx_qr_scans_scanned_by ON qr_scans(scanned_by);
CREATE INDEX idx_qr_scans_beach ON qr_scans(beach_id);
CREATE INDEX idx_qr_scans_date ON qr_scans(scanned_at);
CREATE INDEX idx_audit_log_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_log_date ON admin_audit_log(created_at);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_bookings_qr_token ON bookings(qr_token);
CREATE INDEX idx_beaches_created_by ON beaches(created_by);
CREATE INDEX idx_beaches_active ON beaches(is_active);

-- Создание супер-администратора по умолчанию
-- Пароль: admin123 (рекомендуется изменить после первого входа)
INSERT INTO admin_users (email, password_hash, name, role) VALUES (
    'admin@beachbooking.com',
    '$2b$10$K8qNzKvN0U5OE8qPtN6yNe8YxKvN0U5OE8qPtN6yNe8YxKvN0U5OE',
    'Супер Администратор',
    'super_admin'
);

-- Предоставление доступа супер-админу ко всем пляжам
INSERT INTO beach_access (admin_user_id, beach_id, granted_by)
SELECT 
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1),
    id,
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM beaches;

-- Обновление существующих пляжей - назначаем их супер-админу
UPDATE beaches SET created_by = (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1);

-- Генерация QR токенов для существующих бронирований
UPDATE bookings SET qr_token = generate_qr_token(id) WHERE qr_token IS NULL;