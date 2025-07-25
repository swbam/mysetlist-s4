import { type NextRequest, NextResponse } from 'next/server';
import { 
  initializePipelineEngine,
  addPipelineJob,
  getPipelineMetrics,
  getPipelineStatus,
  pausePipeline,
  resumePipeline,
  cleanPipeline
} from '~/lib/data-pipeline/pipeline-engine';
import { createServiceClient } from '~/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Check if request is authorized for pipeline management
function isAuthorizedPipelineRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const pipelineSecret = process.env['PIPELINE_SECRET'] || process.env['CRON_SECRET'];

  if (!pipelineSecret) {
    return false;
  }

  return authHeader === `Bearer ${pipelineSecret}`;
}

// GET: Get pipeline status and metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pipelineId = searchParams.get('pipelineId');
    const type = searchParams.get('type') || 'status';
    
    // Initialize pipeline engine if not already done
    await initializePipelineEngine();

    switch (type) {
      case 'status':
        if (pipelineId) {
          const status = await getPipelineStatus(pipelineId);
          return NextResponse.json({
            success: true,
            pipelineId,
            status,
            timestamp: new Date().toISOString()
          });
        } else {
          // Get all pipeline statuses
          const supabase = createServiceClient();
          const { data: pipelines } = await supabase
            .from('pipeline_configs')
            .select('id, name, active')
            .eq('active', true);

          const statuses = await Promise.all(
            (pipelines || []).map(async (pipeline) => {
              try {
                const status = await getPipelineStatus(pipeline.id);
                return {
                  id: pipeline.id,
                  name: pipeline.name,
                  ...status
                };
              } catch (error) {
                return {
                  id: pipeline.id,
                  name: pipeline.name,
                  active: false,
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            })
          );

          return NextResponse.json({
            success: true,
            pipelines: statuses,
            timestamp: new Date().toISOString()
          });
        }

      case 'metrics':
        const metrics = await getPipelineMetrics(pipelineId || undefined);
        return NextResponse.json({
          success: true,
          metrics,
          timestamp: new Date().toISOString()
        });

      case 'health':
        // Check overall pipeline health
        const healthStatus = {
          pipelineEngine: 'healthy',
          redis: 'healthy',
          database: 'healthy',
          totalPipelines: 0,
          activePipelines: 0,
          failedPipelines: 0
        };

        try {
          const supabase = createServiceClient();
          const { data: pipelineConfigs } = await supabase
            .from('pipeline_configs')
            .select('id, active');

          healthStatus.totalPipelines = pipelineConfigs?.length || 0;
          healthStatus.activePipelines = pipelineConfigs?.filter(p => p.active).length || 0;
        } catch (error) {
          healthStatus.database = 'unhealthy';
        }

        return NextResponse.json({
          success: true,
          health: healthStatus,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch pipeline data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Add job to pipeline or manage pipeline operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, pipelineId, data, options } = body;

    if (!pipelineId) {
      return NextResponse.json(
        { error: 'pipelineId is required' },
        { status: 400 }
      );
    }

    // Initialize pipeline engine if not already done
    await initializePipelineEngine();

    switch (action) {
      case 'add_job':
        if (!data) {
          return NextResponse.json(
            { error: 'data is required for add_job action' },
            { status: 400 }
          );
        }

        const jobId = await addPipelineJob(pipelineId, data, options);
        return NextResponse.json({
          success: true,
          jobId,
          message: 'Job added to pipeline successfully',
          timestamp: new Date().toISOString()
        });

      case 'pause':
        if (!isAuthorizedPipelineRequest(request)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await pausePipeline(pipelineId);
        return NextResponse.json({
          success: true,
          message: 'Pipeline paused successfully',
          timestamp: new Date().toISOString()
        });

      case 'resume':
        if (!isAuthorizedPipelineRequest(request)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await resumePipeline(pipelineId);
        return NextResponse.json({
          success: true,
          message: 'Pipeline resumed successfully',
          timestamp: new Date().toISOString()
        });

      case 'clean':
        if (!isAuthorizedPipelineRequest(request)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await cleanPipeline(pipelineId);
        return NextResponse.json({
          success: true,
          message: 'Pipeline cleaned successfully',
          timestamp: new Date().toISOString()
        });

      case 'bulk_add':
        if (!Array.isArray(data)) {
          return NextResponse.json(
            { error: 'data must be an array for bulk_add action' },
            { status: 400 }
          );
        }

        const jobIds = await Promise.all(
          data.map(item => addPipelineJob(pipelineId, item, options))
        );

        return NextResponse.json({
          success: true,
          jobIds,
          count: jobIds.length,
          message: 'Bulk jobs added to pipeline successfully',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Pipeline POST error:', error);
    return NextResponse.json(
      { 
        error: 'Pipeline operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT: Update pipeline configuration
export async function PUT(request: NextRequest) {
  try {
    if (!isAuthorizedPipelineRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pipelineId, config } = body;

    if (!pipelineId || !config) {
      return NextResponse.json(
        { error: 'pipelineId and config are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    
    // Update pipeline configuration
    const { data: updatedConfig, error: updateError } = await supabase
      .from('pipeline_configs')
      .update({
        ...config,
        updated_at: new Date().toISOString()
      })
      .eq('id', pipelineId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Pipeline configuration updated successfully',
      config: updatedConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pipeline PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update pipeline configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete pipeline
export async function DELETE(request: NextRequest) {
  try {
    if (!isAuthorizedPipelineRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const pipelineId = searchParams.get('pipelineId');

    if (!pipelineId) {
      return NextResponse.json(
        { error: 'pipelineId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    
    // First, pause the pipeline
    try {
      await pausePipeline(pipelineId);
    } catch (error) {
      console.warn('Failed to pause pipeline before deletion:', error);
    }

    // Delete pipeline configuration
    const { error: deleteError } = await supabase
      .from('pipeline_configs')
      .delete()
      .eq('id', pipelineId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Pipeline deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pipeline DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete pipeline',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}