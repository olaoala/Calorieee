import Link from "next/link";
import { Flame, Search, Bell, CalendarClock } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Search real foods",
    body: "Look up calories from USDA and Open Food Facts as you log, or add your own.",
  },
  {
    icon: Flame,
    title: "Track against your goal",
    body: "See what you've eaten today, grouped by meal, against your daily target.",
  },
  {
    icon: CalendarClock,
    title: "Plan ahead",
    body: "Save go-to meals as templates and apply a full day's plan in one tap.",
  },
  {
    icon: Bell,
    title: "Gentle reminders",
    body: "Set reminders so logging a meal never slips your mind.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-accent-light/60 to-gray-50 flex flex-col">
      <header className="px-5 sm:px-8 py-5 flex items-center gap-2 max-w-5xl mx-auto w-full">
        <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center">
          <Flame size={18} strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-gray-900">Calorie Tracker</span>
      </header>

      <main className="flex-1 px-5 sm:px-8 max-w-5xl mx-auto w-full flex flex-col justify-center py-10 sm:py-16">
        <div className="max-w-xl animate-fade-in">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
            Know what you eat, without the spreadsheet.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600">
            Log meals in seconds, see your daily progress at a glance, and stay on track with a
            goal that&apos;s always in view.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="bg-accent text-white text-center rounded-lg px-6 py-3.5 text-sm font-semibold shadow-card active:scale-[0.98] transition"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="bg-white text-gray-700 text-center border border-gray-200 rounded-lg px-6 py-3.5 text-sm font-semibold active:scale-[0.98] transition"
            >
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-14 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-card"
            >
              <div className="w-9 h-9 rounded-lg bg-accent-light text-accent flex items-center justify-center mb-3">
                <Icon size={18} strokeWidth={2.25} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-5 sm:px-8 py-6 text-center text-xs text-gray-400">
        Free to use. Your data stays in your own account.
      </footer>
    </div>
  );
}
