import { NextResponse } from 'next/server';
import { testInfrastructure, healthCheck, verifyEnvironment } from '../../../../lib/test-infrastructure';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'full';
    
    if (testType === 'health') {
      const healthy = await healthCheck();
      return NextResponse.json({
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
    
    if (testType === 'env') {
      const envCheck = verifyEnvironment();
      return NextResponse.json({
        environment: envCheck,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Full infrastructure test
    const results = await testInfrastructure();
    
    return NextResponse.json({
      success: results.redis && results.queues && results.progressBus && results.concurrency,
      results,
      environment: verifyEnvironment(),
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Infrastructure test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    error: 'Method not allowed',
  }, { status: 405 });
}