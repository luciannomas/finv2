'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Home, Receipt, TrendingUp, LayoutGrid, User, ShieldCheck, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationSettings, Expense } from '@/lib/types'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/expenses', icon: Receipt, label: 'Gastos' },
  { href: '/categories', icon: LayoutGrid, label: 'Categorías' },
  { href: '/incomes', icon: TrendingUp, label: 'Ingresos' },
  { href: '/notifications', icon: Bell, label: 'Alertas', hasBadge: true },
  { href: '/profile', icon: User, label: 'Perfil' },
]

const adminItem = { href: '/admin', icon: ShieldCheck, label: 'Admin', hasBadge: false }

function useNotificationAlert() {
  const [hasAlert, setHasAlert] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/notifications').then(r => r.json()).catch(() => null),
      fetch('/api/expenses?period=week').then(r => r.json()).catch(() => []),
      fetch('/api/expenses?period=month').then(r => r.json()).catch(() => []),
    ]).then(([settings, weekExp, monthExp]: [NotificationSettings | null, Expense[], Expense[]]) => {
      if (!settings?.enabled) return

      const weekSpent = weekExp.reduce((s: number, e: Expense) => s + e.amount, 0)
      const monthSpent = monthExp.reduce((s: number, e: Expense) => s + e.amount, 0)

      const weekAlert = settings.weeklyLimit && weekSpent >= settings.weeklyLimit * 0.8
      const monthAlert = settings.monthlyLimit && monthSpent >= settings.monthlyLimit * 0.8

      setHasAlert(!!(weekAlert || monthAlert))
    })
  }, [])

  return hasAlert
}

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const hasNotifAlert = useNotificationAlert()

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin'
  const items = isAdmin ? [...navItems, adminItem] : navItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto">
      <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 px-1 pb-safe">
        <div className="flex items-center justify-around h-16">
          {items.map(({ href, icon: Icon, label, hasBadge }) => {
            const isActive = pathname === href
            const showBadge = hasBadge && hasNotifAlert
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-2 rounded-2xl transition-all duration-200',
                  isActive
                    ? 'text-violet-400'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <div
                  className={cn(
                    'relative p-1.5 rounded-xl transition-all duration-200',
                    isActive ? 'bg-violet-500/20' : ''
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900" />
                  )}
                </div>
                <span className={cn('text-[9px] font-medium', isActive ? 'text-violet-400' : 'text-slate-500')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
