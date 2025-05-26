const fs = require('fs')
const path = require('path')
require('dotenv').config()

const pool = require('../config/database')

async function runAuthMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🔐 Запуск миграции системы авторизации...')
    
    // Start transaction
    await client.query('BEGIN')
    
    // Check if users table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Таблица users уже существует')
    } else {
      console.log('📝 Создание таблицы users...')
      await client.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          phone VARCHAR(20) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)
      console.log('✅ Таблица users создана')
    }
    
    // Check if user_id column exists in bookings
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'user_id'
      );
    `)
    
    if (columnCheck.rows[0].exists) {
      console.log('✅ Колонка user_id в bookings уже существует')
    } else {
      console.log('📝 Добавление user_id в таблицу bookings...')
      await client.query('ALTER TABLE bookings ADD COLUMN user_id UUID REFERENCES users(id);')
      console.log('✅ Колонка user_id добавлена в bookings')
    }
    
    // Make customer fields optional
    console.log('📝 Обновление ограничений в таблице bookings...')
    try {
      await client.query('ALTER TABLE bookings ALTER COLUMN customer_name DROP NOT NULL;')
      await client.query('ALTER TABLE bookings ALTER COLUMN customer_phone DROP NOT NULL;')
      await client.query('ALTER TABLE bookings ALTER COLUMN customer_email DROP NOT NULL;')
      console.log('✅ Ограничения NOT NULL удалены из полей customer_*')
    } catch (error) {
      console.log('ℹ️ Ограничения NOT NULL уже были удалены или не существовали')
    }
    
    // Create indexes
    console.log('📝 Создание индексов...')
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);')
      await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);')
      console.log('✅ Индексы созданы')
    } catch (error) {
      console.log('ℹ️ Индексы уже существуют')
    }
    
    // Add trigger for users table
    console.log('📝 Создание триггера для users...')
    try {
      await client.query(`
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `)
      console.log('✅ Триггер для users создан')
    } catch (error) {
      console.log('ℹ️ Триггер для users уже существует')
    }
    
    // Update lounger_type enum
    console.log('📝 Обновление enum lounger_type...')
    try {
      // Check if the enum needs updating
      const enumCheck = await client.query(`
        SELECT enumlabel FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lounger_type')
        AND enumlabel = 'sunbed';
      `)
      
      if (enumCheck.rows.length > 0) {
        console.log('🔄 Обновление enum lounger_type с sunbed на chair...')
        await client.query('ALTER TYPE lounger_type RENAME TO lounger_type_old;')
        await client.query("CREATE TYPE lounger_type AS ENUM ('chair', 'bungalow');")
        await client.query('ALTER TABLE loungers ALTER COLUMN type TYPE lounger_type USING type::text::lounger_type;')
        await client.query('DROP TYPE lounger_type_old;')
        console.log('✅ Enum lounger_type обновлен')
      } else {
        console.log('ℹ️ Enum lounger_type уже имеет правильные значения')
      }
    } catch (error) {
      console.log('ℹ️ Enum lounger_type уже в правильном состоянии или произошла ошибка:', error.message)
    }
    
    // Commit transaction
    await client.query('COMMIT')
    console.log('🎉 Миграция системы авторизации завершена успешно!')
    
    // Test the users table
    console.log('🧪 Тестирование таблицы users...')
    const testResult = await pool.query('SELECT COUNT(*) FROM users;')
    console.log(`📊 В таблице users: ${testResult.rows[0].count} записей`)
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Ошибка при выполнении миграции авторизации:', error)
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runAuthMigration()
    .then(() => {
      console.log('✅ Скрипт миграции завершен')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error)
      process.exit(1)
    })
}

module.exports = runAuthMigration