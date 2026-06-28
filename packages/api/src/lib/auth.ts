import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { db } from '@topspin/db'
import {
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  members,
  invitations,
} from '@topspin/db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.API_URL!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      organization: organizations,
      member: members,
      invitation: invitations,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [organization()],
})
