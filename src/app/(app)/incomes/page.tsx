'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { useCurrency, type Currency } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, BottomSheet, DialogClose } from '@/components/ui/dialog'
import type { Income } from '@/lib/types'
import { useViewAs } from '@/lib/view-as-context'

type Period = 'day' | 'week' | 'month' | 'all'

interface IncomeForm {
  description: string
  amount: string
  currency: Currency
  date: string
  notes: string
}

export default function IncomesPage() {
  const { format, currency: globalCurrency } = useCurrency()
  const { viewAsId } = useViewAs()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [form, setForm] = useState<IncomeForm>({ description: '', amount: '', currency: globalCurrency, date: today(), notes: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const vq = viewAsId ? `&viewAs=${viewAsId}` : ''

  useEffect(() => {
    loadIncomes()
  }, [period, viewAsId])

  async function loadIncomes() {
    setLoading(true)
    const res = await fetch(`/api/incomes?period=${period}${vq}`)
    const data = await res.json()
    setIncomes(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function openCreate() {
    setEditingIncome(null)
    setForm({ description: '', amount: '', currency: globalCurrency, date: today(), notes: '' })
    setSaveError(null)
    setShowForm(true)
  }

  function openEdit(income: Income) {
    setEditingIncome(income)
    setForm({
      description: income.description,
      amount: String(income.amount),
      currency: income.currency || globalCurrency,
      date: income.date,
      notes: income.notes || '',
    })
    setSaveError(null)
    setShowForm(true)
  }

  async function handleSave() {
    setSaveError(null)
    if (!form.description.trim()) { setSaveError('Ingresá una descripción'); return }
    if (!form.amount || Number(form.amount) <= 0) { setSaveError('Ingresá un monto válido'); return }

    setSaving(true)
    try {
      if (editingIncome) {
        const res = await fetch(`/api/incomes/${editingIncome.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const updated = await res.json()
        setIncomes(prev => prev.map(i => i.id === editingIncome.id ? updated : i))
      } else {
        const res = await fetch('/api/incomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const created = await res.json()
        setIncomes(prev => [created, ...prev])
      }
      setSaving(false)
      setShowForm(false)
    } catch (err) {
      setSaving(false)
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/incomes/${id}`, { method: 'DELETE' })
    setIncomes(prev => prev.filter(i => i.id !== id))
    setDeletingId(null)
  }

  const grouped = incomes.reduce<Record<string, Income[]>>((acc, i) => {
    if (!acc[i.date]) acc[i.date] = []
    acc[i.date].push(i)
    return acc
  }, {})

  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const total = incomes.reduce((s, i) => s + i.amount, 0)

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
          <h1 className="text-2xl font-bold text-white">Ingresos</h1>
          <p className="text-emerald-400 text-sm font-semibold">{format(total)} en total</p>
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
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Income list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : groupedDates.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={48} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin ingresos en este período</p>
          <Button onClick={openCreate} className="mt-4">
            <Plus size={16} className="mr-1" /> Agregar ingreso
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
                  +{format(grouped[date].reduce((s, i) => s + i.amount, 0))}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {grouped[date].map(income => (
                  <div
                    key={income.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/15">
                      <TrendingUp size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{income.description}</p>
                      {income.notes ? (
                        <p className="text-slate-500 text-xs truncate">{income.notes}</p>
                      ) : (
                        <p className="text-slate-600 text-xs">Ingreso</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-emerald-400 font-bold text-sm">
                        +{formatCurrency(income.amount, income.currency || 'ARS')}
                      </span>
                      <button
                        onClick={() => openEdit(income)}
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        disabled={deletingId === income.id}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === income.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit bottom sheet */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingIncome ? 'Editar ingreso' : 'Nuevo ingreso'}
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
                  placeholder="Ej: Sueldo, Freelance, Venta..."
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
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
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

              {saveError && (
                <div className="rounded-xl px-4 py-3 text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  {saveError}
                </div>
              )}

              <Button onClick={handleSave} className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700" size="lg" disabled={saving}>
                {saving
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</>
                  : editingIncome ? 'Guardar cambios' : 'Agregar ingreso'}
              </Button>
            </div>
          </div>
        </BottomSheet>
      </Dialog>
    </div>
  )
}
