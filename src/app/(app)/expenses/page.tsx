'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Receipt } from 'lucide-react'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { useCurrency, type Currency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle, DialogHeader, BottomSheet, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Expense, Category } from '@/lib/types'
import { useViewAs } from '@/lib/view-as-context'

type Period = 'day' | 'week' | 'month' | 'all'

interface ExpenseForm {
  description: string
  amount: string
  currency: Currency
  categoryId: string
  date: string
  notes: string
}

export default function ExpensesPage() {
  const { format, currency: globalCurrency } = useCurrency()
  const { viewAsId } = useViewAs()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpenseForm>({ description: '', amount: '', currency: globalCurrency, categoryId: '', date: today(), notes: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const vq = viewAsId ? `&viewAs=${viewAsId}` : ''

  useEffect(() => {
    fetch(`/api/categories${viewAsId ? `?viewAs=${viewAsId}` : ''}`).then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []))
  }, [viewAsId])

  useEffect(() => {
    loadExpenses()
  }, [period, viewAsId])

  async function loadExpenses() {
    setLoading(true)
    const res = await fetch(`/api/expenses?period=${period}${vq}`)
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function openCreate() {
    setEditingExpense(null)
    setForm({ description: '', amount: '', currency: globalCurrency, categoryId: categories[0]?.id || '', date: today(), notes: '' })
    setShowForm(true)
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense)
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      currency: expense.currency || globalCurrency,
      categoryId: expense.categoryId,
      date: expense.date,
      notes: expense.notes || '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.description || !form.amount || !form.categoryId) return
    setSaving(true)

    if (editingExpense) {
      await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }

    setSaving(false)
    setShowForm(false)
    loadExpenses()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  // Group expenses by date
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  const periods: { value: Period; label: string }[] = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'all', label: 'Todo' },
  ]

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos</h1>
          <p className="text-slate-400 text-sm">{format(total)} en total</p>
        </div>
        <Button size="icon" onClick={openCreate} className="w-11 h-11 rounded-2xl">
          <Plus size={20} />
        </Button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 mb-5 bg-slate-900 p-1 rounded-2xl">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              period === p.value
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Expense list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : groupedDates.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={48} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin gastos en este período</p>
          <Button onClick={openCreate} className="mt-4">
            <Plus size={16} className="mr-1" /> Agregar gasto
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedDates.map(date => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  {formatDate(date)}
                </p>
                <p className="text-slate-500 text-xs">
                  {format(grouped[date].reduce((s, e) => s + e.amount, 0))}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {grouped[date].map(expense => {
                  const cat = categories.find(c => c.id === expense.categoryId)
                  return (
                    <div
                      key={expense.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${cat?.color || '#94a3b8'}22` }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ background: cat?.color || '#94a3b8' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{expense.description}</p>
                        <p className="text-slate-500 text-xs">{cat?.name || 'Sin categoría'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-rose-400 font-bold text-sm">
                          -{formatCurrency(expense.amount, expense.currency || 'ARS')}
                        </span>
                        <button
                          onClick={() => openEdit(expense)}
                          className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={deletingId === expense.id}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === expense.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit expense bottom sheet */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingExpense ? 'Editar gasto' : 'Nuevo gasto'}
              </h2>
              <DialogClose asChild>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </DialogClose>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 block">Descripción</Label>
                <Input
                  placeholder="Ej: Almuerzo, Uber, Netflix..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Moneda</Label>
                <div className="flex gap-2">
                  {(['ARS', 'USD'] as Currency[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, currency: c }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.currency === c
                          ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {c === 'ARS' ? '$ Pesos' : 'USD $'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Monto</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Categoría</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(p => ({ ...p, categoryId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block">Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Notas (opcional)</Label>
                <Input
                  placeholder="Nota adicional..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <Button onClick={handleSave} className="w-full mt-1" size="lg" disabled={saving}>
                {saving
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</>
                  : editingExpense ? 'Guardar cambios' : 'Agregar gasto'}
              </Button>
            </div>
          </div>
        </BottomSheet>
      </Dialog>
    </div>
  )
}
