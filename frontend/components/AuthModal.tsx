'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AuthModalProps {
  mode: 'login' | 'register'
  onClose: () => void
  onSwitchMode: (mode: 'login' | 'register') => void
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { login, register } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+7\d{10}$/
    return phoneRegex.test(phone)
  }

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // If it starts with 8, replace with 7
    if (digits.startsWith('8')) {
      return '+7' + digits.slice(1)
    }
    
    // If it starts with 7, add +
    if (digits.startsWith('7')) {
      return '+' + digits
    }
    
    // If no prefix, assume it's Russian number
    if (digits.length > 0 && !digits.startsWith('7')) {
      return '+7' + digits
    }
    
    return '+7' + digits.slice(1)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 12) { // +7 + 10 digits
      setPhone(formatPhone(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!validatePhone(phone)) {
      setError('Неверный формат номера телефона. Используйте формат +7XXXXXXXXXX')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Имя обязательно для заполнения')
        return
      }
      
      if (name.length < 2) {
        setError('Имя должно содержать минимум 2 символа')
        return
      }
      
      if (password !== confirmPassword) {
        setError('Пароли не совпадают')
        return
      }
    }

    setIsLoading(true)

    try {
      if (mode === 'login') {
        await login(phone, password)
      } else {
        await register(phone, password, name)
      }
      onClose()
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gradient">
            {mode === 'login' ? '🔐 Вход в систему' : '📝 Регистрация'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите ваше имя"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Номер телефона *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+7 (999) 123-45-67"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Формат: +7XXXXXXXXXX
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подтвердите пароль *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {mode === 'login' ? 'Вход...' : 'Регистрация...'}
              </div>
            ) : (
              mode === 'login' ? '🔓 Войти' : '📝 Зарегистрироваться'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          </p>
          <button
            onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
            className="text-blue-600 hover:text-blue-800 font-medium mt-1"
          >
            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>

        {mode === 'register' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-1">ℹ️ Информация:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Номер телефона должен быть в формате +7XXXXXXXXXX</li>
              <li>Пароль должен содержать минимум 6 символов</li>
              <li>После регистрации вы сможете бронировать места</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}