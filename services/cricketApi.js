import axios from 'axios';

const oddsAPI = axios.create({
  baseURL: 'https://api.allorigins.win/get?url=',
  timeout: 10000,
});

// Apply house margin to odds (5-15% overround)
const applyHouseMargin = (odds, marginPercent = 8) => {
  const margin = 1 - (marginPercent / 100);
  return Object.keys(odds).reduce((acc, key) => {
    acc[key] = Math.max(1.20, odds[key] * margin); // Minimum odds 1.20
    return acc;
  }, {});
};

// Test API connection and key validity
export const testAPIConnection = async () => {
  console.log('🧪 Testing API connection...');

  try {
    const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;
    console.log('🔑 API Key:', API_KEY ? `${API_KEY.substring(0, 8)}...` : 'MISSING');

    // Test with a simple sports list call using different CORS proxy
    const targetUrl = `https://api.the-odds-api.com/v4/sports?apiKey=${API_KEY}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    console.log('🔗 Using CORS proxy:', proxyUrl);
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const actualData = await response.json();
    console.log('✅ API Connection successful!');

    // Direct response from corsproxy.io (no need to parse contents)
    console.log('📊 Available sports:', Array.isArray(actualData) ? actualData.length : 'Not an array');
    console.log('🔍 Response data type:', typeof actualData);

    const sportsArray = Array.isArray(actualData) ? actualData : [];
    console.log('🏏 Cricket sports available:', sportsArray.filter(s => s.key && s.key.includes('cricket')));

    return { success: true, sports: sportsArray };
  } catch (error) {
    console.error('❌ API Connection failed:', error.message);
    console.log('📊 Error details:', error.response?.data);
    return { success: false, error: error.message };
  }
};

// Fetch live cricket matches with hybrid approach
export const getLiveCricketMatches = async () => {
  console.log('🏏 Attempting to fetch live cricket matches...');

  // First test the API connection
  const connectionTest = await testAPIConnection();
  if (!connectionTest.success) {
    console.log('🚨 API connection failed, using demo matches only');
    return getDemoMatches();
  }

  try {
    const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;
    console.log('🔑 Using API key:', API_KEY ? 'Present' : 'Missing');

    // Try multiple cricket sports for better coverage
    const cricketSports = ['cricket_ipl', 'cricket_international', 'cricket_big_bash', 'cricket_test_match'];
    let allMatches = [];

    for (const sport of cricketSports) {
      try {
        console.log(`🔍 Fetching ${sport} matches via proxy...`);
        const targetUrl = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${API_KEY}&dateFormat=iso&oddsFormat=decimal`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        console.log(`📡 Making proxy API call to: ${proxyUrl}`);

        const response = await fetch(proxyUrl);
        const data = await response.json();

        console.log(`📊 Proxy Response status: ${response.status}`);
        console.log(`📊 Proxy Response data length:`, data?.length || 0);

        if (response.ok && data && data.length > 0) {
          console.log(`✅ Found ${data.length} ${sport} matches`);
          console.log(`📋 Sample match:`, data[0]);

          // Convert API format to our format
          const convertedMatches = data.map(match => ({
            id: match.id,
            home_team: match.home_team,
            away_team: match.away_team,
            league: sport.replace('cricket_', '').replace(/_/g, ' ').toUpperCase(),
            commence_time: match.commence_time,
            isDemo: false
          }));
          allMatches = [...allMatches, ...convertedMatches];
        } else {
          console.log(`📭 No matches in ${sport} response`);
        }
      } catch (sportError) {
        console.log(`❌ Error fetching ${sport}:`, sportError.message);
        console.log(`📊 Error status:`, sportError.response?.status);
        console.log(`📊 Error data:`, sportError.response?.data);
        console.log(`📊 Error headers:`, sportError.response?.headers);
      }
    }

    // Filter for upcoming and live matches (within next 24 hours)
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let relevantMatches = allMatches.filter(match => {
      const matchTime = new Date(match.commence_time);
      return matchTime >= now && matchTime <= next24Hours;
    });

    console.log(`🎯 Found ${relevantMatches.length} relevant matches in next 24 hours`);

    // If we have real matches, use them
    if (relevantMatches.length > 0) {
      console.log('🌟 Using real cricket matches from API');
      return relevantMatches.slice(0, 5); // Limit to 5 matches
    }

    // Fallback to demo matches
    console.log('📋 No live matches found, using demo matches');
    return getDemoMatches();

  } catch (error) {
    console.error("❌ Failed to fetch live matches:", error.response?.status, error.message);
    console.log('📋 Falling back to demo matches');
    return getDemoMatches();
  }
};

