export function getSafeRedirectUrl(requestUrl: string, destination: string | null): URL {
  const baseUrl = new URL(requestUrl);

  if (
    !destination ||
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    destination.includes("\\")
  ) {
    return new URL("/dashboard", baseUrl);
  }

  const targetUrl = new URL(destination, baseUrl);
  return targetUrl.origin === baseUrl.origin
    ? targetUrl
    : new URL("/dashboard", baseUrl);
}
