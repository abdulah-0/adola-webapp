// Vercel Serverless Function (non-Next): Evolution launch proxy
// Path: /api/evolution-launch

const crypto = require('crypto');

function makeAes256EcbKey(secret) {
  // Ensure 32-byte key by zero-padding/truncation (aligns with common PHP OpenSSL usage)
  if (!secret) return null;
  const buf = Buffer.from(secret, 'utf8');
  if (buf.length >= 32) return buf.subarray(0, 32);
  const out = Buffer.alloc(32);
  buf.copy(out, 0, 0, buf.length);
  return out;
}

function encryptPayload(secret, dataObj) {
  const key = makeAes256EcbKey(secret);
  if (!key) return null;
  const plaintext = JSON.stringify(dataObj);
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      user_id,
      wallet_amount = 0,
      game_uid,
      token,
      // timestamp will be generated here in ms
      domain_url,
      username,
      currency,
      callback_url,
    } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (!user_id || !game_uid || !token) {
      res.status(400).json({ error: 'Missing required fields: user_id, game_uid, token' });
      return;
    }

    // Per provider doc, force GET /launch_game with exact params
    const serverUrl = 'https://hardapi.live/launch_game';

    const resolvedDomain = domain_url || (req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : (process.env.EXPO_PUBLIC_EVOLUTION_DOMAIN_URL || 'https://example.com'));
    const tsMs = Date.now();

    // Core fields for provider per doc
    const core = {
      user_id,
      wallet_amount: Number(wallet_amount || 0),
      game_uid,
      token,
      timestamp: tsMs,
    };

    const secret = process.env.EVOLUTION_SECRET;
    const payloadEnc = encryptPayload(secret, core);
    if (!payloadEnc) {
      return res.status(500).json({ error: 'missing_or_invalid_secret', message: 'Server is missing EVOLUTION_SECRET or it is invalid' });
    }


    // Two provider variants observed: GET /launch_game and POST /launch_game1
    // Build GET URL exactly as doc specifies (no extras, no 'a')
    const url = new URL(serverUrl);
    url.searchParams.set('user_id', String(core.user_id));
    url.searchParams.set('wallet_amount', String(core.wallet_amount));
    url.searchParams.set('game_uid', String(core.game_uid));
    url.searchParams.set('token', String(core.token));
    url.searchParams.set('timestamp', String(core.timestamp));
    url.searchParams.set('payload', payloadEnc);
    url.searchParams.set('a', payloadEnc);
    return res.status(200).json({ url: url.toString() });
  } catch (err) {
    console.error('evolution-launch proxy error:', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
}

