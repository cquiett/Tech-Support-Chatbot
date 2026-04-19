module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Log conversation for audit trail
    const timestamp = new Date().toISOString();
    const lastMessage = req.body.messages?.[req.body.messages.length - 1];
    console.log(JSON.stringify({
        timestamp,
        event: 'user_message',
        messageCount: req.body.messages?.length,
        lastRole: lastMessage?.role,
        preview: lastMessage?.content?.substring(0, 100)
    }));

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const error = await response.json();
            console.log(JSON.stringify({ timestamp, event: 'api_error', status: response.status, error }));
            return res.status(response.status).json(error);
        }

        const data = await response.json();

        // Log AI response
        console.log(JSON.stringify({
            timestamp,
            event: 'ai_response',
            preview: data.content?.[0]?.text?.substring(0, 100),
            inputTokens: data.usage?.input_tokens,
            outputTokens: data.usage?.output_tokens
        }));

        res.status(200).json(data);

    } catch (error) {
        console.log(JSON.stringify({ timestamp, event: 'server_error', error: error.message }));
        res.status(500).json({ error: error.message });
    }
};