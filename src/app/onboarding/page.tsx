import { redirect } from "next/navigation";

// Onboarding questions were folded into the signup form itself, so this
// standalone step is no longer used. Keep the route alive as a redirect in
// case anything still links here.
export default function OnboardingPage() {
  redirect("/dashboard");
}
