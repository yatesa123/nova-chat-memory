const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  console.log('=== CHATS API CALLED === Method:', req.method);

  if (req.method === 'GET') {
    try {
      console.log('Loading chat_list from KV...');
      const chats = await kv.get('chat_list') || [];
      console.log('✅ Loaded chats:', chats);
      return res.json(chats);
    } catch (error) {
      console.error('❌ GET /api/chats FAILED:', error.message);
      console.error(error);
      return res.status(500).json({ error: 'Failed to load chats', details: error.message });
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

  if (req.method === 'PATCH') {
    try {
      const { chatId, title } = req.body || {};
      if (!chatId) return res.status(400).json({ error: 'chatId required' });
      let chats = await kv.get('chat_list') || [];
      chats = chats.map(c => c.id === chatId ? { ...c, title } : c);
      await kv.set('chat_list', chats);
      await kv.set(`chat_meta_${chatId}`, { title });
      return res.json({ success: true });
    } catch (error) {
      console.error('PATCH error:', error.message);
      return res.status(500).json({ error: 'Failed to rename' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { chatId } = req.body || {};
      if (!chatId) return res.status(400).json({ error: 'chatId required' });
      let chats = await kv.get('chat_list') || [];
      chats = chats.filter(c => c.id !== chatId);
      await kv.set('chat_list', chats);
      await kv.del(`chat_${chatId}`);
      await kv.del(`chat_meta_${chatId}`);
      return res.json({ success: true });
    } catch (error) {
      console.error('DELETE error:', error.message);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
