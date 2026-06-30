export function getFrontendUrl(): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL
  if (process.env.NODE_ENV === 'production') throw new Error('FRONTEND_URL is required in production')
  return 'http://localhost:5173'
}
