// Vercel Serverless Function (non-Next): Evolution launch proxy
// Path: /api/evolution-launch

const crypto = require('crypto');

function makeAes256EcbKey(secret) {
  // Ensure 32-byte key; if not 32, derive via SHA-256 of the provided secret
  if (!secret) return null;
  const buf = Buffer.from(secret, 'utf8');
  if (buf.length === 32) return buf;
  return crypto.createHash('sha256').update(buf).digest();
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

    const serverUrl = process.env.EXPO_PUBLIC_EVOLUTION_SERVER_URL || 'https://hardapi.live/launch_game';

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
    const isGetLaunch = /\/launch_game(?:\?|$)/.test(serverUrl);
    if (isGetLaunch) {
      // Return our own auto-submit POST bridge URL so provider receives POST fields (including 'a').
      const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : '';
      const qs = new URLSearchParams();
      qs.set('user_id', String(core.user_id));
      qs.set('wallet_amount', String(core.wallet_amount));
      qs.set('game_uid', String(core.game_uid));
      qs.set('token', String(core.token));
      qs.set('timestamp', String(core.timestamp));
      qs.set('payload', payloadEnc);
      qs.set('a', payloadEnc);
      if (username) qs.set('username', String(username));
      if (currency) qs.set('currency', String(currency));
      qs.set('return_url', resolvedDomain);
      qs.set('callback_url', process.env.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || '');
      return res.status(200).json({ url: `${origin}/api/evolution-open?${qs.toString()}` });
    }

    // Fallback: POST form to serverUrl (e.g., launch_game1)
    const form = new URLSearchParams();
    form.append('user_id', String(core.user_id));
    form.append('wallet_amount', String(core.wallet_amount));
    form.append('game_uid', String(core.game_uid));
    form.append('token', String(core.token));
    form.append('timestamp', String(core.timestamp));
    form.append('payload', payloadEnc);
    form.append('a', payloadEnc);
    if (username) form.append('username', String(username));
    if (currency) form.append('currency', String(currency));
    form.append('return_url', resolvedDomain);
    form.append('callback_url', process.env.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || '');

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json,text/plain,*/*',
    };
    const basicUser = process.env.EVOLUTION_BASIC_USER;
    const basicPass = process.env.EVOLUTION_BASIC_PASS;
    if (basicUser && basicPass) {
      const token64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
      headers['Authorization'] = `Basic ${token64}`;
    }

    const providerResp = await fetch(serverUrl, { method: 'POST', headers, body: form.toString(), redirect: 'follow' });
    const contentType = providerResp.headers.get('content-type') || '';
    let data = null;
    let text = '';
    if (contentType.includes('application/json')) data = await providerResp.json();
    else text = await providerResp.text();

    if (!providerResp.ok) {
      return res.status(providerResp.status).json({ error: 'provider_error', status: providerResp.status, data: data || text });
    }

    const candidateUrl = data?.url || data?.launch_url || data?.game_url || data?.data?.url || providerResp.url;
    if (candidateUrl && typeof candidateUrl === 'string') return res.status(200).json({ url: candidateUrl, raw: data || text });
    if (text) return res.status(200).send(text);
    return res.status(200).json({ ok: true, raw: data });
  } catch (err) {
    console.error('evolution-launch proxy error:', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
}

