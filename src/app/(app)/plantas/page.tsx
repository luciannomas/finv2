'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Leaf, ChevronRight, LayoutList, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, BottomSheet, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { today } from '@/lib/utils'
import type { Plant } from '@/lib/types'
import { useViewAs } from '@/lib/view-as-context'

const ESTATUS_OPTIONS = ['chica', 'en vegetación', 'en flor', 'mal estado', 'cosechada']
const TIPO_OPTIONS = [
  { value: 'auto', label: 'Automática' },
  { value: 'fem', label: 'Feminizada' },
]
const CULTIVO_OPTIONS = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
]

// Auto: 75–90 days. We show both ends.
const AUTO_MIN = 75
const AUTO_MAX = 90

interface PlantForm {
  raza: string
  banco: string
  inicio: string
  tipo: 'auto' | 'fem'
  maceta: string
  productos: string
  estatus: string
  cultivo: 'indoor' | 'outdoor'
  cosecha: string
}

const emptyForm = (): PlantForm => ({
  raza: '', banco: '', inicio: today(), tipo: 'auto',
  maceta: '', productos: '', estatus: 'chica', cultivo: 'indoor', cosecha: '',
})

function diasDesde(dateStr: string): number {
  const start = new Date(dateStr + 'T00:00:00')
  return Math.floor((Date.now() - start.getTime()) / 86400000)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatFecha(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// Days remaining until earliest harvest window (AUTO_MIN). Negative = ya en fecha.
function diasHastaCosecha(plant: Plant): number {
  if (plant.cosecha) return -999 // already harvested — goes to end
  const dias = diasDesde(plant.inicio)
  return AUTO_MIN - dias
}

function estatusColor(estatus: string): string {
  const map: Record<string, string> = {
    'chica': 'bg-sky-500/20 text-sky-400',
    'en vegetación': 'bg-emerald-500/20 text-emerald-400',
    'en flor': 'bg-violet-500/20 text-violet-400',
    'mal estado': 'bg-rose-500/20 text-rose-400',
    'cosechada': 'bg-amber-500/20 text-amber-400',
  }
  return map[estatus] || 'bg-slate-700 text-slate-400'
}

function CosechaEstimada({ plant }: { plant: Plant }) {
  if (plant.cosecha) {
    return <span className="text-amber-400 text-xs font-medium">🌾 {formatFecha(plant.cosecha)}</span>
  }
  const dias = diasDesde(plant.inicio)
  const restMin = AUTO_MIN - dias
  const restMax = AUTO_MAX - dias

  if (restMin <= 0 && restMax <= 0) {
    return <span className="text-amber-400 text-xs font-semibold animate-pulse">¡Lista!</span>
  }
  if (restMin <= 0) {
    return <span className="text-emerald-400 text-xs font-semibold">En fecha ({restMax}d max)</span>
  }
  return <span className="text-slate-300 text-xs">{restMin}–{restMax}d</span>
}

export default function PlantasPage() {
  const { viewAsId } = useViewAs()
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [sortByHarvest, setSortByHarvest] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null)
  const [form, setForm] = useState<PlantForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => { loadData() }, [viewAsId])

  async function loadData() {
    setLoading(true)
    const vq = viewAsId ? `?viewAs=${viewAsId}` : ''
    const res = await fetch(`/api/plantas${vq}`)
    setPlants(await res.json())
    setLoading(false)
  }

  const sortedPlants = [...plants].sort((a, b) =>
    sortByHarvest
      ? diasHastaCosecha(a) - diasHastaCosecha(b)
      : a.numero - b.numero
  )

  function openCreate() {
    setEditingPlant(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(plant: Plant) {
    setEditingPlant(plant)
    setForm({
      raza: plant.raza, banco: plant.banco, inicio: plant.inicio,
      tipo: plant.tipo, maceta: String(plant.maceta),
      productos: plant.productos.join(', '), estatus: plant.estatus,
      cultivo: plant.cultivo, cosecha: plant.cosecha || '',
    })
    setShowForm(true)
    setShowDetail(false)
  }

  function openDetail(plant: Plant) {
    setSelectedPlant(plant)
    setShowDetail(true)
  }

  async function handleSave() {
    if (!form.raza || !form.banco || !form.inicio || !form.maceta) return
    setSaving(true)
    const payload = {
      raza: form.raza, banco: form.banco, inicio: form.inicio,
      tipo: form.tipo, maceta: Number(form.maceta),
      productos: form.productos ? form.productos.split(',').map(p => p.trim()).filter(Boolean) : [],
      estatus: form.estatus, cultivo: form.cultivo, cosecha: form.cosecha || null,
    }
    if (editingPlant) {
      const res = await fetch(`/api/plantas/${editingPlant.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const updated = await res.json()
      setPlants(prev => prev.map(p => p.id === editingPlant.id ? updated : p))
      if (selectedPlant?.id === editingPlant.id) setSelectedPlant(updated)
    } else {
      const res = await fetch('/api/plantas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const created = await res.json()
      setPlants(prev => [...prev, created].sort((a, b) => a.numero - b.numero))
    }
    setSaving(false)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/plantas/${id}`, { method: 'DELETE' })
    setPlants(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
    setShowDetail(false)
  }

  const detail = selectedPlant

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Plantas</h1>
          <p className="text-slate-400 text-sm">{plants.length} plantas · indoor</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-slate-600 text-white' : 'text-slate-500'}`}
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-500'}`}
            >
              <Table2 size={15} />
            </button>
          </div>
          <Button size="icon" onClick={openCreate} className="w-10 h-10 rounded-2xl">
            <Plus size={18} />
          </Button>
        </div>
      </div>

      {/* Sort toggle */}
      {!loading && plants.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSortByHarvest(false)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              !sortByHarvest ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Por número
          </button>
          <button
            onClick={() => setSortByHarvest(true)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              sortByHarvest ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            🌾 Próxima cosecha
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : plants.length === 0 ? (
        <div className="text-center py-16">
          <Leaf size={48} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Sin plantas aún</p>
          <Button onClick={openCreate} className="mt-4">
            <Plus size={16} className="mr-1" /> Agregar planta
          </Button>
        </div>
      ) : viewMode === 'cards' ? (
        // ── CARD VIEW ──────────────────────────────────────────────────
        <div className="flex flex-col gap-3">
          {sortedPlants.map(plant => {
            const dias = diasDesde(plant.inicio)
            const cosechada = !!plant.cosecha
            const diasTotales = cosechada
              ? Math.floor((new Date(plant.cosecha! + 'T00:00:00').getTime() - new Date(plant.inicio + 'T00:00:00').getTime()) / 86400000)
              : null

            return (
              <div
                key={plant.id}
                onClick={() => openDetail(plant)}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-black text-lg">#{plant.numero}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold text-sm truncate">{plant.raza}</p>
                    <span className="text-slate-600 text-xs">{plant.banco}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estatusColor(plant.estatus)}`}>
                      {plant.estatus}
                    </span>
                    <span className="text-slate-500 text-xs">{plant.maceta}L</span>
                    {cosechada
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">🌾 {diasTotales}d</span>
                      : <span className="text-slate-400 text-xs">{dias}d · <CosechaEstimada plant={plant} /></span>
                    }
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </div>
            )
          })}
        </div>
      ) : (
        // ── TABLE VIEW ─────────────────────────────────────────────────
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-400 text-xs font-semibold px-4 py-3">#</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-3 py-3">Raza</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-3 py-3">Inicio</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-3 py-3">Días</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-3 py-3">Cosecha est.</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-3 py-3">Maceta</th>
                <th className="text-left text-slate-400 text-xs font-semibold px-3 py-3">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlants.map((plant, i) => {
                const dias = diasDesde(plant.inicio)
                return (
                  <tr
                    key={plant.id}
                    onClick={() => openDetail(plant)}
                    className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/40 transition-colors ${i === sortedPlants.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-black">#{plant.numero}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-white font-semibold">{plant.raza}</p>
                      <p className="text-slate-500 text-xs">{plant.banco}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{formatFecha(plant.inicio)}</td>
                    <td className="px-3 py-3 text-slate-300 font-medium">{dias}d</td>
                    <td className="px-3 py-3">
                      {plant.cosecha ? (
                        <span className="text-amber-400 text-xs">🌾 {formatFecha(plant.cosecha)}</span>
                      ) : (
                        <div className="text-xs">
                          <p className="text-slate-400">{formatFecha(addDays(plant.inicio, AUTO_MIN))} –</p>
                          <p className="text-slate-400">{formatFecha(addDays(plant.inicio, AUTO_MAX))}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-300">{plant.maceta}L</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estatusColor(plant.estatus)}`}>
                        {plant.estatus}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail bottom sheet */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <span className="text-emerald-400 font-black text-lg">#{detail?.numero}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{detail?.raza}</h2>
                  <p className="text-slate-400 text-xs">{detail?.banco}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => detail && openEdit(detail)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => detail && handleDelete(detail.id)}
                  disabled={deletingId === detail?.id}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50">
                  {deletingId === detail?.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
                <DialogClose asChild>
                  <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </DialogClose>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {detail && (() => {
                const dias = diasDesde(detail.inicio)
                const cosechada = !!detail.cosecha
                const diasTotales = cosechada
                  ? Math.floor((new Date(detail.cosecha! + 'T00:00:00').getTime() - new Date(detail.inicio + 'T00:00:00').getTime()) / 86400000)
                  : null
                const estMin = addDays(detail.inicio, AUTO_MIN)
                const estMax = addDays(detail.inicio, AUTO_MAX)

                return (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-800 rounded-xl p-3 text-center">
                        <p className="text-white font-bold text-lg">{cosechada ? diasTotales : dias}</p>
                        <p className="text-slate-400 text-xs">{cosechada ? 'días totales' : 'días'}</p>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 text-center">
                        <p className="text-white font-bold text-lg">{detail.maceta}L</p>
                        <p className="text-slate-400 text-xs">maceta</p>
                      </div>
                      <div className="bg-slate-800 rounded-xl p-3 text-center">
                        <p className="text-white font-bold text-sm capitalize">{detail.tipo}</p>
                        <p className="text-slate-400 text-xs">tipo</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${estatusColor(detail.estatus)}`}>
                        {detail.estatus}
                      </span>
                      <span className="text-xs px-3 py-1 rounded-full font-medium bg-slate-700 text-slate-300 capitalize">
                        {detail.cultivo}
                      </span>
                      {cosechada && (
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-amber-500/20 text-amber-400">
                          🌾 Cosechada {formatFecha(detail.cosecha!)}
                        </span>
                      )}
                    </div>

                    {!cosechada && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                        <p className="text-emerald-400 text-xs font-semibold mb-0.5">Cosecha estimada</p>
                        <p className="text-white text-sm font-bold">{formatFecha(estMin)} — {formatFecha(estMax)}</p>
                        <p className="text-emerald-400/70 text-xs mt-0.5">
                          <CosechaEstimada plant={detail} />
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-800 rounded-xl divide-y divide-slate-700">
                      <DetailRow label="Inicio" value={formatFecha(detail.inicio)} />
                      {detail.cosecha && <DetailRow label="Cosecha" value={formatFecha(detail.cosecha)} />}
                      <DetailRow label="Banco" value={detail.banco} />
                      {detail.productos.length > 0 && (
                        <DetailRow label="Productos" value={detail.productos.join(', ')} />
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </BottomSheet>
      </Dialog>

      {/* Add/Edit form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingPlant ? `Editar #${editingPlant.numero}` : 'Nueva planta'}
              </h2>
              <DialogClose asChild>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </DialogClose>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              <div>
                <Label className="mb-1.5 block">Raza</Label>
                <Input placeholder="Ej: White Widow" value={form.raza}
                  onChange={e => setForm(p => ({ ...p, raza: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">Banco</Label>
                <Input placeholder="Ej: Semishop" value={form.banco}
                  onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as 'auto' | 'fem' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Cultivo</Label>
                  <Select value={form.cultivo} onValueChange={v => setForm(p => ({ ...p, cultivo: v as 'indoor' | 'outdoor' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CULTIVO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Maceta (litros)</Label>
                  <Input type="number" placeholder="10" value={form.maceta}
                    onChange={e => setForm(p => ({ ...p, maceta: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Estatus</Label>
                  <Select value={form.estatus} onValueChange={v => setForm(p => ({ ...p, estatus: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Inicio</Label>
                <Input type="date" value={form.inicio}
                  onChange={e => setForm(p => ({ ...p, inicio: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">Productos (separados por coma)</Label>
                <Input placeholder="Ej: Eden, Rizo" value={form.productos}
                  onChange={e => setForm(p => ({ ...p, productos: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">Fecha de cosecha (opcional)</Label>
                <Input type="date" value={form.cosecha}
                  onChange={e => setForm(p => ({ ...p, cosecha: e.target.value }))} />
              </div>
              <Button onClick={handleSave} className="w-full mt-1" size="lg" disabled={saving}>
                {saving
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</>
                  : editingPlant ? 'Guardar cambios' : 'Agregar planta'}
              </Button>
            </div>
          </div>
        </BottomSheet>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}
