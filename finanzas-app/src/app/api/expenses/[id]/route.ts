import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { ExpenseModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  await connectDB()

  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin'
  const filter = isAdmin ? { _id: id } : { _id: id, userId: session.user.id }

  const expense = await ExpenseModel.findOneAndUpdate(
    filter,
    {
      $set: {
        ...(body.description != null && { description: body.description }),
        ...(body.amount != null && { amount: Number(body.amount) }),
        ...(body.currency != null && { currency: body.currency === 'USD' ? 'USD' : 'ARS' }),
        ...(body.categoryId != null && { categoryId: body.categoryId }),
        ...(body.date != null && { date: body.date }),
        ...(body.notes != null && { notes: body.notes }),
      },
    },
    { new: true }
  )

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(expense.toJSON())
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin'
  const filter = isAdmin ? { _id: id } : { _id: id, userId: session.user.id }

  const expense = await ExpenseModel.findOneAndDelete(filter)
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
