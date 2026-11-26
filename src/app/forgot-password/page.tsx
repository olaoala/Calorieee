import Link from "next/link";
import { requestPasswordReset } from "./actions";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h1 className="text-lg font-semibold mb-2">Reset your password</h1>
          <p className="text-sm text-gray-500 mb-4">
            Enter your account email and we’ll send you a password reset link.
          </p>

          {error && (
            <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {sent ? (
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              If an account uses that email, a password reset link will be sent.
            </p>
          ) : (
            <form action={requestPasswordReset} className="flex flex-col gap-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
                required
                className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="bg-accent text-white rounded-md py-2.5 text-sm font-medium"
              >
                Send reset link
              </button>
            </form>
          )}

          <p className="text-sm text-gray-500 mt-4 text-center">
            <Link href="/login" className="text-accent font-medium">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
