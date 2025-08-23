// Minimal Cleanup Processor stub
import { Job } from "bullmq";

export default class CleanupProcessor {
  static async process(job: Job): Promise<any> {
    return { success: true, jobId: job.id };
  }
}


