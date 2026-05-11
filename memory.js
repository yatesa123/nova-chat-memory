import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const memory = await kv.get('user_memory') || {};
    const history = await kv.get('chat_history') || [];
    return res.json({ memory, history });
  }

  if (req.method === 'DELETE') {
    await kv.del('user_memory');
    await kv.del('chat_history');
    return res.json({ success: true });
  }

  res.status(405).end();
}