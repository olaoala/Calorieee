import { createClient } from "@/lib/supabase/client";
import type { Reminder } from "@/lib/types";

export async function getReminders(userId: string): Promise<Reminder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("time");

  if (error) throw error;
  return (data ?? []) as Reminder[];
}

export async function addReminder(
  userId: string,
  time: string,
  label: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("reminders").insert({
    user_id: userId,
    time,
    label,
    enabled: true,
  });

  if (error) throw error;
}

export async function setReminderEnabled(id: string, enabled: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("reminders").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}
