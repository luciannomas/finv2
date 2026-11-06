'use client'

import { upload } from '@vercel/blob/client'
import { Camera, ImagePlus, Loader2, Play, Trash2, Video, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface Medio {
  url: string
  fecha: string
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v|quicktime)(\?|$)/i.test(url)
}

export function MediaView({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  if (isVideoUrl(src)) {
    return <video src={src} controls playsInline className={className} />
  }
  return <img src={src} alt={alt} className={className} />
}

// Lightweight preview for lists: images render directly, videos show their first frame.
export function MediaThumb({ src, className }: { src: string; className?: string }) {
  if (isVideoUrl(src)) {
    return <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className={className} />
  }
  return <img src={src} alt="" className={className} />
}

// Fullscreen viewer: tap to close, shows the media at full size.
export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={22} />
      </button>
      <div onClick={e => e.stopPropagation()} className="max-w-full max-h-full">
        {isVideoUrl(src) ? (
          <video src={src} controls autoPlay playsInline className="max-w-full max-h-[88vh] rounded-lg" />
        ) : (
          <img src={src} alt="" className="max-w-full max-h-[88vh] object-contain rounded-lg" />
        )}
      </div>
    </div>
  )
}

// Self-contained media slot: uploads to Blob and persists via onSave, deletes via onDelete.
export function MediaSlot({
  label,
  value,
  onSave,
  onDelete,
}: {
  label: string
  value: string
  onSave: (url: string) => Promise<void> | void
  onDelete: () => Promise<void> | void
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const ref = e.target
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      await onSave(blob.url)
    } catch {
      setError('No se pudo subir. ¿Está configurado el storage?')
    } finally {
      setBusy(false)
      ref.value = ''
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await onDelete()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-slate-400 text-xs font-semibold mb-1.5">{label}</p>
      <input ref={photoRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <input ref={videoRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-700 max-h-56 bg-slate-900">
          <button type="button" onClick={() => setViewing(true)} className="block w-full">
            <MediaThumb src={value} className="w-full h-full object-cover max-h-56" />
            {isVideoUrl(value) && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="p-2.5 rounded-full bg-black/50 text-white">
                  <Play size={18} fill="currentColor" />
                </span>
              </span>
            )}
          </button>
          {viewing && <Lightbox src={value} onClose={() => setViewing(false)} />}
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-rose-400 hover:bg-black/80 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-700 bg-slate-800/50 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            Foto
          </button>
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-700 bg-slate-800/50 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            Video
          </button>
        </div>
      )}
      {error && <p className="text-rose-400 text-xs mt-1.5">{error}</p>}
    </div>
  )
}

export function MediaUpload({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const ref = e.target
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      onChange(blob.url)
    } catch {
      setError('No se pudo subir. ¿Está configurado el storage?')
    } finally {
      setUploading(false)
      ref.value = ''
    }
  }

  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>

      {value && (
        <div className="relative mb-2 rounded-2xl overflow-hidden border border-slate-700 max-h-48">
          <MediaView src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <input ref={photoRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <input ref={videoRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          Foto
        </button>
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
          Video
        </button>
      </div>

      {error && <p className="text-rose-400 text-xs mt-1.5">{error}</p>}

      <Input
        placeholder="o pegá una URL..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-2"
      />
    </div>
  )
}

// Gallery of media (photos/videos) each with its own date, to track progression.
export function MediaGallery({
  items,
  onAdd,
  onDelete,
  onDateChange,
}: {
  items: Medio[]
  onAdd: (url: string) => Promise<void> | void
  onDelete: (url: string) => Promise<void> | void
  onDateChange: (url: string, fecha: string) => Promise<void> | void
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)

  const sorted = [...items].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const ref = e.target
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      await onAdd(blob.url)
    } catch {
      setError('No se pudo subir. ¿Está configurado el storage?')
    } finally {
      setBusy(false)
      ref.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-300 text-sm font-semibold">Galería · progresión</p>
        <span className="text-slate-500 text-xs">{items.length} archivo{items.length === 1 ? '' : 's'}</span>
      </div>

      <input ref={photoRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <input ref={videoRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />

      <div className="grid grid-cols-2 gap-2">
        {sorted.map(m => (
          <div key={m.url} className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            <div className="relative h-40">
              <button
                type="button"
                onClick={() => setViewing(m.url)}
                className="block w-full h-full"
              >
                <MediaThumb src={m.url} className="w-full h-full object-cover" />
                {isVideoUrl(m.url) && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="p-2.5 rounded-full bg-black/50 text-white">
                      <Play size={18} fill="currentColor" />
                    </span>
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onDelete(m.url)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-rose-400 hover:bg-black/80"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <input
              type="date"
              value={m.fecha || ''}
              onChange={e => onDateChange(m.url, e.target.value)}
              className="w-full bg-slate-800 text-slate-300 text-xs px-2 py-1.5 border-t border-slate-700 focus:outline-none"
            />
          </div>
        ))}

        <div className="flex flex-col gap-2 min-h-[9rem]">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={busy}
            className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700 bg-slate-800/50 text-slate-400 text-xs font-medium hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            Foto
          </button>
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={busy}
            className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700 bg-slate-800/50 text-slate-400 text-xs font-medium hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
            Video
          </button>
        </div>
      </div>

      {error && <p className="text-rose-400 text-xs mt-1.5">{error}</p>}

      {viewing && <Lightbox src={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
