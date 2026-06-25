/** Nexus hosts — grudachain + nexus aliases proxied by grudge-nexus-proxy Worker. */

const NEXUS_CANONICAL = 'https://nexus.grudge-studio.com';
const NEXUS_ALIAS = 'https://grudachain.grudge-studio.com';
const NEXUS_FALLBACK = 'https://grudachain-rho.vercel.app';

/** Origin used for widget/sdk/api URLs in fleet manifests. Override with NEXUS_ORIGIN env. */
const NEXUS_ORIGIN = process.env.NEXUS_ORIGIN || NEXUS_ALIAS;

module.exports = { NEXUS_CANONICAL, NEXUS_FALLBACK, NEXUS_ORIGIN };