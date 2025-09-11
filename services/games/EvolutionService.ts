// EvolutionService: client helpers for Evolution game provider
// NOTE: Do not hardcode secrets. Read non-sensitive config from public env; use Edge Function for server-side actions.

import supabase from '../../lib/supabase';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants?.expoConfig?.extra as any) || {};
const evoExtra = extra?.evolution || extra;
const EVOLUTION_API_BASE = process.env.EXPO_PUBLIC_EVOLUTION_API_BASE || evoExtra?.EXPO_PUBLIC_EVOLUTION_API_BASE || 'https://huser.hardapi.live';
const EVOLUTION_SERVER_URL = process.env.EXPO_PUBLIC_EVOLUTION_SERVER_URL || evoExtra?.EXPO_PUBLIC_EVOLUTION_SERVER_URL || 'https://hardapi.live/launch_game1';
const EVOLUTION_LAUNCH_BASE = process.env.EXPO_PUBLIC_EVOLUTION_LAUNCH_BASE || evoExtra?.EXPO_PUBLIC_EVOLUTION_LAUNCH_BASE || 'https://hardapi.live';
const EVOLUTION_LAUNCH_PATH = process.env.EXPO_PUBLIC_EVOLUTION_LAUNCH_PATH || evoExtra?.EXPO_PUBLIC_EVOLUTION_LAUNCH_PATH || '';
const EVOLUTION_CALLBACK_URL = process.env.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || evoExtra?.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || '';
const EVOLUTION_TOKEN = process.env.EXPO_PUBLIC_EVOLUTION_TOKEN || evoExtra?.EXPO_PUBLIC_EVOLUTION_TOKEN || '';
const EVOLUTION_DOMAIN_URL = process.env.EXPO_PUBLIC_EVOLUTION_DOMAIN_URL || evoExtra?.EXPO_PUBLIC_EVOLUTION_DOMAIN_URL || '';

// Allow customizing provider param names without code changes (GET fallback only)
const PARAM_GAME = process.env.EXPO_PUBLIC_EVOLUTION_PARAM_GAME || evoExtra?.EXPO_PUBLIC_EVOLUTION_PARAM_GAME || 'game_id';
const PARAM_TOKEN = process.env.EXPO_PUBLIC_EVOLUTION_PARAM_TOKEN || evoExtra?.EXPO_PUBLIC_EVOLUTION_PARAM_TOKEN || 'token';
const PARAM_USER = process.env.EXPO_PUBLIC_EVOLUTION_PARAM_USER || evoExtra?.EXPO_PUBLIC_EVOLUTION_PARAM_USER || 'user';
const PARAM_USERNAME = process.env.EXPO_PUBLIC_EVOLUTION_PARAM_USERNAME || evoExtra?.EXPO_PUBLIC_EVOLUTION_PARAM_USERNAME || 'username';
const PARAM_CALLBACK = process.env.EXPO_PUBLIC_EVOLUTION_PARAM_CALLBACK || evoExtra?.EXPO_PUBLIC_EVOLUTION_PARAM_CALLBACK || 'callback';

export type StartSessionResult = {
  launchUrl: string;
  sessionId?: string; // internal session id
};

/**
 * Start an Evolution game session for a user.
 * For MVP we only construct a launch URL with basic params and record a local session.
 * As per provider docs, this may need a server-side create-session call; we will adjust after live testing.
 */
export async function startEvolutionSession(userId: string, gameId: string, options?: { username?: string }) : Promise<StartSessionResult> {
  // Resolve local users.id from either auth_user_id or id
  const { data: localUser } = await supabase
    .from('users')
    .select('id, username, email')
    .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
    .maybeSingle();
  const localUserId = localUser?.id || userId;

  // 1) Create local session row
  const { data: sessionRow, error: sessionErr } = await supabase
    .from('provider_game_sessions')
    .insert({ user_id: localUserId, provider: 'evolution', game_id: gameId, status: 'active' })
    .select('id')
    .single();

  if (sessionErr) {
    console.warn('Failed to create local session:', sessionErr);
  }

  // 2) Provider now requires a POST to obtain launch URL
  // Build payload
  let wallet_amount = 0;
  try {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', localUserId)
      .maybeSingle();
    wallet_amount = Number(wallet?.balance || 0);
  } catch {}

  const payload = {
    user_id: localUserId,
    wallet_amount,
    game_uid: gameId,
    token: EVOLUTION_TOKEN,
    timestamp: Math.floor(Date.now() / 1000),
    domain_url: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.origin : EVOLUTION_DOMAIN_URL) : EVOLUTION_DOMAIN_URL,
  };

  // On web, use our Vercel API proxy to avoid CORS; on native, call provider directly
  const endpoint = Platform.OS === 'web' ? '/api/evolution-launch' : EVOLUTION_SERVER_URL;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const contentType = resp.headers.get('content-type') || '';
  let launchUrl: string | null = null;
  if (contentType.includes('application/json')) {
    const data = await resp.json();
    launchUrl = data?.url || data?.launch_url || data?.game_url || null;
    if (!launchUrl && typeof data === 'string') launchUrl = data;
  } else {
    // If provider returns HTML/redirect, rely on final URL if available
    launchUrl = (resp as any).url || null;
  }

  if (!resp.ok) {
    console.warn('Evolution launch error', await resp.text());
    throw new Error('Failed to obtain launch URL');
  }

  if (!launchUrl) {
    // Fallback to GET pattern if no URL returned (misconfiguration)
    const base = EVOLUTION_LAUNCH_BASE.replace(/\/$/, '');
    const path = EVOLUTION_LAUNCH_PATH ? (EVOLUTION_LAUNCH_PATH.startsWith('/') ? EVOLUTION_LAUNCH_PATH : '/' + EVOLUTION_LAUNCH_PATH) : '';
    const url = new URL(base + path);
    url.searchParams.set(PARAM_GAME, gameId);
    if (EVOLUTION_TOKEN) url.searchParams.set(PARAM_TOKEN, EVOLUTION_TOKEN);
    url.searchParams.set(PARAM_USER, localUserId);
    if (options?.username) url.searchParams.set(PARAM_USERNAME, options.username);
    if (EVOLUTION_CALLBACK_URL) url.searchParams.set(PARAM_CALLBACK, EVOLUTION_CALLBACK_URL);
    launchUrl = url.toString();
  }

  return { launchUrl, sessionId: sessionRow?.id };
}

