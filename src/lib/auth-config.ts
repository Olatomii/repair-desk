export function authConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.BETTER_AUTH_URL || env.RENDER_EXTERNAL_URL;
  if (!configured && env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_URL or RENDER_EXTERNAL_URL is required in production");
  }
  const url = new URL(configured || "http://localhost:3000");
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid authentication URL");
  }
  if (env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Production authentication requires HTTPS");
  }
  return { baseURL: url.origin, trustedOrigins: [url.origin] };
}
