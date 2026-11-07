import { EventEmitter } from "events";

export interface QueueJob<T = any> {
  id: string;
  type: "IMPORT_STUDENTS" | "GEOCODE_BATCH" | "RECOMPUTE_COUNTS";
  payload: T;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

class EnterpriseTaskQueue extends EventEmitter {
  private jobs = new Map<string, QueueJob>();
  private activeWorkers = 0;
  private maxConcurrency = 4;

  enqueue<T>(type: QueueJob["type"], payload: T): QueueJob<T> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: QueueJob<T> = {
      id,
      type,
      payload,
      status: "pending",
      progress: 0,
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    this.processNext();
    return job;
  }

  getJob(id: string): QueueJob | undefined {
    return this.jobs.get(id);
  }

  private async processNext() {
    if (this.activeWorkers >= this.maxConcurrency) return;

    const pendingJob = Array.from(this.jobs.values()).find((j) => j.status === "pending");
    if (!pendingJob) return;

    this.activeWorkers++;
    pendingJob.status = "processing";
    this.emit("job:start", pendingJob);

    try {
      // Async worker execution simulated safely in non-blocking event loop chunks
      await new Promise((resolve) => setTimeout(resolve, 50));
      pendingJob.progress = 100;
      pendingJob.status = "completed";
      pendingJob.completedAt = new Date();
      this.emit("job:complete", pendingJob);
    } catch (err: any) {
      pendingJob.status = "failed";
      pendingJob.error = err.message || "Unknown execution error";
      this.emit("job:fail", pendingJob);
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  getStats() {
    const all = Array.from(this.jobs.values());
    return {
      total: all.length,
      pending: all.filter((j) => j.status === "pending").length,
      processing: all.filter((j) => j.status === "processing").length,
      completed: all.filter((j) => j.status === "completed").length,
      failed: all.filter((j) => j.status === "failed").length,
    };
  }
}

export const enterpriseQueue = new EnterpriseTaskQueue();
