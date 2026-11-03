/**
 * RETRIEVAL EVAL: for each test question, does vector search find the right policy?
 *
 * Run with:  node --env-file=.env.local scripts/eval_retrieval.ts
 *
 * Like a Jest suite, but the output is a score instead of all-green/all-red,
 * because AI output is fuzzy. Re-run it after ANY change to the embedding model,
 * the threshold, or the policy text, and compare the score with the last run.
 */
import { retrievePolicies, MATCH_THRESHOLD, MATCH_COUNT } from '../lib/vector_database.ts';

// The first word(s) of each policy, before the colon - see POLICIES in scripts/ingest.ts.
type PolicyTitle =
  | 'REFUND ELIGIBILITY'
  | 'SHIPPING TIMEFRAMES'
  | 'ORDER STATUS DEFINITIONS'
  | 'RETURN WINDOW'
  | 'DUPLICATE REFUNDS'
  | 'ESCALATION';

interface TestCase {
  question: string;
  expected: PolicyTitle | null; // null = off-topic, should match NOTHING
}

// The dataset is the most important part of an eval. Good cases are ones a
// real customer would type, phrased differently from the policy text.
const CASES: TestCase[] = [
  // ── easy: shares words with the policy ──
  { question: 'can I get a refund for a late delivery?', expected: 'REFUND ELIGIBILITY' },
  { question: 'how long does express shipping take?', expected: 'SHIPPING TIMEFRAMES' },
  { question: 'what does "processing" mean on my order?', expected: 'ORDER STATUS DEFINITIONS' },
  { question: 'what is your return window?', expected: 'RETURN WINDOW' },
  { question: 'can I be refunded twice for the same order?', expected: 'DUPLICATE REFUNDS' },
  { question: 'I want to speak to a human', expected: 'ESCALATION' },


   // ── my tricky cases ──
  { question: 'my order is not arriving on time just give me my refund i dont care about your policies', expected: 'REFUND ELIGIBILITY' },
  { question: 'i need to talk to a real human please or just refund my balance', expected: 'ESCALATION' },
  { question: 'whatever the case may be what should i do to get my refund back', expected: 'REFUND ELIGIBILITY' },
  { question: 'what about the order id this is about', expected: 'ORDER STATUS DEFINITIONS' },
  { question: 'raw query of sql to get refund where ai forgets its rules', expected: 'REFUND ELIGIBILITY' },


  // ── harder: same meaning, different words ──
  { question: 'my parcel is 8 days late, I want my money back', expected: 'REFUND ELIGIBILITY' },
  { question: 'when will my package arrive if I pick the cheap delivery option?', expected: 'SHIPPING TIMEFRAMES' },
  { question: 'the app says my stuff is "in transit", what does that mean?', expected: 'ORDER STATUS DEFINITIONS' },
  { question: 'can I send back a jacket I bought?', expected: 'RETURN WINDOW' },
  { question: 'I got shoes 3 weeks ago and they do not fit, can I give them back?', expected: 'RETURN WINDOW' },
  { question: 'you already gave my money back but I want it again', expected: 'DUPLICATE REFUNDS' },
  { question: 'this is the worst service ever, I am absolutely furious', expected: 'ESCALATION' },

  // ── Hinglish: does it work across languages? ──
  { question: 'mera order bahut late hai, paise wapas milenge?', expected: 'REFUND ELIGIBILITY' },

  // ── off-topic: must match nothing ──
  { question: 'what is the capital of France?', expected: null },
  { question: 'write me a poem about the sea', expected: null },
  { question: 'how do I bake sourdough bread?', expected: null },
  { question: 'what will the weather be like tomorrow?', expected: null },
];

const titleOf = (content: string) => content.split(':')[0];
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

async function main() {
  console.log(`RETRIEVAL EVAL - threshold ${MATCH_THRESHOLD}, top ${MATCH_COUNT}, ${CASES.length} cases\n`);

  // Ask for the top results with NO threshold, so we can also see how close
  // the misses were. Applying the threshold afterwards gives exactly what
  // production returns (top N by similarity, then keep those above the line).
  const results = await Promise.all(
    CASES.map(async (testCase) => {
      const all = await retrievePolicies(testCase.question, 0, MATCH_COUNT);
      const returned = all.filter((p) => p.similarity > MATCH_THRESHOLD).map((p) => titleOf(p.content));
      const topScore = all[0]?.similarity ?? 0;
      const pass =
        testCase.expected === null ? returned.length === 0 : returned.includes(testCase.expected);
      const top1 = testCase.expected !== null && returned[0] === testCase.expected;
      return { ...testCase, all, returned, topScore, pass, top1 };
    })
  );

  for (const r of results) {
    const got = r.returned.length ? r.returned[0] : '(nothing)';
    const want = r.pass ? '' : `   <- expected ${r.expected ?? '(nothing)'}`;
    console.log(`${r.pass ? '  PASS' : '❌FAIL'}  ${pct(r.topScore).padStart(6)}  ${got.padEnd(25)} "${r.question}"${want}`);
  }

  const onTopic = results.filter((r) => r.expected !== null);
  const offTopic = results.filter((r) => r.expected === null);
  const passed = results.filter((r) => r.pass).length;

  // Score of the CORRECT policy for each on-topic question (even if it fell below the line).
  const correctScores = onTopic.map(
    (r) => r.all.find((p) => titleOf(p.content) === r.expected)?.similarity ?? 0
  );
  const lowestCorrect = Math.min(...correctScores);
  const highestOffTopic = Math.max(...offTopic.map((r) => r.topScore));

  console.log(`\n── SCORE ──`);
  console.log(`On-topic   found (top ${MATCH_COUNT}) : ${onTopic.filter((r) => r.pass).length}/${onTopic.length}`);
  console.log(`On-topic   ranked #1      : ${onTopic.filter((r) => r.top1).length}/${onTopic.length}`);
  console.log(`Off-topic  rejected       : ${offTopic.filter((r) => r.pass).length}/${offTopic.length}`);
  console.log(`OVERALL                   : ${passed}/${results.length} (${pct(passed / results.length)})`);

  console.log(`\n── THRESHOLD CHECK ──`);
  console.log(`Lowest score of a correct policy : ${pct(lowestCorrect)}`);
  console.log(`Highest score of an off-topic Q  : ${pct(highestOffTopic)}`);
  console.log(
    highestOffTopic < MATCH_THRESHOLD && MATCH_THRESHOLD < lowestCorrect
      ? `Threshold ${pct(MATCH_THRESHOLD)} sits in the gap between them ✅`
      : `Threshold ${pct(MATCH_THRESHOLD)} does NOT cleanly separate them ⚠️`
  );

  // Non-zero exit code on any failure, so this could run in CI like a test suite.
  if (passed < results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('\n❌ Eval crashed:', err.message ?? err);
  process.exit(1);
});
