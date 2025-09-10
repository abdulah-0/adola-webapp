// EvolutionService: client helpers for Evolution game provider
// NOTE: Do not hardcode secrets. Read non-sensitive config from public env; use Edge Function for server-side actions.

import supabase from '../../lib/supabase';
import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra as any) || {};
const evoExtra = extra?.evolution || extra;
const EVOLUTION_API_BASE = process.env.EXPO_PUBLIC_EVOLUTION_API_BASE || evoExtra?.EXPO_PUBLIC_EVOLUTION_API_BASE || 'https://huser.hardapi.live';
const EVOLUTION_LAUNCH_BASE = process.env.EXPO_PUBLIC_EVOLUTION_LAUNCH_BASE || evoExtra?.EXPO_PUBLIC_EVOLUTION_LAUNCH_BASE || 'https://hardapi.live';
const EVOLUTION_LAUNCH_PATH = process.env.EXPO_PUBLIC_EVOLUTION_LAUNCH_PATH || evoExtra?.EXPO_PUBLIC_EVOLUTION_LAUNCH_PATH || '';
const EVOLUTION_CALLBACK_URL = process.env.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || evoExtra?.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || '';
const EVOLUTION_TOKEN = process.env.EXPO_PUBLIC_EVOLUTION_TOKEN || evoExtra?.EXPO_PUBLIC_EVOLUTION_TOKEN || '';

// Allow customizing provider param names without code changes
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

  // 2) Build launch URL (flexible configuration)
  // If provider requires a server-side session, we will adjust to call our Edge Function instead.
  const base = EVOLUTION_LAUNCH_BASE.replace(/\/$/, '');
  const path = EVOLUTION_LAUNCH_PATH ? (EVOLUTION_LAUNCH_PATH.startsWith('/') ? EVOLUTION_LAUNCH_PATH : '/' + EVOLUTION_LAUNCH_PATH) : '';
  const url = new URL(base + path);
  url.searchParams.set(PARAM_GAME, gameId);
  if (EVOLUTION_TOKEN) url.searchParams.set(PARAM_TOKEN, EVOLUTION_TOKEN);
  // Send local user id so callback can credit wallet correctly
  url.searchParams.set(PARAM_USER, localUserId);
  if (options?.username) url.searchParams.set(PARAM_USERNAME, options.username);
  if (EVOLUTION_CALLBACK_URL) url.searchParams.set(PARAM_CALLBACK, EVOLUTION_CALLBACK_URL);

  return { launchUrl: url.toString(), sessionId: sessionRow?.id };
}

