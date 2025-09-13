Deploying PHP Evolution Launcher on Render

Overview
This is a tiny PHP service that builds the exact GET /launch_game URL required by the provider. It encrypts the payload using AES-256-ECB and redirects to the provider. It also includes the param a alongside payload for provider PHP compatibility.

What you get
- index.php: reads query params and builds a provider launch URL
- AES-256-ECB encryption using openssl_encrypt
- Key handling: truncate/zero-pad the secret to 32 bytes
- Dockerfile to run on Render as a Web Service

Render setup
1) Push this repository to GitHub (already done for the app). Ensure the adola-production/php-evolution folder is included.
2) Go to render.com → New → Web Service
3) Select your adola-webapp repository
4) Pick the adola-production/php-evolution subdirectory
5) Use Docker as runtime; it will detect Dockerfile inside that folder
6) Name: evolution-launcher (or anything)
7) Environment Variables:
   - EVOLUTION_SECRET: provider secret (exact string you were given)
   - EVOLUTION_TOKEN: provider token (optional if you pass token in the URL)
   - EVOLUTION_SERVER_URL: https://hardapi.live/launch_game (default)
8) Create Web Service and wait for deploy
9) The service URL will be like: https://evolution-launcher.onrender.com

Usage
- Direct browser usage (redirect):
  https://evolution-launcher.onrender.com/index.php?user_id=UID&wallet_amount=0&game_uid=GAME_UID&token=TOKEN&username=NAME&currency=PKR&return_url=https%3A%2F%2Fwww.adolagaming.com&callback_url=https%3A%2F%2Fwww.adolagaming.com%2Fapi%2Fcallback

- JSON usage (set Accept: application/json):
  GET /index.php?... with header Accept: application/json
  Response: { "url": "https://hardapi.live/launch_game?..." }

App integration
- Set EXPO_PUBLIC_EVOLUTION_RENDER_URL to the Render base URL (e.g., https://evolution-launcher.onrender.com) in your .env.
- The client will use this URL directly; no changes to the provider are required.

Notes
- If the provider still rejects, it is almost certainly about key handling. This service uses typical PHP behavior (PKCS7 padding, base64 output, key literal zero-padded/truncated to 32 bytes). If the provider expects a different derivation, they must clarify.
- You can temporarily print the generated JSON by hitting Accept: application/json for debugging.

