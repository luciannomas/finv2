import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { ExpenseModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'month'

  const isSuperAdmin = session.user.role === 'superadmin'
  const isAdmin = session.user.role === 'admin' || isSuperAdmin
  const viewAs = isSuperAdmin ? searchParams.get('viewAs') : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {}
  if (viewAs) {
    filter.userId = viewAs
  } else if (!isAdmin) {
    filter.userId = session.user.id
  }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const month = searchParams.get('month') // YYYY-MM

  if (month) {
    filter.date = { $gte: `${month}-01`, $lte: `${month}-31` }
  } else if (period === 'day') {
    filter.date = todayStr
  } else if (period === 'week') {
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    filter.date = { $gte: weekAgo.toISOString().split('T')[0] }
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    filter.date = { $gte: monthStart.toISOString().split('T')[0] }
  }

  const expenses = await ExpenseModel.find(filter).sort({ date: -1 })
  return NextResponse.json(expenses.map(e => e.toJSON()))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await connectDB()

  const expense = await ExpenseModel.create({
    description: body.description,
    amount: Number(body.amount),
    currency: body.currency === 'USD' ? 'USD' : 'ARS',
    categoryId: body.categoryId,
    userId: session.user.id,
    date: body.date,
    notes: body.notes || '',
  })

  return NextResponse.json(expense.toJSON(), { status: 201 })
}
