import { lookup } from "node:dns/promises";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import webpush, {
  type PushSubscription,
  type RequestOptions,
} from "web-push";

// Browser subscription hosts verified for Chrome/Chromium, Firefox, and Safari.
const SUPPORTED_PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);

const blockedAddresses = new BlockList();
const blockedIpv4Subnets: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

for (const [subnet, prefix] of blockedIpv4Subnets) {
  blockedAddresses.addSubnet(subnet, prefix, "ipv4");
}

const blockedIpv6Subnets: [string, number][] = [
  ["::", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

for (const [subnet, prefix] of blockedIpv6Subnets) {
  blockedAddresses.addSubnet(subnet, prefix, "ipv6");
}

const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");

export class InvalidPushEndpointError extends Error {
  constructor() {
    super("Push endpoint is not an approved HTTPS endpoint.");
    this.name = "InvalidPushEndpointError";
  }
}

export class UnsafePushAddressError extends Error {
  constructor() {
    super("Push endpoint resolved to a non-public address.");
    this.name = "UnsafePushAddressError";
  }
}

export function validatePushEndpoint(value: unknown): URL {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 4096 ||
    value.trim() !== value ||
    /[\u0000-\u0020\u007f\\]/.test(value)
  ) {
    throw new InvalidPushEndpointError();
  }

  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new InvalidPushEndpointError();
  }

  if (
    endpoint.protocol !== "https:" ||
    !SUPPORTED_PUSH_HOSTS.has(endpoint.hostname.toLowerCase()) ||
    endpoint.username !== "" ||
    endpoint.password !== "" ||
    (endpoint.port !== "" && endpoint.port !== "443") ||
    endpoint.pathname === "/" ||
    endpoint.hash !== ""
  ) {
    throw new InvalidPushEndpointError();
  }

  return endpoint;
}

function isPublicAddress(address: string, family: number): boolean {
  if (family === 4) {
    return isIP(address) === 4 && !blockedAddresses.check(address, "ipv4");
  }

  if (family === 6) {
    return (
      isIP(address) === 6 &&
      globalIpv6.check(address, "ipv6") &&
      !blockedAddresses.check(address, "ipv6")
    );
  }

  return false;
}

type ResolvedAddress = { address: string; family: number };
type AddressResolver = (hostname: string) => Promise<ResolvedAddress[]>;
type PushSender = (
  subscription: PushSubscription,
  payload: string,
  options: RequestOptions
) => Promise<unknown>;

const resolveAddresses: AddressResolver = (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

export async function sendValidatedPushNotification(
  subscription: PushSubscription,
  payload: string,
  sender: PushSender = webpush.sendNotification,
  resolver: AddressResolver = resolveAddresses
): Promise<unknown> {
  const endpoint = validatePushEndpoint(subscription.endpoint);
  const addresses = await resolver(endpoint.hostname);

  if (addresses.length === 0) {
    throw new Error("Push endpoint DNS lookup returned no addresses.");
  }

  if (addresses.some(({ address, family }) => !isPublicAddress(address, family))) {
    throw new UnsafePushAddressError();
  }

  const lookup: NonNullable<https.AgentOptions["lookup"]> = (
    hostname,
    options,
    callback
  ) => {
    if (hostname.toLowerCase() !== endpoint.hostname.toLowerCase()) {
      const error = Object.assign(new Error("Unexpected push endpoint host."), {
        code: "ENOTFOUND",
      });
      callback(error, "", 0);
      return;
    }

    if (typeof options === "object" && options.all) {
      callback(null, addresses);
      return;
    }

    const address = addresses[0];
    callback(null, address.address, address.family);
  };

  const agent = new https.Agent({ lookup });
  try {
    return await sender(
      { ...subscription, endpoint: endpoint.href },
      payload,
      { agent, timeout: 10_000 }
    );
  } finally {
    agent.destroy();
  }
}
