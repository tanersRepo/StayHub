"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

export type ActionState = { error?: string } | undefined;

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists" };

  await db.user.create({ data: { name, email, passwordHash: await hash(password, 10) } });
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  await signIn("credentials", { email, password, redirectTo: callbackUrl });
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: callbackUrl });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Invalid email or password" };
    throw err; // NEXT_REDIRECT must propagate
  }
}

export async function googleLoginAction(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  await signIn("google", { redirectTo: callbackUrl });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
