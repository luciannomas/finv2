import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { PlantModel } from '@/lib/models'
import { NextResponse } from 'next/server'

const NUEVAS = [
  { numero: 10, raza: 'The Glove',     banco: 'Lit Farms',  feno: 'f1', inicio: '2026-10-25' },
  { numero: 11, raza: 'Cubana Affair', banco: 'Ziploc',     feno: 'f1', inicio: '2026-10-25' },
  { numero: 11, raza: 'Cubana Affair', banco: 'Ziploc',     feno: 'f2', inicio: '2026-10-25' },
  { numero: 12, raza: 'Banana Dessert', banco: 'a definir', feno: 'f1', inicio: '2026-10-28' },
  { numero: 13, raza: 'Tropicana',     banco: 'a definir',  feno: 'f1', inicio: '2026-10-28' },
  { numero: 14, raza: 'Slazp x Opalo', banco: 'a definir',  feno: 'f1', inicio: '2026-10-28' },
]

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const existing = await PlantModel.countDocuments({ userId: session.user!.id, numero: { $in: [10, 11, 12, 13, 14] } })
  if (existing > 0) {
    return NextResponse.json({ success: true, created: 0, message: 'Ya estaban cargadas' })
  }

  const plants = await PlantModel.insertMany(
    NUEVAS.map(p => ({
      ...p,
      tipo: 'fem',
      maceta: 3,
      productos: ['Eden'],
      estatus: 'chica',
      estado: 'vege',
      cultivo: 'indoor',
      userId: session.user!.id,
    }))
  )

  return NextResponse.json({ success: true, created: plants.length })
}
