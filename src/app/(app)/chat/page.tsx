'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrency } from '@/lib/currency'
import type { ChatMessage, Category } from '@/lib/types'

type ApiMessage = { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'Gasté $1500 en almuerzo hoy',
  'Pagué el gimnasio $8000',
  'Uber $650 ayer',
  'Supermercado $12000',
]

export default function ChatPage() {
  const { format } = useCurrency()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Contame tus gastos en lenguaje natural y los registro automáticamente. Por ejemplo: "Gasté $1200 en almuerzo hoy" o "Pagué Netflix $2900".',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function buildApiMessages(msgs: ChatMessage[]): ApiMessage[] {
    return msgs.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content }))
  }

  async function saveExpense(exp: NonNullable<ChatMessage['parsedExpense']>): Promise<string | null> {
    let categoryId = exp.categoryId

    if (exp.isNewCategory) {
      const catRes = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: exp.categoryName, color: exp.newCategoryColor, icon: 'circle-ellipsis' }),
      })
      const newCat = await catRes.json()
      categoryId = newCat.id
      setCategories(prev => [...prev, newCat])
    }

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: exp.description,
        amount: exp.amount,
        currency: exp.currency,
        categoryId,
        date: exp.date,
        notes: '',
      }),
    })
    const saved = await res.json()
    return saved.id || null
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: buildApiMessages(updatedMessages) }),
      })
      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`, role: 'assistant',
          content: 'Hubo un error. Revisá que la API key esté configurada.',
        }])
        return
      }

      // Auto-guardar el gasto si Claude lo detectó
      if (data.parsedExpense) {
        try {
          await saveExpense(data.parsedExpense)
          const exp = data.parsedExpense
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: 'assistant',
            content: data.reply || `Registré el gasto.`,
            parsedExpense: exp,
            confirmed: true, // ya guardado
          }
          setMessages(prev => [...prev, assistantMsg])
        } catch {
          setMessages(prev => [...prev, {
            id: `msg-${Date.now()}-ai`, role: 'assistant',
            content: data.reply + '\n\n⚠️ No se pudo guardar automáticamente. Intentá de nuevo.',
          }])
        }
      } else {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.reply || 'Entendido.',
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'assistant', content: 'No se pudo conectar con el servidor.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (categoryId: string | null, fallback: string) => {
    if (!categoryId) return fallback
    return categories.find(c => c.id === categoryId)?.color || fallback
  }

  return (
    <div className="flex flex-col h-dvh pb-20">
      {/* Header */}
      <div className="px-4 pt-12 pb-3 border-b border-slate-800/50 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-2xl gradient-violet flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Asistente</h1>
          <p className="text-slate-500 text-xs">Registrá gastos hablando</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user'
              ? 'bg-violet-600 text-white rounded-2xl rounded-br-md px-4 py-2.5'
              : 'bg-slate-800/80 text-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5'}`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>

              {/* Expense saved card */}
              {msg.parsedExpense && msg.confirmed === true && (
                <div className="mt-3 bg-slate-900/80 rounded-xl p-3 border border-emerald-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: getCategoryColor(msg.parsedExpense.categoryId, msg.parsedExpense.newCategoryColor) }}
                    />
                    <span className="text-xs text-slate-400 font-medium">
                      {msg.parsedExpense.categoryName}
                      {msg.parsedExpense.isNewCategory && <span className="ml-1 text-violet-400">(nueva)</span>}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-sm">{msg.parsedExpense.description}</p>
                  <p className="text-rose-400 font-bold text-lg">-{format(msg.parsedExpense.amount)}</p>
                  <p className="text-slate-500 text-xs mb-2">{msg.parsedExpense.date}</p>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                    <Check size={12} />
                    <span>Guardado en {msg.parsedExpense.categoryName}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="flex-shrink-0 text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-2xl px-3 py-1.5 hover:bg-slate-700 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-800/50 flex gap-2 flex-shrink-0">
        <Input
          ref={inputRef}
          placeholder="Ej: Gasté $800 en café hoy..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          className="flex-1 rounded-2xl"
          disabled={loading}
        />
        <Button
          size="icon"
          className="w-11 h-11 rounded-2xl flex-shrink-0"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </Button>
      </div>
    </div>
  )
}
