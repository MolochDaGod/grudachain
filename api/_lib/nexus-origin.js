/** Nexus hosts — grudachain + nexus aliases proxied by grudge-nexus-proxy Worker. */

const NEXUS_CANONICAL = 'https://nexus.grudge-studio.com';
/** DNS-live aliases when nexus.grudge-studio.com has no CF record yet */
const NEXUS_ALIASES = [
  'https://platform.grudge-studio.com',
  'https://grudachain.grudge-studio.com',
];
const NEXUS_ALIAS = NEXUS_ALIASES[0];
const NEXUS_FALLBACK = 'https://grudachain-rho.vercel.app';

/** Origin used for widget/sdk/api URLs in fleet manifests. Override with NEXUS_ORIGIN env. */
const NEXUS_ORIGIN = process.env.NEXUS_ORIGIN || NEXUS_ALIAS;

module.exports = { NEXUS_CANONICAL, NEXUS_ALIASES, NEXUS_ALIAS, NEXUS_FALLBACK, NEXUS_ORIGIN };