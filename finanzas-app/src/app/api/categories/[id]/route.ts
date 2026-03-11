import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { CategoryModel } from '@/lib/models'
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

  const category = await CategoryModel.findOneAndUpdate(
    filter,
    {
      $set: {
        ...(body.name != null && { name: body.name }),
        ...(body.color != null && { color: body.color }),
        ...(body.icon != null && { icon: body.icon }),
      },
    },
    { new: true }
  )

  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(category.toJSON())
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

  const category = await CategoryModel.findOneAndDelete(filter)
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
