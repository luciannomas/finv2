export type Role = 'superadmin' | 'admin' | 'user'

export interface NotificationSettings {
  userId: string
  weeklyLimit: number | null
  monthlyLimit: number | null
  enabled: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  parsedExpense?: {
    description: string
    amount: number
    currency: 'ARS' | 'USD'
    categoryId: string | null
    categoryName: string
    isNewCategory: boolean
    newCategoryColor: string
    date: string
  }
  confirmed?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: Role
  createdAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  userId: string // 'global' for shared, or userId for personal
  createdAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  currency: 'ARS' | 'USD'
  categoryId: string
  userId: string
  date: string // YYYY-MM-DD
  createdAt: string
  notes?: string
}

export interface Income {
  id: string
  description: string
  amount: number
  currency: 'ARS' | 'USD'
  userId: string
  date: string // YYYY-MM-DD
  createdAt: string
  notes?: string
}

export interface Plant {
  id: string
  numero: number
  raza: string
  banco: string
  inicio: string // YYYY-MM-DD
  tipo: 'auto' | 'fem'
  maceta: number // litros
  productos: string[]
  estatus: string // chica | en vegetación | en flor | cosechada
  cultivo: 'indoor' | 'outdoor'
  feno?: string
  cosecha?: string // YYYY-MM-DD
  gramos?: number
  userId: string
  createdAt: string
}
