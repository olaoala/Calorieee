"use client";

import { useCallback, useRef, useState } from "react";
import { Check } from "lucide-react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    timer.current = setTimeout(() => setMessage(null), 1800);
  }, []);

  return { message, show };
}

export default function ToastHost({ message }: { message: string | null }) {
  return (
    <div
      className={`fixed left-4 right-4 sm:left-auto sm:right-6 sm:w-72 z-[60] bottom-24 sm:bottom-6 bg-gray-900 text-white rounded-xl px-4 py-3 text-sm font-medium shadow-lg flex items-center gap-2 transition-all duration-200 ${
        message ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <Check size={15} className="text-accent shrink-0" strokeWidth={3} />
      {message}
    </div>
  );
}
