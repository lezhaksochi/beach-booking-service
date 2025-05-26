# 🏖️ Sochi Beach Booking

Современный сервис бронирования шезлонгов и бунгало на лучших пляжах Сочи с реальным временем и интерактивными схемами расположения.

## ✨ Особенности

- 🗺️ **Интерактивная карта пляжей Сочи** - 5 популярных пляжей с детальной информацией
- 🎭 **Схемы расположения как в кинотеатре** - наглядное отображение рядов и мест
- ⚡ **Реальное время через WebSocket** - мгновенные обновления доступности
- 🎨 **Современный дизайн** - glassmorphism эффекты, градиенты, анимации
- 📱 **Мобильная адаптивность** - отзывчивый дизайн для всех устройств
- 🏠 **Разные типы мест** - шезлонги и бунгало с различными характеристиками
- 🌟 **Премиум сервис** - стандартные и премиум места с дополнительными удобствами

## 🛠️ Технологии

**Frontend:**
- Next.js 14 (App Router)
- Tailwind CSS
- TypeScript
- WebSocket для реального времени
- Современный дизайн с glassmorphism

**Backend:**
- Node.js
- Express.js
- PostgreSQL с расширенной схемой
- WebSocket Server (ws)
- Joi для валидации

**DevOps:**
- Docker & Docker Compose
- PostgreSQL в контейнере

## 🚀 Быстрый старт

### Предварительные требования
- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)

### Запуск через Docker Compose

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd beach-booking-service
```

2. Создайте файл окружения для backend:
```bash
cp backend/.env.example backend/.env
```

3. Запустите все сервисы:
```bash
docker-compose up -d
```

4. Дождитесь инициализации базы данных и запуска всех сервисов.

### Доступ к приложению

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **WebSocket:** ws://localhost:3001/ws
- **PostgreSQL:** localhost:5432

## 🏖️ Пляжи Сочи

Сервис включает 5 популярных пляжей:

1. **Ривьера** - Главный городской пляж с развитой инфраструктурой
2. **Маяк** - Живописный пляж у подножия горы
3. **Приморский** - Центральный пляж с прокатом оборудования
4. **Альбатрос** - Тихий семейный пляж
5. **Солнечный** - Современный пляж с VIP-зонами

### Типы мест

- **🏖️ Шезлонги стандарт** (300-400₽/час) - Ряды 1-3
- **⭐ Шезлонги премиум** (600₽/час) - Ряд 4
- **🏠 Бунгало** (1000₽/час) - Ряд 5

### Характеристики

- **☂️ С зонтом / без зонта**
- **☀️ Солнечная / 🌥️ теневая сторона**
- **🌟 Стандарт / премиум класс**

## 📡 API Endpoints

#### Пляжи
- `GET /api/beaches` - Получить все пляжи
- `GET /api/beaches/:id` - Получить пляж по ID  
- `GET /api/beaches/:id/layout` - Получить схему расположения пляжа

#### Шезлонги
- `GET /api/loungers` - Получить все шезлонги
- `GET /api/loungers?beach_id=:id` - Получить шезлонги пляжа
- `GET /api/loungers/:id` - Получить шезлонг по ID
- `GET /api/loungers/:id/availability` - Проверить доступность

#### Бронирования
- `POST /api/bookings` - Создать бронирование
- `GET /api/bookings` - Получить все бронирования
- `GET /api/bookings/:id` - Получить бронирование по ID
- `PATCH /api/bookings/:id/cancel` - Отменить бронирование

#### WebSocket Events
- `lounger_update` - Обновление доступности шезлонга
- `booking_update` - Обновление бронирования
- `availability_update` - Общее обновление статистики

## 📁 Структура проекта

```
beach-booking-service/
├── frontend/                 # Next.js приложение
│   ├── app/                 # App Router страницы
│   │   ├── loungers/        # Страницы шезлонгов
│   │   ├── booking/         # Страницы бронирования
│   │   └── globals.css      # Глобальные стили
│   ├── components/          # React компоненты
│   ├── lib/                 # Утилиты и API клиент
│   ├── types/               # TypeScript типы
│   └── package.json
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── controllers/     # Контроллеры
│   │   ├── models/          # Модели данных
│   │   ├── routes/          # Маршруты API
│   │   ├── middleware/      # Промежуточное ПО
│   │   ├── database/        # Схема БД и миграции
│   │   └── config/          # Конфигурация
│   └── package.json
├── docker-compose.yml       # Docker Compose конфигурация
└── README.md
```

## 🧪 Разработка

### Локальная разработка без Docker

1. Запустите PostgreSQL:
```bash
docker run --name postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=beach_booking -p 5432:5432 -d postgres:15
```

2. Запустите backend:
```bash
cd backend
npm install
cp .env.example .env
npm run migrate  # Создание таблиц и тестовых данных
npm run dev
```

3. Запустите frontend:
```bash
cd frontend
npm install
npm run dev
```

### Миграции базы данных

Для создания таблиц и заполнения тестовыми данными:
```bash
cd backend
npm run migrate
```

## 🎨 Особенности

- **Без регистрации:** Пользователи могут бронировать шезлонги без создания аккаунта
- **Проверка доступности:** Автоматическая проверка конфликтов бронирований
- **Responsive дизайн:** Адаптивный интерфейс для всех устройств
- **Валидация данных:** Полная валидация входящих данных
- **Error handling:** Обработка ошибок на всех уровнях
- **Типизация:** Полная типизация TypeScript

## 📝 API Документация

### Создание бронирования

```bash
POST /api/bookings
Content-Type: application/json

{
  "lounger_id": "uuid",
  "customer_name": "string",
  "customer_phone": "string", 
  "customer_email": "string",
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T14:00:00Z"
}
```

### Ответ

```json
{
  "id": "uuid",
  "lounger_id": "uuid",
  "customer_name": "string",
  "customer_phone": "string",
  "customer_email": "string", 
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T14:00:00Z",
  "total_price": 1200.00,
  "status": "active",
  "created_at": "2024-01-01T09:30:00Z"
}
```

## 🔧 Переменные окружения

### Backend (.env)
```
NODE_ENV=development
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=beach_booking
DB_USER=postgres
DB_PASSWORD=password
CORS_ORIGIN=http://localhost:3000
```

## 📊 Схема базы данных

### Таблица `loungers`
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `beach_name` (VARCHAR)
- `description` (TEXT)
- `price_per_hour` (DECIMAL)
- `image_url` (VARCHAR)
- `location_lat` (DECIMAL)
- `location_lng` (DECIMAL)
- `available` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Таблица `bookings`
- `id` (UUID, Primary Key)
- `lounger_id` (UUID, Foreign Key)
- `customer_name` (VARCHAR)
- `customer_phone` (VARCHAR)
- `customer_email` (VARCHAR)
- `start_time` (TIMESTAMP)
- `end_time` (TIMESTAMP)
- `total_price` (DECIMAL)
- `status` (ENUM: active, completed, cancelled)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🤝 Contributing

1. Fork проект
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License.