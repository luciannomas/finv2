'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, Users, X, Eye, EyeOff, ScanEye } from 'lucide-react'
import { useViewAs } from '@/lib/view-as-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, BottomSheet, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface UserForm {
  name: string
  email: string
  password: string
  role: string
}

const emptyForm: UserForm = { name: '', email: '', password: '', role: 'user' }

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const isSuperAdmin = session?.user?.role === 'superadmin'
  const { viewAsId, setViewAs, clearViewAs } = useViewAs()

  useEffect(() => {
    const role = session?.user?.role
    if (role && role !== 'admin' && role !== 'superadmin') {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingUser(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(user: UserData) {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.email) { setError('Nombre y email son requeridos'); return }
    if (!editingUser && !form.password) { setError('La contraseña es requerida'); return }

    setSaving(true)
    setError('')

    let res: Response
    if (editingUser) {
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role }
      if (form.password) body.password = form.password
      res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }

    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al guardar')
      return
    }

    setShowForm(false)
    loadUsers()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== id))
    setDeletingId(null)
  }

  const roleBadge = (role: string) => {
    if (role === 'superadmin') return <Badge variant="warning">Super Admin</Badge>
    if (role === 'admin') return <Badge variant="default">Admin</Badge>
    return <Badge variant="outline">Usuario</Badge>
  }

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Administración</h1>
          <p className="text-slate-400 text-sm">{users.length} usuarios registrados</p>
        </div>
        <Button size="icon" onClick={openCreate} className="w-11 h-11 rounded-2xl">
          <Plus size={20} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'SuperAdmins', count: users.filter(u => u.role === 'superadmin').length, color: 'text-amber-400' },
          { label: 'Admins', count: users.filter(u => u.role === 'admin').length, color: 'text-violet-400' },
          { label: 'Usuarios', count: users.filter(u => u.role === 'user').length, color: 'text-slate-300' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No hay usuarios</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map(user => {
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            const isSelf = user.id === session?.user?.id
            return (
              <div
                key={user.id}
                className={`bg-slate-900 border rounded-2xl p-4 flex items-center gap-3 ${
                  isSelf ? 'border-violet-700/50' : 'border-slate-800'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl gradient-violet flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm truncate">{user.name}</p>
                    {isSelf && <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">Tú</span>}
                  </div>
                  <p className="text-slate-500 text-xs truncate">{user.email}</p>
                  <div className="mt-1">{roleBadge(user.role)}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {isSuperAdmin && !isSelf && user.email !== 'lucho@app.com' && (
                    <button
                      onClick={() => viewAsId === user.id ? clearViewAs() : setViewAs(user.id, user.name)}
                      className={`p-2 rounded-xl transition-colors ${
                        viewAsId === user.id
                          ? 'text-amber-400 bg-amber-500/15'
                          : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
                      }`}
                      title="Ver como este usuario"
                    >
                      <ScanEye size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(user)}
                    className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingId === user.id}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {deletingId === user.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form bottom sheet */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <BottomSheet>
          <div className="px-5 pb-8 pt-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <DialogClose asChild>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </DialogClose>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 block">Nombre completo</Label>
                <Input
                  placeholder="Juan García"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  placeholder="juan@email.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">
                  {editingUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required={!editingUser}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Rol</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                  <p className="text-rose-400 text-sm">{error}</p>
                </div>
              )}

              <Button onClick={handleSave} className="w-full mt-1" size="lg" disabled={saving}>
                {saving
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</>
                  : editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
            </div>
          </div>
        </BottomSheet>
      </Dialog>
    </div>
  )
}
