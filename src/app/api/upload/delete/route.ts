import { auth } from '@/auth'
import { del } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url requerida' }, { status: 400 })
  }

  // Solo borramos archivos de nuestro propio store.
  if (!url.includes('blob.vercel-storage.com')) {
    return NextResponse.json({ success: true, skipped: true })
  }

  try {
    await del(url)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
