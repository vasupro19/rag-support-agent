import { generateEmbedding } from './embedding';
import { supabase } from './supabase';

// Re-exported so existing imports of these from this module keep working.
export { generateEmbedding, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from './embedding';
export type { EmbeddingTask } from './embedding';

/**
 * Embeds the user message and queries the Supabase match_policies RPC function to find matching policies.
 * Returns the combined text of all relevant policy documents.
 */
export async function searchRealVectorDB(userMessage: string): Promise<string> {
  try {
    // Generate the embedding vector (as a QUERY, not a document)
    const embedding = await generateEmbedding(userMessage, 'RETRIEVAL_QUERY');

    // Call the PostgreSQL function match_policies via Supabase client
    const { data: policies, error } = await supabase.rpc('match_policies', {
      query_embedding: embedding,
      match_threshold: 0.6, // Tuned empirically: unrelated text scores ~50% with this model, so 0.3 matched everything
      match_count: 3,        // Retrieve top 3 matching policies
    });

    if (error) {
      console.error('Supabase RPC match_policies error:', error);
      return 'Error retrieving policy database.';
    }

    if (!policies || policies.length === 0) {
      return 'No relevant policies found.';
    }

    // Combine and format the results
    return policies
      .map((policy: { content: string; similarity: number }, index: number) => {
        return `[Policy #${index + 1} - Similarity: ${(policy.similarity * 100).toFixed(1)}%]\n${policy.content}`;
      })
      .join('\n\n');
  } catch (error) {
    console.error('Error in searchRealVectorDB:', error);
    return 'Error performing policy database search.';
  }
}
