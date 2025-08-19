import QueueHealthDashboard from "./components/queue-health-dashboard";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

export default async function QueuesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-2xl md:text-3xl">Queue Management</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Monitor and manage BullMQ job queues and worker health
        </p>
      </div>
      <QueueHealthDashboard />
    </div>
  );
}