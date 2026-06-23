#!/usr/bin/env node
'use strict';
/** Deploy public/puter-cloud-dashboard.html → grudge-studio.puter.site */

const path = require('path');
const fs = require('fs');
const os = require('os');

const SDK_PATH = 'C:/Users/nugye/npm-global/node_modules/puter-cli/node_modules/@heyputer/puter.js/src/init.cjs';
const CONFIG_PATH = path.join(process.env.APPDATA || os.homedir(), 'puter-cli-nodejs', 'Config', 'config.json');
const LOCAL_FILE = path.resolve(__dirname, '..', 'public', 'puter-cloud-dashboard.html');
const REMOTE_DIR = 'grudge-studio-app';
const SUBDOMAIN = 'grudge-studio';

function readToken() {
  const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const profiles = data.profiles ?? [];
  const uuid = data.selected_profile;
  const profile = profiles.find((p) => p.uuid === uuid) ?? profiles[0];
  if (!profile?.token) throw new Error('No puter-cli token. Run: puter login');
  return profile.token;
}

(async () => {
  console.log('Deploying Puter Cloud Dashboard → grudge-studio.puter.site');
  const token = readToken();
  const { init } = require(SDK_PATH);
  const puter = init();
  puter.setAuthToken(token);

  const content = fs.readFileSync(LOCAL_FILE);
  console.log(`Read ${LOCAL_FILE} (${(content.length / 1024).toFixed(1)} KB)`);

  try {
    await puter.fs.mkdir(REMOTE_DIR, { createMissingParents: true });
  } catch (_) {}

  const FileCtor = globalThis.File || require('buffer').File;
  const file = new FileCtor([content], 'index.html', { type: 'text/html' });
  await puter.fs.upload(file, REMOTE_DIR, { overwrite: true });
  console.log(`Uploaded ${REMOTE_DIR}/index.html`);

  try {
    await puter.hosting.update(SUBDOMAIN, REMOTE_DIR);
    console.log('Hosting updated');
  } catch (e) {
    await puter.hosting.create(SUBDOMAIN, REMOTE_DIR);
    console.log('Hosting created');
  }

  console.log(`Done → https://${SUBDOMAIN}.puter.site`);
})().catch((e) => {
  console.error('Deploy failed:', e.message || e);
  process.exit(1);
});