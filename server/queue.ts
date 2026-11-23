import { EventEmitter } from "events";

export type QueueJobType = "IMPORT_STUDENTS" | "GEOCODE_BATCH" | "RECOMPUTE_COUNTS";

export interface QueueJob<T = any> {
  id: string;
  type: QueueJobType;
  payload: T;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  attempts: number;
  maxAttempts: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type JobHandler<T = any> = (
  payload: T,
  updateProgress: (pct: number) => void,
) => Promise<unknown>;

const MAX_RETAINED_JOBS = 200;

export class EnterpriseTaskQueue extends EventEmitter {
  private jobs = new Map<string, QueueJob>();
  private handlers = new Map<QueueJobType, JobHandler>();
  private activeWorkers = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 2) {
    super();
    this.maxConcurrency = Math.max(1, maxConcurrency);
  }

  registerHandler<T = any>(type: QueueJobType, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  enqueue<T>(type: QueueJobType, payload: T, maxAttempts: number = 2): QueueJob<T> {
    this.pruneOldJobs();
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: QueueJob<T> = {
      id,
      type,
      payload,
      status: "pending",
      progress: 0,
      attempts: 0,
      maxAttempts: Math.max(1, maxAttempts),
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    // Defer execution to next tick so enqueue returns immediately without blocking HTTP response
    setImmediate(() => this.processNext());
    return job;
  }

  getJob(id: string): QueueJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    // Omit raw payload in status queries to avoid leaking large/PII payloads
    const { payload: _payload, ...safeView } = job;
    return { ...safeView, payload: undefined };
  }

  listJobs(limit: number = 50): Array<Omit<QueueJob, "payload">> {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(({ payload: _payload, ...safeView }) => safeView);
  }

  private pruneOldJobs() {
    if (this.jobs.size < MAX_RETAINED_JOBS) return;
    const finished = Array.from(this.jobs.values())
      .filter((j) => j.status === "completed" || j.status === "failed")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const toRemove = finished.slice(0, Math.max(1, this.jobs.size - MAX_RETAINED_JOBS + 20));
    for (const job of toRemove) {
      this.jobs.delete(job.id);
    }
  }

  private async processNext() {
    if (this.activeWorkers >= this.maxConcurrency) return;

    const pendingJob = Array.from(this.jobs.values()).find((j) => j.status === "pending");
    if (!pendingJob) return;

    this.activeWorkers++;
    pendingJob.status = "processing";
    pendingJob.attempts += 1;
    pendingJob.startedAt = new Date();
    this.emit("job:start", pendingJob);

    try {
      const handler = this.handlers.get(pendingJob.type);
      if (!handler) {
        throw new Error(`No worker handler registered for job type '${pendingJob.type}'`);
      }

      const result = await handler(pendingJob.payload, (pct: number) => {
        pendingJob.progress = Math.max(0, Math.min(100, Math.round(pct)));
      });

      pendingJob.result = result;
      pendingJob.progress = 100;
      pendingJob.status = "completed";
      pendingJob.completedAt = new Date();
      this.emit("job:complete", pendingJob);
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (pendingJob.attempts < pendingJob.maxAttempts) {
        pendingJob.status = "pending";
        pendingJob.error = `Attempt ${pendingJob.attempts} failed: ${errMsg}`;
        const backoffMs = Math.min(5000, 250 * Math.pow(2, pendingJob.attempts - 1));
        setTimeout(() => this.processNext(), backoffMs);
      } else {
        pendingJob.status = "failed";
        pendingJob.error = errMsg;
        pendingJob.completedAt = new Date();
        this.emit("job:fail", pendingJob);
      }
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  getStats() {
    const all = Array.from(this.jobs.values());
    return {
      maxConcurrency: this.maxConcurrency,
      activeWorkers: this.activeWorkers,
      total: all.length,
      pending: all.filter((j) => j.status === "pending").length,
      processing: all.filter((j) => j.status === "processing").length,
      completed: all.filter((j) => j.status === "completed").length,
      failed: all.filter((j) => j.status === "failed").length,
    };
  }
}

const configuredConcurrency = Number(process.env.QUEUE_CONCURRENCY || "2");
export const enterpriseQueue = new EnterpriseTaskQueue(
  Number.isInteger(configuredConcurrency) && configuredConcurrency > 0 ? configuredConcurrency : 2,
);
