// Explicit .ts extensions so standalone Node scripts (scripts/eval_retrieval.ts) can import this file too.
import { generateEmbedding } from './embedding.ts';
import { supabase } from './supabase.ts';

// Re-exported so existing imports of these from this module keep working.
export { generateEmbedding, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from './embedding.ts';
export type { EmbeddingTask } from './embedding.ts';

// Tuned empirically: unrelated text scores ~50% with this model, so 0.3 matched everything.
// Check any change against scripts/eval_retrieval.ts.
export const MATCH_THRESHOLD = 0.6;
export const MATCH_COUNT = 3; // Retrieve top 3 matching policies

export interface RetrievedPolicy {
  id: number;
  content: string;
  similarity: number;
}

/**
 * Embeds the query and returns the closest policies above the threshold, best match first.
 * Throws on failure. This is the one retrieval code path: the chat route and the eval both use it.
 */
export async function retrievePolicies(
  query: string,
  threshold = MATCH_THRESHOLD,
  count = MATCH_COUNT
): Promise<RetrievedPolicy[]> {
  // Generate the embedding vector (as a QUERY, not a document)
  const embedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');

  // Call the PostgreSQL function match_policies via Supabase client
  const { data, error } = await supabase.rpc('match_policies', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  });

  if (error) throw error;
  return data ?? [];
}

/**
 * Retrieves the relevant policies for the user message and formats them for the system prompt.
 * Never throws: on failure the agent gets an error note instead of policies.
 */
export async function searchRealVectorDB(userMessage: string): Promise<string> {
  try {
    const policies = await retrievePolicies(userMessage);

    if (policies.length === 0) {
      return 'No relevant policies found.';
    }

    // Combine and format the results
    return policies
      .map((policy, index) => {
        return `[Policy #${index + 1} - Similarity: ${(policy.similarity * 100).toFixed(1)}%]\n${policy.content}`;
      })
      .join('\n\n');
  } catch (error) {
    console.error('Error in searchRealVectorDB:', error);
    return 'Error performing policy database search.';
  }
}
