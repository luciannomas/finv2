import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { PlantModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

const SEED_DATA = [
  { numero: 1, raza: 'Pina Express',  banco: 'Semishop', inicio: '2026-07-09', tipo: 'auto', maceta: 40, productos: ['Eden'], estatus: 'en flor', cultivo: 'indoor' },
  { numero: 2, raza: 'Grapefruit',    banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 10, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
  { numero: 3, raza: 'Grapefruit',    banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 15, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
  { numero: 4, raza: 'White Widow',   banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 20, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
  { numero: 5, raza: 'White Widow',   banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 20, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
  { numero: 6, raza: 'White Widow',   banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 15, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
  { numero: 7, raza: 'Oregon Peach',  banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 30, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
  { numero: 8, raza: 'Oregon Peach',  banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 30, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
  { numero: 9, raza: 'Gorilla',       banco: 'Semishop', inicio: '2026-08-05', tipo: 'auto', maceta: 10, productos: ['Eden'], estatus: 'chica', cultivo: 'indoor' },
]

// POST /api/seed-plantas — public, uses session userId or body userId
export async function POST(req: NextRequest) {
  const session = await auth()
  const body = await req.json().catch(() => ({}))
  const userId = session?.user?.id || body.userId

  if (!userId) return NextResponse.json({ error: 'userId requerido o iniciá sesión' }, { status: 400 })

  await connectDB()

  const existing = await PlantModel.countDocuments({ userId })
  if (existing > 0 && !body.reset) {
    return NextResponse.json({ error: `Ya existen ${existing} plantas. Pasá reset:true para borrar y re-sembrar.` }, { status: 409 })
  }
  if (body.reset) {
    await PlantModel.deleteMany({ userId })
  }

  const plants = await PlantModel.insertMany(
    SEED_DATA.map(p => ({ ...p, userId }))
  )

  return NextResponse.json({ success: true, created: plants.length })
}
