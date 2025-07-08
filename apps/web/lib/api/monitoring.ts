export class MonitoringService {
  private static instance: MonitoringService;

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  log(message: string, data?: any) {
    console.log(`[Monitor] ${message}`, data);
  }

  error(message: string, error: any) {
    console.error(`[Monitor Error] ${message}`, error);
  }

  metric(name: string, value: number) {
    console.log(`[Metric] ${name}: ${value}`);
  }

  startTimer(name: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.metric(`${name}_duration_ms`, duration);
    };
  }

  async trackAnalytics(event: string, properties?: Record<string, any>) {
    console.log(`[Analytics] ${event}`, properties);
  }
}

export const monitor = {
  log: (message: string, data?: any) => {
    console.log(`[Monitor] ${message}`, data);
  },
  error: (message: string, error: any) => {
    console.error(`[Monitor Error] ${message}`, error);
  },
  metric: (name: string, value: number) => {
    console.log(`[Metric] ${name}: ${value}`);
  },
};
