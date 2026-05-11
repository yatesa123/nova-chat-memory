import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const chats = await kv.get('chat_list') || [];
      return res.json(chats);
    } catch (error) {
      console.error('Error in /api/chats GET:', error);
      return res.status(500).json({ error: 'Failed to load chats' });
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
      return res.json(newChat);
    } catch (error) {
      console.error('Error in /api/chats POST:', error);
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
      console.error('Error in /api/chats PATCH:', error);
      return res.status(500).json({ error: 'Failed to update chat' });
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
      console.error('Error in /api/chats DELETE:', error);
      return res.status(500).json({ error: 'Failed to delete chat' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
