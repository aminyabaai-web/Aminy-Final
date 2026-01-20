/**
 * Health Check Dashboard
 * Displays system status, API health, and error rates
 */

import React, { useState, useEffect } from 'react';
import { getEnvStatus } from '../lib/env-validation';
import { aiCircuitBreaker } from '../lib/api-retry';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency?: number;
  lastChecked?: string;
  details?: string;
}

interface HealthMetrics {
  services: ServiceStatus[];
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
}

export function HealthDashboard(): JSX.Element {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    services: [],
    uptime: 100,
    errorRate: 0,
    avgResponseTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    setIsLoading(true);
    const services: ServiceStatus[] = [];
    const envStatus = getEnvStatus();

    // Check Supabase
    services.push(await checkSupabase(envStatus.supabase));

    // Check AI Service
    services.push(await checkAIService());

    // Check Stripe
    services.push(checkStripe(envStatus.stripe));

    // Check Daily.co
    services.push(checkDaily(envStatus.daily));

    // Check Circuit Breaker status
    const circuitStatus = aiCircuitBreaker.status;
    if (circuitStatus.isOpen) {
      const aiService = services.find(s => s.name === 'AI Service');
      if (aiService) {
        aiService.status = 'degraded';
        aiService.details = `Circuit breaker open (${circuitStatus.failures} failures)`;
      }
    }

    setMetrics({
      services,
      uptime: calculateUptime(services),
      errorRate: 0, // Would come from real metrics
      avgResponseTime: calculateAvgLatency(services),
    });

    setLastUpdated(new Date());
    setIsLoading(false);
  }

  async function checkSupabase(configured: boolean): Promise<ServiceStatus> {
    if (!configured) {
      return {
        name: 'Supabase',
        status: 'down',
        details: 'Not configured',
      };
    }

    try {
      const start = Date.now();
      const url = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${url}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const latency = Date.now() - start;

      return {
        name: 'Supabase',
        status: response.ok ? 'healthy' : 'degraded',
        latency,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'Supabase',
        status: 'down',
        details: 'Connection failed',
      };
    }
  }

  async function checkAIService(): Promise<ServiceStatus> {
    try {
      const start = Date.now();
      const url = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${url}/functions/v1/make-server-8a022548/health`,
        { method: 'GET' }
      );
      const latency = Date.now() - start;

      return {
        name: 'AI Service',
        status: response.ok ? 'healthy' : 'degraded',
        latency,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'AI Service',
        status: 'unknown',
        details: 'Could not reach service',
      };
    }
  }

  function checkStripe(configured: boolean): ServiceStatus {
    return {
      name: 'Stripe',
      status: configured ? 'healthy' : 'unknown',
      details: configured ? 'Configured' : 'Not configured',
    };
  }

  function checkDaily(configured: boolean): ServiceStatus {
    return {
      name: 'Daily.co',
      status: configured ? 'healthy' : 'unknown',
      details: configured ? 'Configured' : 'Not configured',
    };
  }

  function calculateUptime(services: ServiceStatus[]): number {
    const healthy = services.filter(s => s.status === 'healthy').length;
    return Math.round((healthy / services.length) * 100);
  }

  function calculateAvgLatency(services: ServiceStatus[]): number {
    const latencies = services.filter(s => s.latency).map(s => s.latency!);
    if (latencies.length === 0) return 0;
    return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  }

  function getStatusColor(status: ServiceStatus['status']): string {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'degraded': return '#f59e0b';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  }

  function getStatusIcon(status: ServiceStatus['status']): string {
    switch (status) {
      case 'healthy': return '✓';
      case 'degraded': return '!';
      case 'down': return '✕';
      default: return '?';
    }
  }

  return (
    <div style={{
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          System Health
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={checkHealth}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Uptime
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 700,
            color: metrics.uptime >= 90 ? '#22c55e' : metrics.uptime >= 70 ? '#f59e0b' : '#ef4444',
          }}>
            {metrics.uptime}%
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Avg Response Time
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>
            {metrics.avgResponseTime}ms
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Services
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>
            {metrics.services.filter(s => s.status === 'healthy').length}/{metrics.services.length}
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
        }}>
          Service Status
        </div>

        {metrics.services.map((service, idx) => (
          <div
            key={service.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: idx < metrics.services.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: getStatusColor(service.status),
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                {getStatusIcon(service.status)}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{service.name}</div>
                {service.details && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {service.details}
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                background: getStatusColor(service.status) + '20',
                color: getStatusColor(service.status),
                fontSize: '12px',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}>
                {service.status}
              </div>
              {service.latency !== undefined && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {service.latency}ms
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Environment Status */}
      <div style={{
        marginTop: '24px',
        padding: '16px 20px',
        background: '#f9fafb',
        borderRadius: '12px',
        fontSize: '12px',
        color: '#6b7280',
      }}>
        <strong>Environment:</strong> {import.meta.env.MODE} |{' '}
        <strong>Version:</strong> {import.meta.env.VITE_APP_VERSION || '0.1.0'}
      </div>
    </div>
  );
}

export default HealthDashboard;
