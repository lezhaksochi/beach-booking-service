'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import QrScanner from 'qr-scanner'

interface ScanResult {
  result: 'success' | 'expired' | 'invalid' | 'already_used' | 'error'
  message: string
  booking?: {
    id: string
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
  }
  checkedInAt?: string
  checkedInBy?: {
    name: string
    email: string
  }
}

export default function QRScanner() {
  const [hasCamera, setHasCamera] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selectedBeachId, setSelectedBeachId] = useState('')
  const [beaches, setBeaches] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrScanner = useRef<QrScanner | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Проверяем авторизацию
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    // Загружаем список пляжей через API
    loadBeaches()

    // Проверяем доступность камеры
    checkCameraSupport()

    // Очистка при размонтировании
    return () => {
      if (qrScanner.current) {
        qrScanner.current.stop()
        qrScanner.current.destroy()
      }
    }
  }, [router])

  const loadBeaches = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/beaches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Loaded beaches:', data)
        const beachesList = data.beaches || data || []
        setBeaches(beachesList)
        if (beachesList.length > 0 && !selectedBeachId) {
          setSelectedBeachId(beachesList[0].id)
          console.log('Auto-selected beach:', beachesList[0].name, beachesList[0].id)
        }
      } else {
        console.error('Ошибка загрузки пляжей:', response.status)
      }
    } catch (error) {
      console.error('Ошибка загрузки пляжей:', error)
    }
  }

  const checkCameraSupport = async () => {
    try {
      // Проверяем поддержку mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API не поддерживается')
        setHasCamera(false)
        return
      }

      console.log('Checking camera support...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      })
      console.log('Camera available:', stream)
      setHasCamera(true)
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.label)
        track.stop()
      })
    } catch (error) {
      console.error('Камера недоступна:', error)
      setHasCamera(false)
    }
  }

  const startCamera = async () => {
    try {
      // if (!selectedBeachId) {
      //   alert('Сначала выберите пляж')
      //   return
      // }

      console.log('Starting camera...')
      
      // Устанавливаем состояние scanning для показа видео элемента
      setScanning(true)
      
      // Ждем рендеринга видео элемента
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!videoRef.current) {
        console.error('Video element not found after render')
        setScanning(false)
        return
      }

      console.log('Video element found, creating QR Scanner...')
      
      // Создаем QR сканер
      qrScanner.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data)
          scanQRCode(result.data)
          // Временно останавливаем сканер для показа результата
          if (qrScanner.current) {
            qrScanner.current.pause()
          }
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )
      
      console.log('Starting QR Scanner...')
      await qrScanner.current.start()
      console.log('QR Scanner started successfully')
      
    } catch (error) {
      console.error('Ошибка запуска камеры:', error)
      setScanning(false)
      
      // Более детальные сообщения об ошибках
      let errorMessage = 'Не удалось запустить камеру'
      if ((error as any).name === 'NotAllowedError') {
        errorMessage = 'Доступ к камере запрещен. Разрешите доступ к камере в настройках браузера.'
      } else if ((error as any).name === 'NotFoundError') {
        errorMessage = 'Камера не найдена. Подключите камеру и попробуйте снова.'
      } else if ((error as any).name === 'NotSupportedError') {
        errorMessage = 'Сайт должен быть открыт по HTTPS для доступа к камере.'
      }
      
      alert(errorMessage)
    }
  }

  const stopCamera = () => {
    if (qrScanner.current) {
      qrScanner.current.stop()
      qrScanner.current.destroy()
      qrScanner.current = null
    }
    setScanning(false)
  }


  const scanQRCode = async (qrToken: string) => {
    const token = localStorage.getItem('adminToken')
    console.log('Admin token found:', token ? 'YES' : 'NO')
    console.log('Token length:', token?.length || 0)
    if (!token) {
      setScanResult({
        result: 'error',
        message: 'Токен авторизации не найден'
      })
      return
    }

    // Для super_admin разрешаем сканирование без выбора пляжа
    // if (!selectedBeachId) {
    //   setScanResult({
    //     result: 'error',
    //     message: 'Выберите пляж для сканирования'
    //   })
    //   return
    // }

    try {
      console.log('=== QR SCAN REQUEST ===')
      console.log('QR Token:', qrToken)
      console.log('Selected Beach ID:', selectedBeachId)
      console.log('Beach Name:', beaches.find(b => b.id === selectedBeachId)?.name)
      console.log('Available beaches:', beaches.map(b => ({ id: b.id, name: b.name })))
      console.log('Notes:', notes.trim() || 'none')
      
      const requestBody = {
        qrToken: qrToken.trim(),
        beachId: selectedBeachId || undefined,
        notes: notes.trim() || undefined
      }
      console.log('Request body:', requestBody)
      
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/qr/scan`
      console.log('API URL:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('=== SERVER ERROR ===')
        console.error('Error data:', errorData)
        setScanResult({
          result: errorData.result || 'error',
          message: errorData.error || `Ошибка сервера: ${response.status}`,
          ...errorData
        })
        return
      }

      const data = await response.json()
      console.log('=== SUCCESS RESPONSE ===')
      console.log('Success data:', data)
      setScanResult(data)

      // Очищаем заметки после успешного сканирования
      if (data.result === 'success') {
        setNotes('')
      }

    } catch (error) {
      console.error('Ошибка сканирования:', error)
      setScanResult({
        result: 'error',
        message: 'Ошибка соединения с сервером. Проверьте подключение к интернету.'
      })
    }
  }

  const handleManualScan = () => {
    if (!manualCode.trim()) return
    scanQRCode(manualCode.trim())
    setManualCode('')
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
              <h1 className="text-xl font-semibold text-gray-900">QR-сканер</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Beach Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Выберите пляж</h3>
          {beaches.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              <p>Загрузка пляжей...</p>
              <button 
                onClick={loadBeaches}
                className="mt-2 text-indigo-600 hover:text-indigo-800 underline"
              >
                Обновить список
              </button>
            </div>
          ) : (
            <select
              value={selectedBeachId}
              onChange={(e) => setSelectedBeachId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Выберите пляж</option>
              {beaches.map((beach) => (
                <option key={beach.id} value={beach.id}>
                  {beach.name}
                </option>
              ))}
            </select>
          )}
          {selectedBeachId && (
            <p className="mt-2 text-sm text-gray-600">
              Выбран: {beaches.find(b => b.id === selectedBeachId)?.name}
            </p>
          )}
        </div>

        {/* Scanner Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Scanner */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Сканер камеры</h3>
            
            {hasCamera ? (
              <div className="space-y-4">
                <div className="relative">
                  {scanning ? (
                    <video
                      ref={videoRef}
                      className="w-full h-64 bg-black rounded-lg"
                      autoPlay
                      playsInline
                      muted
                      style={{
                        objectFit: 'cover',
                        width: '100%',
                        height: '256px',
                        minHeight: '256px'
                      }}
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">Камера не активна</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  {!scanning ? (
                    <button
                      onClick={startCamera}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Запустить камеру
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Остановить камеру
                    </button>
                  )}
                  
                  {scanResult && (
                    <>
                      <button
                        onClick={() => {
                          setScanResult(null)
                          if (qrScanner.current && scanning) {
                            qrScanner.current.start()
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Сканировать еще
                      </button>
                      <button
                        onClick={() => setScanResult(null)}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Очистить результат
                      </button>
                    </>
                  )}
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Наведите камеру на QR-код бронирования
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Камера недоступна</p>
                <p className="text-xs text-gray-400">Используйте ручной ввод</p>
              </div>
            )}
          </div>

          {/* Manual Input */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ручной ввод</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="qr-code" className="block text-sm font-medium text-gray-700 mb-2">
                  QR-код бронирования
                </label>
                <input
                  id="qr-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Введите код или отсканируйте QR"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Заметки (опционально)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Дополнительная информация..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleManualScan}
                disabled={!manualCode.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {!manualCode.trim() ? 'Введите QR код' : 'Проверить код'}
              </button>
              
              {/* Debug info */}
              <div className="mt-2 text-xs text-gray-500">
                <p>QR код: {manualCode.trim() ? `"${manualCode.trim()}"` : 'не введен'}</p>
                <p>Пляж: {selectedBeachId ? beaches.find(b => b.id === selectedBeachId)?.name || 'ID: ' + selectedBeachId : 'автоопределение'}</p>
                <p>Кнопка: {!manualCode.trim() ? 'неактивна (нет QR кода)' : 'активна'}</p>
              </div>
              
              {/* Test QR codes */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Быстрое тестирование:</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setManualCode('QR_FAFA91C6')
                      setSelectedBeachId('') // Автоопределение
                    }}
                    className="block w-full text-left px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-xs"
                  >
                    <code>QR_FAFA91C6</code> - Последний Тест (пляж Солнечный) - СВЕЖИЙ
                  </button>
                  <button
                    onClick={() => {
                      setManualCode('QR_A795D03B')
                      setSelectedBeachId('') // Автоопределение
                    }}
                    className="block w-full text-left px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-xs"
                  >
                    <code>QR_A795D03B</code> - Дол (пляж Приморский) - ИСПОЛЬЗОВАН
                  </button>
                  <button
                    onClick={() => {
                      setManualCode('QR_04B780DA')
                      setSelectedBeachId('') // Автоопределение
                    }}
                    className="block w-full text-left px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-xs"
                  >
                    <code>QR_04B780DA</code> - Тест QR Новый (пляж Маяк)
                  </button>
                  <button
                    onClick={() => {
                      setManualCode('QR_FA07457F')
                      setSelectedBeachId('') // Автоопределение
                    }}
                    className="block w-full text-left px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-xs"
                  >
                    <code>QR_FA07457F</code> - Дол (другой пляж)
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  ℹ️ Теперь пляж определяется автоматически по QR коду
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div className={`mt-6 p-6 rounded-lg border ${getResultColor(scanResult.result)}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getResultIcon(scanResult.result)}
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium mb-2">
                  {scanResult.result === 'success' ? 'Успешно!' : 'Ошибка сканирования'}
                </h4>
                <p className="text-sm mb-4">{scanResult.message}</p>

                {scanResult.booking && (
                  <div className="bg-white rounded-lg p-4 mt-4">
                    <h5 className="font-medium text-gray-900 mb-3">Информация о бронировании</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="font-medium">Клиент:</span> {scanResult.booking.customer_name}</p>
                        <p><span className="font-medium">Телефон:</span> {scanResult.booking.customer_phone}</p>
                        <p><span className="font-medium">Пляж:</span> {scanResult.booking.beach_name}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Шезлонг:</span> {scanResult.booking.lounger.name}</p>
                        <p><span className="font-medium">Ряд/Место:</span> {scanResult.booking.lounger.row}-{scanResult.booking.lounger.seat}</p>
                        <p><span className="font-medium">Стоимость:</span> {scanResult.booking.total_price.toLocaleString('ru-RU')} ₽</p>
                      </div>
                      <div className="md:col-span-2">
                        <p><span className="font-medium">Время:</span> {new Date(scanResult.booking.start_time).toLocaleString('ru-RU')} - {new Date(scanResult.booking.end_time).toLocaleString('ru-RU')}</p>
                        {scanResult.checkedInAt && (
                          <p><span className="font-medium">Время регистрации:</span> {new Date(scanResult.checkedInAt).toLocaleString('ru-RU')}</p>
                        )}
                        {scanResult.checkedInBy && (
                          <p><span className="font-medium">Зарегистрировал:</span> {scanResult.checkedInBy.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}