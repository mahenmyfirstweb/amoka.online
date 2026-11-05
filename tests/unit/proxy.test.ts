import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

async function proxyWithSiteUrl(siteUrl: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  return (await import("@/proxy")).proxy;
}

const visit = (url: string) => new NextRequest(url, { headers: { host: new URL(url).host } });

afterEach(() => vi.unstubAllEnvs());

describe("old Vercel address", () => {
  it("sends visitors to the real domain, keeping the page they asked for", async () => {
    const proxy = await proxyWithSiteUrl("https://www.amoka.online");
    const response = await proxy(visit("https://amoka-online.vercel.app/p/amoka-lemon-pickle?ref=1"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://www.amoka.online/p/amoka-lemon-pickle?ref=1");
  });

  it("leaves preview deployments and the real domain alone", async () => {
    const proxy = await proxyWithSiteUrl("https://www.amoka.online");
    expect((await proxy(visit("https://amoka-online-git-test-team.vercel.app/"))).status).toBe(200);
    expect((await proxy(visit("https://www.amoka.online/"))).status).toBe(200);
  });

  it("does nothing until the site address is changed from the Vercel one", async () => {
    const proxy = await proxyWithSiteUrl("https://amoka-online.vercel.app");
    expect((await proxy(visit("https://amoka-online.vercel.app/"))).status).toBe(200);
  });
});
