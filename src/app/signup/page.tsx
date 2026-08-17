import Link from "next/link";
import { Flame, MailCheck } from "lucide-react";
import SignupForm from "@/components/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; check_email?: string }>;
}) {
  const { error, check_email } = await searchParams;

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
          <h1 className="text-lg font-semibold mb-4">Create your account</h1>

          {error && (
            <p className="text-sm text-danger bg-danger-light border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {check_email ? (
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-10 h-10 rounded-full bg-accent-light text-accent flex items-center justify-center">
                <MailCheck size={20} />
              </div>
              <p className="text-sm text-gray-600">
                Check your email to confirm your account, then log in.
              </p>
            </div>
          ) : (
            <SignupForm />
          )}

          <p className="text-sm text-gray-500 mt-4 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
