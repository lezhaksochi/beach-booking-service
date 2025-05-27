# 🏖️ Beach Booking Service - Руководство по развертыванию на рег.ру

## 📋 Предварительные требования

### 🖥️ Хостинг рег.ру
- ✅ Активированный хостинг
- ✅ SSH доступ
- ✅ Node.js поддержка (версия 18+)
- ✅ PostgreSQL база данных
- ✅ Доменное имя

### 🔧 Технические требования
- Node.js 18.0.0+
- PostgreSQL 12+
- Nginx (для проксирования)
- PM2 (процесс-менеджер)
- SSL сертификат

## 🚀 Пошаговый деплой

### Шаг 1: Подготовка файлов для загрузки

Создайте архив проекта без лишних файлов:

```bash
# Перейдите в папку проекта
cd /Users/samveloganesan/Desktop/beach-booking-service

# Создайте архив для загрузки (исключая node_modules и .git)
tar -czf beach-booking-service.tar.gz \
  --exclude='*/node_modules' \
  --exclude='.git' \
  --exclude='*/.next' \
  --exclude='*/build' \
  --exclude='*/dist' \
  --exclude='*/.DS_Store' \
  .
```

### Шаг 2: Загрузка на сервер

1. **Подключитесь к серверу по SSH:**
   ```bash
   ssh username@your-domain.ru
   ```

2. **Загрузите архив на сервер** (через SCP или веб-интерфейс рег.ру)

3. **Распакуйте архив на сервере:**
   ```bash
   tar -xzf beach-booking-service.tar.gz
   cd beach-booking-service
   ```

### Шаг 3: Настройка окружения

1. **Запустите скрипт деплоя:**
   ```bash
   chmod +x production-config/deploy.sh
   ./production-config/deploy.sh
   ```

2. **Настройте переменные окружения:**

   **Backend (.env):**
   ```bash
   nano backend/.env
   ```
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=beach_booking
   DB_USER=your_db_user
   DB_PASSWORD=your_secure_password
   PORT=3001
   NODE_ENV=production
   JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here
   ADMIN_JWT_SECRET=your_very_long_and_secure_admin_jwt_secret_key_here
   ALLOWED_ORIGINS=https://your-domain.ru,https://www.your-domain.ru
   ```

   **Frontend (.env.local):**
   ```bash
   nano frontend/.env.local
   ```
   ```env
   NEXT_PUBLIC_API_URL=https://your-domain.ru/api
   NEXT_PUBLIC_WS_URL=wss://your-domain.ru/ws
   NODE_ENV=production
   NEXT_PUBLIC_SITE_URL=https://your-domain.ru
   ```

### Шаг 4: Настройка базы данных

1. **Создайте базу данных:**
   ```bash
   sudo -u postgres createdb beach_booking
   sudo -u postgres createuser beach_booking_user
   sudo -u postgres psql -c "ALTER USER beach_booking_user PASSWORD 'your_password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE beach_booking TO beach_booking_user;"
   ```

2. **Запустите миграции:**
   ```bash
   cd backend
   node src/database/migrate.js
   node src/database/migrate-admin.js
   ```

3. **Создайте администратора:**
   ```bash
   node src/scripts/createAdmin.js
   ```

### Шаг 5: Установка зависимостей и сборка

```bash
# Установка зависимостей backend
cd backend
npm install --production

# Установка зависимостей frontend
cd ../frontend
npm install --production

# Сборка frontend
npm run build
```

### Шаг 6: Настройка PM2

```bash
# Копирование конфигурации PM2
cp production-config/ecosystem.config.js .

# Запуск приложения
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
pm2 save
pm2 startup
```

### Шаг 7: Настройка Nginx

1. **Скопируйте конфигурацию Nginx:**
   ```bash
   sudo cp production-config/nginx.conf /etc/nginx/sites-available/beach-booking
   ```

2. **Отредактируйте конфигурацию:**
   ```bash
   sudo nano /etc/nginx/sites-available/beach-booking
   ```
   - Замените `yourdomain.ru` на ваш домен
   - Укажите пути к SSL сертификатам

3. **Активируйте сайт:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/beach-booking /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Шаг 8: Настройка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru

# Автоматическое обновление
sudo crontab -e
# Добавьте строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Команды управления

### PM2 команды:
```bash
pm2 status                    # Статус процессов
pm2 logs                      # Просмотр логов
pm2 restart beach-booking     # Перезапуск
pm2 stop beach-booking        # Остановка
pm2 delete beach-booking      # Удаление
```

### Обновление приложения:
```bash
git pull origin main          # Получить обновления
cd frontend && npm run build  # Пересобрать frontend
pm2 restart beach-booking     # Перезапустить
```

## 🔍 Проверка работы

1. **Откройте в браузере:** `https://your-domain.ru`
2. **Проверьте API:** `https://your-domain.ru/api/health`
3. **Админ-панель:** `https://your-domain.ru/admin`

## 🐛 Troubleshooting

### Проблемы с подключением к БД:
```bash
# Проверьте статус PostgreSQL
sudo systemctl status postgresql

# Проверьте подключение
psql -h localhost -U beach_booking_user -d beach_booking
```

### Проблемы с PM2:
```bash
# Просмотр логов ошибок
pm2 logs --err

# Перезапуск с очисткой логов
pm2 flush
pm2 restart all
```

### Проблемы с Nginx:
```bash
# Проверка конфигурации
sudo nginx -t

# Просмотр логов Nginx
sudo tail -f /var/log/nginx/error.log
```

## 📱 Мониторинг

### Настройка мониторинга PM2:
```bash
pm2 install pm2-server-monit
pm2 monitor
```

### Логи приложения:
- Backend: `logs/backend.log`
- Frontend: `logs/frontend.log`
- Nginx: `/var/log/nginx/access.log`

## 🔒 Безопасность

1. **Обновляйте систему:**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

2. **Настройте файрвол:**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

3. **Регулярно обновляйте зависимости:**
   ```bash
   npm audit fix
   ```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи PM2: `pm2 logs`
2. Проверьте статус сервисов: `pm2 status`
3. Проверьте подключение к базе данных
4. Убедитесь в правильности переменных окружения

---

🏖️ **Удачного деплоя!** Ваш Beach Booking Service готов к работе!