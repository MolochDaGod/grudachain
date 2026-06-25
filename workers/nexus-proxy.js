/**
 * Edge proxy for GrudaChain Nexus — serves nexus.grudge-studio.com and
 * grudachain.grudge-studio.com from the live Vercel deployment.
 */
const ORIGIN = "https://grudachain-rho.vercel.app";

export default {
  async fetch(request, env) {
    const origin = (env && env.NEXUS_ORIGIN) || ORIGIN;
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, origin.replace(/\/$/, "") + "/");
    const headers = new Headers(request.headers);
    headers.set("Host", new URL(origin).host);
    headers.delete("cf-connecting-ip");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const res = await fetch(target.toString(), init);
    const out = new Headers(res.headers);
    out.set("Access-Control-Allow-Origin", "*");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  },
};