import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { PlantModel } from '@/lib/models'
import { NextResponse } from 'next/server'

const FOTOS: Record<string, string> = {
  'Pina Express':  'https://placehold.co/400x400/0f172a/a3e635?text=Pina+Express',
  'Grapefruit':    'https://placehold.co/400x400/0f172a/fb923c?text=Grapefruit',
  'White Widow':   'https://placehold.co/400x400/0f172a/e2e8f0?text=White+Widow',
  'Oregon Peach':  'https://placehold.co/400x400/0f172a/fb7185?text=Oregon+Peach',
  'Gorilla':       'https://placehold.co/400x400/0f172a/a78bfa?text=Gorilla',
  'Critical +2':   'https://placehold.co/400x400/0f172a/34d399?text=Critical+%2B2',
  'Black Dom':     'https://placehold.co/400x400/0f172a/94a3b8?text=Black+Dom',
  'Moby-D':        'https://placehold.co/400x400/0f172a/38bdf8?text=Moby-D',
  'Northern':      'https://placehold.co/400x400/0f172a/c084fc?text=Northern',
}

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  let updated = 0
  for (const [raza, foto] of Object.entries(FOTOS)) {
    const result = await PlantModel.updateMany(
      { userId: session.user!.id, raza, foto: null },
      { $set: { foto } }
    )
    updated += result.modifiedCount
  }

  return NextResponse.json({ success: true, updated })
}
