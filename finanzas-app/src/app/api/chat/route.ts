import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { CategoryModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.KEY_CLAUDE })

const CATEGORY_COLORS = [
  '#4ade80', '#60a5fa', '#c084fc', '#f87171', '#f9a8d4',
  '#fbbf24', '#fb923c', '#94a3b8', '#34d399', '#a78bfa',
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { messages } = body as { messages: { role: 'user' | 'assistant'; content: string }[] }

  await connectDB()
  const categoriesDocs = await CategoryModel.find({
    $or: [{ userId: 'global' }, { userId: session.user.id }],
  })
  const categories = categoriesDocs.map(c => c.toJSON())

  const today = new Date().toISOString().split('T')[0]

  const systemPrompt = `Sos un asistente de finanzas personales en español rioplatense (Argentina). Ayudás al usuario a registrar gastos y entender su situación financiera.

Fecha de hoy: ${today}

Categorías disponibles (usá estos IDs exactos):
${categories.map(c => `- id: "${c.id}", nombre: "${c.name}"`).join('\n')}

INSTRUCCIONES:
- Cuando el usuario mencione un gasto, usá la herramienta "registrar_gasto" para procesarlo.
- Si la categoría no existe en la lista, usá isNewCategory: true y sugerí un nombre apropiado.
- Para la fecha: "hoy" = ${today}, "ayer" = ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}, si no especifica usá hoy.
- El monto siempre es positivo. Si dicen "gasté $500" el amount es 500.
- Moneda default: ARS. Si dicen "dólares" o "USD" usá USD.
- Respondé siempre en español, de forma amigable y concisa.
- Si el usuario pregunta por sus finanzas, dales consejos útiles basados en el contexto.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      tools: [
        {
          name: 'registrar_gasto',
          description: 'Registra un gasto detectado en el mensaje del usuario',
          input_schema: {
            type: 'object' as const,
            properties: {
              description: { type: 'string', description: 'Descripción del gasto (qué compró)' },
              amount: { type: 'number', description: 'Monto del gasto (número positivo)' },
              currency: { type: 'string', enum: ['ARS', 'USD'], description: 'Moneda del gasto' },
              categoryId: { type: 'string', description: 'ID de la categoría existente. Null si es nueva.' },
              categoryName: { type: 'string', description: 'Nombre de la categoría (existente o nueva)' },
              isNewCategory: { type: 'boolean', description: 'True si la categoría no existe y hay que crearla' },
              date: { type: 'string', description: 'Fecha del gasto en formato YYYY-MM-DD' },
            },
            required: ['description', 'amount', 'currency', 'categoryName', 'isNewCategory', 'date'],
          },
        },
      ],
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    let replyText = ''
    let parsedExpense = null

    for (const block of response.content) {
      if (block.type === 'text') {
        replyText += block.text
      } else if (block.type === 'tool_use' && block.name === 'registrar_gasto') {
        const input = block.input as {
          description: string
          amount: number
          currency: 'ARS' | 'USD'
          categoryId?: string
          categoryName: string
          isNewCategory: boolean
          date: string
        }
        const colorIdx = Math.floor(Math.random() * CATEGORY_COLORS.length)
        parsedExpense = {
          description: input.description,
          amount: input.amount,
          currency: input.currency || 'ARS',
          categoryId: input.isNewCategory ? null : (input.categoryId || null),
          categoryName: input.categoryName,
          isNewCategory: input.isNewCategory,
          newCategoryColor: CATEGORY_COLORS[colorIdx],
          date: input.date,
        }
      }
    }

    if (!replyText && parsedExpense) {
      replyText = `Anotado! Registré un gasto de ${parsedExpense.amount} ${parsedExpense.currency} en "${parsedExpense.description}" (${parsedExpense.categoryName}). ¿Lo confirmo?`
    }

    return NextResponse.json({ reply: replyText, parsedExpense })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Error al procesar el mensaje' }, { status: 500 })
  }
}
