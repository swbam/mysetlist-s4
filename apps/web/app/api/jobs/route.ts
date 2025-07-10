import { NextRequest, NextResponse } from 'next/server';
import { backgroundJobQueue, scheduleJob, getJobStatus, JobType } from '~/lib/background-jobs';
import { monitor } from '~/lib/api/monitoring';

// GET /api/jobs - Get job status or queue statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('id');
    
    if (jobId) {
      // Get specific job status
      const job = await getJobStatus(jobId);
      
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        job,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get queue statistics
    const stats = await backgroundJobQueue.getQueueStats();
    
    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    monitor.error('Error getting job status', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Schedule a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, priority, scheduledAt, maxAttempts } = body;
    
    // Validate job type
    const validJobTypes: JobType[] = [
      'email_notification',
      'data_sync',
      'image_processing',
      'analytics_processing',
      'cache_warming',
      'cleanup',
      'trending_calculation',
      'user_activity_analysis'
    ];
    
    if (!validJobTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid job type' },
        { status: 400 }
      );
    }
    
    // Validate required data
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Job data is required' },
        { status: 400 }
      );
    }
    
    // Schedule the job
    const options: any = {
      priority: priority || 'medium',
    };
    
    if (scheduledAt) {
      options.scheduledAt = new Date(scheduledAt);
    }
    
    if (maxAttempts) {
      options.maxAttempts = maxAttempts;
    }
    
    const jobId = await scheduleJob(type, data, options);
    
    monitor.log('Job scheduled via API', {
      jobId,
      type,
      priority,
      scheduledAt
    });
    
    return NextResponse.json({
      jobId,
      message: 'Job scheduled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    monitor.error('Error scheduling job', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/jobs/:id - Update job (cancel, retry, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, action } = body;
    
    if (!jobId || !action) {
      return NextResponse.json(
        { error: 'Job ID and action are required' },
        { status: 400 }
      );
    }
    
    const job = await getJobStatus(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    switch (action) {
      case 'cancel':
        if (job.status === 'pending') {
          // Cancel pending job
          job.status = 'cancelled';
          job.updatedAt = new Date();
          
          // Remove from queue and update cache
          const cache = backgroundJobQueue['cache'];
          await cache.pipeline([
            ['ZREM', 'job_queue', jobId],
            ['SET', `job:${jobId}`, JSON.stringify(job)]
          ]);
          
          monitor.log('Job cancelled', { jobId, type: job.type });
          
          return NextResponse.json({
            message: 'Job cancelled successfully',
            job
          });
        } else {
          return NextResponse.json(
            { error: 'Job cannot be cancelled in current state' },
            { status: 400 }
          );
        }
        
      case 'retry':
        if (job.status === 'failed') {
          // Retry failed job
          job.status = 'pending';
          job.attempts = 0;
          job.scheduledAt = new Date();
          job.updatedAt = new Date();
          delete job.error;
          
          // Re-add to queue
          const score = Date.now() + (job.priority === 'high' ? -1000 : job.priority === 'medium' ? -500 : -100);
          const cache = backgroundJobQueue['cache'];
          await cache.pipeline([
            ['SET', `job:${jobId}`, JSON.stringify(job)],
            ['ZADD', 'job_queue', score, jobId]
          ]);
          
          monitor.log('Job retried', { jobId, type: job.type });
          
          return NextResponse.json({
            message: 'Job retried successfully',
            job
          });
        } else {
          return NextResponse.json(
            { error: 'Job cannot be retried in current state' },
            { status: 400 }
          );
        }
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    monitor.error('Error updating job', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/:id - Delete job
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('id');
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    const job = await getJobStatus(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Only allow deletion of completed, failed, or cancelled jobs
    if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Job cannot be deleted in current state' },
        { status: 400 }
      );
    }
    
    // Delete job from cache
    const cache = backgroundJobQueue['cache'];
    await cache.pipeline([
      ['DEL', `job:${jobId}`],
      ['ZREM', 'job_queue', jobId]
    ]);
    
    monitor.log('Job deleted', { jobId, type: job.type });
    
    return NextResponse.json({
      message: 'Job deleted successfully'
    });
  } catch (error) {
    monitor.error('Error deleting job', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}