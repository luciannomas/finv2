import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { PlantModel } from '@/lib/models'
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

  const isSuperAdmin = session.user.role === 'superadmin'
  const filter = isSuperAdmin ? { _id: id } : { _id: id, userId: session.user.id }

  const plant = await PlantModel.findOneAndUpdate(
    filter,
    { $set: body },
    { new: true }
  )

  if (!plant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(plant.toJSON())
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const isSuperAdmin = session.user.role === 'superadmin'
  const filter = isSuperAdmin ? { _id: id } : { _id: id, userId: session.user.id }

  const plant = await PlantModel.findOneAndDelete(filter)
  if (!plant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
