'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, LayoutGrid, ChevronRight, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, BottomSheet, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, today } from '@/lib/utils'
import { useCurrency } from '@/lib/currency'
import type { Category, Expense } from '@/lib/types'
import { useViewAs } from '@/lib/view-as-context'

const ALIMENTOS_GROUP = ['Mica', 'Pibes', 'Familia']

const COLORS = [
  '#4ade80', '#60a5fa', '#c084fc', '#f87171', '#f9a8d4',
  '#fbbf24', '#fb923c', '#94a3b8', '#34d399', '#f472b6',
  '#a78bfa', '#38bdf8', '#facc15', '#4ade80', '#e879f9',
]

interface CategoryForm {
  name: string
  color: string
  icon: string
}

interface ExpenseForm {
  description: string
  amount: string
  categoryId: string
  date: string
  notes: string
}

const emptyForm: CategoryForm = { name: '', color: '#c084fc', icon: 'circle-ellipsis' }
const emptyExpenseForm = (categoryId = ''): ExpenseForm => ({
  description: '', amount: '', categoryId, date: today(), notes: '',
})

export default function CategoriesPage() {
  const { format } = useCurrency()
  const { viewAsId } = useViewAs()
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  // Category form
  const [showForm, setShowForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Category detail
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Expense form (from detail)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm())
  const [savingExpense, setSavingExpense] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [viewAsId])

  async function loadData() {
    setLoading(true)
    const vq = viewAsId ? `?viewAs=${viewAsId}` : ''
    const vqAmp = viewAsId ? `&viewAs=${viewAsId}` : ''
    const [catsRes, expRes] = await Promise.all([
      fetch(`/api/categories${vq}`),
      fetch(`/api/expenses?period=all${vqAmp}`),
    ])
    setCategories(await catsRes.json())
    setExpenses(await expRes.json())
    setLoading(false)
  }

  function openCreate() {
    setEditingCat(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditingCat(cat)
    setForm({ name: cat.name, color: cat.color, icon: cat.icon })
    setShowForm(true)
  }

  function openDetail(cat: Category) {
    setSelectedCat(cat)
    setShowDetail(true)
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    if (editingCat) {
      const res = await fetch(`/api/categories/${editingCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const updated = await res.json()
      setCategories(prev => prev.map(c => c.id === editingCat.id ? updated : c))
      if (selectedCat?.id === editingCat.id) setSelectedCat(updated)
    } else {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const created = await res.json()
      setCategories(prev => [...prev, created])
    }
    setSaving(false)
    setShowForm(false)
  }

  async function handleDeleteCat(id: string) {
    setDeletingId(id)
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  // Expense actions from detail view
  function openCreateExpense() {
    setEditingExpense(null)
    setExpenseForm(emptyExpenseForm(selectedCat?.id || ''))
    setShowExpenseForm(true)
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense)
    setExpenseForm({
      description: expense.description,
      amount: String(expense.amount),
      categoryId: expense.categoryId,
      date: expense.date,
      notes: expense.notes || '',
    })
    setShowExpenseForm(true)
  }

  async function handleSaveExpense() {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.categoryId) return
    setSavingExpense(true)
    if (editingExpense) {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      })
      const updated = await res.json()
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? updated : e))
    } else {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      })
      const created = await res.json()
      setExpenses(prev => [created, ...prev])
    }
    setSavingExpense(false)
    setShowExpenseForm(false)
  }

  async function handleDeleteExpense(id: string) {
    setDeletingExpenseId(id)
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeletingExpenseId(null)
  }

  const getCatExpenses = (catId: string) =>
    expenses.filter(e => e.categoryId === catId).sort((a, b) => b.date.localeCompare(a.date))

  const getCatTotal = (catId: string) =>
    getCatExpenses(catId).reduce((s, e) => s + e.amount, 0)

  const catExpenses = selectedCat ? getCatExpenses(selectedCat.id) : []

  // Group by date for detail view
  const grouped = catExpenses.reduce<Record<string, Expense[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})
  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorías</h1>
          <p className="text-slate-400 text-sm">{categories.length} categorías</p>
        </div>
        <Button size="icon" onClick={openCreate} className="w-11 h-11 rounded-2xl">
          <Plus size={20} />
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <LayoutGrid size={48} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Sin categorías aún</p>
          <Button onClick={openCreate} className="mt-4">
            <Plus size={16} className="mr-1" /> Crear categoría
          </Button>
        </div>
      ) : (() => {
        const alimentosCats = categories.filter(c => ALIMENTOS_GROUP.includes(c.name))
        const otherCats = categories.filter(c => !ALIMENTOS_GROUP.includes(c.name))
        const alimentosTotal = alimentosCats.reduce((s, c) => s + getCatTotal(c.id), 0)

        const renderCatCard = (cat: Category) => {
          const total = getCatTotal(cat.id)
          const count = getCatExpenses(cat.id).length
          return (
            <div
              key={cat.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
              onClick={() => openDetail(cat)}
            >
                {/* Color accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ background: cat.color }}
                />

                <div className="flex items-start justify-between mb-3 mt-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${cat.color}22` }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ background: cat.color }} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(cat) }}
                      className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteCat(cat.id) }}
                      disabled={deletingId === cat.id}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === cat.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>

                <p className="text-white font-bold text-sm truncate">{cat.name}</p>
                <p className="text-rose-400 font-semibold text-sm mt-0.5">
                  {total > 0 ? format(total) : '—'}
                </p>
                <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-0.5">
                  {count > 0 ? `${count} gasto${count > 1 ? 's' : ''}` : 'Sin gastos'}
                  {count > 0 && <ChevronRight size={10} />}
                </p>
              </div>
            )
        }

        return (
          <div className="flex flex-col gap-5">
            {alimentosCats.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
                    <h2 className="text-white font-bold text-base">Alimentos</h2>
                  </div>
                  <span className="text-rose-400 text-sm font-semibold">{alimentosTotal > 0 ? format(alimentosTotal) : '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {alimentosCats.map(renderCatCard)}
                </div>
              </div>
            )}
            {otherCats.length > 0 && (
              <div>
                {alimentosCats.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-5 rounded-full bg-slate-500" />
                    <h2 className="text-white font-bold text-base">Otras</h2>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {otherCats.map(renderCatCard)}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Category detail bottom sheet */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2 max-h-[80vh] flex flex-col">
            {/* Detail header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${selectedCat?.color}22` }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: selectedCat?.color }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedCat?.name}</h2>
                  <p className="text-slate-400 text-xs">
                    {catExpenses.length > 0
                      ? `${catExpenses.length} gasto${catExpenses.length > 1 ? 's' : ''} · ${format(getCatTotal(selectedCat?.id || ''))}`
                      : 'Sin gastos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" onClick={openCreateExpense} className="w-9 h-9 rounded-xl">
                  <Plus size={16} />
                </Button>
                <DialogClose asChild>
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </DialogClose>
              </div>
            </div>

            {/* Expense list */}
            <div className="overflow-y-auto flex-1">
              {catExpenses.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt size={40} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Sin gastos en esta categoría</p>
                  <Button onClick={openCreateExpense} className="mt-4" size="sm">
                    <Plus size={14} className="mr-1" /> Agregar gasto
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
                        {grouped[date].map(expense => (
                          <div
                            key={expense.id}
                            className="bg-slate-800 border border-slate-700 rounded-2xl p-3.5 flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold truncate">{expense.description}</p>
                              {expense.notes && (
                                <p className="text-slate-500 text-xs truncate">{expense.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-rose-400 font-bold text-sm">
                                -{format(expense.amount)}
                              </span>
                              <button
                                onClick={() => openEditExpense(expense)}
                                className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={deletingExpenseId === expense.id}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deletingExpenseId === expense.id
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
            </div>
          </div>
        </BottomSheet>
      </Dialog>

      {/* Expense add/edit bottom sheet */}
      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
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
                  value={expenseForm.description}
                  onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Monto ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Categoría</Label>
                <Select value={expenseForm.categoryId} onValueChange={v => setExpenseForm(p => ({ ...p, categoryId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block">Fecha</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Notas (opcional)</Label>
                <Input
                  placeholder="Nota adicional..."
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <Button onClick={handleSaveExpense} className="w-full mt-1" size="lg" disabled={savingExpense}>
                {savingExpense
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</>
                  : editingExpense ? 'Guardar cambios' : 'Agregar gasto'}
              </Button>
            </div>
          </div>
        </BottomSheet>
      </Dialog>

      {/* Category form bottom sheet */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingCat ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <DialogClose asChild>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </DialogClose>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 block">Nombre</Label>
                <Input
                  placeholder="Ej: Comida, Transporte..."
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-2 block">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, color }))}
                      className={`w-8 h-8 rounded-full transition-all ${
                        form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                      }`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${form.color}33` }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: form.color }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{form.name || 'Vista previa'}</p>
                  <p className="text-slate-400 text-xs">Categoría</p>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full mt-1" size="lg" disabled={saving}>
                {saving
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</>
                  : editingCat ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
            </div>
          </div>
        </BottomSheet>
      </Dialog>
    </div>
  )
}
