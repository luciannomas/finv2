import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { UserModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const users = await UserModel.find({}, { password: 0 })
  return NextResponse.json(users.map(u => u.toJSON()))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  await connectDB()

  const exists = await UserModel.findOne({ email: body.email })
  if (exists) return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

  let role = body.role || 'user'
  if (session.user.role === 'admin' && role !== 'user') role = 'user'

  const user = await UserModel.create({
    name: body.name,
    email: body.email,
    password: await bcrypt.hash(body.password, 10),
    role,
  })

  const { password: _pw, ...safeUser } = user.toJSON()
  return NextResponse.json(safeUser, { status: 201 })
}
