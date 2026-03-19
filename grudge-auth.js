/** grudge-auth.js — Grudge Auth Gateway: https://auth-gateway-otb8qmmyd-grudgenexus.vercel.app */
const GRUDGE_GATEWAY_URL='https://auth-gateway-otb8qmmyd-grudgenexus.vercel.app';
function getGrudgeToken(){return localStorage.getItem('grudge_auth_token')||null;}
function getGrudgeUser(){const t=getGrudgeToken();if(!t)return null;return{token:t,userId:localStorage.getItem('grudge_user_id')||null,grudgeId:localStorage.getItem('grudge_id')||null,username:localStorage.getItem('grudge_username')||'Player'};}
function isGrudgeAuthenticated(){return!!getGrudgeToken();}
function redirectToGrudgeGateway(r){window.location.href=`${GRUDGE_GATEWAY_URL}?return=${encodeURIComponent(r||window.location.href)}`;}
function requireGrudgeAuth(r){if(!isGrudgeAuthenticated())redirectToGrudgeGateway(r);}
function grudgeSignOut(){['grudge_auth_token','grudge_user_id','grudge_id','grudge_username','grudge_session_token','grudge-session'].forEach(k=>localStorage.removeItem(k));}
function grudgeAuthHeaders(){const t=getGrudgeToken();return t?{Authorization:`Bearer ${t}`,'Content-Type':'application/json'}:{'Content-Type':'application/json'};}
