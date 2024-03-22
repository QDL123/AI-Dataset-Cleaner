import OpenAI from "openai";

export default async function handler(req, res) {
    console.log("Reached handler");
    if (req.method == 'POST') {
    
        const openai = new OpenAI({
            apiKey: process.env.OpenAI_API_KEY,
        });
    
        const userEditPrompt = req.body.prompt;
        console.log(`userEditPrompt: ${userEditPrompt}`);
        const conversationJSON = req.body.conversation;
        console.log(`conversationJSON: ${JSON.stringify(conversationJSON, null, 2)}`);
    
        try {
            const response = await openai.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that takes prompts containing valid JSON representing a conversation, makes edits to that conversation based on the prompt, and outputs valid JSON representing the modified conversation. Always make the top level key "conversation".',
                    },
                    {
                        role: 'user',
                        content: `Here is some JSON representing a conversation: ${JSON.stringify(conversationJSON)}. I would like to make the following changes to it: ${userEditPrompt}. Output the updated conversation as an array of objects that each have role and content keys.`,
                    }
                ],
                model: 'gpt-4-turbo-preview',
                response_format: { type: 'json_object' },
            });
            console.log(`response: ${JSON.stringify(response, null, 2)}`);
            res.status(200).json(JSON.parse(response.choices[0].message.content).conversation);
        } catch (error) {
            console.log('AN ERROR occurred')
            console.error(error)
            res.status(500).json({ error: error.message });
        }

    } else {
        console.log('WRONG HTTP METHOD USED');
        // No other HTTP methods supported
        res.status(405).end(`Method ${req.method} Not Supported`);
    }

    console.log('END OF HANDLER')
}