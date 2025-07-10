import { type NextRequest, NextResponse } from 'next/server';
import { SyncProgressTracker } from '~/lib/sync/progress-tracker';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params;
    const progressTracker = new SyncProgressTracker();
    const progress = await progressTracker.getProgress(artistId);

    if (!progress) {
      return NextResponse.json(
        { error: 'No sync in progress for this artist' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to get sync progress' },
      { status: 500 }
    );
  }
}
