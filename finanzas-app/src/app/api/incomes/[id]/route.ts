import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { IncomeModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  await connectDB()

  const income = await IncomeModel.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    {
      $set: {
        description: body.description,
        amount: Number(body.amount),
        currency: body.currency === 'USD' ? 'USD' : 'ARS',
        date: body.date,
        notes: body.notes || '',
      },
    },
    { new: true }
  )

  if (!income) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(income.toJSON())
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const income = await IncomeModel.findOneAndDelete({ _id: id, userId: session.user.id })
  if (!income) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
