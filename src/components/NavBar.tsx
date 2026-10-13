"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutCurrentUser } from "@/features/auth/services/authService";
import {
  Flame,
  LogOut,
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  User,
  type LucideIcon,
} from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/plans", label: "Plans", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await signOutCurrentUser();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200 pt-safe-top">
        <div className="max-w-2xl mx-auto px-4 sm:px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center">
              <Flame size={15} strokeWidth={2.5} />
            </div>
            <h1 className="text-[15px] font-semibold text-gray-900">Calorie Tracker</h1>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-danger px-2.5 py-1.5 rounded-md transition-colors"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

        {/* Desktop/tablet tabs, inline under the header */}
        <nav className="hidden sm:flex max-w-2xl mx-auto px-5 gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3.5 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "text-accent border-accent font-semibold"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 pb-safe-bottom">
        <div className="flex items-stretch justify-between px-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-accent" : "text-gray-400"
                }`}
              >
                <tab.icon size={19} strokeWidth={active ? 2.4 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
