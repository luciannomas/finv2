import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { PlantModel } from '@/lib/models'
import { NextResponse } from 'next/server'

const NUEVAS = [
  { numero: 6, raza: 'Critical +2', maceta: 11 },
  { numero: 6, raza: 'Critical +2', maceta: 11 },
  { numero: 6, raza: 'Critical +2', maceta: 11 },
  { numero: 7, raza: 'Black Dom',   maceta: 11 },
  { numero: 7, raza: 'Black Dom',   maceta: 11 },
  { numero: 7, raza: 'Black Dom',   maceta: 11 },
  { numero: 8, raza: 'Moby-D',      maceta: 11 },
  { numero: 8, raza: 'Moby-D',      maceta: 11 },
  { numero: 8, raza: 'Moby-D',      maceta: 11 },
  { numero: 9, raza: 'Northern',    maceta: 11 },
  { numero: 9, raza: 'Northern',    maceta: 11 },
  { numero: 9, raza: 'Northern',    maceta: 11 },
]

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const existing = await PlantModel.countDocuments({ userId: session.user!.id, numero: { $in: [6,7,8,9] } })
  if (existing > 0) {
    const result = await PlantModel.updateMany(
      { userId: session.user!.id, numero: { $in: [6,7,8,9] }, banco: { $ne: 'BSF' } },
      { $set: { banco: 'BSF' } }
    )
    return NextResponse.json({ success: true, created: 0, updated: result.modifiedCount, message: result.modifiedCount > 0 ? `Banco actualizado a BSF (${result.modifiedCount})` : 'Ya estaban al día' })
  }

  const plants = await PlantModel.insertMany(
    NUEVAS.map(p => ({
      ...p,
      banco: 'BSF',
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