// Generate demo matches for fallback
const getDemoMatches = () => {
  return [
    {
      id: 'demo_match_1',
      sport_title: 'Cricket IPL',
      commence_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      home_team: 'Mumbai Indians',
      away_team: 'Chennai Super Kings',
      bookmakers: [],
      isDemo: true
    },
    {
      id: 'demo_match_2',
      sport_title: 'Cricket IPL',
      commence_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      home_team: 'Royal Challengers Bangalore',
      away_team: 'Kolkata Knight Riders',
      bookmakers: [],
      isDemo: true
    },
    {
      id: 'demo_match_3',
      sport_title: 'Cricket International',
      commence_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
      home_team: 'Pakistan',
      away_team: 'India',
      bookmakers: [],
      isDemo: true
    }
  ];
};

// Fetch live odds for a specific match with hybrid approach
export const getLiveOdds = async (matchId) => {
  console.log('💰 Fetching odds for match:', matchId);

  // Use demo odds for demo matches
  if (matchId.startsWith('demo_')) {
    console.log('📋 Using demo odds for demo match');
    return generateDemoOdds(matchId);
  }

  try {
    const API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;

    // Try to get real odds from API
    console.log('🔍 Attempting to fetch real odds from API...');

    // Try different sport categories to find the match
    const cricketSports = ['cricket_ipl', 'cricket_international', 'cricket_big_bash', 'cricket_test_match'];

    for (const sport of cricketSports) {
      try {
        const targetUrl = `https://api.the-odds-api.com/v4/sports/${sport}/events/${matchId}/odds?apiKey=${API_KEY}&markets=h2h,totals,spreads&oddsFormat=decimal&dateFormat=iso`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const actualData = await response.json();
        if (actualData && actualData.bookmakers) {
          console.log(`✅ Found real odds for ${sport} match`);

          // Process odds with house margin
          const processedOdds = actualData.bookmakers.map(bookmaker => ({
            ...bookmaker,
            markets: bookmaker.markets.map(market => ({
              ...market,
              outcomes: market.outcomes.map(outcome => ({
                ...outcome,
                price: Math.max(1.20, outcome.price * 0.92) // Apply 8% house margin
              }))
            }))
          }));

          // Convert real odds to our betting markets format
          return convertRealOddsToOurMarkets(processedOdds, matchId);
        }
      } catch (sportError) {
        console.log(`⚠️ No odds found in ${sport}:`, sportError.response?.status);
      }
    }

    // If no real odds found, use demo odds
    console.log('📋 No real odds found, using demo odds');
    return generateDemoOdds(matchId);

  } catch (error) {
    console.error("❌ Failed to fetch live odds:", error.response?.status, error.message);
    console.log('📋 Falling back to demo odds');
    return generateDemoOdds(matchId);
  }
};

// Convert real API odds to our custom betting markets
const convertRealOddsToOurMarkets = (realOdds, matchId) => {
  console.log('🔄 Converting real odds to custom markets');

  // Extract some real odds if available
  let baseOdds = { team1: 2.0, team2: 2.0, draw: 3.5 };

  if (realOdds.length > 0 && realOdds[0].markets.length > 0) {
    const h2hMarket = realOdds[0].markets.find(m => m.key === 'h2h');
    if (h2hMarket && h2hMarket.outcomes.length >= 2) {
      baseOdds.team1 = h2hMarket.outcomes[0].price;
      baseOdds.team2 = h2hMarket.outcomes[1].price;
    }
  }

  // Generate our custom markets based on real odds
  return [
    {
      key: 'demo_bookmaker',
      title: 'Live Sportsbook',
      markets: [
        {
          key: 'next_ball',
          outcomes: [
            { name: '0 Runs', price: Math.max(1.20, baseOdds.team1 * 0.8) },
            { name: '1 Run', price: Math.max(1.20, baseOdds.team1 * 1.1) },
            { name: '2 Runs', price: Math.max(1.20, baseOdds.team2 * 1.2) },
            { name: '3 Runs', price: Math.max(1.20, baseOdds.team2 * 2.0) },
            { name: '4 Runs', price: Math.max(1.20, baseOdds.team1 * 1.3) },
            { name: '6 Runs', price: Math.max(1.20, baseOdds.team2 * 1.8) },
            { name: 'Wicket', price: Math.max(1.20, baseOdds.draw * 1.5) }
          ]
        },
        {
          key: 'current_over',
          outcomes: [
            { name: 'Under 6.5 Runs', price: Math.max(1.20, baseOdds.team1 * 0.9) },
            { name: '7-9 Runs', price: Math.max(1.20, baseOdds.team2 * 1.1) },
            { name: '10+ Runs', price: Math.max(1.20, baseOdds.draw * 1.3) }
          ]
        },
        {
          key: 'next_wicket',
          outcomes: [
            { name: 'Bowled', price: Math.max(1.20, baseOdds.team1 * 1.8) },
            { name: 'Caught', price: Math.max(1.20, baseOdds.team2 * 1.4) },
            { name: 'LBW', price: Math.max(1.20, baseOdds.draw * 1.6) },
            { name: 'Run Out', price: Math.max(1.20, baseOdds.team1 * 3.0) }
          ]
        }
      ]
    }
  ];
};

