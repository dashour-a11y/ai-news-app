const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const { GEMINI_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY } = process.env;

// Serve static files from the built frontend
const staticPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(staticPath));

async function callGemini(prompt, useSearch = true) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  const model = 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
    },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API request failed: ${response.status} - ${errorBody}`);
  }
  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';
  return text;
}

async function callClaude(prompt) {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY is not set');
  }
  const body = {
    model: 'claude-3-opus-20240229',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
  };
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API request failed: ${response.status} - ${errorBody}`);
  }
  const data = await response.json();
  return data?.content?.[0]?.text || '';
}

async function callChatGPT(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  const body = {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
  };
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ChatGPT API request failed: ${response.status} - ${errorBody}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

// API endpoints
app.post('/api/generate-gemini', async (req, res) => {
  const { prompt, useSearch } = req.body || {};
  try {
    const text = await callGemini(prompt, useSearch);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generating Gemini content' });
  }
});

app.post('/api/generate-claude', async (req, res) => {
  const { prompt } = req.body || {};
  try {
    const text = await callClaude(prompt);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generating Claude content' });
  }
});

app.post('/api/generate-chatgpt', async (req, res) => {
  const { prompt } = req.body || {};
  try {
    const text = await callChatGPT(prompt);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generating ChatGPT content' });
  }
});

// Stub endpoint for social media posting
app.post('/api/post-social', async (req, res) => {
  const { platform, content } = req.body || {};
  console.log(`Received request to post to ${platform}: ${content}`);
  res.json({ message: `Simulated posting to ${platform}. This feature is not yet implemented.` });
});

// Serve the SPA for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
