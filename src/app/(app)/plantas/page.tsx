'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Leaf, ChevronRight } from 'lucide-react'
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
  raza: '',
  banco: '',
  inicio: today(),
  tipo: 'auto',
  maceta: '',
  productos: '',
  estatus: 'chica',
  cultivo: 'indoor',
  cosecha: '',
})

function diasDesde(dateStr: string): number {
  const start = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function formatFecha(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
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

export default function PlantasPage() {
  const { viewAsId } = useViewAs()
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)

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

  function openCreate() {
    setEditingPlant(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(plant: Plant) {
    setEditingPlant(plant)
    setForm({
      raza: plant.raza,
      banco: plant.banco,
      inicio: plant.inicio,
      tipo: plant.tipo,
      maceta: String(plant.maceta),
      productos: plant.productos.join(', '),
      estatus: plant.estatus,
      cultivo: plant.cultivo,
      cosecha: plant.cosecha || '',
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
      raza: form.raza,
      banco: form.banco,
      inicio: form.inicio,
      tipo: form.tipo,
      maceta: Number(form.maceta),
      productos: form.productos ? form.productos.split(',').map(p => p.trim()).filter(Boolean) : [],
      estatus: form.estatus,
      cultivo: form.cultivo,
      cosecha: form.cosecha || null,
    }

    if (editingPlant) {
      const res = await fetch(`/api/plantas/${editingPlant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const updated = await res.json()
      setPlants(prev => prev.map(p => p.id === editingPlant.id ? updated : p))
      if (selectedPlant?.id === editingPlant.id) setSelectedPlant(updated)
    } else {
      const res = await fetch('/api/plantas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Plantas</h1>
          <p className="text-slate-400 text-sm">{plants.length} plantas · indoor</p>
        </div>
        <Button size="icon" onClick={openCreate} className="w-11 h-11 rounded-2xl">
          <Plus size={20} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-900 rounded-2xl animate-pulse" />
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
      ) : (
        <div className="flex flex-col gap-3">
          {plants.map(plant => {
            const dias = diasDesde(plant.inicio)
            const cosechada = !!plant.cosecha
            const diasCultivo = cosechada ? diasDesde(plant.inicio) - diasDesde(plant.cosecha!) : null

            return (
              <div
                key={plant.id}
                onClick={() => openDetail(plant)}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* Número */}
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-black text-lg">#{plant.numero}</span>
                </div>

                {/* Info */}
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
                    <span className="text-slate-500 text-xs capitalize">{plant.tipo}</span>
                    {cosechada ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
                        🌾 {diasCultivo}d
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">{dias}d</span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </div>
            )
          })}
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
                <button
                  onClick={() => detail && openEdit(detail)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => detail && handleDelete(detail.id)}
                  disabled={deletingId === detail?.id}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deletingId === detail?.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Trash2 size={16} />}
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
                  ? Math.floor((new Date(detail.cosecha! + 'T00:00:00').getTime() - new Date(detail.inicio + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <div className="flex flex-col gap-4">
                    {/* Stats row */}
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

                    {/* Badges */}
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

                    {/* Details */}
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
