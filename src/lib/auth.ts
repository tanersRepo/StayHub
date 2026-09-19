import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/lib/validators/auth";

const providers = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (!user?.passwordHash) return null;
      const ok = await compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
    },
  }),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
});

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/**
 * Returns the current session user or null. Verifies the user still exists so a
 * stale JWT (e.g. after `db:reset`) is treated as logged out instead of causing FK errors.
 */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const exists = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!exists) return null;
  return { ...session.user, role: exists.role };
}

/** Redirects to /login (with callback) when unauthenticated. */
export async function requireUser(callbackUrl?: string) {
  const user = await currentUser();
  if (!user) redirect(`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
  return user;
}

/** Any signed-in user may act as a host; visiting /host promotes them. */
export async function requireHost(callbackUrl?: string) {
  const user = await requireUser(callbackUrl);
  if (user.role !== "HOST") {
    await db.user.update({ where: { id: user.id }, data: { role: "HOST" } });
  }
  return user;
}
