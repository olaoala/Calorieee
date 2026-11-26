import { describe, expect, it } from "vitest";
import { getOtpVerificationType } from "../src/lib/authCallback";

describe("getOtpVerificationType", () => {
  it.each(["signup", "email", "recovery"] as const)(
    "accepts the %s callback type",
    (type) => {
      expect(getOtpVerificationType(type)).toBe(type);
    }
  );

  it.each([null, "", "unknown", "magiclink"])(
    "rejects unsupported callback type %s",
    (type) => {
      expect(getOtpVerificationType(type)).toBeNull();
    }
  );
});
