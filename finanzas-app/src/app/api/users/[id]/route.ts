import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { UserModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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
  const isSelf = session.user.id === id
  if (!isAdmin && !isSelf) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (body.name) updates.name = body.name
  if (body.email) updates.email = body.email
  if (body.role && isAdmin) {
    if (session.user.role === 'admin' && body.role === 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    updates.role = body.role
  }
  if (body.password) updates.password = await bcrypt.hash(body.password, 10)

  const user = await UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true, projection: { password: 0 } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user.toJSON())
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.user.id === id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await connectDB()
  const user = await UserModel.findByIdAndDelete(id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
