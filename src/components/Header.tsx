import React, { useState } from 'react'
import { Download, List, Settings, FileSearch, User, Crown, Menu, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useT } from '../stores/localeStore'

interface HeaderProps {
  currentPage: string
  onNavigate: (page: any) => void
  onNavigateToParse?: () => void
  isLoggedIn: boolean
  hasParseResult?: boolean
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, onNavigateToParse, isLoggedIn, hasParseResult }) => {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { page: 'home' as const, label: t('nav.home'), icon: Download, show: isLoggedIn },
    { page: 'parse' as const, label: t('nav.parse'), icon: FileSearch, show: isLoggedIn && !!hasParseResult },
    { page: 'task' as const, label: t('nav.tasks'), icon: List, show: isLoggedIn },
    { page: 'settings' as const, label: t('nav.settings'), icon: Settings, show: isLoggedIn },
    { page: 'login' as const, label: t('nav.login'), icon: User, show: !isLoggedIn },
  ]

  const handleNav = (page: string) => {
    setMenuOpen(false)
    if (page === 'parse' && onNavigateToParse) onNavigateToParse()
    else onNavigate(page)
  }

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand" onClick={() => onNavigate('home')}>
          <div className="brand-icon"><svg width="24" height="24" viewBox="0 0 512 512"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0071e3" /><stop offset="100%" stopColor="#bf5af2" /></linearGradient></defs><rect width="512" height="512" rx="100" fill="url(#lg)" /><g fill="white" transform="translate(256,256)"><rect x="-48" y="-140" width="52" height="280" rx="20" /><path d="M 4 -140 A 90 90 0 0 1 4 40 L -48 40 L -48 -140 Z" /><path d="M -22 80 L -22 140 L -60 102 M -22 140 L 16 102" stroke="white" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g></svg></div>
          <span className="brand-text">PiliPalaDown</span>
        </div>

        {/* Hamburger toggle — visible on mobile */}
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop nav */}
        <nav className="header-nav">
          {navItems.filter(item => item.show).map((item) => (
            <button
              key={item.page}
              className={`nav-btn ${currentPage === item.page ? 'active' : ''}`}
              onClick={() => handleNav(item.page)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}

          {/* User info badge */}
          {isLoggedIn && user && (
            <div className="user-badge" title={`${user.name}${user.isVip ? ' · VIP' : ''}`}>
              <img src={user.face} className="user-avatar" alt="" referrerPolicy="no-referrer" />
              <span className="user-name">{user.name}</span>
              {user.isVip && <Crown size={12} className="user-vip" />}
            </div>
          )}
        </nav>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-nav" onClick={e => e.stopPropagation()}>
            {navItems.filter(item => item.show).map((item) => (
              <button
                key={item.page}
                className={`mobile-nav-item ${currentPage === item.page ? 'active' : ''}`}
                onClick={() => handleNav(item.page)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
            {isLoggedIn && user && (
              <div className="mobile-user-info">
                <img src={user.face} className="user-avatar" alt="" referrerPolicy="no-referrer" />
                <span className="user-name">{user.name}</span>
                {user.isVip && <Crown size={14} className="user-vip" />}
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
