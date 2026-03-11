import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { NotificationSettingsModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  let settings = await NotificationSettingsModel.findOne({ userId: session.user.id })

  if (!settings) {
    settings = await NotificationSettingsModel.create({
      userId: session.user.id,
      weeklyLimit: null,
      monthlyLimit: null,
      enabled: true,
    })
  }

  return NextResponse.json(settings.toJSON())
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await connectDB()

  const settings = await NotificationSettingsModel.findOneAndUpdate(
    { userId: session.user.id },
    {
      $set: {
        weeklyLimit: body.weeklyLimit ?? null,
        monthlyLimit: body.monthlyLimit ?? null,
        enabled: body.enabled ?? true,
      },
    },
    { new: true, upsert: true }
  )

  return NextResponse.json(settings.toJSON())
}
