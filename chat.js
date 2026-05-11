import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, history = [], memory = {} } = req.body;

  // Load latest memory + history from KV (in case multiple tabs)
  const storedMemory = await kv.get('user_memory') || memory;
  const storedHistory = await kv.get('chat_history') || history;

  // Build system prompt with memory
  let systemPrompt = `You are Nova, a friendly long-time friend. 
You have long-term memory about the user. Here is what you know:

${Object.entries(storedMemory).map(([k, v]) => `${k}: ${v}`).join('\n')}

Be warm, fun, and remember details from past conversations.`;

  const messagesForAPI = [
    { role: 'system', content: systemPrompt },
    ...storedHistory.slice(-12), // last 12 messages for context
    { role: 'user', content: message }
  ];

  // Call Grok via Vercel AI Gateway
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, // or use xAI key
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // or grok if you have access
      messages: messagesForAPI,
      temperature: 0.8,
      max_tokens: 800
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;

  // Save new messages
  const newHistory = [...storedHistory, 
    { role: 'user', content: message },
    { role: 'assistant', content: reply }
  ].slice(-20); // keep last 20

  await kv.set('chat_history', newHistory);

  // Simple memory update (you can make this smarter later)
  const updatedMemory = { ...storedMemory };
  // You can add logic here to extract facts (for now it's manual)

  await kv.set('user_memory', updatedMemory);

  res.json({ 
    reply, 
    updatedMemory 
  });
}