/** Nexus host — canonical custom domain vs live Vercel fallback (522 until DNS CNAME is set). */

const NEXUS_CANONICAL = 'https://grudachain.grudge-studio.com';
const NEXUS_FALLBACK = 'https://grudachain-rho.vercel.app';

/** Origin used for widget/sdk/api URLs in fleet manifests. Override with NEXUS_ORIGIN env. */
const NEXUS_ORIGIN = process.env.NEXUS_ORIGIN || NEXUS_FALLBACK;

module.exports = { NEXUS_CANONICAL, NEXUS_FALLBACK, NEXUS_ORIGIN };