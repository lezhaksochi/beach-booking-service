const fs = require('fs')
const path = require('path')
require('dotenv').config()

const pool = require('../config/database')

async function runAdminMigration() {
  try {
    console.log('Запуск миграции административной системы...')
    
    const schemaPath = path.join(__dirname, 'admin-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    // Разделяем SQL на отдельные команды
    const commands = schema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    for (const command of commands) {
      try {
        await pool.query(command)
        console.log(`✓ Выполнена команда: ${command.substring(0, 80)}...`)
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('already has')) {
          console.log(`⚠ Пропускаем (уже существует): ${command.substring(0, 80)}...`)
        } else {
          console.error(`✗ Ошибка в команде: ${command.substring(0, 80)}...`)
          throw error
        }
      }
    }
    
    console.log('✓ Миграция административной системы завершена успешно!')
  } catch (error) {
    console.error('✗ Ошибка при выполнении миграции:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  runAdminMigration()
}

module.exports = runAdminMigration