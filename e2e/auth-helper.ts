import { expect, type APIRequestContext } from "@playwright/test";
export async function signIn(api: APIRequestContext, baseURL: string, email: string, password: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await api.post("/api/auth/sign-in/email", { headers: { origin: baseURL }, data: { email, password } });
    if (response.status() !== 429) return response;
    const seconds = Number(response.headers()["x-retry-after"]);
    expect(seconds).toBeGreaterThan(0); expect(seconds).toBeLessThanOrEqual(10);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000 + 150));
  }
  throw Error("Authentication rate limit did not clear within the expected test window");
}
