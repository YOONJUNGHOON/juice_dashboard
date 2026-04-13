'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavProps {
  isAdmin: boolean
  userName: string
}

const NAV_LINKS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/archive', label: '아카이브' },
  { href: '/upload', label: '업로드' },
  { href: '/add-entry', label: '종목 추가' },
  { href: '/refs', label: '참고사이트' },
]

export default function Nav({ isAdmin, userName }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav
      className="flex items-center h-14 px-6 shrink-0 gap-0.5"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 mr-6 text-sm font-bold shrink-0 tracking-tight"
        style={{ color: 'var(--accent)' }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
        Juice
      </Link>

      {/* Nav links */}
      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              background: active ? 'var(--nav-active-bg)' : 'transparent',
            }}
          >
            {label}
          </Link>
        )
      })}

      {isAdmin && (
        <Link
          href="/admin"
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            color: pathname === '/admin' ? 'var(--accent)' : 'var(--text-muted)',
            background: pathname === '/admin' ? 'var(--nav-active-bg)' : 'transparent',
          }}
        >
          Admin
        </Link>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {userName}
        </span>
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg)'
            e.currentTarget.style.borderColor = '#cbd5e1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          로그아웃
        </button>
      </div>
    </nav>
  )
}
