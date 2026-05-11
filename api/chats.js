export default async function handler(req, res) {
  console.log('🚀 CHATS API TEST - Method:', req.method);

  if (req.method === 'GET') {
    console.log('✅ Returning empty chats list');
    return res.json([]);   // just empty list for now
  }

  if (req.method === 'POST') {
    console.log('✅ Creating test chat');
    return res.json({
      id: Date.now().toString(),
      title: 'Test Chat',
      createdAt: new Date().toISOString()
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
