// Supabase Edge Function: evolution-callback
// Handles provider callbacks for Evolution games (bet, win, rollback, balance check)
// Configure secrets via: supabase secrets set --project-ref <ref> --env-file .env
// Required secrets:
// - EVOLUTION_CALLBACK_SECRET: string to authenticate callback source (shared secret)
// - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: provided by Supabase environment
// - (Optional) LOG_LEVEL

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const log = (...args: unknown[]) => {
  if ((Deno.env.get('LOG_LEVEL') || 'info') !== 'silent') {
    console.log('[evolution-callback]', ...args);
  }
};

serve(async (req: Request) => {
  try {
    // Basic auth via shared secret in header X-Callback-Secret
    const providedSecret = req.headers.get('x-callback-secret') || '';
    const expected = Deno.env.get('EVOLUTION_CALLBACK_SECRET') || '';
    if (!expected || providedSecret !== expected) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'missing_service_role_key' }), { status: 500 });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey
    );

    const body = await req.json().catch(() => ({}));
    log('Incoming payload:', body);

    // Generic expected shape (adjust to exact provider schema per api-doc)
    // {
    //   action: 'balance' | 'bet' | 'win' | 'rollback',
    //   user_id: '<internal-user-id-uuid>' | null, // or external id mapping
    //   session_id: '<external_session_id>',
    //   game_id: '<provider_game_id>',
    //   tx_id: '<provider_tx_id>',
    //   amount: number, // positive for win, negative for bet
    //   currency: 'PKR' | 'INR' | 'BDT' | 'USDT'
    // }

    const action = (body.action || '').toString();
    const userId: string | null = body.user_id || null;
    const externalSessionId: string | null = body.session_id || null;
    const gameId: string = body.game_id || 'unknown';
    const externalTxId: string | null = body.tx_id || null;
    const amount: number = Number(body.amount || 0);
    const currency: string = (body.currency || 'PKR').toString();

    // Resolve internal user from external mapping if needed (placeholder)
    // If the provider sends only username/email, map it here.
    if (!userId) {
      return new Response(JSON.stringify({ error: 'missing user_id mapping' }), { status: 400 });
    }

    // Ensure session row exists (link external_session_id)
    if (externalSessionId) {
      const { error: upsertSessionErr } = await supabase
        .from('provider_game_sessions')
        .upsert({
          user_id: userId,
          provider: 'evolution',
          game_id: gameId,
          external_session_id: externalSessionId,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'external_session_id' });
      if (upsertSessionErr) log('Session upsert error:', upsertSessionErr);
    }

    // Balance check
    if (action === 'balance') {
      const { data: wallet, error: wErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      if (wErr) {
        log('Wallet fetch error:', wErr);
        return new Response(JSON.stringify({ error: 'wallet_error' }), { status: 500 });
      }
      const balance = Number(wallet?.balance || 0);
      return new Response(JSON.stringify({ ok: true, balance, currency: 'PKR' }), { status: 200 });
    }

    // For actions that mutate balance, require tx_id for idempotency
    if (!externalTxId && (action === 'bet' || action === 'win' || action === 'rollback')) {
      return new Response(JSON.stringify({ error: 'missing tx_id' }), { status: 400 });
    }

    // Idempotency: if this tx already recorded, return OK early
    if (externalTxId) {
      const { data: exist } = await supabase
        .from('provider_game_transactions')
        .select('id')
        .eq('external_tx_id', externalTxId)
        .maybeSingle();
      if (exist?.id) {
        return new Response(JSON.stringify({ ok: true, idempotent: true }), { status: 200 });
      }
    }

    // Determine delta to apply to wallet and tx_type
    let delta = 0;
    let txType: 'bet' | 'win' | 'rollback' | 'adjust' | 'balance_check' = 'adjust';

    switch (action) {
      case 'bet':
        delta = -Math.abs(amount);
        txType = 'bet';
        break;
      case 'win':
        delta = Math.abs(amount);
        txType = 'win';
        break;
      case 'rollback':
        // Rollback typically credits back a previous bet amount
        delta = Math.abs(amount);
        txType = 'rollback';
        break;
      default:
        return new Response(JSON.stringify({ error: 'unsupported action' }), { status: 400 });
    }

    // Apply wallet change atomically via helper
    const { error: walletErr } = await supabase.rpc('wallet_add_amount', {
      p_user_id: userId,
      p_delta: delta,
    });
    if (walletErr) {
      log('wallet_add_amount error:', walletErr);
      return new Response(JSON.stringify({ error: 'wallet_update_failed' }), { status: 500 });
    }

    // Link session id (optional)
    let sessionId: string | null = null;
    if (externalSessionId) {
      const { data: sess } = await supabase
        .from('provider_game_sessions')
        .select('id')
        .eq('external_session_id', externalSessionId)
        .maybeSingle();
      sessionId = sess?.id || null;
    }

    // Record provider tx (idempotent via unique external_tx_id)
    const { error: txErr } = await supabase
      .from('provider_game_transactions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        provider: 'evolution',
        game_id: gameId,
        external_tx_id: externalTxId!,
        tx_type: txType,
        amount: delta,
        currency,
        meta: body,
      });
    if (txErr) {
      log('tx insert error:', txErr);
      // Note: we do not rollback the wallet here; rely on reconciliation or explicit rollback action from provider
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    log('Unhandled error:', e);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }
});

