<?php
// Simple PHP launcher for Evolution provider per api-doc.txt
// Deploy this on Render (PHP web service) and set EVOLUTION_SECRET and EVOLUTION_TOKEN env vars

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

function make_key(string $secret): string {
  // Provider PHP often uses the literal secret as key; ensure 32 bytes via truncation/zero-padding
  $len = strlen($secret);
  if ($len >= 32) return substr($secret, 0, 32);
  return $secret . str_repeat("\0", 32 - $len);
}

function now_ms(): int { return (int) round(microtime(true) * 1000); }

$secret = getenv('EVOLUTION_SECRET') ?: '';
if (!$secret) { http_response_code(500); echo 'missing EVOLUTION_SECRET'; exit; }
$key = make_key($secret);

// Inputs (can come from client)
$user_id = isset($_GET['user_id']) ? (string)$_GET['user_id'] : '';
$wallet_amount = isset($_GET['wallet_amount']) ? (float)$_GET['wallet_amount'] : 0.0;
$game_uid = isset($_GET['game_uid']) ? (string)$_GET['game_uid'] : '';
$token = isset($_GET['token']) ? (string)$_GET['token'] : (getenv('EVOLUTION_TOKEN') ?: '');
$timestamp = isset($_GET['timestamp']) ? (int)$_GET['timestamp'] : now_ms();
$username = isset($_GET['username']) ? (string)$_GET['username'] : '';
$currency = isset($_GET['currency']) ? (string)$_GET['currency'] : '';
$return_url = isset($_GET['return_url']) ? (string)$_GET['return_url'] : '';
$callback_url = isset($_GET['callback_url']) ? (string)$_GET['callback_url'] : '';

if (!$user_id || !$game_uid || !$token) {
  http_response_code(400);
  echo 'Missing required fields: user_id, game_uid, token';
  exit;
}

$core = [
  'user_id' => $user_id,
  'wallet_amount' => (0 + $wallet_amount),
  'game_uid' => $game_uid,
  'token' => $token,
  'timestamp' => (0 + $timestamp)
];
$json = json_encode($core, JSON_UNESCAPED_SLASHES);
if ($json === false) { http_response_code(500); echo 'json_encode_failed'; exit; }

// AES-256-ECB with PKCS7 padding; base64 by default (no OPENSSL_RAW_DATA)
$payloadEnc = openssl_encrypt($json, 'aes-256-ecb', $key, 0);
if ($payloadEnc === false) { http_response_code(500); echo 'encrypt_failed'; exit; }

$serverUrl = getenv('EVOLUTION_SERVER_URL') ?: 'https://hardapi.live/launch_game';

// Build GET URL exactly as doc; also include 'a' for provider PHP compatibility
$params = [
  'user_id' => $user_id,
  'wallet_amount' => (0 + $wallet_amount),
  'game_uid' => $game_uid,
  'token' => $token,
  'timestamp' => (0 + $timestamp),
  'payload' => $payloadEnc,
  'a' => $payloadEnc,
];
if ($username !== '') $params['username'] = $username;
if ($currency !== '') $params['currency'] = $currency;
if ($return_url !== '') $params['return_url'] = $return_url;
if ($callback_url !== '') $params['callback_url'] = $callback_url;

$query = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
$finalUrl = rtrim($serverUrl, '/') . '?' . $query;

// If the client wants JSON (Accept header), return JSON; else redirect
$accept = isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '';
if (stripos($accept, 'application/json') !== false) {
  header('Content-Type: application/json');
  echo json_encode(['url' => $finalUrl, 'core' => $core]);
  exit;
}

header('Location: ' . $finalUrl, true, 302);
exit;

