const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

export const handler = async (event: any, context: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || "AIzaSyCsah6dOuAIhZq9r3VotFkvYjYK1gONYLg";

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'YOUTUBE_API_KEY_NOT_CONFIGURED', message: 'YouTube API key is not configured on the server.' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const action = params.action || 'search';

    if (action === 'search') {
      const q = params.q || '';
      const type = params.type || 'video';
      const channelId = params.channelId || '';
      const maxResults = params.maxResults || '15';

      let ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${encodeURIComponent(maxResults)}&key=${apiKey}`;
      
      if (type === 'channel') {
        ytUrl += `&type=channel&q=${encodeURIComponent(q)}`;
      } else if (channelId) {
        ytUrl += `&type=video&videoDuration=long&channelId=${encodeURIComponent(channelId)}`;
      } else {
        ytUrl += `&type=video&videoDuration=long&q=${encodeURIComponent(q)}`;
      }

      const res = await fetch(ytUrl);
      const data = await res.json();

      return {
        statusCode: res.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      };
    }

    if (action === 'channel') {
      const channelId = params.id || '';
      if (!channelId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing channel id' })
        };
      }

      const ytUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${apiKey}`;
      const res = await fetch(ytUrl);
      const data = await res.json();

      return {
        statusCode: res.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid action requested' })
    };

  } catch (error: any) {
    console.error('YouTube serverless function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to query YouTube API', details: error.message })
    };
  }
};
