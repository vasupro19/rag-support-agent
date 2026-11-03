import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  isTextUIPart,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { buildAgent } from '@/lib/agent';

// Allow streaming to run up to 30 seconds (useful for multi-step tool calls)
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // useChat sends UIMessages: { role, parts: [{ type: 'text', text }, ...] } - there is no `content` field.
    const { messages }: { messages: UIMessage[] } = await req.json();

    // Extract the text of the last user message to retrieve relevant policies
    const lastUserMessage =
      messages
        .filter((m) => m.role === 'user')
        .at(-1)
        ?.parts.filter(isTextUIPart)
        .map((part) => part.text)
        .join(' ') ?? '';

    // Model, RAG-filled system prompt, tools and step cap all come from lib/agent.ts,
    // the same agent scripts/eval_agent.ts tests.
    const result = streamText({
      ...(await buildAgent(lastUserMessage)),
      // The model API wants ModelMessages ({ role, content }), not the UI's { role, parts } shape.
      messages: await convertToModelMessages(messages),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error: any) {
    console.error('Error in chat API route:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
