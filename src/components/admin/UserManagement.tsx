// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * UserManagement.tsx
 *
 * Admin dashboard component for managing users.
 * Features:
 * - User search and filtering
 * - Profile, activity, and billing views
 * - Admin actions (tier change, suspension)
 * - User impersonation for support debugging
 * - Bulk operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Users,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CreditCard,
  Activity,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  UserX,
  UserCheck,
  RefreshCw,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  MessageSquare,
  Crown,
  Star,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { tierPricing } from '../../lib/tier-utils';

// Types
interface ManagedUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  tier: 'free' | 'starter' | 'core' | 'pro' | 'proplus';
  status: 'active' | 'suspended' | 'churned' | 'trial';
  createdAt: string;
  lastActiveAt: string;
  childCount: number;
  totalSessions: number;
  totalSpent: number;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';
  avatar?: string;
  flags: string[];
}

interface UserFilters {
  search: string;
  tier: string;
  status: string;
  dateRange: string;
}

// Tier configuration
const TIER_CONFIG = {
  free: { label: 'Free', color: 'bg-neutral-100 text-neutral-700', icon: User },
  starter: { label: 'Starter', color: 'bg-blue-100 text-blue-700', icon: Star },
  core: { label: 'Core', color: 'bg-purple-100 text-purple-700', icon: Crown },
  pro: { label: 'Pro', color: 'bg-amber-100 text-amber-700', icon: Crown },
  proplus: { label: 'Pro+', color: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800', icon: Crown },
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: XCircle },
  churned: { label: 'Churned', color: 'bg-neutral-100 text-[#5A6B7A]', icon: UserX },
  trial: { label: 'Trial', color: 'bg-blue-100 text-blue-700', icon: Clock },
};

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    tier: 'all',
    status: 'all',
    dateRange: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    paidUsers: 0,
    mrr: 0,
  });

  // Load users from Supabase
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          phone,
          created_at,
          last_active_at,
          tier,
          status,
          subscription_status,
          avatar_url
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading users:', error);
      }

      if (profilesData && profilesData.length > 0) {
        const mappedUsers: ManagedUser[] = profilesData.map(p => ({
          id: p.id,
          email: p.email || '',
          name: p.name || 'Unknown User',
          phone: p.phone,
          tier: p.tier || 'free',
          status: p.status || 'active',
          createdAt: p.created_at,
          lastActiveAt: p.last_active_at || p.created_at,
          childCount: 0,
          totalSessions: 0,
          totalSpent: 0,
          subscriptionStatus: p.subscription_status || 'none',
          avatar: p.avatar_url,
          flags: [],
        }));
        setUsers(mappedUsers);
        setFilteredUsers(mappedUsers);

        // Calculate stats
        setStats({
          totalUsers: mappedUsers.length,
          activeUsers: mappedUsers.filter(u => u.status === 'active').length,
          paidUsers: mappedUsers.filter(u => u.tier !== 'free').length,
          mrr: mappedUsers.reduce((sum, u) => {
            const prices = { free: tierPricing.free.monthly, starter: tierPricing.starter.monthly, core: tierPricing.core.monthly, pro: tierPricing.pro.monthly, proplus: tierPricing.proplus.monthly };
            return sum + (prices[u.tier] || 0);
          }, 0),
        });
      } else {
        // No users found - show empty state
        setUsers([]);
        setFilteredUsers([]);
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          paidUsers: 0,
          mrr: 0,
        });
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Apply filters
  useEffect(() => {
    let result = users;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        u =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    if (filters.tier !== 'all') {
      result = result.filter(u => u.tier === filters.tier);
    }

    if (filters.status !== 'all') {
      result = result.filter(u => u.status === filters.status);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (filters.dateRange) {
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(now.getDate() - 90);
          break;
      }
      result = result.filter(u => new Date(u.createdAt) >= cutoff);
    }

    setFilteredUsers(result);
  }, [users, filters]);

  // Admin actions
  const handleChangeTier = async (userId: string, newTier: ManagedUser['tier']) => {
    setActionLoading(`tier-${userId}`);
    try {
      await supabase
        .from('profiles')
        .update({ tier: newTier })
        .eq('id', userId);

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, tier: newTier } : u))
      );
    } catch (error) {
      console.error('Failed to change tier:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    setActionLoading(`suspend-${userId}`);
    try {
      await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', userId);

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, status: 'suspended' } : u))
      );
    } catch (error) {
      console.error('Failed to suspend user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    setActionLoading(`reactivate-${userId}`);
    try {
      await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId);

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, status: 'active' } : u))
      );
    } catch (error) {
      console.error('Failed to reactivate user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = (userId: string) => {
    // In production, this would create an impersonation session
    if (import.meta.env.DEV) console.log('Impersonating user:', userId);
    toast.success(`Impersonation mode enabled for user ${userId}`, {
      description: 'In production, this would allow viewing the app as this user.',
    });
  };

  const handleExportUsers = () => {
    const csv = [
      ['ID', 'Name', 'Email', 'Tier', 'Status', 'Created', 'Last Active', 'Total Spent'].join(','),
      ...filteredUsers.map(u =>
        [
          u.id,
          u.name,
          u.email,
          u.tier,
          u.status,
          new Date(u.createdAt).toLocaleDateString(),
          new Date(u.lastActiveAt).toLocaleDateString(),
          u.totalSpent.toFixed(2),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aminy-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1B2733] dark:text-white">User Management</h2>
          <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
            {filteredUsers.length} users {filters.search || filters.tier !== 'all' || filters.status !== 'all' ? '(filtered)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportUsers}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.totalUsers}</p>
              <p className="text-sm text-[#5A6B7A]">Total Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.activeUsers}</p>
              <p className="text-xs text-[#5A6B7A]">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">{stats.paidUsers}</p>
              <p className="text-xs text-[#5A6B7A]">Paid Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B2733] dark:text-white">${stats.mrr.toFixed(0)}</p>
              <p className="text-xs text-[#5A6B7A]">Est. MRR</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filters.tier}
              onChange={e => setFilters(prev => ({ ...prev, tier: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="core">Core</option>
              <option value="pro">Pro</option>
              <option value="proplus">Pro+</option>
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="churned">Churned</option>
            </select>
            <select
              value={filters.dateRange}
              onChange={e => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </Card>

      {/* User List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#6B9080]" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-12">
            <Users className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
            <p className="text-[#5A6B7A]">No users found matching your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#5A6B7A] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-700">
                {filteredUsers.map(user => {
                  const tierConfig = TIER_CONFIG[user.tier];
                  const statusConfig = STATUS_CONFIG[user.status];
                  const TierIcon = tierConfig.icon;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white font-medium">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-[#1B2733] dark:text-white">{user.name}</p>
                            <p className="text-sm text-[#5A6B7A]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={`${tierConfig.color} border-0`}>
                          <TierIcon className="w-3 h-3 mr-1" />
                          {tierConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={`${statusConfig.color} border-0`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {user.flags.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {user.flags.includes('at_risk') && (
                              <span className="text-xs text-amber-600">At Risk</span>
                            )}
                            {user.flags.includes('high_engagement') && (
                              <span className="text-xs text-emerald-600">High Engagement</span>
                            )}
                            {user.flags.includes('conversion_candidate') && (
                              <span className="text-xs text-blue-600">Convert</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-[#1B2733] dark:text-white">{formatTimeAgo(user.lastActiveAt)}</p>
                        <p className="text-xs text-[#5A6B7A]">Joined {formatDate(user.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#1B2733] dark:text-white">${user.totalSpent.toFixed(2)}</p>
                        <p className="text-xs text-[#5A6B7A]">{user.totalSessions} sessions</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImpersonate(user.id)}
                            className="h-8 w-8 p-0"
                            title="Impersonate"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          {user.status === 'active' || user.status === 'trial' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuspendUser(user.id)}
                              disabled={actionLoading === `suspend-${user.id}`}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Suspend"
                            >
                              {actionLoading === `suspend-${user.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserX className="w-4 h-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivateUser(user.id)}
                              disabled={actionLoading === `reactivate-${user.id}`}
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Reactivate"
                            >
                              {actionLoading === `reactivate-${user.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white text-xl font-medium">
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1B2733] dark:text-white">{selectedUser.name}</h3>
                    <p className="text-[#5A6B7A]">{selectedUser.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Tier Change */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Subscription Tier
                  </label>
                  <select
                    value={selectedUser.tier}
                    onChange={e => {
                      handleChangeTier(selectedUser.id, e.target.value as ManagedUser['tier']);
                      setSelectedUser({ ...selectedUser, tier: e.target.value as ManagedUser['tier'] });
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter (${tierPricing.starter.monthly}/mo)</option>
                    <option value="core">Core (${tierPricing.core.monthly}/mo)</option>
                    <option value="pro">Pro (${tierPricing.pro.monthly}/mo)</option>
                    <option value="proplus">Pro+ (${tierPricing.proplus.monthly}/mo)</option>
                  </select>
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-[#5A6B7A]">Total Sessions</p>
                    <p className="text-xl font-bold text-[#1B2733] dark:text-white">{selectedUser.totalSessions}</p>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-[#5A6B7A]">Total Spent</p>
                    <p className="text-xl font-bold text-[#1B2733] dark:text-white">${selectedUser.totalSpent.toFixed(2)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleImpersonate(selectedUser.id)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Impersonate
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Send message
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
