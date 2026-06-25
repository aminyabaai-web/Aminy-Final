'use client';

/**
 * Clinic Dashboard Component
 *
 * Multi-location clinic management dashboard for ABA providers.
 * Provides overview of clients, providers, utilization, and revenue.
 */

import React, { useState, useEffect } from 'react';
import {
  clinicManagement,
  Clinic,
  ClinicLocation,
  Provider,
  Client,
  ClinicStats,
  ProviderStats,
} from '@/lib/clinic-management';

// ============================================================================
// Types
// ============================================================================

interface ClinicDashboardProps {
  clinicId: string;
  userId: string;
  className?: string;
}

type ActiveTab = 'overview' | 'providers' | 'clients' | 'locations' | 'settings';

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-[#3A4A57]';
    case 'inactive':
    case 'suspended':
      return 'bg-red-100 text-red-800';
    case 'waitlist':
      return 'bg-blue-100 text-[#4A6478]';
    default:
      return 'bg-[#F0EDE8] text-[#1B2733]';
  }
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    bcba: 'BCBA',
    bcaba: 'BCaBA',
    rbt: 'RBT',
    slp: 'SLP',
    ot: 'OT',
    mental_health: 'MH',
    admin: 'Admin',
  };
  return labels[role] || role.toUpperCase();
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DF] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#5A6B7A]">{label}</span>
        <div className="p-2 bg-indigo-50 rounded-lg text-[#6B9080]">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-[#1B2733]">{value}</div>
      {subtitle && <p className="text-sm text-[#5A6B7A] mt-1">{subtitle}</p>}
      {trend && (
        <p className={`text-sm mt-2 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  );
}

function UtilizationBar({
  label,
  used,
  total,
  color = 'bg-indigo-500',
}: {
  label: string;
  used: number;
  total: number;
  color?: string;
}) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const isOverUtilized = percentage > 100;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[#3A4A57]">{label}</span>
        <span className="text-sm text-[#5A6B7A]">
          {used.toFixed(1)} / {total.toFixed(1)} hrs ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-[#F0EDE8] rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${isOverUtilized ? 'bg-red-500' : color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  stats,
  onClick,
}: {
  provider: Provider;
  stats?: ProviderStats;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E8E4DF] p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-[#6B9080] font-semibold">
          {provider.firstName[0]}{provider.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#1B2733] truncate">
              {provider.firstName} {provider.lastName}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(provider.status)}`}>
              {provider.status}
            </span>
          </div>
          <p className="text-sm text-[#5A6B7A]">{getRoleLabel(provider.role)}</p>
          {provider.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {provider.specialties.slice(0, 3).map(s => (
                <span key={s} className="px-2 py-0.5 text-xs bg-[#F0EDE8] text-[#5A6B7A] rounded">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-[#1B2733]">{stats.activeClients}</div>
            <div className="text-sm text-[#5A6B7A]">Clients</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-[#1B2733]">{formatPercent(stats.utilizationRate)}</div>
            <div className="text-sm text-[#5A6B7A]">Utilization</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              stats.credentialsStatus === 'current' ? 'text-green-600' :
              stats.credentialsStatus === 'expiring_soon' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {stats.credentialsStatus === 'current' ? '✓' : stats.credentialsStatus === 'expiring_soon' ? '!' : '✗'}
            </div>
            <div className="text-sm text-[#5A6B7A]">Credentials</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientCard({
  client,
  onClick,
}: {
  client: Client;
  onClick: () => void;
}) {
  const auth = client.authorizedHours;
  const totalAuthorized = auth
    ? auth.assessmentHours + auth.directHours + auth.supervisionHours + auth.parentTrainingHours
    : 0;
  const totalUsed = auth
    ? auth.usedAssessment + auth.usedDirect + auth.usedSupervision + auth.usedParentTraining
    : 0;
  const utilizationPercent = totalAuthorized > 0 ? (totalUsed / totalAuthorized) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E8E4DF] p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-[#1B2733]">Client #{client.id.slice(0, 8)}</h3>
          <p className="text-sm text-[#5A6B7A]">
            {client.assignedProviders.length} provider{client.assignedProviders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className={`px-2 py-1 text-sm font-medium rounded ${getStatusColor(client.status)}`}>
          {client.status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#5A6B7A]">Hours Utilized</span>
          <span className={`font-medium ${utilizationPercent > 80 ? 'text-orange-600' : 'text-[#1B2733]'}`}>
            {totalUsed.toFixed(1)} / {totalAuthorized.toFixed(1)}
          </span>
        </div>
        <div className="w-full bg-[#F0EDE8] rounded-full h-2">
          <div
            className={`h-2 rounded-full ${utilizationPercent > 90 ? 'bg-red-500' : utilizationPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
        </div>
      </div>

      {auth && auth.periodEnd && (
        <p className="text-sm text-[#8A9BA8] mt-3">
          Auth expires: {new Date(auth.periodEnd).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function LocationCard({
  location,
  onClick,
}: {
  location: ClinicLocation;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E8E4DF] p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-[#1B2733]">{location.name}</h3>
          {location.isPrimary && (
            <span className="text-sm text-[#6B9080] font-medium">Primary Location</span>
          )}
        </div>
        <span className={`px-2 py-1 text-sm font-medium rounded ${location.isActive ? 'bg-green-100 text-green-800' : 'bg-[#F0EDE8] text-[#1B2733]'}`}>
          {location.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <p className="text-sm text-[#5A6B7A] mt-2">
        {location.address.street}<br />
        {location.address.city}, {location.address.state} {location.address.zip}
      </p>

      {location.phone && (
        <p className="text-sm text-[#5A6B7A] mt-2">{location.phone}</p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ClinicDashboard({
  clinicId,
  userId,
  className = '',
}: ClinicDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerStats, setProviderStats] = useState<Record<string, ProviderStats>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<ClinicLocation[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [clinicData, statsData, providersData, clientsData, locationsData] = await Promise.all([
          clinicManagement.getClinic(clinicId),
          clinicManagement.getClinicStats(clinicId),
          clinicManagement.getClinicProviders(clinicId),
          clinicManagement.getClinicClients(clinicId),
          clinicManagement.getClinicLocations(clinicId),
        ]);

        setClinic(clinicData);
        setStats(statsData);
        setProviders(providersData);
        setClients(clientsData);
        setLocations(locationsData);

        // Load provider stats
        const statsMap: Record<string, ProviderStats> = {};
        for (const provider of providersData.slice(0, 10)) {
          const pStats = await clinicManagement.getProviderStats(provider.id);
          if (pStats) {
            statsMap[provider.id] = pStats;
          }
        }
        setProviderStats(statsMap);
      } catch (error) {
        console.error('Failed to load clinic data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [clinicId]);

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="h-12 bg-[#E8E4DF] rounded-lg w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#E8E4DF] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-[#5A6B7A]">Clinic not found</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'providers', label: 'Providers', icon: '👥', count: providers.length },
    { id: 'clients', label: 'Clients', icon: '👨‍👩‍👧', count: clients.length },
    { id: 'locations', label: 'Locations', icon: '📍', count: locations.length },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {clinic.logo && (
            <img src={clinic.logo} alt={clinic.name} className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#1B2733]">{clinic.name}</h1>
            <p className="text-sm text-[#5A6B7A]">{clinic.tier.charAt(0).toUpperCase() + clinic.tier.slice(1)} Plan</p>
          </div>
          <span className={`ml-auto px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(clinic.status)}`}>
            {clinic.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E8E4DF] mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-[#6B9080]'
                  : 'border-transparent text-[#5A6B7A] hover:text-[#3A4A57]'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-[#F0EDE8] text-[#5A6B7A] rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Clients"
              value={stats.activeClients}
              subtitle={`${stats.waitlistClients} on waitlist`}
              icon={<span className="text-xl">👨‍👩‍👧</span>}
              trend="+5 this month"
              trendUp={true}
            />
            <StatCard
              label="Active Providers"
              value={stats.activeProviders}
              subtitle={`${stats.totalProviders} total`}
              icon={<span className="text-xl">👥</span>}
            />
            <StatCard
              label="Monthly Revenue"
              value={formatCurrency(stats.monthlyRevenue)}
              icon={<span className="text-xl">💰</span>}
              trend="+12% vs last month"
              trendUp={true}
            />
            <StatCard
              label="Hours Utilization"
              value={formatPercent(stats.hoursUtilization.percentage)}
              subtitle={`${stats.hoursUtilization.used.toFixed(0)} / ${stats.hoursUtilization.authorized.toFixed(0)} hrs`}
              icon={<span className="text-xl">📈</span>}
            />
          </div>

          {/* Utilization Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h3 className="text-lg font-semibold text-[#1B2733] mb-4">Provider Utilization</h3>
              {providers.slice(0, 5).map(provider => {
                const pStats = providerStats[provider.id];
                return (
                  <UtilizationBar
                    key={provider.id}
                    label={`${provider.firstName} ${provider.lastName}`}
                    used={pStats?.billableHours || 0}
                    total={160}
                    color="bg-indigo-500"
                  />
                );
              })}
            </div>

            <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
              <h3 className="text-lg font-semibold text-[#1B2733] mb-4">Upcoming Expirations</h3>
              <div className="space-y-3">
                {providers
                  .filter(p => providerStats[p.id]?.credentialsStatus !== 'current')
                  .slice(0, 5)
                  .map(provider => {
                    const pStats = providerStats[provider.id];
                    return (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-3 bg-[#FDF9F0] rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-[#1B2733]">
                            {provider.firstName} {provider.lastName}
                          </p>
                          <p className="text-sm text-[#5A6B7A]">{getRoleLabel(provider.role)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-yellow-600 font-medium">
                            {pStats?.credentialsStatus === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
                          </span>
                          {pStats?.upcomingExpiration && (
                            <p className="text-sm text-[#5A6B7A]">
                              {pStats.upcomingExpiration.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {providers.filter(p => providerStats[p.id]?.credentialsStatus !== 'current').length === 0 && (
                  <p className="text-sm text-[#5A6B7A] text-center py-4">
                    All credentials are current
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
            <h3 className="text-lg font-semibold text-[#1B2733] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center gap-2 p-4 border border-[#E8E4DF] rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <span className="text-2xl">➕</span>
                <span className="text-sm font-medium text-[#3A4A57]">Add Client</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 border border-[#E8E4DF] rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <span className="text-2xl">👤</span>
                <span className="text-sm font-medium text-[#3A4A57]">Add Provider</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 border border-[#E8E4DF] rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <span className="text-2xl">📄</span>
                <span className="text-sm font-medium text-[#3A4A57]">Generate Report</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 border border-[#E8E4DF] rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <span className="text-2xl">📊</span>
                <span className="text-sm font-medium text-[#3A4A57]">View Analytics</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Providers Tab */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1B2733]">Providers</h2>
              <p className="text-sm text-[#5A6B7A]">{providers.length} total providers</p>
            </div>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#216982] transition-colors">
              Add Provider
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                stats={providerStats[provider.id]}
                onClick={() => setSelectedProvider(provider)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1B2733]">Clients</h2>
              <p className="text-sm text-[#5A6B7A]">
                {clients.filter(c => c.status === 'active').length} active,{' '}
                {clients.filter(c => c.status === 'waitlist').length} on waitlist
              </p>
            </div>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#216982] transition-colors">
              Add Client
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => setSelectedClient(client)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1B2733]">Locations</h2>
              <p className="text-sm text-[#5A6B7A]">{locations.length} locations</p>
            </div>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#216982] transition-colors">
              Add Location
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map(location => (
              <LocationCard
                key={location.id}
                location={location}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && clinic && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
            <h3 className="text-lg font-semibold text-[#1B2733] mb-4">Clinic Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-[#1B2733]">Provider Self-Onboarding</p>
                  <p className="text-sm text-[#5A6B7A]">Allow providers to complete onboarding themselves</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clinic.settings.allowProviderSelfOnboard}
                    className="sr-only peer"
                    readOnly
                  />
                  <div className="w-11 h-6 bg-[#E8E4DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E8E4DF] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B9080]" />
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-[#1B2733]">Session Approval Required</p>
                  <p className="text-sm text-[#5A6B7A]">Require supervisor approval for session notes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clinic.settings.requireSessionApproval}
                    className="sr-only peer"
                    readOnly
                  />
                  <div className="w-11 h-6 bg-[#E8E4DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E8E4DF] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B9080]" />
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-[#1B2733]">Electronic Visit Verification (EVV)</p>
                  <p className="text-sm text-[#5A6B7A]">Enable GPS-based session verification</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clinic.settings.enableEVV}
                    className="sr-only peer"
                    readOnly
                  />
                  <div className="w-11 h-6 bg-[#E8E4DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E8E4DF] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B9080]" />
                </label>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-[#1B2733]">Auto-Generate Reports</p>
                  <p className="text-sm text-[#5A6B7A]">Automatically generate progress reports</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={clinic.settings.reportFrequency}
                    className="px-3 py-1.5 border border-[#E8E4DF] rounded-lg text-sm"
                    disabled
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clinic.settings.autoGenerateReports}
                      className="sr-only peer"
                      readOnly
                    />
                    <div className="w-11 h-6 bg-[#E8E4DF] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E8E4DF] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6B9080]" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E8E4DF] p-6">
            <h3 className="text-lg font-semibold text-[#1B2733] mb-4">Insurance Credentials</h3>
            {clinic.settings.insuranceCredentials.length > 0 ? (
              <div className="space-y-3">
                {clinic.settings.insuranceCredentials.map((cred, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg">
                    <div>
                      <p className="font-medium text-[#1B2733]">{cred.insurerName}</p>
                      <p className="text-sm text-[#5A6B7A]">Contract: {cred.contractNumber || 'N/A'}</p>
                    </div>
                    <span className={`px-2 py-1 text-sm font-medium rounded ${getStatusColor(cred.status)}`}>
                      {cred.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#5A6B7A] text-center py-4">
                No insurance credentials configured
              </p>
            )}
            <button className="mt-4 w-full py-2 border border-[#E8E4DF] rounded-lg text-sm font-medium text-[#3A4A57] hover:bg-[#FAF7F2] transition-colors">
              Add Insurance Credential
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicDashboard;
