// EvolutionService: client helpers for Evolution game provider
// NOTE: Do not hardcode secrets. Read non-sensitive config from public env; use Edge Function for server-side actions.

import supabase from '../../lib/supabase';

const EVOLUTION_API_BASE = process.env.EXPO_PUBLIC_EVOLUTION_API_BASE || 'https://huser.hardapi.live';
const EVOLUTION_LAUNCH_BASE = process.env.EXPO_PUBLIC_EVOLUTION_LAUNCH_BASE || 'https://hardapi.live';
const EVOLUTION_CALLBACK_URL = process.env.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || '';
const EVOLUTION_TOKEN = process.env.EXPO_PUBLIC_EVOLUTION_TOKEN || '';

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
  // 1) Create local session row
  const { data: sessionRow, error: sessionErr } = await supabase
    .from('provider_game_sessions')
    .insert({ user_id: userId, provider: 'evolution', game_id: gameId, status: 'active' })
    .select('id')
    .single();

  if (sessionErr) {
    console.warn('Failed to create local session:', sessionErr);
  }

  // 2) Build launch URL (placeholder; align with api-doc once confirmed)
  // Common params used by providers: game_id, token, user, callback
  const url = new URL(EVOLUTION_LAUNCH_BASE.replace(/\/$/, '') + '/launch');
  url.searchParams.set('game_id', gameId);
  if (EVOLUTION_TOKEN) url.searchParams.set('token', EVOLUTION_TOKEN);
  if (options?.username) url.searchParams.set('user', options.username);
  if (EVOLUTION_CALLBACK_URL) url.searchParams.set('callback', EVOLUTION_CALLBACK_URL);

  return { launchUrl: url.toString(), sessionId: sessionRow?.id };
}

