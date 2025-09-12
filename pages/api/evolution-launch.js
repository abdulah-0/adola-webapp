// Vercel API Route: Evolution launch proxy
// Posts or returns the required URL to obtain a playable game URL.

const crypto = require('crypto');

function makeAes256EcbKey(secret) {
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
  // CORS headers
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
      // timestamp generated server-side
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

    // Build core fields per doc and encrypt payload AES-256-ECB
    const core = {
      user_id,
      wallet_amount: Number(wallet_amount || 0),
      game_uid,
      token,
      timestamp: Date.now(), // milliseconds
    };
    const secret = process.env.EVOLUTION_SECRET;
    const payloadEnc = encryptPayload(secret, core);
    if (!payloadEnc) {
      res.status(500).json({ error: 'missing_or_invalid_secret', message: 'Server is missing EVOLUTION_SECRET or it is invalid' });
      return;
    }

    const isGetLaunch = /\/launch_game(?:\?|$)/.test(serverUrl);
    if (isGetLaunch) {
      const url = new URL(serverUrl);
      url.searchParams.set('user_id', String(core.user_id));
      url.searchParams.set('wallet_amount', String(core.wallet_amount));
      url.searchParams.set('game_uid', String(core.game_uid));
      url.searchParams.set('token', String(core.token));
      url.searchParams.set('timestamp', String(core.timestamp));
      url.searchParams.set('payload', payloadEnc);
      if (username) url.searchParams.set('username', String(username));
      if (currency) url.searchParams.set('currency', String(currency));
      url.searchParams.set('return_url', resolvedDomain);
      url.searchParams.set('callback_url', process.env.EXPO_PUBLIC_EVOLUTION_CALLBACK_URL || '');
      res.status(200).json({ url: url.toString() });
      return;
    }

    // Fallback: POST variant (e.g., launch_game1)
    const form = new URLSearchParams();
    form.append('user_id', String(core.user_id));
    form.append('wallet_amount', String(core.wallet_amount));
    form.append('game_uid', String(core.game_uid));
    form.append('token', String(core.token));
    form.append('timestamp', String(core.timestamp));
    form.append('payload', payloadEnc);
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
      res.status(providerResp.status).json({ error: 'provider_error', status: providerResp.status, data: data || text });
      return;
    }

    const candidateUrl = data?.url || data?.launch_url || data?.game_url || data?.data?.url || providerResp.url;
    if (candidateUrl && typeof candidateUrl === 'string') {
      res.status(200).json({ url: candidateUrl, raw: data || text });
      return;
    }
    if (text) {
      res.status(200).send(text);
      return;
    }
    res.status(200).json({ ok: true, raw: data });
  } catch (err) {
    console.error('evolution-launch proxy error:', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
}

