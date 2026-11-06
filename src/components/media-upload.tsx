'use client'

import { upload } from '@vercel/blob/client'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

export function MediaUpload({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
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
      if (inputRef.current) inputRef.current.value = ''
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
        {uploading ? 'Subiendo...' : value ? 'Cambiar foto/video' : 'Subir foto/video'}
      </button>

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
