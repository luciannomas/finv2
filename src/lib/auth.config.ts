import type { NextAuthConfig } from 'next-auth'

// Config liviana sin imports de Node.js (bcrypt, mongoose)
// Solo se usa en el middleware (Edge Runtime)
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role: string; id: string } & typeof session.user).role = token.role as string
        ;(session.user as { role: string; id: string } & typeof session.user).id = token.id as string
      }
      return session
    },
  },
}
