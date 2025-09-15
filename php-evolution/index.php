<?php
// Simple PHP launcher for Evolution provider per api-doc.txt
// Deploy on Render; set EVOLUTION_SECRET and EVOLUTION_TOKEN in environment

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

function make_key(string $secret): string {
  // Ensure 32 bytes: truncate or zero-pad (typical PHP OpenSSL behavior)
  $len = strlen($secret);
  if ($len >= 32) return substr($secret, 0, 32);
  return $secret . str_repeat("\0", 32 - $len);
}
function now_ms(): int { return (int) round(microtime(true) * 1000); }

$secret = getenv('EVOLUTION_SECRET') ?: '';
if (!$secret) { http_response_code(500); echo 'missing EVOLUTION_SECRET'; exit; }
$key = make_key($secret);

// Inputs (from client)
$user_id = isset($_GET['user_id']) ? (string)$_GET['user_id'] : '';
$wallet_amount = isset($_GET['wallet_amount']) ? (float)$_GET['wallet_amount'] : 0.0;
// Prefer query param; else fallback to env; else default to Plinko UID per provider
$game_uid = isset($_GET['game_uid']) && $_GET['game_uid'] !== '' ? (string)$_GET['game_uid'] : (getenv('EVOLUTION_GAME_UID') ?: 'eb3f4260c17737e09767bc4c06796a61');
$token = isset($_GET['token']) && $_GET['token'] !== '' ? (string)$_GET['token'] : (getenv('EVOLUTION_TOKEN') ?: '');
$timestamp = isset($_GET['timestamp']) ? (int)$_GET['timestamp'] : now_ms();
$username = isset($_GET['username']) ? (string)$_GET['username'] : '';
$currency = isset($_GET['currency']) ? (string)$_GET['currency'] : '';
$return_url = isset($_GET['return_url']) ? (string)$_GET['return_url'] : '';
$callback_url = isset($_GET['callback_url']) ? (string)$_GET['callback_url'] : '';

if (!$user_id || !$game_uid || !$token) { http_response_code(400); echo 'Missing required fields: user_id, game_uid, token'; exit; }

$core = [
  'user_id' => $user_id,
  'wallet_amount' => (0 + $wallet_amount),
  'game_uid' => $game_uid,
  'token' => $token,
  'timestamp' => (0 + $timestamp),
];
$json = json_encode($core, JSON_UNESCAPED_SLASHES);
if ($json === false) { http_response_code(500); echo 'json_encode_failed'; exit; }

// AES-256-ECB (PKCS7), base64 output
$payloadEnc = openssl_encrypt($json, 'aes-256-ecb', $key, 0);
if ($payloadEnc === false) { http_response_code(500); echo 'encrypt_failed'; exit; }

$serverUrl = getenv('EVOLUTION_SERVER_URL') ?: 'https://hardapi.live/launch_game1';
// Normalize common typos and enforce canonical host/path for hardapi
$serverUrl = preg_replace('/^h+t+t+p+s:/i', 'https:', $serverUrl); // fix ht/tp typos
$serverUrl = str_ireplace('hardapi.liv', 'hardapi.live', $serverUrl);
$serverUrl = str_ireplace('hardapi.livee', 'hardapi.live', $serverUrl);
$parts = @parse_url($serverUrl);
if ($parts && isset($parts['host']) && stripos($parts['host'], 'hardapi') !== false) {
  $scheme = 'https';
  $host = 'hardapi.live';
  $path = '/launch_game1';
  if (!empty($parts['path'])) {
    if (stripos($parts['path'], 'launch_game1') !== false) { $path = '/launch_game1'; }
    elseif (stripos($parts['path'], 'launch_game') !== false) { $path = '/launch_game'; }
  }
  $serverUrl = $scheme . '://' . $host . $path;
}
$params = [
  'user_id' => $user_id,
  'wallet_amount' => (0 + $wallet_amount),
  'game_uid' => $game_uid,
  'token' => $token,
  'timestamp' => (0 + $timestamp),
  'payload' => $payloadEnc,
  'a' => $payloadEnc, // provider PHP may read $a
];
if ($username !== '') $params['username'] = $username;
if ($currency !== '') $params['currency'] = $currency;
if ($return_url !== '') $params['return_url'] = $return_url;
if ($callback_url !== '') $params['callback_url'] = $callback_url;

$query = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
$finalUrl = rtrim($serverUrl, '/') . '?' . $query;

$accept = isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '';
if (stripos($accept, 'application/json') !== false) {
  header('Content-Type: application/json');
  echo json_encode(['url' => $finalUrl, 'core' => $core]);
  exit;
}

header('Location: ' . $finalUrl, true, 302);
exit;
?>
