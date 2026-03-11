import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { CategoryModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const categories = await CategoryModel.find({
    $or: [{ userId: 'global' }, { userId: session.user.id }],
  })
  return NextResponse.json(categories.map(c => c.toJSON()))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await connectDB()

  const category = await CategoryModel.create({
    name: body.name,
    color: body.color || '#94a3b8',
    icon: body.icon || 'circle-ellipsis',
    userId: session.user.role === 'admin' || session.user.role === 'superadmin' ? 'global' : session.user.id,
  })

  return NextResponse.json(category.toJSON(), { status: 201 })
}
