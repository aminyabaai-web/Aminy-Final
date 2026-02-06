import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, FileText, Send, Download, RefreshCw, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { BenefitsLetterGenerator } from './BenefitsLetterGenerator';
import { BenefitsStatusPanel } from './BenefitsStatusPanel';
import { toast } from 'sonner';

interface BenefitsNavigatorScreenProps {
  onBack?: () => void;
  userTier?: string;
}

export function BenefitsNavigatorScreen({ onBack, userTier = 'core' }: BenefitsNavigatorScreenProps) {
  const [activeView, setActiveView] = useState<'overview' | 'letters' | 'tracking'>('overview');
  const [hasInsurance] = useState(true); // This would come from user data
  const [lastChecked] = useState('Oct 15, 2025');

  const handleRecheckEligibility = () => {
    toast.info('Checking eligibility with your insurance provider...');
    setTimeout(() => {
      toast.success('Eligibility check complete');
    }, 2000);
  };

  const handleDraftLetter = () => {
    setActiveView('letters');
    toast.info('Opening letter generator...');
  };

  const services = [
    { id: 'aba', name: 'ABA Therapy', status: 'covered', coverage: '100%' },
    { id: 'speech', name: 'Speech Therapy', status: 'covered', coverage: '80%' },
    { id: 'ot', name: 'Occupational Therapy', status: 'covered', coverage: '80%' },
    { id: 'eval', name: 'Diagnostic Evaluation', status: 'approved', coverage: '100%' },
    { id: 'respite', name: 'Respite Care', status: 'pending', coverage: 'TBD' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-semibold">Benefits Navigator</h1>
              <p className="text-sm text-muted-foreground">
                Let us handle the paperwork so you can focus on your child.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              variant={activeView === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('overview')}
            >
              Overview
            </Button>
            <Button
              variant={activeView === 'letters' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('letters')}
            >
              Letters
            </Button>
            <Button
              variant={activeView === 'tracking' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('tracking')}
            >
              Track Status
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Insurance Coverage Header */}
        {hasInsurance && (
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Coverage on file</p>
                  <p className="text-xs text-muted-foreground">
                    Last checked: {lastChecked}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecheckEligibility}
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Check for updates
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDraftLetter}
                >
                  <Edit className="w-3 h-3 mr-1.5" />
                  Draft letter
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!hasInsurance && (
          <Card className="p-4 bg-accent/5 border-accent/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Let's get your insurance set up</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A few details will help us find coverage options and handle the paperwork for you.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Add insurance
                </Button>
              </div>
            </div>
          </Card>
        )}

        {activeView === 'overview' && (
          <>
            {/* Coverage Status Panel */}
            <BenefitsStatusPanel />

            {/* Quick Actions */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setActiveView('letters')}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-sm">Generate Letter</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setActiveView('tracking')}
                >
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">Track Requests</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm">Download Summary</span>
                </Button>
              </div>
            </Card>

            {/* Services Coverage */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h2 className="font-semibold mb-4">Your Coverage</h2>
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          service.status === 'covered' || service.status === 'approved'
                            ? 'bg-green-500'
                            : service.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-gray-300'
                        }`}
                      />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Coverage: {service.coverage}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        service.status === 'covered' || service.status === 'approved'
                          ? 'default'
                          : 'outline'
                      }
                      className={
                        service.status === 'covered' || service.status === 'approved'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : service.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : ''
                      }
                    >
                      {service.status === 'covered' && 'Covered'}
                      {service.status === 'approved' && 'Approved'}
                      {service.status === 'pending' && 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Assistant Note */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    I'll nudge you only when something needs you.
                  </p>
                  <p className="text-xs text-blue-700">
                    You'll get notified when documents need signing, appeals require attention,
                    or coverage decisions arrive.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'letters' && (
          <BenefitsLetterGenerator
            onGenerate={(data) => {
              setActiveView('tracking');
            }}
          />
        )}

        {activeView === 'tracking' && (
          <Card className="p-4 sm:p-5 md:p-6">
            <h2 className="font-semibold mb-4">Track Requests</h2>
            <div className="space-y-3 sm:space-y-4">
              {/* Sample tracking items */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">ABA Therapy Authorization</h3>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Approved
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Submitted: Oct 15, 2025 • Approved: Oct 18, 2025
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Respite Care Request</h3>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    In Review
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Submitted: Oct 19, 2025 • Expected: Oct 26, 2025
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    Follow Up
                  </Button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Speech Therapy Coverage</h3>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    A few details needed
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Submitted: Oct 12, 2025 • Ready when you are by: Oct 22, 2025
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-accent text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Add details
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
