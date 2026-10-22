import { embed } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * Both ingestion and querying MUST use the same model and dimension count.
 * If these ever drift apart you get no error - just silently meaningless
 * similarity scores, because the two sets of vectors live in different spaces.
 * That is why they are constants exported from one place.
 *
 * NOTE: this file deliberately has NO database import, so standalone scripts
 * (scripts/ingest.ts) can use it without pulling in the Supabase/pg client.
 */
export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768; // must match vector(768) in supabase_schema.sql

/**
 * Embeddings are asymmetric: a short question and a long policy document are
 * different shapes of text. Telling the model which side it is embedding
 * measurably improves retrieval quality.
 */
export type EmbeddingTask = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT';

/** Scale a vector to unit length. Needed because gemini-embedding-001 truncates
 *  (rather than re-normalizes) when outputDimensionality < its native 3072. */
function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return magnitude === 0 ? vector : vector.map((v) => v / magnitude);
}

/**
 * Generates a normalized embedding for the input text.
 * Use 'RETRIEVAL_DOCUMENT' when storing policies, 'RETRIEVAL_QUERY' when searching.
 */
export async function generateEmbedding(
  text: string,
  taskType: EmbeddingTask = 'RETRIEVAL_QUERY'
): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google.textEmbeddingModel(EMBEDDING_MODEL),
      value: text.replace(/\n/g, ' '), // sanitize input newlines for better embeddings
      providerOptions: {
        google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType },
      },
    });
    return normalize(embedding);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}
