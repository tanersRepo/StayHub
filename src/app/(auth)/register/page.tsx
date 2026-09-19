import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser, googleEnabled } from "@/lib/auth";

export const metadata = { title: "Sign up" };

export default async function Page({ searchParams }: PageProps<"/register">) {
  const { callbackUrl } = await searchParams;
  if (await currentUser()) redirect(typeof callbackUrl === "string" ? callbackUrl : "/");
  return (
    <AuthForm
      mode="register"
      callbackUrl={typeof callbackUrl === "string" ? callbackUrl : "/"}
      googleEnabled={googleEnabled}
    />
  );
}
