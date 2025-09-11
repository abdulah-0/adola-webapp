// Vercel Serverless Function (non-Next): Evolution launch proxy
// Path: /api/evolution-launch

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
      timestamp,
      domain_url,
    } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (!user_id || !game_uid || !token) {
      res.status(400).json({ error: 'Missing required fields: user_id, game_uid, token' });
      return;
    }

    const serverUrl = process.env.EXPO_PUBLIC_EVOLUTION_SERVER_URL || 'https://hardapi.live/launch_game1';

    const payload = {
      user_id,
      wallet_amount,
      game_uid,
      token,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      domain_url: domain_url || (req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : (process.env.EXPO_PUBLIC_EVOLUTION_DOMAIN_URL || 'https://example.com')),
    };

    // Provider expects form-encoded payload (common for PHP backends)
    const form = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });

    const providerResp = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json,text/plain,*/*',
      },
      body: form.toString(),
      redirect: 'follow',
    });

    const contentType = providerResp.headers.get('content-type') || '';
    let data = null;
    let text = '';

    if (contentType.includes('application/json')) {
      data = await providerResp.json();
    } else {
      text = await providerResp.text();
    }

    const candidateUrl = data?.url || data?.launch_url || data?.game_url || data?.data?.url || providerResp.url;

    if (!providerResp.ok) {
      res.status(providerResp.status).json({ error: 'provider_error', status: providerResp.status, data: data || text });
      return;
    }

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

