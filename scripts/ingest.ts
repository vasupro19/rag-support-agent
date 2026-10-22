/**
 * INGESTION: turn policy text into vectors and store them in Postgres.
 *
 * Run with:  node --env-file=.env.local scripts/ingest.ts
 *
 * This runs ONCE, offline. Retrieval (lib/vector_database.ts) then runs on
 * every chat request and compares against what this script stored.
 */
import { createClient } from "@supabase/supabase-js";
import {
  generateEmbedding,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "../lib/embedding.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Each string becomes exactly one vector. These are short enough that
// one-chunk-per-policy is correct; a 4,000-word document would need splitting.
const POLICIES = [
  `REFUND ELIGIBILITY: A customer is entitled to a full refund if their order has been delayed by MORE THAN 5 days. Orders delayed by 5 days or fewer are not eligible for a refund and the customer should be asked to wait for delivery.`,

  `SHIPPING TIMEFRAMES: Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. An order is marked "delayed" once it passes its expected delivery window.`,

  `ORDER STATUS DEFINITIONS: "processing" means payment is confirmed but the item has not shipped. "shipped" means the item is in transit. "delivered" means the carrier confirmed delivery. "delayed" means the order has passed its expected delivery date. "refunded" means the order was cancelled and the customer's money returned.`,

  `RETURN WINDOW: Customers may return any delivered item within 30 days of the delivery date, provided the item is unused and in its original packaging. Returns outside this window are not accepted.`,

  `DUPLICATE REFUNDS: An order that already has the status "refunded" must never be refunded a second time. If a customer requests a refund on an already-refunded order, politely inform them the refund was already issued.`,

  `ESCALATION: If a customer explicitly asks to speak to a human, or expresses that they are extremely dissatisfied, do not attempt to resolve the issue yourself. Apologise and tell them a human support agent will follow up within one business day.`,
];

async function main() {
  console.log(`Model: ${EMBEDDING_MODEL} @ ${EMBEDDING_DIMENSIONS} dimensions`);
  console.log(`Ingesting ${POLICIES.length} policies...\n`);

  // Clear existing rows so re-running this script doesn't create duplicates.
  await supabase.from("company_policies").delete().neq("id", 0);

  // ─────────────────────────────────────────────────────────────────────
  // TODO 1: turn each policy into a vector.
  //   For each entry in POLICIES, call:
  //       await generateEmbedding(policy, 'RETRIEVAL_DOCUMENT')
  //   Note the second argument - these are DOCUMENTS being stored, not a
  //   QUERY being searched. Push an object into `rows` shaped like:
  //       { content: policy, embedding: <the vector> }
  //   A plain `for (const policy of POLICIES) { ... }` loop is fine.
  //   Tip: console.log inside the loop so you can watch it progress.
  // ─────────────────────────────────────────────────────────────────────
  const rows: { content: string; embedding: number[] }[] = [];

  // YOUR CODE HERE
  rows.push(
    ...await Promise.all(POLICIES.map(async (policy) => {
      const embedding = await generateEmbedding(policy, 'RETRIEVAL_DOCUMENT')
      return { content: policy, embedding }
    }))
  );
  // ─────────────────────────────────────────────────────────────────────
  // TODO 2: insert `rows` into the company_policies table.
  //   supabase.from('...').insert(rows) takes the whole array at once.
  //   Column names are in supabase_schema.sql:5-9 - check them rather than
  //   guessing. Capture the { error } it returns and `throw error` if set,
  //   otherwise a failed insert will look like a success.
  // ─────────────────────────────────────────────────────────────────────

  // YOUR CODE HERE
  console.log(`Inserting ${rows.length} rows into the database...`);
  const { error: insertError } = await supabase
    .from("company_policies")
    .insert(rows);
  if (insertError) throw insertError;

  // ── verification (already written for you) ──
  const { data, error } = await supabase
    .from("company_policies")
    .select("id, content");
  if (error) throw error;
  console.log(`\n✅ ${data?.length ?? 0} policies now in the database:`);
  for (const row of data ?? []) {
    console.log(`   #${row.id}  ${row.content.slice(0, 60)}...`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Ingestion failed:", err.message ?? err);
    process.exit(1);
  });
