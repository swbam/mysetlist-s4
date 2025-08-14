import MonitoringDashboard from "~/components/admin/monitoring-dashboard";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-2xl md:text-3xl">System Monitoring</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Monitor system health, performance, and real-time metrics
        </p>
      </div>
      <MonitoringDashboard />
    </div>
  );
}
