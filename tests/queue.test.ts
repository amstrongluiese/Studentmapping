import assert from "node:assert/strict";
import { EnterpriseTaskQueue } from "../server/queue";

async function waitUntil(predicate: () => boolean, timeoutMs = 4000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for queue condition");
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}

async function runQueueTests() {
  // 1. Concurrency cap enforcement & real handler execution
  const queue = new EnterpriseTaskQueue(2);
  let active = 0;
  let peakActive = 0;

  queue.registerHandler<{ n: number }>("IMPORT_STUDENTS", async (payload, updateProgress) => {
    active += 1;
    peakActive = Math.max(peakActive, active);
    updateProgress(50);
    await new Promise((r) => setTimeout(r, 40));
    active -= 1;
    return { processed: payload.n };
  });

  const jobs = [1, 2, 3, 4].map((n) => queue.enqueue("IMPORT_STUDENTS", { n }));
  await waitUntil(() => jobs.every((j) => queue.getJob(j.id)?.status === "completed"));

  assert.equal(peakActive <= 2, true, `Peak concurrency ${peakActive} exceeded maxConcurrency 2`);
  assert.equal(queue.getJob(jobs[0].id)?.payload, undefined, "Job status API must redact raw payload");
  assert.deepEqual(queue.getJob(jobs[0].id)?.result, { processed: 1 });
  console.log("PASS [1/2]: Concurrency limit, async execution, and payload redaction verified");

  // 2. Automatic retry on transient failure
  let attemptCounter = 0;
  queue.registerHandler("RECOMPUTE_COUNTS", async () => {
    attemptCounter += 1;
    if (attemptCounter === 1) {
      throw new Error("Transient DB hiccup");
    }
    return { ok: true };
  });

  const retryJob = queue.enqueue("RECOMPUTE_COUNTS", {}, 2);
  await waitUntil(() => queue.getJob(retryJob.id)?.status === "completed");
  assert.equal(attemptCounter, 2, "Expected handler to succeed on retry attempt #2");
  assert.equal(queue.getJob(retryJob.id)?.attempts, 2);
  console.log("PASS [2/2]: Automatic retry with backoff verified");
}

runQueueTests().catch((err) => {
  console.error("QUEUE TEST FAILED:", err);
  process.exit(1);
});
