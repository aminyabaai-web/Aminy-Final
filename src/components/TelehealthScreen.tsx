// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Video, FileText, CheckCircle, Sparkles, Shield, Zap, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { TelehealthSessionManager } from './TelehealthSessionManager';
import { PostVisitSummary } from './PostVisitSummary';
import { TelehealthConsent, ConsentStatusBadge } from './TelehealthConsent';
import { useAuditedAction } from '../hooks/useAuditedAction';

interface TelehealthScreenProps {
  onBack?: () => void;
  userTier?: string;
  childName?: string;
  parentName?: string;
  onNavigate?: (destination: string) => void;
}

// Key for storing consent in localStorage
const CONSENT_STORAGE_KEY = 'aminy-telehealth-consent';

interface ConsentRecord {
  accepted: boolean;
  timestamp: string;
  version: string;
}

export function TelehealthScreen({
  onBack,
  userTier = 'pro',
  childName = 'Alex',
  parentName = 'Parent',
  onNavigate
}: TelehealthScreenProps) {
  // HIPAA audit: log telehealth session view on mount
  const { logAction, logExport } = useAuditedAction('telehealth_session');

  const [activeView, setActiveView] = useState<'credits' | 'history'>('credits');
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [consentLoading, setConsentLoading] = useState<boolean>(true);

  // Check for existing consent on mount
  useEffect(() => {
    const checkConsent = () => {
      try {
        const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (stored) {
          const consent: ConsentRecord = JSON.parse(stored);
          // Check if consent is valid (within 1 year)
          const consentDate = new Date(consent.timestamp);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          if (consent.accepted && consentDate > oneYearAgo) {
            setHasConsent(true);
          } else {
            // Consent expired, need renewal
            setHasConsent(false);
          }
        }
      } catch (e) {
        console.error('Error checking consent:', e);
      }
      setConsentLoading(false);
    };

    checkConsent();
  }, []);

  // Handle consent acceptance
  const handleConsentAccept = () => {
    const consentRecord: ConsentRecord = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentRecord));
    setHasConsent(true);
    setShowConsentModal(false);
  };

  // Handle consent decline
  const handleConsentDecline = () => {
    setShowConsentModal(false);
    // Optionally navigate back if they decline
    if (onBack) {
      onBack();
    }
  };

  // Show consent modal if user tries to book without consent
  const handleBookWithoutConsent = () => {
    setShowConsentModal(true);
  };



  // Show loading state while checking consent
  if (consentLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6B9080] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If no consent, show consent form first
  if (!hasConsent && !showConsentModal) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-[#E8E4DF] dark:border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-[#1B2733] dark:text-white">Telehealth Consent Required</h1>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                  Please review and accept before booking sessions
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <TelehealthConsent
            onConsent={handleConsentAccept}
            onDecline={handleConsentDecline}
            sessionType="parent coaching session"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pb-24">
      {/* Consent Modal for renewal or first-time */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <TelehealthConsent
              variant={hasConsent ? 'abbreviated' : 'full'}
              onConsent={handleConsentAccept}
              onDecline={() => setShowConsentModal(false)}
              sessionType="parent coaching session"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-[#E8E4DF] dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-[#1B2733] dark:text-white">Telehealth Sessions</h1>
                <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                  Professional guidance for {childName}'s development
                </p>
              </div>
            </div>
            {/* Consent Status Badge */}
            <ConsentStatusBadge hasConsent={hasConsent} />
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              variant={activeView === 'credits' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('credits')}
              className={activeView === 'credits' ? 'bg-primary hover:bg-[#6B9080]' : ''}
            >
              Sessions & Credits
            </Button>
            <Button
              variant={activeView === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('history')}
              className={activeView === 'history' ? 'bg-primary hover:bg-[#6B9080]' : ''}
            >
              History & Notes
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Meet & Greet — free 15-min intro call, kills commitment friction */}
        <Card className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 rounded-lg shrink-0">
              <Heart className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-teal-900">Free 15-Min Meet & Greet</h3>
                <span className="text-xs font-semibold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">No cost</span>
              </div>
              <p className="text-sm text-teal-800 mb-3">
                Not sure where to start? Meet a BCBA who specializes in {childName}'s needs — no commitment, no charge. Find the right fit before you commit.
              </p>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => onNavigate?.('conversational-booking')}
              >
                Book Free Intro Call
              </Button>
            </div>
          </div>
        </Card>

        {/* Urgent Help Card - On-demand sessions */}
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">Need Help Right Now?</h3>
              <p className="text-sm text-amber-800 mb-3">
                Connect with a BCBA in minutes during a meltdown, anxiety spike, or overwhelming moment.
                Get real-time de-escalation strategies.
              </p>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('on-demand-telehealth');
                  }
                }}
              >
                <Zap className="w-4 h-4 mr-1" />
                Get Urgent Help (+$50)
              </Button>
            </div>
          </div>
        </Card>

        {/* Feature Overview */}
        <Alert className="bg-[#6B9080]/10 border-[#6B9080]/20">
          <Sparkles className="w-4 h-4 text-[#6B9080]" />
          <AlertDescription className="text-sm text-[#6B9080]">
            <strong>Professional Support:</strong> Your {userTier === 'pro' ? 'Plus' : 'Premium'} plan includes 
            monthly telehealth sessions with Board Certified Behavior Analysts (BCBAs). Session notes 
            automatically integrate into progress reports.
          </AlertDescription>
        </Alert>

        {activeView === 'credits' && (
          <TelehealthSessionManager
            childName={childName}
            parentName={parentName}
            userTier={userTier}
            onSessionScheduled={(session) => {
            }}
            onNotesComplete={(notes) => {
            }}
          />
        )}

        {activeView === 'history' && (
          <Card className="p-4 sm:p-5 md:p-6">
            <h3 className="text-lg text-[#1B2733] mb-2">Progress Report Integration</h3>
            <p className="text-sm text-[#5A6B7A] mb-4">
              All telehealth session notes are automatically included in your AI-generated progress reports, 
              IEP documents, and BCBA notes. No need to manually transfer information.
            </p>
            
            <div className="p-4 bg-[#FAF7F2] rounded-lg border border-[#E8E4DF]">
              <h4 className="text-sm text-[#3A4A57] mb-2">What gets included:</h4>
              <ul className="space-y-1 text-sm text-[#5A6B7A]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
                  Provider observations and clinical notes
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
                  Progress updates across developmental areas
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
                  Recommendations and next steps
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#6B9080] mt-0.5 flex-shrink-0" />
                  Parent questions and concerns addressed
                </li>
              </ul>
            </div>

            <Button className="w-full mt-4 bg-primary hover:bg-[#6B9080]">
              <FileText className="w-4 h-4 mr-2" />
              Generate Progress Report with Session Notes
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
