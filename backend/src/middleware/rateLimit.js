// Простая реализация rate limiting в памяти
const rateLimit = (maxRequests, windowMinutes) => {
  const requests = new Map()

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()
    const windowMs = windowMinutes * 60 * 1000

    // Очистка старых записей
    if (requests.has(key)) {
      const userRequests = requests.get(key)
      const validRequests = userRequests.filter(time => now - time < windowMs)
      requests.set(key, validRequests)
    }

    const userRequests = requests.get(key) || []

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Слишком много запросов',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      })
    }

    userRequests.push(now)
    requests.set(key, userRequests)

    next()
  }
}

module.exports = rateLimit