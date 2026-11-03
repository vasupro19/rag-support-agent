/**
 * THE SUPPORT AGENT: model + system prompt + tools, in one place.
 *
 * Both the chat route (streamText, for the browser) and the agent eval
 * (generateText, for scripts/eval_agent.ts) build their agent from here, so the
 * eval tests exactly what production runs. If they each had their own copy, the
 * eval would slowly drift into testing a different agent.
 */
// Explicit .ts extensions so standalone Node scripts can import this file too.
import { tool, isStepCount } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { searchRealVectorDB } from './vector_database.ts';
import { supabase } from './supabase.ts';

export const AGENT_MODEL = 'gemini-2.5-flash';
export const MAX_STEPS = 8; // max LLM round-trips per user message (not max messages)

// Server-side enforcement of the refund policy, independent of what the LLM decides.
// This must not rely solely on the system prompt/RAG policy text, since a user could
// try to talk the model into ignoring its instructions (prompt injection).
export const MIN_REFUND_DELAY_DAYS = 5;

function buildSystemPrompt(policyContext: string) {
  return `You are an Autonomous Tier-1 Support Agent.
Your job is to resolve customer inquiries regarding orders, shipping, and refunds.

You have access to:
1. Retrieved company policies (via vector search). ALWAYS follow these policies strictly. Do not make up rules or exceptions.
2. Database tools to check order status and process refunds.

=== CURRENT COMPANY POLICIES ===
${policyContext}
================================

Guidelines:
- If a customer requests a refund or asks about their order status, ALWAYS call 'checkOrderStatus' first.
- Only process a refund using the 'processRefund' tool if the retrieved policies allow it based on the order's status and details (e.g. if a policy specifies that refunds require more than 5 days of delay, verify that the order's 'daysDelayed' is greater than 5).
- If the policy conditions are met, use 'processRefund' and confirm the refund to the user.
- If the policy conditions are not met, explain the reason clearly to the customer using the policy as a reference, and do NOT perform the refund.
- If a customer asks general questions, answer them using the retrieved policies.
- Keep your answers friendly, professional, and clear.`;
}

export const agentTools = {
  checkOrderStatus: tool({
    description: 'Checks the status of a specific order in the database, including the shipping status and number of days delayed.',
    inputSchema: z.object({
      orderId: z.string().describe('The alphanumeric order ID (e.g., ORD-1001, ORD-1002).'),
    }),
    execute: async ({ orderId }) => {
      console.log(`Tool calling: checkOrderStatus for ${orderId}`);
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, days_delayed')
        .eq('id', orderId.toUpperCase().trim())
        .single();

      if (error || !data) {
        return { error: `Order ${orderId} not found in our database.` };
      }

      return {
        orderId: data.id,
        status: data.status,
        daysDelayed: data.days_delayed,
      };
    },
  }),
  processRefund: tool({
    description: 'Processes a refund for a specific order by updating its status to "refunded" in the database.',
    inputSchema: z.object({
      orderId: z.string().describe('The alphanumeric order ID (e.g., ORD-1001, ORD-1002).'),
    }),
    execute: async ({ orderId }) => {
      console.log(`Tool calling: processRefund for ${orderId}`);

      const normalizedId = orderId.toUpperCase().trim();

      // Check if order exists first
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, days_delayed')
        .eq('id', normalizedId)
        .single();

      if (fetchError || !order) {
        return { error: `Order ${orderId} not found. Cannot process refund.` };
      }

      if (order.status === 'refunded') {
        return { error: `Order ${orderId} has already been refunded.` };
      }

      if (order.days_delayed <= MIN_REFUND_DELAY_DAYS) {
        return {
          error: `Order ${orderId} is not eligible for a refund: it has only been delayed ${order.days_delayed} day(s), which does not exceed the ${MIN_REFUND_DELAY_DAYS}-day policy threshold.`,
        };
      }

      // Perform the status update in the database
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', normalizedId);

      if (updateError) {
        return { error: `Database update failed: ${updateError.message}` };
      }

      return {
        success: true,
        orderId: normalizedId,
        status: 'refunded',
        message: `Refund successfully processed for order ${normalizedId}.`,
      };
    },
  }),
};

/**
 * Runs RAG for the latest user message and returns everything streamText/generateText
 * needs except `messages`. Spread it in: streamText({ ...(await buildAgent(q)), messages }).
 */
export async function buildAgent(lastUserMessage: string) {
  const policyContext = lastUserMessage
    ? await searchRealVectorDB(lastUserMessage)
    : 'No relevant policy context found.';

  return {
    model: google(AGENT_MODEL),
    system: buildSystemPrompt(policyContext),
    tools: agentTools,
    stopWhen: isStepCount(MAX_STEPS),
  };
}
