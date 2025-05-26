FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости (включая devDependencies)
RUN npm install && npm cache clean --force

# Копируем остальные файлы
COPY . .

# Открываем порт
EXPOSE 3000

# Команда запуска для разработки
CMD ["npm", "run", "dev"]