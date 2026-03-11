import { connectDB } from '@/lib/mongodb'
import { UserModel, CategoryModel, ExpenseModel, IncomeModel, NotificationSettingsModel } from '@/lib/models'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  await connectDB()

  // Limpiar todo
  await Promise.all([
    UserModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    ExpenseModel.deleteMany({}),
    IncomeModel.deleteMany({}),
    NotificationSettingsModel.deleteMany({}),
  ])

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const [superadmin, admin, juan, maria, pedro] = await UserModel.insertMany([
    { name: 'Super Admin',    email: 'superadmin@app.com', password: await bcrypt.hash('super123', 10), role: 'superadmin' },
    { name: 'Administrador',  email: 'admin@app.com',      password: await bcrypt.hash('admin123', 10), role: 'admin' },
    { name: 'Juan García',    email: 'juan@app.com',       password: await bcrypt.hash('user123', 10),  role: 'user' },
    { name: 'María López',    email: 'maria@app.com',      password: await bcrypt.hash('user123', 10),  role: 'user' },
    { name: 'Pedro Martínez', email: 'pedro@app.com',      password: await bcrypt.hash('user123', 10),  role: 'user' },
  ])

  // ── Categorías globales ───────────────────────────────────────────────────
  const cats = await CategoryModel.insertMany([
    { name: 'Comida',          color: '#4ade80', icon: 'utensils',        userId: 'global' },
    { name: 'Transporte',      color: '#60a5fa', icon: 'car',             userId: 'global' },
    { name: 'Entretenimiento', color: '#c084fc', icon: 'gamepad-2',       userId: 'global' },
    { name: 'Salud',           color: '#f87171', icon: 'heart',           userId: 'global' },
    { name: 'Ropa',            color: '#f9a8d4', icon: 'shirt',           userId: 'global' },
    { name: 'Servicios',       color: '#fbbf24', icon: 'zap',             userId: 'global' },
    { name: 'Educacion',       color: '#fb923c', icon: 'book-open',       userId: 'global' },
    { name: 'Otros',           color: '#94a3b8', icon: 'circle-ellipsis', userId: 'global' },
  ])

  const catIds = cats.map(c => c._id.toString())

  // ── Helpers ───────────────────────────────────────────────────────────────
  const dateStr = (d: Date) => d.toISOString().split('T')[0]
  const randomBetween = (min: number, max: number) =>
    Math.round((Math.random() * (max - min) + min) / 10) * 10

  // 6 meses atrás desde hoy (2026-03-11)
  const today = new Date('2026-03-11')

  interface ExpenseEntry {
    description: string
    catIdx: number
    minAmount: number
    maxAmount: number
    frequency: number // veces por mes aprox
  }

  const expenseTemplates: ExpenseEntry[] = [
    { description: 'Almuerzo',          catIdx: 0, minAmount: 400,   maxAmount: 1500,  frequency: 12 },
    { description: 'Delivery',          catIdx: 0, minAmount: 800,   maxAmount: 3000,  frequency: 6  },
    { description: 'Supermercado',      catIdx: 0, minAmount: 5000,  maxAmount: 18000, frequency: 4  },
    { description: 'Café',              catIdx: 0, minAmount: 300,   maxAmount: 800,   frequency: 8  },
    { description: 'Taxi/Uber',         catIdx: 1, minAmount: 500,   maxAmount: 2500,  frequency: 8  },
    { description: 'SUBE / Colectivo',  catIdx: 1, minAmount: 100,   maxAmount: 400,   frequency: 10 },
    { description: 'Nafta',             catIdx: 1, minAmount: 3000,  maxAmount: 8000,  frequency: 3  },
    { description: 'Netflix/Streaming', catIdx: 2, minAmount: 800,   maxAmount: 1500,  frequency: 1  },
    { description: 'Cine',              catIdx: 2, minAmount: 1200,  maxAmount: 3000,  frequency: 2  },
    { description: 'Farmacia',          catIdx: 3, minAmount: 500,   maxAmount: 4000,  frequency: 3  },
    { description: 'Gimnasio',          catIdx: 3, minAmount: 3000,  maxAmount: 8000,  frequency: 1  },
    { description: 'Ropa',              catIdx: 4, minAmount: 3000,  maxAmount: 15000, frequency: 2  },
    { description: 'Luz y Gas',         catIdx: 5, minAmount: 3000,  maxAmount: 8000,  frequency: 1  },
    { description: 'Internet',          catIdx: 5, minAmount: 2000,  maxAmount: 5000,  frequency: 1  },
    { description: 'Curso Online',      catIdx: 6, minAmount: 2000,  maxAmount: 12000, frequency: 1  },
    { description: 'Varios',            catIdx: 7, minAmount: 300,   maxAmount: 2000,  frequency: 4  },
  ]

  const usersForSeed = [
    { user: juan,  salary: 180000, bonus: 35000 },
    { user: maria, salary: 150000, bonus: 25000 },
    { user: pedro, salary: 220000, bonus: 50000 },
  ]

  const allExpenses = []
  const allIncomes = []
  const allNotifSettings = []

  for (const { user, salary, bonus } of usersForSeed) {
    const userId = user._id.toString()

    // Notificaciones
    allNotifSettings.push({
      userId,
      weeklyLimit: Math.round(salary * 0.3),
      monthlyLimit: Math.round(salary * 0.8),
      enabled: true,
    })

    for (let m = 5; m >= 0; m--) {
      const monthDate = new Date(today)
      monthDate.setMonth(monthDate.getMonth() - m)
      const year = monthDate.getFullYear()
      const month = monthDate.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()

      // Ingresos del mes
      allIncomes.push({
        description: 'Sueldo',
        amount: salary + randomBetween(-5000, 5000),
        currency: 'ARS',
        userId,
        date: dateStr(new Date(year, month, 1)),
        notes: '',
      })

      // Freelance ocasional (60% de los meses)
      if (Math.random() > 0.4) {
        allIncomes.push({
          description: 'Freelance',
          amount: bonus + randomBetween(-10000, 10000),
          currency: 'ARS',
          userId,
          date: dateStr(new Date(year, month, randomBetween(10, 20))),
          notes: 'Proyecto extra',
        })
      }

      // Gastos del mes según templates
      for (const tpl of expenseTemplates) {
        const times = Math.round(tpl.frequency * (0.7 + Math.random() * 0.6))
        for (let t = 0; t < times; t++) {
          const day = Math.ceil(Math.random() * daysInMonth)
          const expDate = new Date(year, month, day)
          // No future dates
          if (expDate > today) continue

          allExpenses.push({
            description: tpl.description,
            amount: randomBetween(tpl.minAmount, tpl.maxAmount),
            currency: 'ARS',
            categoryId: catIds[tpl.catIdx],
            userId,
            date: dateStr(expDate),
            notes: '',
          })
        }
      }
    }
  }

  await Promise.all([
    ExpenseModel.insertMany(allExpenses),
    IncomeModel.insertMany(allIncomes),
    NotificationSettingsModel.insertMany(allNotifSettings),
  ])

  return NextResponse.json({
    ok: true,
    users: 5,
    categories: cats.length,
    expenses: allExpenses.length,
    incomes: allIncomes.length,
    message: 'Seed completado. Usuarios: superadmin@app.com/super123, admin@app.com/admin123, juan@app.com/user123, maria@app.com/user123, pedro@app.com/user123',
  })
}
