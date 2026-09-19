import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser, googleEnabled } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function Page({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  if (await currentUser()) redirect(typeof callbackUrl === "string" ? callbackUrl : "/");
  return (
    <AuthForm
      mode="login"
      callbackUrl={typeof callbackUrl === "string" ? callbackUrl : "/"}
      googleEnabled={googleEnabled}
    />
  );
}
