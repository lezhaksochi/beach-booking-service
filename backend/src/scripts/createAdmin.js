#!/usr/bin/env node

/**
 * Скрипт для создания администраторов и модераторов
 * Использование: node src/scripts/createAdmin.js [options]
 */

require('dotenv').config()
const readline = require('readline')
const AdminUser = require('../models/AdminUser')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function questionPassword(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    
    let password = ''
    
    process.stdin.on('data', function(char) {
      char = char + ''
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write('\n')
          resolve(password)
          break
        case '\u0003':
          process.exit()
          break
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          password += char
          process.stdout.write('*')
          break
      }
    })
  })
}

async function createAdminUser() {
  try {
    console.log('🔐 Создание нового администратора/модератора\n')

    // Получение данных пользователя
    const email = await question('Email: ')
    if (!email || !email.includes('@')) {
      throw new Error('Некорректный email')
    }

    const password = await questionPassword('Пароль: ')
    if (!password || password.length < 6) {
      throw new Error('Пароль должен содержать минимум 6 символов')
    }

    const name = await question('Имя: ')
    if (!name) {
      throw new Error('Имя обязательно')
    }

    const phone = await question('Телефон (опционально): ')

    console.log('\nВыберите роль:')
    console.log('1. Super Admin (полный доступ)')
    console.log('2. Beach Admin (создание пляжей, управление модераторами)')
    console.log('3. Moderator (доступ к назначенным пляжам)')
    
    const roleChoice = await question('Выбор (1-3): ')
    
    let role
    switch(roleChoice) {
      case '1':
        role = 'super_admin'
        break
      case '2':
        role = 'beach_admin'
        break
      case '3':
        role = 'moderator'
        break
      default:
        throw new Error('Неверный выбор роли')
    }

    // Подтверждение создания
    console.log('\n📋 Данные для создания:')
    console.log(`Email: ${email}`)
    console.log(`Имя: ${name}`)
    console.log(`Телефон: ${phone || 'не указан'}`)
    console.log(`Роль: ${role}`)

    const confirm = await question('\nСоздать пользователя? (y/N): ')
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Создание отменено')
      process.exit(0)
    }

    // Создание пользователя
    console.log('\n⏳ Создание пользователя...')
    
    const userData = {
      email,
      password,
      name,
      phone: phone || null,
      role,
      created_by: null // Создан скриптом
    }

    const newUser = await AdminUser.create(userData)

    console.log('\n✅ Пользователь успешно создан!')
    console.log(`ID: ${newUser.id}`)
    console.log(`Email: ${newUser.email}`)
    console.log(`Имя: ${newUser.name}`)
    console.log(`Роль: ${newUser.role}`)
    console.log(`Создан: ${newUser.created_at}`)

    // Для супер-админов и админов пляжей предоставляем доступ ко всем пляжам
    if (role === 'super_admin' || role === 'beach_admin') {
      console.log('\n🏖️ Предоставление доступа к пляжам...')
      
      const pool = require('../config/database')
      const beachesResult = await pool.query('SELECT id, name FROM beaches')
      
      if (beachesResult.rows.length > 0) {
        for (const beach of beachesResult.rows) {
          await AdminUser.grantBeachAccess(newUser.id, beach.id, newUser.id)
          console.log(`✓ Доступ к пляжу "${beach.name}" предоставлен`)
        }
      } else {
        console.log('ℹ️ Пляжи в системе отсутствуют')
      }
    }

    console.log('\n🎉 Настройка завершена!')
    
    if (role === 'moderator') {
      console.log('\n⚠️ Внимание: Модератору необходимо назначить доступ к пляжам через админ-панель')
    }

  } catch (error) {
    console.error('\n💥 Ошибка:', error.message)
    
    if (error.constraint === 'admin_users_email_key') {
      console.error('Пользователь с таким email уже существует')
    }
    
    process.exit(1)
  } finally {
    rl.close()
    process.exit(0)
  }
}

async function listAdminUsers() {
  try {
    console.log('👥 Список администраторов и модераторов\n')
    
    const pool = require('../config/database')
    const result = await pool.query(`
      SELECT id, email, name, phone, role, is_active, 
             last_login, created_at
      FROM admin_users 
      ORDER BY created_at DESC
    `)

    if (result.rows.length === 0) {
      console.log('❌ Администраторы не найдены')
      return
    }

    console.log('┌─────────────────────────────────────────┬──────────────────────────┬────────────────┬─────────────┬─────────────────────┐')
    console.log('│ Email                                   │ Имя                      │ Роль           │ Активен     │ Последний вход      │')
    console.log('├─────────────────────────────────────────┼──────────────────────────┼────────────────┼─────────────┼─────────────────────┤')

    for (const user of result.rows) {
      const email = user.email.padEnd(39)
      const name = (user.name || '').padEnd(24)
      const role = user.role.padEnd(14)
      const active = (user.is_active ? 'Да' : 'Нет').padEnd(11)
      const lastLogin = user.last_login 
        ? new Date(user.last_login).toLocaleString('ru-RU').padEnd(19)
        : 'Никогда'.padEnd(19)

      console.log(`│ ${email} │ ${name} │ ${role} │ ${active} │ ${lastLogin} │`)
    }

    console.log('└─────────────────────────────────────────┴──────────────────────────┴────────────────┴─────────────┴─────────────────────┘')
    console.log(`\nВсего пользователей: ${result.rows.length}`)

  } catch (error) {
    console.error('💥 Ошибка получения списка:', error.message)
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔐 Скрипт управления администраторами

Использование:
  node src/scripts/createAdmin.js [command]

Команды:
  (без параметров)  - Создать нового администратора/модератора
  --list, -l        - Показать список всех администраторов
  --help, -h        - Показать эту справку

Примеры:
  node src/scripts/createAdmin.js
  node src/scripts/createAdmin.js --list
    `)
    process.exit(0)
  }

  if (args.includes('--list') || args.includes('-l')) {
    await listAdminUsers()
    process.exit(0)
  }

  // По умолчанию создаем нового пользователя
  await createAdminUser()
}

// Запуск только если файл выполняется напрямую
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  })
}

module.exports = { createAdminUser, listAdminUsers }