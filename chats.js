import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const chats = await kv.get('chat_list') || [];
    return res.json(chats);
  }

  if (req.method === 'POST') {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Conversation',
      createdAt: new Date().toISOString()
    };
    let chats = await kv.get('chat_list') || [];
    chats.unshift(newChat);
    await kv.set('chat_list', chats);
    return res.json(newChat);
  }

  if (req.method === 'PATCH') {
    const { chatId, title } = req.body;
    let chats = await kv.get('chat_list') || [];
    chats = chats.map(c => c.id === chatId ? { ...c, title } : c);
    await kv.set('chat_list', chats);
    await kv.set(`chat_meta_${chatId}`, { title });
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { chatId } = req.body;
    let chats = await kv.get('chat_list') || [];
    chats = chats.filter(c => c.id !== chatId);
    await kv.set('chat_list', chats);
    await kv.del(`chat_${chatId}`);
    await kv.del(`chat_meta_${chatId}`);
    return res.json({ success: true });
  }

  res.status(405).end();
}