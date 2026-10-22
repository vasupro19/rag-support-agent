// A throwaway script just to SEE what an embedding is. Delete me whenever.
import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';

const sentences = [
  'my package is late',
  'shipment delayed',
  'where is my order',
  'how do I bake sourdough bread',
];

// cosine similarity = how close two vectors point in the same direction.
// 1.0 = identical direction, 0 = unrelated.
function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const { embeddings } = await embedMany({
  model: google.textEmbeddingModel('gemini-embedding-001'),
  values: sentences,
});

console.log('=== WHAT ONE EMBEDDING LOOKS LIKE ===');
console.log(`Input text : "${sentences[0]}"`);
console.log(`Output     : an array of ${embeddings[0].length} numbers`);
console.log(`First 8    : [${embeddings[0].slice(0, 8).map(n => n.toFixed(4)).join(', ')}, ...]`);

console.log('\n=== HOW CLOSE IS EACH SENTENCE TO "my package is late"? ===');
sentences.forEach((s, i) => {
  const score = cosine(embeddings[0], embeddings[i]);
  const bar = '#'.repeat(Math.max(0, Math.round((score - 0.3) * 60)));
  console.log(`${(score * 100).toFixed(1).padStart(5)}%  ${bar.padEnd(42)} "${s}"`);
});
