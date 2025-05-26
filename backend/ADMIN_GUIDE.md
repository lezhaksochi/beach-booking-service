# 🔐 Руководство администратора Beach Booking System

## Учетные данные по умолчанию

**Супер-администратор:**
- Email: `admin@beachbooking.com`
- Пароль: `admin123`
- Роль: `super_admin`

⚠️ **ВАЖНО**: Смените пароль после первого входа!

## Доступ к административной панели

### Веб-интерфейс
- URL: http://localhost:3000/admin/login
- Введите email и пароль
- После входа вы попадете на дашборд

### API endpoints
- Базовый URL: http://localhost:3001/api/admin
- Авторизация: `POST /api/admin/auth/login`
- Дашборд: `GET /api/admin/dashboard`

## Роли и права доступа

### 🦸‍♂️ Супер-администратор (`super_admin`)
- ✅ Полный доступ ко всем функциям
- ✅ Создание/удаление администраторов
- ✅ Просмотр всех пляжей в системе
- ✅ Просмотр логов и аудита

### 👨‍💼 Администратор пляжа (`beach_admin`)
- ✅ Создание новых пляжей
- ✅ Полное управление созданными пляжами
- ✅ Назначение модераторов для своих пляжей
- ✅ Просмотр статистики своих пляжей
- ❌ Управление другими администраторами

### 👨‍💻 Модератор (`moderator`)
- ✅ Доступ только к назначенным пляжам
- ✅ Сканирование QR-кодов
- ✅ Просмотр и управление бронированиями
- ❌ Создание пляжей
- ❌ Назначение других модераторов

## Создание новых администраторов

### Через скрипт (рекомендуется)
```bash
cd backend
node src/scripts/createAdmin.js
```

### Через API
```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.admin@example.com",
    "password": "secure_password",
    "name": "Новый Администратор",
    "phone": "+79991234567",
    "role": "beach_admin"
  }'
```

## Управление доступом к пляжам

### Предоставление доступа модератору
```bash
curl -X POST http://localhost:3001/api/admin/beaches/BEACH_ID/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "MODERATOR_USER_ID"
  }'
```

### Отзыв доступа
```bash
curl -X DELETE http://localhost:3001/api/admin/beaches/BEACH_ID/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## QR-сканирование

### Веб-сканер
1. Перейдите в админ-панель: http://localhost:3000/admin/qr-scanner
2. Выберите пляж из списка
3. Используйте камеру или введите код вручную

### API сканирования
```bash
curl -X POST http://localhost:3001/api/admin/qr/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "QR_TOKEN_FROM_BOOKING",
    "beachId": "BEACH_ID",
    "notes": "Дополнительные заметки"
  }'
```

## Управление пляжами

### Создание пляжа
```bash
curl -X POST http://localhost:3001/api/admin/beaches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новый пляж",
    "description": "Описание пляжа",
    "location_lat": 43.5985,
    "location_lng": 39.7192,
    "contact_phone": "+79991234567",
    "contact_email": "beach@example.com",
    "working_hours": {
      "open": "08:00",
      "close": "22:00"
    }
  }'
```

## Статистика и отчеты

### Дашборд
- GET `/api/admin/dashboard` - общая статистика

### Статистика пляжа
- GET `/api/admin/beaches/BEACH_ID/stats?period=7d` - статистика за период

### Отчеты
- GET `/api/admin/reports/bookings?start_date=2025-01-01&end_date=2025-01-31`
- GET `/api/admin/reports/revenue?start_date=2025-01-01&end_date=2025-01-31`

## Безопасность

### Смена пароля
```bash
curl -X POST http://localhost:3001/api/admin/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "old_password",
    "newPassword": "new_secure_password"
  }'
```

### Просмотр логов (только супер-админ)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/admin/audit-log?limit=100"
```

## Устранение неполадок

### Проблемы с авторизацией
1. Проверьте правильность email и пароля
2. Убедитесь, что аккаунт активен
3. Проверьте подключение к базе данных

### Сброс пароля администратора
```bash
cd backend
psql -h localhost -U postgres -d beach_booking -c "
  UPDATE admin_users 
  SET password_hash = '\$2b\$12\$qH3CgOwJ9GSRCV5tGfsHoO5NrbXW1bkw0G7Nwp2xXQL/azjXqQfb.' 
  WHERE email = 'admin@beachbooking.com';
"
```
(Пароль сбросится на `admin123`)

### Проверка состояния системы
```bash
# Проверка API
curl http://localhost:3001/health

# Проверка базы данных
psql -h localhost -U postgres -d beach_booking -c "SELECT COUNT(*) FROM admin_users;"

# Просмотр логов сервера
tail -f backend/server.log
```

## Контакты поддержки

При возникновении проблем:
1. Проверьте логи сервера
2. Убедитесь в корректности конфигурации
3. Обратитесь к разработчику системы

---

📝 **Версия документа**: 1.0  
📅 **Последнее обновление**: 25.05.2025  
🔄 **Статус**: Актуально