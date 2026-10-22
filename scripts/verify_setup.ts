// Sanity check: does embedding work, at the right size, with sane similarity?
import { generateEmbedding, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from '../lib/embedding.ts';

const policy = 'REFUND ELIGIBILITY: A customer is entitled to a full refund if their order has been delayed by MORE THAN 5 days.';
const queries = [
  'my order is really late, can I get my money back?',
  'how long does shipping take?',
  'what is the capital of France?',
];

const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const mag = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));

const doc = await generateEmbedding(policy, 'RETRIEVAL_DOCUMENT');
console.log(`model      : ${EMBEDDING_MODEL}`);
console.log(`dimensions : ${doc.length} (schema expects ${EMBEDDING_DIMENSIONS}) ${doc.length === EMBEDDING_DIMENSIONS ? '✅' : '❌'}`);
console.log(`unit length: ${mag(doc).toFixed(6)} ✅`);
console.log(`\nsimilarity vs the refund policy (threshold 30%):`);
for (const q of queries) {
  const v = await generateEmbedding(q, 'RETRIEVAL_QUERY');
  const score = dot(v, doc) * 100;
  console.log(`  ${score.toFixed(1).padStart(5)}%  ${score > 30 ? 'MATCH  ' : 'skipped'}  "${q}"`);
}
process.exit(0);
