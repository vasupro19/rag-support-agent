// Shows the RAW wire format of tool calling. Throwaway - delete whenever.
import { generateText, tool, isStepCount } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

let n = 0;
// Wrap fetch so we can see exactly what leaves the machine and what comes back.
const loggingFetch: typeof fetch = async (url, init) => {
  const callNo = ++n;
  const body = JSON.parse(init!.body as string);
  console.log(`\n${'='.repeat(62)}\n  REQUEST ${callNo}  -->  Google\n${'='.repeat(62)}`);
  console.log('contents (the conversation so far):');
  console.log(JSON.stringify(body.contents, null, 2));
  if (callNo === 1) {
    console.log('\ntools (the menu of functions, generated from your zod schema):');
    console.log(JSON.stringify(body.tools, null, 2));
  }
  const res = await fetch(url, init);
  const clone = res.clone();
  const json: any = await clone.json();
  console.log(`\n${'-'.repeat(62)}\n  RESPONSE ${callNo}  <--  Google\n${'-'.repeat(62)}`);
  console.log(JSON.stringify(json.candidates?.[0]?.content, null, 2));
  return res;
};

const google = createGoogleGenerativeAI({ fetch: loggingFetch });

await generateText({
  model: google('gemini-2.5-flash'),
  system: 'You are a support agent. Use tools to look up orders.',
  prompt: 'Is order ORD-1002 delayed?',
  stopWhen: isStepCount(4),
  tools: {
    checkOrderStatus: tool({
      description: 'Checks the status of a specific order in the database.',
      inputSchema: z.object({
        orderId: z.string().describe('The alphanumeric order ID (e.g., ORD-1001).'),
      }),
      execute: async ({ orderId }) => {
        console.log(`\n>>> YOUR TypeScript ran: checkOrderStatus("${orderId}")`);
        return { orderId, status: 'delayed', daysDelayed: 7 };
      },
    }),
  },
});
