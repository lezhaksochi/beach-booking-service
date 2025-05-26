'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from './AuthModal'

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  return (
    <>
      <header className="glass fixed top-0 left-0 right-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🏖️</div>
              <Link href="/">
                <h1 className="text-xl font-bold text-gradient cursor-pointer">
                  Sochi Beach
                </h1>
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                Главная
              </Link>
              <a 
                href="/#beaches" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300"
              >
                Пляжи
              </a>
            </nav>

            {/* Auth Section */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 glass-button px-4 py-2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user?.name ? user.name.slice(0, 1).toUpperCase() : user?.phone.slice(-1)}
                    </div>
                    <span className="hidden sm:block font-medium">
                      {user?.name || user?.phone || 'Пользователь'}
                    </span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 glass-card border border-white/20 shadow-xl">
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-gray-700 hover:bg-white/20 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          👤 Личный кабинет
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          🚪 Выйти
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex space-x-3">
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="glass-button px-4 py-2 text-gray-700 hover:text-blue-600"
                  >
                    Вход
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="btn-primary px-4 py-2"
                  >
                    Регистрация
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button className="glass-button p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={(mode) => setAuthMode(mode)}
        />
      )}
    </>
  )
}