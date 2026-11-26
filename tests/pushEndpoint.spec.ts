import { describe, expect, it, vi } from "vitest";
import type { PushSubscription, RequestOptions } from "web-push";
import {
  InvalidPushEndpointError,
  UnsafePushAddressError,
  sendValidatedPushNotification,
  validatePushEndpoint,
} from "../src/lib/pushEndpoint";

const validSubscription: PushSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/subscription-token",
  keys: {
    p256dh: "public-key",
    auth: "auth-secret",
  },
};

function createSender() {
  return vi.fn(
    async (
      _subscription: PushSubscription,
      _payload: string,
      _options?: RequestOptions
    ) => ({ statusCode: 201 })
  );
}

describe("validatePushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/token",
    "https://updates.push.services.mozilla.com/wpush/v1/token",
    "https://web.push.apple.com/token",
  ])("accepts supported browser push endpoint %s", (endpoint) => {
    expect(validatePushEndpoint(endpoint).href).toBe(endpoint);
  });

  it.each([
    "not a URL",
    "http://fcm.googleapis.com/fcm/send/token",
    "https://attacker.example/push",
    "https://fcm.googleapis.com.attacker.example/fcm/send/token",
    "https://user:password@fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com:8443/fcm/send/token",
    "https://fcm.googleapis.com/",
    "https://fcm.googleapis.com/fcm/send/token#fragment",
    "https://fcm.googleapis.com/fcm/send/\\attacker.example",
  ])("rejects unsafe or malformed endpoint %s", (endpoint) => {
    expect(() => validatePushEndpoint(endpoint)).toThrow(InvalidPushEndpointError);
  });

  it("rejects non-string and oversized endpoint values", () => {
    expect(() => validatePushEndpoint(null)).toThrow(InvalidPushEndpointError);
    expect(() => validatePushEndpoint("x".repeat(4097))).toThrow(
      InvalidPushEndpointError
    );
  });
});

describe("sendValidatedPushNotification", () => {
  it("pins the HTTPS agent to resolved public addresses", async () => {
    const sender = createSender();
    const resolver = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);

    await sendValidatedPushNotification(validSubscription, "reminder", sender, resolver);

    expect(resolver).toHaveBeenCalledWith("fcm.googleapis.com");
    expect(sender).toHaveBeenCalledOnce();
    const options = sender.mock.calls[0][2];
    expect(options?.agent).toBeDefined();
    expect(options?.timeout).toBe(10_000);

    const lookup = options?.agent?.options.lookup;
    expect(lookup).toBeDefined();
    const address = await new Promise<{ address: string; family: number }>(
      (resolve, reject) => {
        lookup!("fcm.googleapis.com", { all: false }, (error, result, family) => {
          if (error) {
            reject(error);
          } else if (typeof result !== "string") {
            reject(new Error("Expected a single pinned DNS address."));
          } else {
            resolve({ address: result, family: family ?? 0 });
          }
        });
      }
    );
    expect(address).toEqual({ address: "8.8.8.8", family: 4 });
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/token",
    "https://127.0.0.1/private",
    "https://attacker.example/push",
  ])("does not send invalid stored endpoint %s", async (endpoint) => {
    const sender = createSender();
    const resolver = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);

    await expect(
      sendValidatedPushNotification(
        { ...validSubscription, endpoint },
        "reminder",
        sender,
        resolver
      )
    ).rejects.toThrow(InvalidPushEndpointError);
    expect(resolver).not.toHaveBeenCalled();
    expect(sender).not.toHaveBeenCalled();
  });

  it.each([
    { address: "127.0.0.1", family: 4 },
    { address: "10.0.0.4", family: 4 },
    { address: "169.254.169.254", family: 4 },
    { address: "::1", family: 6 },
    { address: "fd00::1", family: 6 },
    { address: "::ffff:127.0.0.1", family: 6 },
  ])("does not send when DNS returns unsafe address $address", async (address) => {
    const sender = createSender();
    const resolver = vi.fn(async () => [address]);

    await expect(
      sendValidatedPushNotification(validSubscription, "reminder", sender, resolver)
    ).rejects.toThrow(UnsafePushAddressError);
    expect(sender).not.toHaveBeenCalled();
  });
});
