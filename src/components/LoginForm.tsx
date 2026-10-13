"use client";

import { useFormStatus } from "react-dom";
import PasswordField from "@/components/PasswordField";

type LoginFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-accent text-white rounded-md py-2.5 text-sm font-medium mt-1 active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
    >
      {pending && (
        <span
          className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? "Logging in..." : "Log in"}
    </button>
  );
}

export default function LoginForm({ action }: LoginFormProps) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        className="border border-gray-200 rounded-md px-3 py-2.5 text-sm"
      />
      <PasswordField autoComplete="current-password" placeholder="Password" />
      <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
        />
        Remember me
      </label>
      <SubmitButton />
    </form>
  );
}
