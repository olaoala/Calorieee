import Link from "next/link";
import { Flame } from "lucide-react";
import { login } from "./actions";

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

          <form action={login} className="flex flex-col gap-3">
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              Remember me
            </label>
            <button
              type="submit"
              className="bg-accent text-white rounded-md py-2.5 text-sm font-medium mt-1 active:scale-[0.98] transition"
            >
              Log in
            </button>
          </form>

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
