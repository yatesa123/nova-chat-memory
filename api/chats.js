import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  console.log('=== CHATS API CALLED ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  if (req.method === 'GET') {
    try {
      console.log('Trying to load chat_list from KV...');
      const chats = await kv.get('chat_list') || [];
      console.log('✅ Successfully loaded chats:', chats);
      return res.json(chats);
    } catch (error) {
      console.error('❌ GET /api/chats FAILED:', error.message);
      console.error('Full error:', error);
      return res.status(500).json({ 
        error: 'Failed to load chats', 
        details: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const newChat = {
        id: Date.now().toString(),
        title: 'New Conversation',
        createdAt: new Date().toISOString()
      };
      let chats = await kv.get('chat_list') || [];
      chats.unshift(newChat);
      await kv.set('chat_list', chats);
      console.log('✅ New chat created:', newChat);
      return res.json(newChat);
    } catch (error) {
      console.error('❌ POST /api/chats FAILED:', error.message);
      return res.status(500).json({ error: 'Failed to create chat' });
    }
  }

  // Keep the other methods for now (you can ignore them)
  if (req.method === 'PATCH' || req.method === 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed yet' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
