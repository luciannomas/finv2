import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { PlantModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const isSuperAdmin = session.user.role === 'superadmin'
  const viewAs = isSuperAdmin ? searchParams.get('viewAs') : null
  const targetUserId = viewAs || session.user.id

  const plants = await PlantModel.find({ userId: targetUserId }).sort({ numero: 1 })
  return NextResponse.json(plants.map(p => p.toJSON()))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await connectDB()

  // Auto-assign next numero if not provided
  if (!body.numero) {
    const last = await PlantModel.findOne({ userId: session.user.id }).sort({ numero: -1 })
    body.numero = last ? last.numero + 1 : 1
  }

  const plant = await PlantModel.create({
    numero: body.numero,
    raza: body.raza,
    banco: body.banco,
    inicio: body.inicio,
    tipo: body.tipo || 'auto',
    maceta: Number(body.maceta),
    productos: body.productos || [],
    estatus: body.estatus || 'chica',
    cultivo: body.cultivo || 'indoor',
    cosecha: body.cosecha || null,
    userId: session.user.id,
  })

  return NextResponse.json(plant.toJSON(), { status: 201 })
}
