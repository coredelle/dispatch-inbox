import { LoginForm } from "./login-form";

const NOTICES: Record<string, string> = {
  auth: "That sign-in link didn't work. Links expire and only work in the browser that requested them.",
  demo: "The demo isn't available right now. You can still sign in with your email.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return <LoginForm notice={typeof error === "string" ? (NOTICES[error] ?? null) : null} />;
}
