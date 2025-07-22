'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  details?: any;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export default function HealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health/comprehensive');
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (loading && !health) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Health Check Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={fetchHealth}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Overall System Status
            {getStatusIcon(health.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(health.status)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-mono text-sm mt-1">
                {health.version.substring(0, 8) || 'development'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Services</p>
              <div className="flex gap-2 mt-1">
                <span className="text-sm">
                  <span className="text-green-500">{health.summary.healthy}</span> healthy
                </span>
                {health.summary.degraded > 0 && (
                  <span className="text-sm">
                    <span className="text-yellow-500">{health.summary.degraded}</span> degraded
                  </span>
                )}
                {health.summary.unhealthy > 0 && (
                  <span className="text-sm">
                    <span className="text-red-500">{health.summary.unhealthy}</span> unhealthy
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Response Time</p>
              <p className="font-mono text-sm mt-1">{health.uptime}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {health.checks.map((check) => (
          <Card
            key={check.service}
            className={
              check.status === 'unhealthy'
                ? 'border-destructive'
                : check.status === 'degraded'
                ? 'border-warning'
                : ''
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="capitalize">{check.service.replace(/_/g, ' ')}</span>
                {getStatusIcon(check.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(check.status)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Response Time</span>
                  <span className="font-mono text-sm">{check.responseTime}ms</span>
                </div>
                {check.error && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-destructive">{check.error}</p>
                  </div>
                )}
                {check.details && (
                  <div className="pt-2 border-t">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Basic Health Check
            </a>
            <a
              href="/api/health/db"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Database Health
            </a>
            <a
              href="/api/trending/test"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Test Trending API
            </a>
            <a
              href="/api/external-apis/diagnostics"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              External APIs
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Node Version</p>
              <p className="font-mono text-sm">{process.version}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Environment</p>
              <p className="font-mono text-sm">{process.env.NODE_ENV || 'development'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Site URL</p>
              <p className="font-mono text-sm truncate">
                {process.env.NEXT_PUBLIC_SITE_URL || 'Not configured'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deployment</p>
              <p className="font-mono text-sm">
                {process.env.VERCEL ? 'Vercel' : 'Local'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}