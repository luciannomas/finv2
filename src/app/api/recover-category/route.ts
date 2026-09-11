import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import { CategoryModel, ExpenseModel } from '@/lib/models'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/recover-category
// Finds orphaned expenses (categoryId not matching any existing category),
// creates a new category with the given name, and relinks the expenses.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name = 'Préstamos', color = '#60a5fa' } = body

  await connectDB()

  // Get all existing category IDs
  const existingCategories = await CategoryModel.find({})
  const existingIds = new Set(existingCategories.map(c => String(c._id)))

  // Find expenses belonging to this user with orphaned categoryIds
  const isSuperAdmin = session.user.role === 'superadmin'
  const isAdmin = session.user.role === 'admin' || isSuperAdmin
  const userFilter = isAdmin ? {} : { userId: session.user.id }

  const allExpenses = await ExpenseModel.find(userFilter)
  const orphanedExpenses = allExpenses.filter(e => !existingIds.has(String(e.categoryId)))

  if (orphanedExpenses.length === 0) {
    return NextResponse.json({
      success: false,
      message: 'No se encontraron gastos huérfanos. Es posible que los gastos también hayan sido eliminados.',
    })
  }

  // Group orphaned expenses by their categoryId to show breakdown
  const byOldCatId: Record<string, number> = {}
  for (const e of orphanedExpenses) {
    const key = String(e.categoryId)
    byOldCatId[key] = (byOldCatId[key] || 0) + 1
  }

  // Create the recovered category
  const recovered = await CategoryModel.create({
    name,
    color,
    icon: 'circle-ellipsis',
    userId: isAdmin ? 'global' : session.user.id,
  })

  // Relink all orphaned expenses to the new category
  const newCatId = String(recovered._id)
  await ExpenseModel.updateMany(
    {
      _id: { $in: orphanedExpenses.map(e => e._id) },
    },
    { $set: { categoryId: newCatId } }
  )

  return NextResponse.json({
    success: true,
    category: recovered.toJSON(),
    recoveredExpenses: orphanedExpenses.length,
    orphanedCategoryIds: Object.keys(byOldCatId).length,
    detail: byOldCatId,
  })
}
