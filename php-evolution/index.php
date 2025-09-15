<?php
// === Configuration ===
$api_secret = '905174411f4090891291ff63c7adeb'; // Replace with actual secret key from API provider
$server_url = 'https://hardapi.live/launch_game1';

$gameId = 'eb3f4260c17737e09767bc4c06796a61';

// === User/Game Details (Replace with real session/database values) ===
$user_id = 1;
$wallet_amount = 0;
$game_uid = $gameId;
$token = 'e90023de-2c97-4fdd-8d1b-297c29';
$timestamp = round(microtime(true) * 1000); // Current time in milliseconds

// === Step 1: Create Raw Payload Array ===
$rawPayload = [
    "user_id"       => $user_id,
    "wallet_amount" => $wallet_amount,
    "game_uid"      => $game_uid,
    "token"         => $token,
    "timestamp"     => $timestamp,
    "domain_url"       => "https://www.adolagaming.com"
];

// === Step 2: Encode to JSON ===
 $payload= json_encode($rawPayload, JSON_UNESCAPED_SLASHES); 
 
 function aes256Encrypt($key, $data) {
    $method = "AES-256-ECB";
    return base64_encode(openssl_encrypt($data, $method, $key, OPENSSL_RAW_DATA));
}
 $encryptedPayload = aes256Encrypt($api_secret, $payload);

// === Step 4: Build Final Query URL ===
$params  = http_build_query([
    "user_id"       => $user_id,
    "wallet_amount" => $wallet_amount,
    "game_uid"      => $game_uid,
    "token"         => $token,
    "timestamp"     => $timestamp,
    "payload"       => $encryptedPayload
]);

$finalUrl = $server_url . '?' . $params ;


// === Step 5: Redirect to Launch Game URL ===
header("Location: $finalUrl");
exit;

?>
