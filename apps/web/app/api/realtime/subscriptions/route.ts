import { realtimeManager } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/realtime/subscriptions - Get active subscriptions
export async function GET(_request: NextRequest) {
  try {
    const activeChannels = realtimeManager.getActiveChannels();
    const connectionStatus = realtimeManager.getConnectionStatus();

    return NextResponse.json({
      connectionStatus,
      activeChannels,
      channelCount: activeChannels.length,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 },
    );
  }
}

// POST /api/realtime/subscriptions - Manage subscriptions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, type, id } = body;

    switch (action) {
      case "subscribe":
        switch (type) {
          case "setlist": {
            if (!id) {
              return NextResponse.json(
                { error: "Show ID required for setlist subscription" },
                { status: 400 },
              );
            }

            // Note: In a real implementation, this would set up server-sent events
            // or WebSocket connections. For now, we just track the subscription.
            return NextResponse.json({
              message: `Subscribed to setlist updates for show ${id}`,
              channelName: `setlist:${id}`,
              type: "setlist",
              id,
            });
          }

          case "votes": {
            if (!id) {
              return NextResponse.json(
                { error: "Setlist song ID required for vote subscription" },
                { status: 400 },
              );
            }

            return NextResponse.json({
              message: `Subscribed to vote updates for setlist song ${id}`,
              channelName: `votes:${id}`,
              type: "votes",
              id,
            });
          }

          case "show": {
            if (!id) {
              return NextResponse.json(
                { error: "Show ID required for show subscription" },
                { status: 400 },
              );
            }

            return NextResponse.json({
              message: `Subscribed to show updates for ${id}`,
              channelName: `show:${id}`,
              type: "show",
              id,
            });
          }

          case "attendance": {
            if (!id) {
              return NextResponse.json(
                { error: "Show ID required for attendance subscription" },
                { status: 400 },
              );
            }

            return NextResponse.json({
              message: `Subscribed to attendance updates for show ${id}`,
              channelName: `attendance:${id}`,
              type: "attendance",
              id,
            });
          }

          case "artist_followers": {
            if (!id) {
              return NextResponse.json(
                { error: "Artist ID required for follower subscription" },
                { status: 400 },
              );
            }

            return NextResponse.json({
              message: `Subscribed to follower updates for artist ${id}`,
              channelName: `artist_followers:${id}`,
              type: "artist_followers",
              id,
            });
          }

          case "trending":
            return NextResponse.json({
              message: "Subscribed to trending updates",
              channelName: "trending_updates",
              type: "trending",
            });

          case "global_activity":
            return NextResponse.json({
              message: "Subscribed to global activity feed",
              channelName: "global_activity",
              type: "global_activity",
            });

          default:
            return NextResponse.json(
              { error: "Invalid subscription type" },
              { status: 400 },
            );
        }

      case "unsubscribe": {
        if (!type || !id) {
          return NextResponse.json(
            { error: "Type and ID required for unsubscription" },
            { status: 400 },
          );
        }

        const channelName = `${type}:${id}`;
        realtimeManager.unsubscribe(channelName);

        return NextResponse.json({
          message: `Unsubscribed from ${channelName}`,
          channelName,
        });
      }

      case "unsubscribe_all": {
        realtimeManager.unsubscribeAll();

        return NextResponse.json({
          message: "Unsubscribed from all channels",
        });
      }

      case "reconnect": {
        realtimeManager.reconnect();

        return NextResponse.json({
          message: "Reconnecting to realtime service",
          connectionStatus: realtimeManager.getConnectionStatus(),
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Valid actions: subscribe, unsubscribe, unsubscribe_all, reconnect",
          },
          { status: 400 },
        );
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 },
    );
  }
}

// DELETE /api/realtime/subscriptions - Cleanup subscriptions
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get("channel");

    if (channelName) {
      realtimeManager.unsubscribe(channelName);
      return NextResponse.json({
        message: `Unsubscribed from ${channelName}`,
      });
    }
    realtimeManager.unsubscribeAll();
    return NextResponse.json({
      message: "Unsubscribed from all channels",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
