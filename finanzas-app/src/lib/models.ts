import mongoose, { Schema, type Model } from 'mongoose'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transform = (_doc: any, ret: Record<string, unknown>) => {
  ret.id = (ret._id as { toString(): string }).toString()
  delete ret._id
  delete ret.__v
}

const opts = { toJSON: { transform } }

// ── User ──────────────────────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'user'], default: 'user' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  opts
)

// ── Category ──────────────────────────────────────────────────────────────────
const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    color: { type: String, default: '#94a3b8' },
    icon: { type: String, default: 'circle-ellipsis' },
    userId: { type: String, required: true }, // 'global' o userId personal
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  opts
)

// ── Expense ───────────────────────────────────────────────────────────────────
const ExpenseSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    categoryId: { type: String, required: true },
    userId: { type: String, required: true },
    date: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    notes: { type: String, default: '' },
  },
  opts
)

// ── Income ────────────────────────────────────────────────────────────────────
const IncomeSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    userId: { type: String, required: true },
    date: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    notes: { type: String, default: '' },
  },
  opts
)

// ── NotificationSettings ──────────────────────────────────────────────────────
const NotificationSettingsSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    weeklyLimit: { type: Number, default: null },
    monthlyLimit: { type: Number, default: null },
    enabled: { type: Boolean, default: true },
  },
  opts
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function model<T = any>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema)
}

export const UserModel = model('User', UserSchema)
export const CategoryModel = model('Category', CategorySchema)
export const ExpenseModel = model('Expense', ExpenseSchema)
export const IncomeModel = model('Income', IncomeSchema)
export const NotificationSettingsModel = model('NotificationSettings', NotificationSettingsSchema)
