import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// All cron schedules are consolidated in crons.ts per Convex best practices.

export default crons;