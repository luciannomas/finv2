import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { PlantModel } from '@/lib/models'
import { NextResponse } from 'next/server'

const NUEVAS = [
  { numero: 6, raza: 'Critical +2', maceta: 1 },
  { numero: 6, raza: 'Critical +2', maceta: 1 },
  { numero: 6, raza: 'Critical +2', maceta: 1 },
  { numero: 7, raza: 'Black Dom',   maceta: 1 },
  { numero: 7, raza: 'Black Dom',   maceta: 1 },
  { numero: 7, raza: 'Black Dom',   maceta: 1 },
  { numero: 8, raza: 'Moby-D',      maceta: 1 },
  { numero: 8, raza: 'Moby-D',      maceta: 1 },
  { numero: 8, raza: 'Moby-D',      maceta: 1 },
  { numero: 9, raza: 'Northern',    maceta: 1 },
  { numero: 9, raza: 'Northern',    maceta: 1 },
  { numero: 9, raza: 'Northern',    maceta: 1 },
]

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const plants = await PlantModel.insertMany(
    NUEVAS.map(p => ({
      ...p,
      banco: 'Semishop',
      inicio: '2026-10-11',
      tipo: 'auto',
      productos: ['Eden'],
      estatus: 'chica',
      cultivo: 'indoor',
      userId: session.user!.id,
    }))
  )

  return NextResponse.json({ success: true, created: plants.length })
}
