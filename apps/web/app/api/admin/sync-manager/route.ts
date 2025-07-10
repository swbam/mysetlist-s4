import { type NextRequest, NextResponse } from 'next/server';
import { SyncScheduler } from '~/lib/api/external-apis';

const syncScheduler = new SyncScheduler();

// GET /api/admin/sync-manager - Get sync job status and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job details
      const job = syncScheduler.getJob(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ job });
    }
    // Get all jobs and overall statistics
    const jobs = syncScheduler.getAllJobs();
    const stats = syncScheduler.getJobStats();
    const health = syncScheduler.getHealthStatus();

    return NextResponse.json({
      jobs,
      stats,
      health,
      isRunning: stats.runningJobs > 0,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/sync-manager - Control sync jobs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, schedule } = body;

    switch (action) {
      case 'start': {
        await syncScheduler.startScheduler();
        return NextResponse.json({
          message: 'Sync scheduler started',
          jobs: syncScheduler.getAllJobs(),
        });
      }

      case 'stop': {
        await syncScheduler.stopScheduler();
        return NextResponse.json({
          message: 'Sync scheduler stopped',
        });
      }

      case 'run_now': {
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required for run_now action' },
            { status: 400 }
          );
        }
        await syncScheduler.runJobNow(jobId);
        return NextResponse.json({
          message: `Job ${jobId} executed`,
          job: syncScheduler.getJob(jobId),
        });
      }

      case 'enable': {
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required for enable action' },
            { status: 400 }
          );
        }
        const enableSuccess = syncScheduler.enableJob(jobId);
        if (!enableSuccess) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        return NextResponse.json({
          message: `Job ${jobId} enabled`,
          job: syncScheduler.getJob(jobId),
        });
      }

      case 'disable': {
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required for disable action' },
            { status: 400 }
          );
        }
        const disableSuccess = syncScheduler.disableJob(jobId);
        if (!disableSuccess) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        return NextResponse.json({
          message: `Job ${jobId} disabled`,
          job: syncScheduler.getJob(jobId),
        });
      }

      case 'update_schedule': {
        if (!jobId || !schedule) {
          return NextResponse.json(
            {
              error: 'Job ID and schedule required for update_schedule action',
            },
            { status: 400 }
          );
        }
        const updateSuccess = syncScheduler.updateJobSchedule(jobId, schedule);
        if (!updateSuccess) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        return NextResponse.json({
          message: `Job ${jobId} schedule updated`,
          job: syncScheduler.getJob(jobId),
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              'Invalid action. Valid actions: start, stop, run_now, enable, disable, update_schedule',
          },
          { status: 400 }
        );
    }
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to control sync manager' },
      { status: 500 }
    );
  }
}
