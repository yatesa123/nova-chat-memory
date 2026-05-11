// 1. Declare the variable OUTSIDE the try block!
  let reply = "";

  try {
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

    // 2. Check if xAI rejected us (e.g. bad key, no credits)
    if (!response.ok) {
      console.error("❌ xAI API ERROR:", data);
      reply = "My brain glitched! Check the Vercel logs to see the API error.";
    } else {
      // 3. Success! Get the message
      reply = data.choices?.[0]?.message?.content || "I didn't know what to say! 😅";
    }

  } catch (err) {
    console.error('❌ Network error:', err);
    reply = "Sorry, network glitch! 😅";
  }

  // Now 'reply' works perfectly here!
  const newHistory = [
    ...storedHistory,
    { role: 'user', content: message },
    { role: 'assistant', content: reply }
  ].slice(-20);
