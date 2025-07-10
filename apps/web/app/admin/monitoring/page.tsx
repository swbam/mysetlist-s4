import MonitoringDashboard from '~/components/admin/monitoring-dashboard';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  return (
    <div className="space-y-6">
      <MonitoringDashboard />
    </div>
  );
}
