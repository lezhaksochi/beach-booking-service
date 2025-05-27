# 🚀 Быстрый деплой на рег.ру

## 📦 Файлы для загрузки

Архив для загрузки создан: `beach-booking-service-production.tar.gz` (находится в родительской папке)

## ⚡ Быстрая установка

### 1. Загрузите архив на сервер
```bash
# Через SCP
scp beach-booking-service-production.tar.gz username@your-domain.ru:~/

# Или через веб-интерфейс рег.ру
```

### 2. Подключитесь к серверу
```bash
ssh username@your-domain.ru
```

### 3. Распакуйте и установите
```bash
tar -xzf beach-booking-service-production.tar.gz
cd beach-booking-service
chmod +x production-config/deploy.sh
./production-config/deploy.sh
```

### 4. Настройте переменные окружения
```bash
# Backend
nano backend/.env
# Укажите данные вашей БД и домен

# Frontend  
nano frontend/.env.local
# Укажите ваш домен
```

### 5. Запустите базу данных
```bash
cd backend
node src/database/migrate.js
node src/database/migrate-admin.js
node src/scripts/createAdmin.js
```

### 6. Запустите приложение
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Настройка домена

Если у вас есть панель управления рег.ру:
1. Настройте A-запись для вашего домена на IP сервера
2. Настройте Nginx конфигурацию
3. Установите SSL сертификат

## ✅ Проверка

- Сайт: `https://your-domain.ru`
- API: `https://your-domain.ru/api/health`  
- Админ: `https://your-domain.ru/admin`

## 📞 Если что-то не работает

1. Проверьте логи: `pm2 logs`
2. Проверьте статус: `pm2 status`
3. Перезапустите: `pm2 restart all`

Подробная инструкция в файле `DEPLOYMENT_GUIDE.md`