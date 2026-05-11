const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  console.log('=== CHAT API CALLED === Method:', req.method, 'Query:', req.query);

  if (req.method === 'GET') {
    try {
      const { chatId } = req.query;
      if (!chatId) return res.status(400).json({ error: 'chatId is required' });

      const history = await kv.get(`chat_${chatId}`) || [];
      const chatMeta = await kv.get(`chat_meta_${chatId}`) || { title: 'New Conversation' };
      const memory = await kv.get('user_memory') || {};

      console.log('✅ Loaded chat history for', chatId);
      return res.json({ 
        history, 
        title: chatMeta.title,
        memory 
      });
    } catch (error) {
      console.error('❌ GET /api/chat FAILED:', error.message);
      return res.status(500).json({ error: 'Failed to load chat' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { message, chatId, history: clientHistory = [], memory: clientMemory = {} } = req.body;
      if (!chatId || !message) return res.status(400).json({ error: 'Missing chatId or message' });

      let storedMemory = await kv.get('user_memory') || clientMemory;
      let storedHistory = await kv.get(`chat_${chatId}`) || clientHistory;

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

      const apiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-beta',        // ← this was the fix!
          messages: messagesForAPI,
          temperature: 0.85,
          max_tokens: 700
        })
      });

      const data = await apiResponse.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, my brain glitched 😅";

      const newHistory = [
        ...storedHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: reply }
      ].slice(-20);

      await kv.set(`chat_${chatId}`, newHistory);

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

      return res.json({ reply, updatedMemory });
    } catch (error) {
      console.error('❌ POST /api/chat FAILED:', error.message);
      return res.status(500).json({ error: 'Failed to get reply' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
