/**
 * Admin Dashboard
 * Visualize analytics, module usage, retention, cohorts
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  getAnalyticsSummary,
  getModuleUsageStats,
  exportCohortData,
  ModuleUsageStats,
} from '../lib/analytics-tracker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'];

export function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [moduleStats, setModuleStats] = useState<Record<string, ModuleUsageStats>>({});

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [summaryData, moduleData] = await Promise.all([
        getAnalyticsSummary(timeRange),
        Promise.resolve(getModuleUsageStats()),
      ]);
      
      setSummary(summaryData);
      setModuleStats(moduleData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  }

  async function handleExportCohort() {
    try {
      const weekStr = new Date().toISOString().split('T')[0];
      const blob = await exportCohortData(weekStr);
      
      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cohort-${weekStr}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting cohort data:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const moduleUsageData = Object.values(moduleStats).map(stat => ({
    name: stat.module.charAt(0).toUpperCase() + stat.module.slice(1),
    visits: stat.visits,
    timeSpent: Math.round(stat.timeSpent / 60), // Convert to minutes
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">Monitor app usage and user engagement</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(value: '7d' | '30d') => setTimeRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportCohort} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Cohort
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Coins/Day</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.avgCoinsPerDay || 0}</div>
              <p className="text-xs text-slate-600 mt-1">
                Calm Coins earned daily
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">D7 Retention</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.retention?.d7 || 0}%
              </div>
              <p className="text-xs text-slate-600 mt-1">
                7-day return rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">D30 Retention</CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.retention?.d30 || 0}%
              </div>
              <p className="text-xs text-slate-600 mt-1">
                30-day return rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
              <Clock className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((summary?.retention?.avgSessionDuration || 0) / 60)}m
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Average session duration
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList>
            <TabsTrigger value="modules">Module Usage</TabsTrigger>
            <TabsTrigger value="events">Top Events</TabsTrigger>
            <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          </TabsList>

          {/* Module Usage Tab */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Module Visits Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Module Visits</CardTitle>
                  <CardDescription>Number of times each module was accessed</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={moduleUsageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="visits" fill="#0891b2" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Time Spent Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Time Spent by Module</CardTitle>
                  <CardDescription>Minutes spent in each module</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={moduleUsageData}
                        dataKey="timeSpent"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {moduleUsageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Module Usage Percentage */}
            <Card>
              <CardHeader>
                <CardTitle>Module Usage Distribution</CardTitle>
                <CardDescription>Percentage of total app usage by module</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary?.moduleUsage?.map((item: any, index: number) => (
                    <div key={item.module} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900">
                            {item.module.charAt(0).toUpperCase() + item.module.slice(1)}
                          </span>
                          <span className="text-sm text-slate-600">{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
                <CardDescription>Most frequent user actions in the selected time range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.topEvents?.map((event: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">{event.event}</span>
                      <span className="text-sm font-semibold text-accent">{event.count} times</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cohorts Tab */}
          <TabsContent value="cohorts">
            <Card>
              <CardHeader>
                <CardTitle>Cohort Analysis</CardTitle>
                <CardDescription>User retention by signup week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Cohort Analytics
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Track retention and engagement by signup week
                  </p>
                  <Button onClick={handleExportCohort}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Current Cohort
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
