import Link from "next/link";
import { updatePassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
          <h1 className="text-lg font-semibold mb-2">Choose a new password</h1>
          <p className="text-sm text-gray-500 mb-4">
            Set a new password for your account.
          </p>

          {error && (
            <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <form action={updatePassword} className="flex flex-col gap-3">
            <input
              type="password"
              name="password"
              placeholder="New password"
              autoComplete="new-password"
              required
              className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              name="confirm_password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="bg-accent text-white rounded-md py-2.5 text-sm font-medium"
            >
              Update password
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-4 text-center">
            <Link href="/forgot-password" className="text-accent font-medium">
              Request another reset link
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
