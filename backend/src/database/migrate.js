const fs = require('fs')
const path = require('path')
require('dotenv').config()

const pool = require('../config/database')

async function runMigration() {
  try {
    console.log('Запуск миграции базы данных...')
    
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    // Разделяем SQL на отдельные команды
    const commands = schema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0)
    
    for (const command of commands) {
      if (command.startsWith('CREATE DATABASE') || command.startsWith('\\c')) {
        console.log(`Пропускаем команду: ${command.substring(0, 50)}...`)
        continue
      }
      
      try {
        await pool.query(command)
        console.log(`Выполнена команда: ${command.substring(0, 50)}...`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`Пропускаем (уже существует): ${command.substring(0, 50)}...`)
        } else {
          throw error
        }
      }
    }
    
    console.log('Миграция завершена успешно!')
  } catch (error) {
    console.error('Ошибка при выполнении миграции:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  runMigration()
}

module.exports = runMigration