import type { NextAuthConfig } from "next-auth";

/** Edge-safe config (no Prisma/bcrypt) shared by middleware and the full auth setup. */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "GUEST";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
