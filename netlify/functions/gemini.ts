import { GoogleGenAI } from '@google/genai';

function getAI(customApiKey?: string) {
  const isAutoKey = !customApiKey || 
                    customApiKey === "MY_GEMINI_API_KEY" || 
                    customApiKey.startsWith('academix_') || 
                    customApiKey.startsWith('auto_') || 
                    customApiKey === 'IN_APP_GOOGLE_KEY';
  
  const apiKey = isAutoKey ? process.env.GEMINI_API_KEY : customApiKey;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // If still missing, try process.env.GEMINI_API_KEY as final safety net
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
      return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({ 
    apiKey: apiKey,
  });
}

function checkRateLimit(error: any) {
  const errorString = String(error).toLowerCase();
  if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('rate limit')) {
    throw new Error('RATE_LIMIT_REACHED');
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler = async (event: any, context: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: 'Method Not Allowed'
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { model, contents, config, apiKey, action, prompt: imgPrompt, imageSize, aspectRatio, topicExtractions, thinkingMode } = body;

    const ai = getAI(apiKey);

    if (action === 'generateImage' || model?.includes('imagen') || model?.includes('image')) {
      let imageRes: any = null;
      
      const requestedAspect = aspectRatio || '1:1';
      const requestedSize = imageSize || '2K';

      // Build rich, topic-extracted prompt
      let detailedPrompt = `High-resolution educational infographic poster specifically illustrating and breaking down the topic: "${imgPrompt}".`;
      if (topicExtractions && Array.isArray(topicExtractions) && topicExtractions.length > 0) {
        detailedPrompt += ` Key extracted facts & research sections to visually display: ${topicExtractions.join('; ')}.`;
      }
      detailedPrompt += ` Visual layout: Modern dark slate background (#0F172A), vibrant cyan (#38BDF8) and purple (#C084FC) accents, bold clear titles, visual flowcharts, step-by-step labeled diagrams, key statistics callout boxes, vector icons, crisp typography, clean professional layout. Resolution detail: ${requestedSize}.`;

      // Try image models in priority order
      const imageModels = [
        'gemini-3-pro-image-preview',
        'gemini-3.1-flash-image-preview',
        'imagen-3.0-generate-002',
        'imagen-3.0-fast-generate-001',
        'imagen-4.0-generate-001'
      ];

      for (const imgModel of imageModels) {
        try {
          imageRes = await ai.models.generateImages({
            model: imgModel,
            prompt: detailedPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: requestedAspect as any,
              imageSize: requestedSize as any,
            }
          });
          if (imageRes?.generatedImages?.[0]?.image?.imageBytes) {
            break;
          }
        } catch (err) {
          console.warn(`Image model ${imgModel} attempted:`, err);
        }
      }

      if (imageRes?.generatedImages?.[0]?.image?.imageBytes) {
        const base64Image = `data:image/jpeg;base64,${imageRes.generatedImages[0].image.imageBytes}`;
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ image: base64Image, text: "Infographic image generated successfully.", imageSize: requestedSize })
        };
      }

      // Fallback to generating SVG infographic using gemini content generation with high detail
      try {
        const svgResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: [{
            role: 'user',
            parts: [{ text: `Create a complete, visually stunning, highly detailed modern educational infographic SVG code specifically for the topic: "${imgPrompt}".
${topicExtractions ? `\nIncorporate these exact topic extractions and research facts:\n${Array.isArray(topicExtractions) ? topicExtractions.join('\n- ') : topicExtractions}` : ''}

CRITICAL VISUAL & CONTENT REQUIREMENTS:
1. TITLE & HEADER: Place a bold header with the exact topic title at the top, wrapped in a sleek gradient card with decorative icon elements.
2. TOPIC SPECIFIC VISUAL SECTIONS: Include 4 distinct visual sections directly relevant to "${imgPrompt}":
   - Section 1: Key Core Principles & Research Facts (with labeled cards and colorful icon badges).
   - Section 2: Visual Flowchart / Architecture Diagram (with connected nodes, arrows, and step-by-step labels).
   - Section 3: Data & Key Statistics (with visual metric percentage bars or circular charts and big numbers).
   - Section 4: Key Applications or Takeaways (with highlighted callout boxes).
3. STYLING & PALETTE: Use a modern dark theme background (#0F172A and #1E293B), vibrant cyan (#38BDF8), purple (#C084FC), emerald (#34D399), and pink (#F472B6) gradients, high contrast text (#F8FAFC), crisp borders, and rounded rect cards.
4. FORMAT: Return ONLY valid SVG code (viewBox="0 0 800 1000", xmlns="http://www.w3.org/2000/svg") wrapped in \`\`\`xml ... \`\`\`. Write actual real facts, concepts, and diagrams for "${imgPrompt}".` }]
          }]
        });
        const svgText = svgResponse.text || '';
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ text: svgText, fallbackSvg: true })
        };
      } catch (fallbackErr) {
        console.error("SVG Fallback error:", fallbackErr);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Failed to generate infographic visual." })
        };
      }
    }

    if (!model || !contents) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing model or contents' })
      };
    }

    // Handle model selection with dynamic resilient fallback cascade
    const flashFallbackList = [
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-flash-latest'
    ];
    
    const proFallbackList = [
      'gemini-3.1-pro-preview',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash'
    ];

    let reqConfig = config || {};
    let isProOrThinking = thinkingMode || model?.includes('pro');
    let initialModel = model || 'gemini-3.6-flash';

    if (thinkingMode) {
      initialModel = 'gemini-3.1-pro-preview';
      reqConfig = {
        ...reqConfig,
        thinkingConfig: {
          thinkingLevel: 'HIGH'
        }
      };
    }

    // Build unique model cascade list starting with initialModel
    const modelQueue = Array.from(new Set([
      initialModel,
      ...(isProOrThinking ? proFallbackList : flashFallbackList),
      ...flashFallbackList
    ]));

    let response: any = null;
    let lastError: any = null;

    for (const modelToTry of modelQueue) {
      try {
        // Clean thinkingConfig if trying a non-pro model
        const currentConfig = { ...reqConfig };
        if (!modelToTry.includes('pro') && currentConfig.thinkingConfig) {
          delete currentConfig.thinkingConfig;
        }

        // Try with tools first if specified
        try {
          response = await ai.models.generateContent({
            model: modelToTry,
            contents,
            config: currentConfig
          });
        } catch (toolErr: any) {
          const toolErrStr = String(toolErr?.message || toolErr).toLowerCase();
          const isQuotaOrRateLimit = toolErrStr.includes('429') || toolErrStr.includes('quota') || toolErrStr.includes('resource_exhausted');
          
          if (currentConfig.tools && !isQuotaOrRateLimit) {
            // Try without tools if tool invocation had a schema/formatting issue
            const noToolsConfig = { ...currentConfig };
            delete noToolsConfig.tools;
            response = await ai.models.generateContent({
              model: modelToTry,
              contents,
              config: noToolsConfig
            });
          } else {
            // If it's a 429 quota error, throw immediately to move to the next model in the cascade
            throw toolErr;
          }
        }

        if (response && response.text) {
          break; // Success!
        }
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err).toLowerCase();
        
        // If it's auth error or missing key, throw immediately
        if (errStr.includes('api_key_invalid') || errStr.includes('unauthorized') || err.message === 'MISSING_API_KEY') {
          throw err;
        }
        // For rate limit (429/quota), proceed seamlessly to the next model in queue
      }
    }

    if (!response || !response.text) {
      if (lastError) throw lastError;
      throw new Error('All model candidate attempts failed');
    }

    let groundingChunks: { title: string; uri: string; snippet?: string }[] = [];
    try {
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const metadata = candidates[0].groundingMetadata;
        if (metadata) {
          if (Array.isArray(metadata.groundingChunks)) {
            metadata.groundingChunks.forEach((chunk: any) => {
              const uri = chunk.web?.uri || chunk.uri;
              const title = chunk.web?.title || chunk.title || uri;
              if (uri && !groundingChunks.some(g => g.uri === uri)) {
                groundingChunks.push({
                  title: title,
                  uri: uri,
                  snippet: chunk.web?.snippet || chunk.web?.description || '',
                });
              }
            });
          }
        }
      }

      // Also extract markdown links [title](url) and raw http/https URLs from response text
      if (response.text) {
        const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
        let match;
        while ((match = mdLinkRegex.exec(response.text)) !== null) {
          const title = match[1].trim();
          const uri = match[2].trim();
          if (uri && !groundingChunks.some(g => g.uri === uri)) {
            groundingChunks.push({
              title: title || uri,
              uri: uri,
              snippet: 'Extracted from research answer'
            });
          }
        }

        const rawUrlRegex = /(https?:\/\/[^\s\)\>\]]+)/g;
        let urlMatch;
        while ((urlMatch = rawUrlRegex.exec(response.text)) !== null) {
          const uri = urlMatch[1].replace(/[.,;:)]+$/, '').trim();
          if (uri && !groundingChunks.some(g => g.uri === uri)) {
            let domain = uri;
            try { domain = new URL(uri).hostname.replace('www.', ''); } catch (e) {}
            groundingChunks.push({
              title: domain,
              uri: uri,
              snippet: 'Extracted website reference'
            });
          }
        }
      }
    } catch (e) {
      console.error("Error extracting grounding chunks:", e);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ text: response.text, groundingChunks })
    };

  } catch (error: any) {
    const errStr = String(error?.message || error).toLowerCase();
    if (error.message === 'MISSING_API_KEY') {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'MISSING_API_KEY', message: 'API Key is missing' })
      };
    }

    if (
      errStr.includes('api key not valid') ||
      errStr.includes('invalid api key') ||
      errStr.includes('api_key_invalid') ||
      errStr.includes('unauthorized') ||
      errStr.includes('permission_denied') ||
      (error.status === 400 && errStr.includes('api key'))
    ) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'INVALID_API_KEY', message: 'API key is invalid or not authorized.' })
      };
    }

    try {
      checkRateLimit(error);
    } catch (rateLimitError) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'RATE_LIMIT_REACHED' })
      };
    }

    console.error('Netlify Function Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message || 'Error executing AI request' })
    };
  }
};
