import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { RecordsVault } from './RecordsVault';
import { TalkToAminyEnhanced } from './TalkToAminyEnhanced';
import { DisclaimerFooter } from './DisclaimerFooter';
import { ChildProfileChip } from './ChildProfileChip';
import { useDisplayNames } from '../lib/name-store';
import { 
  Sun,
  Moon,
  Sunset,
  Bell,
  FolderOpen,
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Share,
  Archive,
  TrendingUp
} from 'lucide-react';
import { CompassIcon } from './CompassIcon';
import type { VaultRecord } from '../types/vault';

interface DocumentVaultPageProps {
  userTier?: string | null;
  onNavigate?: (destination: string) => void;
}

export function DocumentVaultPage({ userTier, onNavigate }: DocumentVaultPageProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  
  // Mock vault records data
  const [vaultRecords, setVaultRecords] = useState<VaultRecord[]>([
    {
      id: 'vault-1',
      childId: 'child-1',
      title: 'IEP Meeting Notes - Spring 2024',
      type: 'IEP',
      source: 'Uploaded',
      visibility: 'Private',
      category: ['School', 'IEP'],
      tags: ['speech', 'occupational therapy', 'goals'],
      date: '2024-03-15',
      fileUrl: '',
      vaultText: 'IEP meeting discussed progress in speech therapy and set new goals for occupational therapy sessions.',
      quickSummary: '• Speech therapy showing good progress\n• New OT goals established\n• Increased service minutes recommended',
      keyFields: {
        service_minutes: '180 minutes/week',
        goals_mentioned: '4 new goals established',
        next_review: 'September 2024'
      },
      usableByAssistant: true,
      attachToExport: true,
      createdAt: '2024-03-15T10:00:00Z',
      sourceType: 'upload',
      fileType: 'application/pdf'
    },
    {
      id: 'vault-2',
      childId: 'child-1',
      title: 'Behavioral Assessment Report',
      type: 'Evaluation',
      source: 'Uploaded',
      visibility: 'Private',
      category: ['Evaluation', 'Behavioral'],
      tags: ['autism', 'sensory', 'recommendations'],
      date: '2024-02-28',
      fileUrl: '',
      vaultText: 'Comprehensive behavioral assessment indicating autism spectrum diagnosis with specific sensory processing recommendations.',
      quickSummary: '• ASD diagnosis confirmed\n• Sensory processing needs identified\n• Behavioral intervention strategies outlined',
      keyFields: {
        dx_terms: 'Autism Spectrum Disorder, Sensory Processing',
        recommendations: '8 specific interventions listed',
        assessor: 'Dr. Sarah Johnson, PhD'
      },
      usableByAssistant: true,
      attachToExport: false,
      createdAt: '2024-02-28T14:30:00Z',
      sourceType: 'upload',
      fileType: 'application/pdf'
    }
  ]);

  // Mock usage statistics for tiering
  const getStorageStats = () => {
    const totalFiles = vaultRecords.length;
    const storageUsed = totalFiles * 2.5; // Mock MB per file
    
    const limits = {
      starter: { storage: 1000, files: 50 },
      core: { storage: 5000, files: 200 },
      pro: { storage: 20000, files: 1000 }
    };
    
    const currentLimits = limits[userTier as keyof typeof limits] || limits.starter;
    
    return {
      storageUsed: Math.round(storageUsed),
      storageLimit: currentLimits.storage,
      filesCount: totalFiles,
      filesLimit: currentLimits.files,
      searchEnabled: userTier !== 'starter',
      aiSearchEnabled: userTier === 'pro'
    };
  };

  const stats = getStorageStats();

  // Get time of day for greeting
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return <Sun className="w-5 h-5 text-amber-500" />;
    if (hour >= 12 && hour < 18) return <Sun className="w-5 h-5 text-orange-400" />;
    if (hour >= 18 && hour < 21) return <Sunset className="w-5 h-5 text-orange-500" />;
    return <Moon className="w-5 h-5 text-indigo-400" />;
  };

  const handleRecordAdded = (record: VaultRecord) => {
    setVaultRecords(prev => [...prev, record]);
  };

  const handleRecordUpdated = (record: VaultRecord) => {
    setVaultRecords(prev => prev.map(r => r.id === record.id ? record : r));
  };

  const handleRecordDeleted = (recordId: string) => {
    setVaultRecords(prev => prev.filter(r => r.id !== recordId));
  };

  const handleRecordOpen = (recordId: string) => {
    // Implementation for opening record details
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getTimeIcon()}
              <div>
                <h1 className="text-xl text-slate-900 dark:text-slate-100">Good {getTimeOfDay()}, {caregiverShort}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Your digital medical binder for {childShort}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Bell className="w-4 h-4" />
              </Button>
              <ChildProfileChip size="md" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 sm:gap-6">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-4 sm:space-y-6">
            
            {/* Storage Stats Card */}
            <Card className="p-4 border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Vault Storage</h3>
                  <p className="text-xs text-slate-500">{userTier || 'Starter'} Plan</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Storage</span>
                    <span className="text-slate-900 dark:text-slate-100">
                      {stats.storageUsed} MB / {stats.storageLimit} MB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-teal-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((stats.storageUsed / stats.storageLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Files</span>
                    <span className="text-slate-900 dark:text-slate-100">
                      {stats.filesCount} / {stats.filesLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((stats.filesCount / stats.filesLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {userTier === 'starter' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                  <Button size="sm" className="w-full">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Upgrade for More
                  </Button>
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="p-4 border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Upload className="w-3 h-3 mr-2" />
                  Upload Document
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Share className="w-3 h-3 mr-2" />
                  Share Report
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="w-3 h-3 mr-2" />
                  Export All
                </Button>
              </div>
            </Card>

            {/* AI Assistant Card */}
            <Card className="p-4 border-0 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-accent/10 dark:bg-accent/20 rounded-lg flex items-center justify-center">
                  <CompassIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Aminy</h3>
                  <p className="text-xs text-slate-500">Search your records</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                {stats.aiSearchEnabled 
                  ? "Ask questions about your uploaded documents"
                  : "Upgrade to Pro for AI-powered document search"
                }
              </p>
              
              <Button 
                size="sm" 
                className="w-full" 
                disabled={!stats.aiSearchEnabled}
              >
                <CompassIcon className="w-3 h-3 mr-1" />
                {stats.aiSearchEnabled ? "Ask About Records" : "Upgrade for AI Search"}
              </Button>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <RecordsVault
              childId="child-1"
              records={vaultRecords}
              onRecordAdded={handleRecordAdded}
              onRecordUpdated={handleRecordUpdated}
              onRecordDeleted={handleRecordDeleted}
            />

            {/* AI Chat Integration */}
            {stats.aiSearchEnabled && vaultRecords.length > 0 && (
              <div className="mt-4 sm:mt-6">
                <TalkToAminyEnhanced
                  vaultRecords={vaultRecords}
                  userTier={userTier ?? null}
                  canSendMessage={true}
                  onRecordOpen={handleRecordOpen}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
}