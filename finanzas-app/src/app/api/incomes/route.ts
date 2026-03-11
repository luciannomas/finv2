import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { IncomeModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'month'

  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (!isAdmin) filter.userId = session.user.id

  const now = new Date()
  if (period === 'day') {
    filter.date = now.toISOString().split('T')[0]
  } else if (period === 'week') {
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    filter.date = { $gte: weekAgo.toISOString().split('T')[0] }
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    filter.date = { $gte: monthStart.toISOString().split('T')[0] }
  }

  const incomes = await IncomeModel.find(filter).sort({ date: -1 })
  return NextResponse.json(incomes.map(i => i.toJSON()))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await connectDB()

  const income = await IncomeModel.create({
    description: body.description,
    amount: Number(body.amount),
    currency: body.currency === 'USD' ? 'USD' : 'ARS',
    userId: session.user.id,
    date: body.date,
    notes: body.notes || '',
  })

  return NextResponse.json(income.toJSON(), { status: 201 })
}
