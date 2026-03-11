import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var _mongoConn: Promise<typeof mongoose> | undefined
}

export async function connectDB() {
  const MONGODB_URI = process.env.BASE_URL_MONGODB_URI
  if (!MONGODB_URI) throw new Error('Define BASE_URL_MONGODB_URI en Vercel Environment Variables')
  if (global._mongoConn) return global._mongoConn
  global._mongoConn = mongoose.connect(MONGODB_URI)
  return global._mongoConn
}