// Generate demo betting markets and odds with realistic variations
const generateDemoOdds = (matchId) => {
  console.log('🎲 Generating demo odds for match:', matchId);

  // Add some randomness to make odds feel more dynamic
  const randomFactor = () => 0.85 + (Math.random() * 0.3); // 0.85 to 1.15 multiplier

  return [
    {
      key: 'demo_bookmaker',
      title: 'Demo Sportsbook',
      markets: [
        {
          key: 'next_ball',
          outcomes: [
            { name: '0 Runs', price: Math.max(1.20, 2.50 * randomFactor()) },
            { name: '1 Run', price: Math.max(1.20, 3.20 * randomFactor()) },
            { name: '2 Runs', price: Math.max(1.20, 4.50 * randomFactor()) },
            { name: '3 Runs', price: Math.max(1.20, 8.00 * randomFactor()) },
            { name: '4 Runs', price: Math.max(1.20, 3.80 * randomFactor()) },
            { name: '6 Runs', price: Math.max(1.20, 5.50 * randomFactor()) },
            { name: 'Wicket', price: Math.max(1.20, 6.00 * randomFactor()) }
          ]
        },
        {
          key: 'current_over',
          outcomes: [
            { name: 'Under 6.5 Runs', price: Math.max(1.20, 1.95 * randomFactor()) },
            { name: '7-9 Runs', price: Math.max(1.20, 2.80 * randomFactor()) },
            { name: '10+ Runs', price: Math.max(1.20, 4.20 * randomFactor()) }
          ]
        },
        {
          key: 'next_wicket',
          outcomes: [
            { name: 'Bowled', price: Math.max(1.20, 4.50 * randomFactor()) },
            { name: 'Caught', price: Math.max(1.20, 3.25 * randomFactor()) },
            { name: 'LBW', price: Math.max(1.20, 5.00 * randomFactor()) },
            { name: 'Run Out', price: Math.max(1.20, 8.00 * randomFactor()) },
            { name: 'Stumped', price: Math.max(1.20, 12.00 * randomFactor()) }
          ]
        }
      ]
    }
  ];
};

// Calculate potential payout with commission
export const calculatePayout = (stake, odds, commissionPercent = 5) => {
  const grossPayout = stake * odds;
  const commission = (grossPayout - stake) * (commissionPercent / 100);
  return Math.max(stake, grossPayout - commission);
};

// Dynamic odds adjustment based on user behavior
export const calculateDynamicOdds = (trueOdds, userBehavior = {}) => {
  const { betsPlaced = 0, exposure = 0, winStreak = 0 } = userBehavior;

  let margin = 0.92; // Default 8% margin

  // Increase margin on popular bets
  if (betsPlaced > 100) {
    margin = 0.85; // 15% margin
  }
  // Decrease margin for market balancing
  else if (exposure > 5000) {
    margin = 0.97; // 3% margin
  }

  // Apply win streak penalty
  if (winStreak >= 5) {
    margin *= (1 - (winStreak * 0.05)); // Reduce by 5% per win
  }

  return Math.max(1.20, trueOdds * margin);
};

// Manual API test function for browser console
export const manualAPITest = async () => {
  console.log('🔧 Manual API Test Starting...');

  const API_KEY = '2444b2bca3d41b5ddfd2c7cfae5371a9';
  console.log('🔑 Using API key:', API_KEY);

  try {
    // Test 1: Get available sports
    console.log('📋 Test 1: Getting available sports...');
    const sportsTargetUrl = `https://api.the-odds-api.com/v4/sports?apiKey=${API_KEY}`;
    const sportsResponse = await fetch(`https://corsproxy.io/?${encodeURIComponent(sportsTargetUrl)}`);
    const sportsData = await sportsResponse.json();
    console.log('✅ Sports API Response:', sportsData);

    // Test 2: Get cricket events
    console.log('📋 Test 2: Getting cricket events...');
    const cricketTargetUrl = `https://api.the-odds-api.com/v4/sports/cricket_test_match/events?apiKey=${API_KEY}&dateFormat=iso`;
    const cricketResponse = await fetch(`https://corsproxy.io/?${encodeURIComponent(cricketTargetUrl)}`);
    const cricketData = await cricketResponse.json();
    console.log('✅ Cricket API Response:', cricketData);

    // Test 3: Check remaining requests
    console.log('📊 Remaining requests:', cricketResponse.headers.get('x-requests-remaining'));
    console.log('📊 Used requests:', cricketResponse.headers.get('x-requests-used'));

    return { success: true, sports: sportsData, cricket: cricketData };
  } catch (error) {
    console.error('❌ Manual API test failed:', error);
    return { success: false, error: error.message };
  }
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  window.testCricketAPI = manualAPITest;
}
