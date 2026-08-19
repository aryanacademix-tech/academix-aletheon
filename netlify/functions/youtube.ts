const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-youtube-api-key',
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

  const params = event.queryStringParameters || {};
  const clientKey = event.headers?.['x-youtube-api-key'] || params.apiKey;
  const apiKey = clientKey || process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'YOUTUBE_API_KEY_NOT_CONFIGURED', 
        message: 'YouTube API key is not configured. Please add YOUTUBE_API_KEY to your Netlify Environment Variables or ensure YouTube Data API v3 is enabled in Google Cloud Console.' 
      })
    };
  }

  try {
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
        ytUrl += `&type=video&channelId=${encodeURIComponent(channelId)}`;
      } else {
        ytUrl += `&type=video&q=${encodeURIComponent(q)}`;
      }

      const res = await fetch(ytUrl);
      const data = await res.json();

      if (!res.ok) {
        return {
          statusCode: res.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: data?.error?.message || 'Failed to query YouTube API',
            code: data?.error?.code || res.status,
            details: data?.error?.errors || []
          })
        };
      }

      return {
        statusCode: 200,
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

      if (!res.ok) {
        return {
          statusCode: res.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: data?.error?.message || 'Failed to query YouTube Channel API',
            code: data?.error?.code || res.status
          })
        };
      }

      return {
        statusCode: 200,
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
