'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ViewAsCtx {
  viewAsId: string | null
  viewAsName: string | null
  setViewAs: (id: string, name: string) => void
  clearViewAs: () => void
}

const Ctx = createContext<ViewAsCtx>({
  viewAsId: null,
  viewAsName: null,
  setViewAs: () => {},
  clearViewAs: () => {},
})

export function ViewAsProvider({ children }: { children: React.ReactNode }) {
  const [viewAsId, setId] = useState<string | null>(null)
  const [viewAsName, setName] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('viewAsId')
    const name = localStorage.getItem('viewAsName')
    if (id) { setId(id); setName(name) }
  }, [])

  function setViewAs(id: string, name: string) {
    localStorage.setItem('viewAsId', id)
    localStorage.setItem('viewAsName', name)
    setId(id)
    setName(name)
  }

  function clearViewAs() {
    localStorage.removeItem('viewAsId')
    localStorage.removeItem('viewAsName')
    setId(null)
    setName(null)
  }

  return (
    <Ctx.Provider value={{ viewAsId, viewAsName, setViewAs, clearViewAs }}>
      {children}
    </Ctx.Provider>
  )
}

export const useViewAs = () => useContext(Ctx)
