'use client'

import { X } from 'lucide-react'
import { ViewAsProvider, useViewAs } from '@/lib/view-as-context'

function ViewAsBanner() {
  const { viewAsId, viewAsName, clearViewAs } = useViewAs()
  if (!viewAsId) return null
  return (
    <div className="sticky top-0 z-[100] bg-amber-500 px-4 py-2 flex items-center justify-between max-w-[430px] mx-auto w-full">
      <span className="text-black text-sm font-semibold truncate">Viendo: {viewAsName}</span>
      <button
        onClick={clearViewAs}
        className="text-black/60 hover:text-black ml-2 flex-shrink-0 p-1"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function ViewAsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ViewAsProvider>
      <ViewAsBanner />
      {children}
    </ViewAsProvider>
  )
}
