import { describe, expect, it } from "vitest";
import { getSafeRedirectUrl } from "../src/lib/safeRedirect";

const requestUrl = "https://calorieee.example/auth/callback";

describe("getSafeRedirectUrl", () => {
  it("allows a same-origin path and its query", () => {
    expect(getSafeRedirectUrl(requestUrl, "/reset-password?from=email").href).toBe(
      "https://calorieee.example/reset-password?from=email"
    );
  });

  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    null,
  ])("falls back for unsafe destination %s", (destination) => {
    expect(getSafeRedirectUrl(requestUrl, destination).href).toBe(
      "https://calorieee.example/dashboard"
    );
  });
});
