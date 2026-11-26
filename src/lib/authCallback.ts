export type OtpVerificationType = "signup" | "email" | "recovery";

export function getOtpVerificationType(type: string | null): OtpVerificationType | null {
  if (type === "signup" || type === "email" || type === "recovery") {
    return type;
  }

  return null;
}
