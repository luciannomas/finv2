'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { TrendingDown, TrendingUp, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/lib/currency'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Expense, Category, Income } from '@/lib/types'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getLast8Months() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: getMonthKey(d), label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), month: d.getMonth() })
  }
  return months
}

type QuickPeriod = 'day' | 'week'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthKey(new Date()))
  const [loading, setLoading] = useState(true)
  const monthScrollRef = useRef<HTMLDivElement>(null)

  const { format } = useCurrency()
  const firstName = session?.user?.name?.split(' ')[0] || 'Usuario'
  const months = getLast8Months()

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    setLoading(true)
    let expUrl: string, incUrl: string
    if (quickPeriod) {
      expUrl = `/api/expenses?period=${quickPeriod}`
      incUrl = `/api/incomes?period=${quickPeriod}`
    } else {
      expUrl = `/api/expenses?month=${selectedMonth}`
      incUrl = `/api/incomes?month=${selectedMonth}`
    }
    Promise.all([
      fetch(expUrl).then(r => r.json()),
      fetch(incUrl).then(r => r.json()),
    ]).then(([expData, incData]) => {
      setExpenses(Array.isArray(expData) ? expData : [])
      setIncomes(Array.isArray(incData) ? incData : [])
      setLoading(false)
    })
  }, [quickPeriod, selectedMonth])

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
  const balance = totalIncome - totalSpent

  const categoryTotals = categories.map(cat => {
    const total = expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0)
    return { ...cat, total }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const maxCatTotal = Math.max(...categoryTotals.map(c => c.total), 1)
  const recentExpenses = expenses.slice(0, 5)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const periodLabel = quickPeriod === 'day' ? 'hoy' : quickPeriod === 'week' ? 'esta semana' : (() => {
    const m = months.find(m => m.key === selectedMonth)
    return m ? `${MONTH_NAMES_FULL[m.month]} ${m.year}` : ''
  })()

  const scrollMonths = (dir: number) => {
    monthScrollRef.current?.scrollBy({ left: dir * 80, behavior: 'smooth' })
  }

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-400 text-sm">{greeting()},</p>
          <h1 className="text-2xl font-bold text-white">{firstName} 👋</h1>
        </div>
        <div className="w-11 h-11 rounded-2xl gradient-violet flex items-center justify-center">
          <span className="text-white font-bold text-base">{firstName.charAt(0).toUpperCase()}</span>
        </div>
      </div>

      {/* Period selector */}
      <div className="mb-4">
        {/* Quick filters */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setQuickPeriod('day')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              quickPeriod === 'day' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setQuickPeriod('week')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              quickPeriod === 'week' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setQuickPeriod(null)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              quickPeriod === null ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Mes
          </button>
        </div>

        {/* Month picker */}
        {quickPeriod === null && (
          <div className="flex items-center gap-1">
            <button onClick={() => scrollMonths(-1)} className="text-slate-500 hover:text-white flex-shrink-0">
              <ChevronLeft size={16} />
            </button>
            <div ref={monthScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
              {months.map(m => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMonth(m.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedMonth === m.key
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label} {m.year !== new Date().getFullYear() ? m.year : ''}
                </button>
              ))}
            </div>
            <button onClick={() => scrollMonths(1)} className="text-slate-500 hover:text-white flex-shrink-0">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main balance card */}
      <div className="gradient-violet rounded-3xl p-5 mb-4 shadow-xl shadow-violet-900/30">
        <p className="text-violet-200 text-sm mb-1">Balance {periodLabel}</p>
        <p className={`text-4xl font-bold mb-1 ${balance >= 0 ? 'text-white' : 'text-rose-300'}`}>
          {loading ? '...' : (balance >= 0 ? '+' : '') + format(balance)}
        </p>
        <p className="text-violet-300 text-xs">
          {loading ? '' : `${format(totalIncome)} ingresos · ${format(totalSpent)} gastos`}
        </p>
      </div>

      {/* Income / Expense summary row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/incomes" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-400 text-xs">Ingresos</p>
            <p className="text-emerald-400 font-bold text-sm truncate">
              {loading ? '...' : `+${format(totalIncome)}`}
            </p>
          </div>
        </Link>
        <Link href="/expenses" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
            <TrendingDown size={16} className="text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-400 text-xs">Gastos</p>
            <p className="text-rose-400 font-bold text-sm truncate">
              {loading ? '...' : `-${format(totalSpent)}`}
            </p>
          </div>
        </Link>
      </div>

      {/* Category breakdown */}
      {categoryTotals.length > 0 && (
        <Card className="mb-5">
          <CardContent className="pt-4">
            <h2 className="text-white font-bold mb-3">Por categoría</h2>
            <div className="flex flex-col gap-3">
              {categoryTotals.slice(0, 5).map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                      <span className="text-slate-300 text-sm">{cat.name}</span>
                    </div>
                    <span className="text-white text-sm font-semibold">{format(cat.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(cat.total / maxCatTotal) * 100}%`, background: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Donut chart */}
      {!loading && expenses.length > 0 && (
        <DonutChart categories={categories} expenses={expenses} format={format} />
      )}

      {/* Weekly bar chart — solo en modo mes */}
      {quickPeriod === null && expenses.length > 0 && (
        <Card className="mb-5">
          <CardContent className="pt-4">
            <h2 className="text-white font-bold mb-3">Semanas del mes</h2>
            <WeeklyChart expenses={expenses} monthKey={selectedMonth} />
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold">Recientes</h2>
          <Link href="/expenses" className="text-violet-400 text-sm flex items-center gap-1 hover:text-violet-300">
            Ver todo <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recentExpenses.length === 0 ? (
          <div className="text-center py-10">
            <TrendingDown size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Sin gastos {periodLabel}</p>
            <Link href="/expenses" className="text-violet-400 text-sm mt-2 inline-block">Agregar gasto</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentExpenses.map(expense => {
              const cat = categories.find(c => c.id === expense.categoryId)
              return (
                <div key={expense.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat?.color}22` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: cat?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{expense.description}</p>
                    <p className="text-slate-500 text-xs">{formatDate(expense.date)} · {cat?.name}</p>
                  </div>
                  <span className="text-rose-400 font-bold text-sm flex-shrink-0">-{format(expense.amount)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const ALIMENTOS_CATS = ['Mica', 'Pibes', 'Familia']
const ALIMENTOS_COLOR = '#4ade80'

function DonutChart({
  categories, expenses, format,
}: {
  categories: Category[]
  expenses: Expense[]
  format: (n: number) => string
}) {
  const [groupAlimentos, setGroupAlimentos] = useState(true)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const catTotals = categories
    .map(c => ({ ...c, total: expenses.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0) }))
    .filter(c => c.total > 0)

  const alimentosCats = catTotals.filter(c => ALIMENTOS_CATS.includes(c.name))
  const otherCats = catTotals.filter(c => !ALIMENTOS_CATS.includes(c.name))
  const alimentosTotal = alimentosCats.reduce((s, c) => s + c.total, 0)

  const chartData = groupAlimentos
    ? [...(alimentosTotal > 0 ? [{ id: 'alimentos', name: 'Alimentos', color: ALIMENTOS_COLOR, total: alimentosTotal }] : []), ...otherCats]
    : catTotals

  const visibleData = chartData.filter(d => !hidden.has(d.id))
  const total = visibleData.reduce((s, d) => s + d.total, 0)

  const R = 52, sw = 22, cx = 75, cy = 75
  const circ = 2 * Math.PI * R
  let offset = 0
  const segments = visibleData.map(d => {
    const pct = total > 0 ? d.total / total : 0
    const seg = { ...d, dash: pct * circ, gap: circ - pct * circ, rotation: offset * 360 - 90 }
    offset += pct
    return seg
  })

  const toggle = (id: string) => setHidden(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <Card className="mb-5">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold">Distribución</h2>
          <button
            onClick={() => setGroupAlimentos(g => !g)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${groupAlimentos ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Agrupar Alimentos
          </button>
        </div>

        {visibleData.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Sin datos para mostrar</p>
        ) : (
          <div className="flex items-center gap-3">
            {/* Donut SVG */}
            <div className="flex-shrink-0">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="#1e293b" strokeWidth={sw} />
                {segments.map((seg, i) => (
                  <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                    stroke={seg.color} strokeWidth={sw}
                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                    transform={`rotate(${seg.rotation} ${cx} ${cy})`}
                  />
                ))}
                <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Total</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize="9">
                  {format(total).replace('$', '').trim()}
                </text>
              </svg>
            </div>

            {/* Legend con toggles */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {chartData.map(d => {
                const isHidden = hidden.has(d.id)
                const pct = total > 0 ? Math.round((visibleData.find(v => v.id === d.id)?.total || 0) / total * 100) : 0
                return (
                  <button key={d.id} onClick={() => toggle(d.id)}
                    className={`flex items-center gap-2 text-left transition-opacity ${isHidden ? 'opacity-35' : ''}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-300 text-xs truncate flex-1">{d.name}</span>
                    <span className="text-slate-500 text-xs flex-shrink-0">{isHidden ? '—' : `${pct}%`}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WeeklyChart({ expenses, monthKey }: { expenses: Expense[], monthKey: string }) {
  const [year, month] = monthKey.split('-').map(Number)
  const weeks = [0, 1, 2, 3].map(w => {
    const start = new Date(year, month - 1, w * 7 + 1)
    const end = new Date(year, month - 1, w * 7 + 7)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    const total = expenses.filter(e => e.date >= startStr && e.date <= endStr).reduce((s, e) => s + e.amount, 0)
    return { label: `S${w + 1}`, total }
  })

  const max = Math.max(...weeks.map(w => w.total), 1)
  const now = new Date()
  const currentWeek = Math.floor((now.getDate() - 1) / 7)
  const isCurrentMonth = monthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="flex items-end gap-2 h-20">
      {weeks.map((week, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center" style={{ height: '60px' }}>
            <div
              className={`w-full rounded-t-lg transition-all duration-500 ${isCurrentMonth && i === currentWeek ? 'bg-violet-500' : 'bg-slate-700'}`}
              style={{ height: `${Math.max((week.total / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-slate-500 text-[10px]">{week.label}</span>
        </div>
      ))}
    </div>
  )
}
