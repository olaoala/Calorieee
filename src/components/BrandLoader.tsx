import { Flame } from "lucide-react";

export default function BrandLoader() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-gray-50">
      <div className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center animate-pulse">
        <Flame size={22} strokeWidth={2.5} />
      </div>
      <div className="w-5 h-5 border-2 border-accent-light border-t-accent rounded-full animate-spin" />
    </div>
  );
}
