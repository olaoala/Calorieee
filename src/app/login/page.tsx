import Link from "next/link";
import { Flame } from "lucide-react";
import { login } from "./actions";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center">
            <Flame size={20} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-gray-900">Calorie Tracker</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h1 className="text-lg font-semibold mb-4">Log in</h1>

          {error && (
            <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <LoginForm action={login} />

          <p className="text-sm text-gray-500 mt-4 text-center">
            No account?{" "}
            <Link href="/signup" className="text-accent font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
