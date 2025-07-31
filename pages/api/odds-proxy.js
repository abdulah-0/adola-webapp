// Vercel API Route to proxy Odds API calls
// This bypasses CSP restrictions by making server-side requests

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { endpoint, ...queryParams } = req.query;
    
    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint parameter' });
      return;
    }

    // Get API key from environment
    const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    // Build the target URL
    const baseUrl = 'https://api.the-odds-api.com/v4';
    const targetUrl = new URL(`${baseUrl}/${endpoint}`);
    
    // Add API key and other query parameters
    targetUrl.searchParams.set('apiKey', API_KEY);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'endpoint') {
        targetUrl.searchParams.set(key, value);
      }
    });

    console.log('🔄 Proxying request to:', targetUrl.toString());

    // Make the request to Odds API
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Adola-Sports-Betting/1.0'
      }
    });

    if (!response.ok) {
      console.error('❌ Odds API error:', response.status, response.statusText);
      res.status(response.status).json({ 
        error: `Odds API error: ${response.status} ${response.statusText}` 
      });
      return;
    }

    const data = await response.json();
    console.log('✅ Odds API response received, data length:', Array.isArray(data) ? data.length : 'object');

    // Return the data
    res.status(200).json(data);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
