// Vercel API Route: Auto-submit POST bridge to provider launch_game1
// Purpose: Accepts encrypted payload via query, renders HTML that POSTs to provider

export default async function handler(req, res) {
  // Only GET to render HTML
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Read all expected params from query
  const q = req.query || {};
  const user_id = q.user_id || '';
  const wallet_amount = q.wallet_amount || '';
  const game_uid = q.game_uid || '';
  const token = q.token || '';
  const timestamp = q.timestamp || '';
  const payload = q.payload || '';
  const a = q.a || '';
  const username = q.username || '';
  const currency = q.currency || '';
  const return_url = q.return_url || '';
  const callback_url = q.callback_url || '';

  // Provider POST endpoint (force POST variant)
  const configured = process.env.EXPO_PUBLIC_EVOLUTION_SERVER_URL || 'https://hardapi.live/launch_game1';
  let action = configured;
  // If someone configured GET endpoint (/launch_game), coerce to POST endpoint (/launch_game1)
  action = action.replace(/\/launch_game(?:\/?)(?:\?.*)?$/i, '/launch_game1');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Launching game…</title>
  <style>
    body { margin:0; background:#000; color:#fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
    .box { padding:16px; }
    .btn { background:#00FFC6; color:#000; padding:10px 16px; border:none; border-radius:6px; font-weight:700; cursor:pointer; }
    .muted { color:#bbb; font-size:12px; margin-top:8px; }
  </style>
</head>
<body>
  <div class="box">
    <div>Preparing secure session…</div>
    <div class="muted">If you are not redirected automatically, click the button below.</div>
  </div>
  <form id="f" method="post" action="${action}">
    <input type="hidden" name="user_id" value="${String(user_id)}" />
    <input type="hidden" name="user" value="${String(user_id)}" />
    <input type="hidden" name="wallet_amount" value="${String(wallet_amount)}" />
    <input type="hidden" name="game_uid" value="${String(game_uid)}" />
    <input type="hidden" name="game_id" value="${String(game_uid)}" />
    <input type="hidden" name="token" value="${String(token)}" />
    <input type="hidden" name="timestamp" value="${String(timestamp)}" />
    <input type="hidden" name="payload" value="${String(payload)}" />
    <input type="hidden" name="a" value="${String(a || payload)}" />
    <input type="hidden" name="username" value="${String(username)}" />
    <input type="hidden" name="user_name" value="${String(username)}" />
    <input type="hidden" name="currency" value="${String(currency)}" />
    <input type="hidden" name="return_url" value="${String(return_url)}" />
    <input type="hidden" name="callback_url" value="${String(callback_url)}" />
    <div class="box"><button class="btn" type="submit">Continue</button></div>
  </form>
  <script>
    try { document.getElementById('f').submit(); } catch(e) {}
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}

