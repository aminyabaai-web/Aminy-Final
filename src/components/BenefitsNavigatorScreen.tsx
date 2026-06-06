// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, FileText, Send, RefreshCw, Edit, MapPin, ExternalLink, ChevronRight, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { BenefitsLetterGenerator } from './BenefitsLetterGenerator';
import { BenefitsStatusPanel } from './BenefitsStatusPanel';
import { toast } from 'sonner';
import { getStateBenefits, checkEligibility, type EligibilityResult } from '../lib/benefits-service';
import { getAvailableStates } from '../lib/benefits-database';
import { supabase } from '../utils/supabase/client';
import {
  orchestrateBenefitsDiscovery,
  type BenefitsDiscoveryData,
} from '../lib/benefits-orchestrator';
import { useAuditedAction } from '../hooks/useAuditedAction';

interface BenefitsNavigatorScreenProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
  userTier?: string;
}

export function BenefitsNavigatorScreen({ onBack, onNavigate, userTier = 'core' }: BenefitsNavigatorScreenProps) {
  useAuditedAction('child_data');
  const [activeView, setActiveView] = useState<'overview' | 'letters' | 'tracking'>('overview');
  const [userState, setUserState] = useState<string>('');
  const [childAge, setChildAge] = useState<number>(5);
  // Tracks whether childAge came from a real profile DOB. When false, age 5 is a
  // default assumption — eligibility (esp. age-capped mandates) must NOT be
  // presented as definitive, so we surface an "update age" affordance.
  const [childAgeKnown, setChildAgeKnown] = useState<boolean>(false);
  const [childName, setChildName] = useState<string>('');
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [trackedRequests, setTrackedRequests] = useState<any[]>([]);

  const availableStates = getAvailableStates();
  const stateData = userState ? getStateBenefits(userState) : null;

  // Load user's state + child info from Supabase
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('state')
          .eq('id', user.id)
          .single();

        if (profile?.state) {
          setUserState(profile.state.toUpperCase());
        }

        const { data: children } = await supabase
          .from('children')
          .select('name, date_of_birth')
          .eq('user_id', user.id)
          .limit(1);

        if (children && children.length > 0) {
          setChildName(children[0].name || '');
          if (children[0].date_of_birth) {
            const dob = new Date(children[0].date_of_birth);
            const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (age > 0) {
              setChildAge(age);
              setChildAgeKnown(true); // real DOB → eligibility is age-accurate
            }
          }
        }
      } catch { /* fallback to defaults; childAgeKnown stays false */ }
    }
    loadProfile();

    // Load tracked requests from localStorage
    const saved = localStorage.getItem('aminy-benefit-requests');
    if (saved) {
      try { setTrackedRequests(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Auto-check eligibility when state changes
  useEffect(() => {
    if (userState) {
      const result = checkEligibility(userState, childAge, ['autism']);
      setEligibility(result);
    }
  }, [userState, childAge]);

  const handleRecheckEligibility = async () => {
    setIsChecking(true);
    toast.info('Checking eligibility for your state...');

    // Immediate local check (fast)
    const result = checkEligibility(userState, childAge, ['autism']);
    setEligibility(result);
    setIsChecking(false);
    toast.success(`Found ${result?.programs.length || 0} programs you may qualify for`);

    // Fire-and-forget: run the full benefits discovery orchestration in background
    // This handles clearinghouse eligibility, prior auth templates, and navigator scheduling
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (userId) {
        const discoveryData: BenefitsDiscoveryData = {
          userId,
          childId: '', // Will be populated from store/profile if available
          childName: childName || 'Your child',
          childAge,
          childDob: '', // Not always available from this screen
          parentName: '',
          stateAbbr: userState,
          diagnoses: ['F84.0'], // Default autism code
          concerns: ['autism'],
        };

        orchestrateBenefitsDiscovery(discoveryData)
          .then(orchResult => {
            if (orchResult.priorAuth?.generated) {
              toast.info('Prior authorization template is ready', {
                description: 'Check the tracking tab to review',
              });
            }
          })
          .catch(err => {
            console.warn('[BenefitsNavigatorScreen] Benefits orchestration error:', err);
          });
      }
    } catch {
      // Non-critical: orchestration is a background enhancement
    }
  };

  const handleDraftLetter = () => {
    setActiveView('letters');
  };

  const services = stateData
    ? stateData.coveredServices.map(s => ({
        id: s.id,
        name: s.name,
        status: s.typicallyCovered ? 'covered' as const : 'pending' as const,
        coverage: s.coverageNotes,
      }))
    : [
        // No state selected yet — don't assert coverage. Show services as
        // "Check Eligibility" until the user picks a state and we have real data.
        { id: 'aba', name: 'ABA Therapy', status: 'pending' as const, coverage: 'Select your state to see coverage details' },
        { id: 'speech', name: 'Speech Therapy', status: 'pending' as const, coverage: 'Select your state to see coverage details' },
        { id: 'ot', name: 'Occupational Therapy', status: 'pending' as const, coverage: 'Select your state to see coverage details' },
        { id: 'eval', name: 'Diagnostic Evaluation', status: 'pending' as const, coverage: 'Select your state to see coverage details' },
        { id: 'respite', name: 'Respite Care', status: 'pending' as const, coverage: 'Select your state to see coverage details' },
      ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E4DF]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} aria-label="Go back">
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

        {/* State Selector */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <MapPin className="w-4 h-4 text-blue-600" />
              <label htmlFor="benefits-state" className="text-sm font-medium">Your State:</label>
              <select
                id="benefits-state"
                aria-label="Select your state"
                value={userState}
                onChange={(e) => setUserState(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
              >
                <option value="">Select state...</option>
                {availableStates.map(s => (
                  <option key={s.abbr} value={s.abbr}>{s.name} ({s.abbr})</option>
                ))}
              </select>
            </div>
            {userState && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecheckEligibility}
                disabled={isChecking}
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Check Eligibility'}
              </Button>
            )}
          </div>

          {/* Age confirmation — when we don't have the child's DOB on file, eligibility
              (esp. age-capped mandates) is computed against a default age. Surface it
              honestly and let the parent correct it rather than assuming silently. */}
          {userState && !childAgeKnown && (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <p className="text-xs text-amber-800 flex-1">
                Based on age {childAge} (we don't have your child's birthdate on file).
                Some programs have age limits — confirm the age for accurate results.
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="benefits-child-age" className="text-xs font-medium text-amber-800">
                  Child's age:
                </label>
                <input
                  id="benefits-child-age"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={21}
                  value={childAge}
                  onChange={(e) => {
                    const next = parseInt(e.target.value, 10);
                    if (!Number.isNaN(next) && next >= 0 && next <= 21) setChildAge(next);
                  }}
                  aria-label="Confirm your child's age in years"
                  className="h-9 w-16 rounded-md border border-amber-200 bg-white px-2 py-1 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setChildAgeKnown(true)}
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Eligibility Results */}
        {eligibility && eligibility.programs.length > 0 && activeView === 'overview' && (
          <Card className="p-4 border-green-200 bg-green-50/50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-green-900">
                {eligibility.programs.length} Program{eligibility.programs.length > 1 ? 's' : ''} Available
              </h2>
            </div>
            <div className="space-y-3">
              {eligibility.programs.map((prog, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={
                      prog.type === 'epsdt' ? 'bg-blue-100 text-blue-700' :
                      prog.type === 'insurance_mandate' ? 'bg-purple-100 text-purple-700' :
                      'bg-[#6B9080]/10 text-[#6B9080]'
                    }>
                      {prog.type === 'epsdt' ? 'Federal' :
                       prog.type === 'insurance_mandate' ? 'State Mandate' : 'Waiver'}
                    </Badge>
                    <h3 className="font-medium text-sm">{prog.name}</h3>
                  </div>
                  <p className="text-xs text-[#5A6B7A] mb-2">{prog.summary}</p>
                  {prog.waitlistWarning && (
                    <p className="text-xs text-amber-700 flex items-center gap-1 mb-2">
                      <Clock className="w-3 h-3" /> {prog.waitlistWarning}
                    </p>
                  )}
                  <div className="space-y-1">
                    {prog.nextSteps.slice(0, 3).map((step, j) => (
                      <p key={j} className="text-xs text-[#5A6B7A] flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">→</span> {step}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Info */}
            {eligibility.contactInfo && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-green-100">
                <p className="text-xs font-medium mb-1">{eligibility.contactInfo.agency}</p>
                <p className="text-xs text-[#5A6B7A]">Phone: {eligibility.contactInfo.phone}</p>
                <a
                  href={eligibility.contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 flex items-center gap-1 mt-1 hover:underline"
                >
                  Visit Website <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </Card>
        )}

        {activeView === 'overview' && (
          <>
            {/* Quick Actions */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => setActiveView('letters')}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-sm">Appeal Letter</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => onNavigate?.('prior-auth')}
                >
                  <Send className="w-5 h-5" />
                  <span className="text-sm">Prior Auth</span>
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
                  className="h-auto flex-col gap-2 py-4 col-span-1"
                  onClick={() => onNavigate?.('coverage-coach')}
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">Coverage Coach</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 col-span-1"
                  onClick={() => onNavigate?.('marketplace')}
                >
                  <ExternalLink className="w-5 h-5" />
                  <span className="text-sm">Cash-Pay Options</span>
                </Button>
              </div>
            </Card>

            {/* Services Coverage */}
            <Card className="p-4 sm:p-5 md:p-6">
              <h2 className="font-semibold mb-1">Your Coverage</h2>
              {stateData && (
                <p className="text-xs text-muted-foreground mb-4">
                  Based on {stateData.state} programs and mandates
                </p>
              )}
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 border border-[#E8E4DF] rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          service.status === 'covered' ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {service.coverage}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={service.status === 'covered' ? 'default' : 'outline'}
                      className={
                        service.status === 'covered'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }
                    >
                      {service.status === 'covered' ? 'Covered' : 'Check Eligibility'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* State Mandate Info */}
            {stateData?.autismMandate.exists && (
              <Card className="p-4 border-purple-200 bg-purple-50/30">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">
                      {stateData.state} Autism Insurance Mandate
                    </p>
                    <p className="text-xs text-purple-700 mb-2">
                      {stateData.autismMandate.summary}
                    </p>
                    {stateData.autismMandate.ageCap && (
                      <p className="text-xs text-purple-600">
                        Age limit: {stateData.autismMandate.ageCap} years
                        {stateData.autismMandate.dollarCap && ` | Cap: ${stateData.autismMandate.dollarCap}`}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Application Steps */}
            {stateData && (
              <Card className="p-4 sm:p-5 md:p-6">
                <h2 className="font-semibold mb-3">How to Apply in {stateData.state}</h2>
                <div className="space-y-2">
                  {stateData.applicationSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm text-[#3A4A57]">{step}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* AI Assistant Note */}
            <div className="p-4 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
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
            userState={userState}
            childName={childName}
            childAge={childAge}
            onGenerate={() => {
              setActiveView('tracking');
            }}
          />
        )}

        {activeView === 'tracking' && (
          <Card className="p-4 sm:p-5 md:p-6">
            <h2 className="font-semibold mb-4">Benefits Tracker</h2>

            {/* State-aware benefits tracker — shows state-specific program names */}
            <BenefitsStatusPanel stateAbbr={userState || undefined} />

            {trackedRequests.length === 0 && (
              <div className="text-center py-6 mt-4 border-t border-[#E8E4DF]">
                <Clock className="w-10 h-10 text-[#8A9BA8] mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No application requests tracked yet</p>
                <div className="flex flex-col gap-2 items-center">
                  <Button size="sm" onClick={() => setActiveView('letters')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate an Appeal Letter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onNavigate?.('prior-auth')}>
                    <Send className="w-4 h-4 mr-2" />
                    Start Prior Authorization
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              {trackedRequests.map((req, i) => (
                <div key={i} className={`border rounded-lg p-4 ${
                  req.status === 'approved' ? 'border-green-200' :
                  req.status === 'pending' ? 'border-amber-200 bg-amber-50' :
                  'border-[#E8E4DF]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{req.title}</h3>
                    <Badge className={
                      req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-blue-100 text-blue-700 border-[#C8DDE8]'
                    }>
                      {req.status === 'approved' ? 'Approved' :
                       req.status === 'pending' ? 'In Review' : 'Submitted'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Submitted: {req.date ? new Date(req.date).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
