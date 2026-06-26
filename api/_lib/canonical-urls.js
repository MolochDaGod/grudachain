/**
 * Grudge Studio fleet canonical URLs — single source of truth (SSOT).
 * Every fleet manifest, env default, and mismatch audit reads from here.
 */

const CANONICAL = {
  portal: 'https://grudge-studio.com',
  nexus: 'https://nexus.grudge-studio.com',
  platform: 'https://apps.grudge-studio.com',
  dash: 'https://dash.grudge-studio.com',
  fleet: 'https://fleet.grudge-studio.com',

  auth: 'https://id.grudge-studio.com',
  authLogin: 'https://id.grudge-studio.com/api/auth/page',
  gameApi: 'https://api.grudge-studio.com',
  account: 'https://account.grudge-studio.com',
  objectStore: 'https://objectstore.grudge-studio.com',
  assets: 'https://assets.grudge-studio.com',

  warlords: 'https://client.grudge-studio.com',
  grudgewarlords: 'https://grudgewarlords.com',
  game: 'https://game.grudge-studio.com',
  wcs: 'https://wcs.grudge-studio.com',
  forge: 'https://forge.grudge-studio.com',

  grudgedot: 'https://coder.grudge-studio.com',
  gdevelop: 'https://coder.grudge-studio.com',
  coder: 'https://coder.grudge-studio.com',
  releasesHub: 'https://launcher.grudge-studio.com',
  legion: 'https://ai.grudge-studio.com',
  grudaAgent: 'https://grudaagent.vercel.app',
  ale: 'https://ale.grudge-studio.com',

  puterCloud: 'https://grudge-studio.puter.site',
};

/** DNS aliases that resolve to the same Nexus deployment */
const NEXUS_ALIASES = [
  'https://grudachain.grudge-studio.com',
  'https://platform.grudge-studio.com',
];

/** Legacy Vercel hostnames — should 301 to canonical custom domains */
const LEGACY_VERCEL_HOSTS = [
  'grudachain-rho.vercel.app',
  'grudachain.vercel.app',
  'grudge-platform.vercel.app',
  'gdevelop-assistant.vercel.app',
  'warlord-crafting-suite.vercel.app',
];

/** Hosts that must never appear in fleet manifests */
const STALE_HOSTS = [
  ...LEGACY_VERCEL_HOSTS,
  'grudachain.grudgestudio.com',
  'molochdagod.github.io/ObjectStore',
];

/** Internal Vercel project URL for nexus-proxy worker (not user-facing) */
const NEXUS_VERCEL_ORIGIN =
  process.env.NEXUS_VERCEL_ORIGIN || 'https://grudachain-grudgenexus.vercel.app';

const NEXUS_CANONICAL = CANONICAL.nexus;
const NEXUS_ALIAS = NEXUS_ALIASES[0];
const NEXUS_FALLBACK = NEXUS_VERCEL_ORIGIN;
const NEXUS_ORIGIN = process.env.NEXUS_ORIGIN || NEXUS_CANONICAL;

function islandHub() {
  return `${CANONICAL.wcs}/island-hub`;
}

module.exports = {
  CANONICAL,
  NEXUS_ALIASES,
  NEXUS_CANONICAL,
  NEXUS_ALIAS,
  NEXUS_FALLBACK,
  NEXUS_ORIGIN,
  NEXUS_VERCEL_ORIGIN,
  LEGACY_VERCEL_HOSTS,
  STALE_HOSTS,
  islandHub,
};