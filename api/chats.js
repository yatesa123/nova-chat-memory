import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, chatId, history = [], memory = {} } = req.body;

  let storedMemory = await kv.get('user_memory') || memory;
  let storedHistory = await kv.get(`chat_${chatId}`) || history;
  let chatMeta = await kv.get(`chat_meta_${chatId}`) || { title: 'New Conversation' };

  // Build system prompt
  const memoryText = Object.entries(storedMemory)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const systemPrompt = `You are Nova — a warm, funny, long-time friend who remembers things.

Current memory:
${memoryText || "I don't know much about them yet."}

Be natural and reference past conversations when it feels right.`;

  const messagesForAPI = [
    { role: 'system', content: systemPrompt },
    ...storedHistory.slice(-10),
    { role: 'user', content: message }
  ];

  // Call Grok
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: messagesForAPI,
      temperature: 0.85,
      max_tokens: 700
    })
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "Sorry, my brain glitched 😅";

  // Save new messages
  const newHistory = [
    ...storedHistory,
    { role: 'user', content: message },
    { role: 'assistant', content: reply }
  ].slice(-20);

  await kv.set(`chat_${chatId}`, newHistory);

  // === AUTO TITLE GENERATION (only on first message) ===
  let updatedTitle = chatMeta.title;
  if (storedHistory.length === 0 && message.length > 5) {
    try {
      const titleRes = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-2-latest',
          messages: [
            { role: 'system', content: 'Generate a very short, natural 3-6 word title for this conversation. No quotes, no punctuation.' },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 15
        })
      });
      
      const titleData = await titleRes.json();
      updatedTitle = titleData.choices?.[0]?.message?.content?.trim() || 'New Conversation';
      
      // Save new title
      await kv.set(`chat_meta_${chatId}`, { title: updatedTitle });
      
      // Update chat list title
      let chatList = await kv.get('chat_list') || [];
      chatList = chatList.map(c => c.id === chatId ? { ...c, title: updatedTitle } : c);
      await kv.set('chat_list', chatList);
      
    } catch (e) {
      console.log("Title generation failed, using default");
    }
  }

  // Update memory (same as before)
  const updatedMemory = { ...storedMemory };
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("my name is")) {
    const name = message.split(/my name is/i)[1]?.trim().split(" ")[0];
    if (name) updatedMemory.name = name;
  }
  if (lowerMsg.includes("i live in") || lowerMsg.includes("i'm from")) {
    const loc = message.split(/i (live in|'m from)/i)[2]?.trim().split(/[.,!?]/)[0];
    if (loc) updatedMemory.location = loc;
  }
  if (lowerMsg.includes("i like") || lowerMsg.includes("my favorite")) {
    const like = message.split(/i (like|love|favorite is)/i)[2]?.trim().split(/[.,!?]/)[0];
    if (like) updatedMemory.likes = (updatedMemory.likes || "") + ", " + like;
  }

  await kv.set('user_memory', updatedMemory);

  res.json({ 
    reply, 
    updatedMemory,
    title: updatedTitle 
  });
}
