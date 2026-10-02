'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Leaf, ChevronRight, CheckCircle2 } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [sortByHarvest, setSortByHarvest] = useState(true)
  const [filterMonth, setFilterMonth] = useState<string>('')

  const [showForm, setShowForm] = useState(false)
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null)
  const [form, setForm] = useState<PlantForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const [showHarvest, setShowHarvest] = useState(false)
  const [harvestForm, setHarvestForm] = useState({ fecha: today(), gramos: '' })
  const [savingHarvest, setSavingHarvest] = useState(false)

  useEffect(() => { loadData() }, [viewAsId])

  async function loadData() {
    setLoading(true)
    const vq = viewAsId ? `?viewAs=${viewAsId}` : ''
    const res = await fetch(`/api/plantas${vq}`)
    setPlants(await res.json())
    setLoading(false)
  }

  const filteredPlants = filterMonth
    ? plants.filter(p => {
        if (p.cosecha) return p.cosecha.startsWith(filterMonth)
        const estMin = addDays(p.inicio, AUTO_MIN)
        const estMax = addDays(p.inicio, AUTO_MAX)
        return estMin.startsWith(filterMonth) || estMax.startsWith(filterMonth)
      })
    : plants

  const sortedPlants = [...filteredPlants].sort((a, b) =>
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

  function openHarvest() {
    setHarvestForm({ fecha: today(), gramos: '' })
    setShowHarvest(true)
  }

  async function handleFinalizeHarvest() {
    if (!selectedPlant || !harvestForm.fecha || !harvestForm.gramos) return
    setSavingHarvest(true)
    const res = await fetch(`/api/plantas/${selectedPlant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cosecha: harvestForm.fecha,
        gramos: Number(harvestForm.gramos),
        estatus: 'cosechada',
      }),
    })
    const updated = await res.json()
    setPlants(prev => prev.map(p => p.id === selectedPlant.id ? updated : p))
    setSelectedPlant(updated)
    setSavingHarvest(false)
    setShowHarvest(false)
  }

  async function handleRevertHarvest() {
    if (!selectedPlant) return
    const res = await fetch(`/api/plantas/${selectedPlant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cosecha: null, gramos: null, estatus: 'en flor' }),
    })
    const updated = await res.json()
    setPlants(prev => prev.map(p => p.id === selectedPlant.id ? updated : p))
    setSelectedPlant(updated)
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
        <Button size="icon" onClick={openCreate} className="w-11 h-11 rounded-2xl">
          <Plus size={20} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-2xl p-1 mb-3">
        {([
          { id: 'cards', label: 'Plantas' },
          { id: 'table', label: '🌾 Cosecha' },
        ] as { id: 'cards' | 'table'; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setViewMode(tab.id)
              setSortByHarvest(tab.id === 'table')
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              viewMode === tab.id
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Month filter (table only) */}
      {viewMode === 'table' && !loading && plants.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
          {filterMonth && (
            <button
              onClick={() => setFilterMonth('')}
              className="text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 transition-colors"
            >
              Todos
            </button>
          )}
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
                className={`rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform border ${
                  cosechada
                    ? 'bg-amber-500/8 border-amber-500/30'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  cosechada
                    ? 'bg-amber-500/20 border border-amber-500/40'
                    : 'bg-emerald-500/15 border border-emerald-500/30'
                }`}>
                  <span className={`font-black text-lg ${cosechada ? 'text-amber-400' : 'text-emerald-400'}`}>
                    #{plant.numero}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold text-sm truncate">{plant.raza}</p>
                    {cosechada && <span className="text-amber-400 text-xs">🌾</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cosechada ? (
                      <>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
                          {diasTotales}d
                        </span>
                        {plant.gramos != null && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 font-bold">
                            {plant.gramos}g
                          </span>
                        )}
                        <span className="text-slate-500 text-xs">{plant.maceta}L</span>
                      </>
                    ) : (
                      <>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estatusColor(plant.estatus)}`}>
                          {plant.estatus}
                        </span>
                        <span className="text-slate-500 text-xs">{plant.maceta}L</span>
                        <span className="text-slate-400 text-xs">{dias}d · <CosechaEstimada plant={plant} /></span>
                      </>
                    )}
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
                <th className="text-left text-slate-400 text-xs font-semibold px-3 py-3">Tipo</th>
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
                        <div className="text-xs">
                          <p className="text-amber-400">🌾 {formatFecha(plant.cosecha)}</p>
                          {plant.gramos != null && (
                            <p className="text-amber-300 font-bold mt-0.5">{plant.gramos}g</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs">
                          <p className="text-slate-400">{formatFecha(addDays(plant.inicio, AUTO_MIN))} –</p>
                          <p className="text-slate-400">{formatFecha(addDays(plant.inicio, AUTO_MAX))}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plant.tipo === 'auto' ? 'bg-violet-500/20 text-violet-400' : 'bg-pink-500/20 text-pink-400'}`}>
                        {plant.tipo}
                      </span>
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

                    {cosechada ? (
                      <div className="flex flex-col gap-2">
                        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-amber-400 text-xs font-semibold">🌾 Cosechada</p>
                            <p className="text-white text-sm font-bold mt-0.5">{formatFecha(detail.cosecha!)}</p>
                          </div>
                          {detail.gramos != null && (
                            <div className="text-right">
                              <p className="text-amber-300 text-2xl font-black">{detail.gramos}g</p>
                              <p className="text-slate-400 text-xs">obtenidos</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleRevertHarvest}
                          className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors"
                        >
                          ↩ Revertir cosecha
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                          <p className="text-emerald-400 text-xs font-semibold mb-0.5">Cosecha estimada</p>
                          <p className="text-white text-sm font-bold">{formatFecha(estMin)} — {formatFecha(estMax)}</p>
                          <p className="text-emerald-400/70 text-xs mt-0.5">
                            <CosechaEstimada plant={detail} />
                          </p>
                        </div>
                        <Button
                          onClick={openHarvest}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                          size="lg"
                        >
                          <CheckCircle2 size={16} className="mr-2" /> Finalizar cosecha
                        </Button>
                      </>
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

      {/* Finalizar cosecha sheet */}
      <Dialog open={showHarvest} onOpenChange={setShowHarvest}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">🌾 Finalizar cosecha</h2>
              <DialogClose asChild>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </DialogClose>
            </div>
            <p className="text-slate-400 text-sm mb-5">
              #{selectedPlant?.numero} · {selectedPlant?.raza}
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 block">Fecha de cosecha</Label>
                <Input type="date" value={harvestForm.fecha}
                  onChange={e => setHarvestForm(p => ({ ...p, fecha: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">Gramos obtenidos</Label>
                <Input type="number" placeholder="Ej: 45" value={harvestForm.gramos}
                  onChange={e => setHarvestForm(p => ({ ...p, gramos: e.target.value }))} />
              </div>
              <Button
                onClick={handleFinalizeHarvest}
                className="w-full mt-1 bg-amber-600 hover:bg-amber-500 text-white"
                size="lg"
                disabled={savingHarvest || !harvestForm.fecha || !harvestForm.gramos}
              >
                {savingHarvest
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</>
                  : 'Confirmar cosecha'}
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
