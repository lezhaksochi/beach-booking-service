'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CheckResult {
  result: 'success' | 'expired' | 'invalid' | 'already_used' | 'error'
  message: string
  booking?: {
    id: string
    simple_code: string
    customer_name: string
    customer_phone: string
    start_time: string
    end_time: string
    total_price: number
    lounger: {
      name: string
      row: number
      seat: number
    }
    beach_name: string
    used_at?: string
  }
  checkedInAt?: string
  checkedInBy?: {
    name: string
    email: string
  }
}

export default function CodeChecker() {
  const [code, setCode] = useState('')
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const checkCode = async (inputCode: string) => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setCheckResult({
        result: 'error',
        message: 'Токен авторизации не найден'
      })
      return
    }

    if (!inputCode.trim()) {
      setCheckResult({
        result: 'error',
        message: 'Введите код'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/code/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: inputCode.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setCheckResult({
          result: errorData.result || 'error',
          message: errorData.error || `Ошибка сервера: ${response.status}`,
          ...errorData
        })
        return
      }

      const data = await response.json()
      setCheckResult(data)

    } catch (error) {
      console.error('Ошибка проверки кода:', error)
      setCheckResult({
        result: 'error',
        message: 'Ошибка соединения с сервером'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkCode(code)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4) // Только цифры, максимум 4
    setCode(value)
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200'
      case 'expired': return 'text-orange-700 bg-orange-50 border-orange-200'
      case 'invalid': return 'text-red-700 bg-red-50 border-red-200'
      case 'already_used': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'error': return 'text-red-700 bg-red-50 border-red-200'
      default: return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'expired':
      case 'invalid':
      case 'already_used':
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Проверка кодов</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Code Input Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Введите 4-значный код бронирования</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Код бронирования
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="0000"
                maxLength={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl font-mono"
                style={{ letterSpacing: '0.2em' }}
              />
            </div>

            <button
              type="submit"
              disabled={code.length !== 4 || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Проверяю...' : 'Проверить код'}
            </button>
          </form>

          <div className="mt-4 text-sm text-gray-600 text-center">
            Введите 4-значный код, который получил клиент при бронировании
          </div>
        </div>

        {/* Check Result */}
        {checkResult && (
          <div className={`p-6 rounded-lg border ${getResultColor(checkResult.result)}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getResultIcon(checkResult.result)}
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium mb-2">
                  {checkResult.result === 'success' ? 'Успешно!' : 'Ошибка проверки'}
                </h4>
                <p className="text-sm mb-4">{checkResult.message}</p>

                {checkResult.booking && (
                  <div className="bg-white rounded-lg p-4 mt-4">
                    <h5 className="font-medium text-gray-900 mb-3">Информация о бронировании</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="font-medium">Код:</span> {checkResult.booking.simple_code}</p>
                        <p><span className="font-medium">Клиент:</span> {checkResult.booking.customer_name}</p>
                        <p><span className="font-medium">Телефон:</span> {checkResult.booking.customer_phone}</p>
                        <p><span className="font-medium">Пляж:</span> {checkResult.booking.beach_name}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Шезлонг:</span> {checkResult.booking.lounger.name}</p>
                        <p><span className="font-medium">Ряд/Место:</span> {checkResult.booking.lounger.row}-{checkResult.booking.lounger.seat}</p>
                        <p><span className="font-medium">Стоимость:</span> {checkResult.booking.total_price.toLocaleString('ru-RU')} ₽</p>
                      </div>
                      <div className="md:col-span-2">
                        <p><span className="font-medium">Время:</span> {new Date(checkResult.booking.start_time).toLocaleString('ru-RU')} - {new Date(checkResult.booking.end_time).toLocaleString('ru-RU')}</p>
                        {checkResult.checkedInAt && (
                          <p><span className="font-medium">Время регистрации:</span> {new Date(checkResult.checkedInAt).toLocaleString('ru-RU')}</p>
                        )}
                        {checkResult.checkedInBy && (
                          <p><span className="font-medium">Зарегистрировал:</span> {checkResult.checkedInBy.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    onClick={() => {
                      setCheckResult(null)
                      setCode('')
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Проверить еще один код
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}