// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Paid Caregiver Mode
 * Dashboard and time tracking for parents who are paid caregivers
 * via Medicaid waivers (CDPAP, self-directed programs)
 *
 * Integrates with fiscal agents like Acumen, DCI, PPL
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Clock,
  Play,
  Pause,
  FileText,
  Download,
  Calendar,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Building2,
  ClipboardList,
  Timer,
  MapPin,
  Zap,
  ChevronRight,
  Settings,
  HelpCircle,
} from 'lucide-react';
import {
  WAIVER_SERVICE_CODES,
  FISCAL_AGENTS,
  getAvailableFiscalAgents,
  hasPaidCaregiverFeatures,
  type TierType,
} from '../lib/tier-utils';

// Types
interface TimeEntry {
  id: string;
  clockIn: Date;
  clockOut?: Date;
  serviceCode: string;
  activities: string[];
  notes?: string;
  status: 'in_progress' | 'completed' | 'submitted';
}

interface WaiverProfile {
  state: string;
  fiscalAgentId: string;
  participantId: string;
  serviceAuthorization?: string;
  approvedServices: string[];
  weeklyAuthorizedHours: number;
  evvRequired: boolean;
}

interface PaidCaregiverModeProps {
  userId: string;
  childName: string;
  userTier: string;
  waiverProfile?: WaiverProfile;
  onSetupWaiver: () => void;
}

export function PaidCaregiverMode({
  userId,
  childName,
  userTier,
  waiverProfile,
  onSetupWaiver,
}: PaidCaregiverModeProps) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedService, setSelectedService] = useState<string>('parent-training');
  const [weeklyEntries, setWeeklyEntries] = useState<TimeEntry[]>([]);
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn && currentEntry) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentEntry.clockIn.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn, currentEntry]);

  // Calculate weekly hours
  const weeklyHours = weeklyEntries.reduce((total, entry) => {
    if (entry.clockOut) {
      return total + (entry.clockOut.getTime() - entry.clockIn.getTime()) / (1000 * 60 * 60);
    }
    return total;
  }, 0);

  const authorizedHours = waiverProfile?.weeklyAuthorizedHours || 40;
  const hoursRemaining = Math.max(0, authorizedHours - weeklyHours);
  const hoursPercentage = (weeklyHours / authorizedHours) * 100;

  // Format time display
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  // Clock in/out handlers
  const handleClockIn = () => {
    const newEntry: TimeEntry = {
      id: `entry-${Date.now()}`,
      clockIn: new Date(),
      serviceCode: selectedService,
      activities: [],
      status: 'in_progress',
    };
    setCurrentEntry(newEntry);
    setIsClockedIn(true);
    setElapsedTime(0);
  };

  const handleClockOut = () => {
    if (currentEntry) {
      const completedEntry: TimeEntry = {
        ...currentEntry,
        clockOut: new Date(),
        status: 'completed',
      };
      setWeeklyEntries([...weeklyEntries, completedEntry]);
      setCurrentEntry(null);
      setIsClockedIn(false);
      setElapsedTime(0);
    }
  };

  // Get service display info
  const getServiceInfo = (code: string) => {
    return WAIVER_SERVICE_CODES[code] || {
      code: 'UNKNOWN',
      description: 'Unknown Service',
      hourlyRange: [0, 0],
    };
  };

  const currentService = getServiceInfo(selectedService);
  const fiscalAgent = waiverProfile
    ? FISCAL_AGENTS.find((a) => a.id === waiverProfile.fiscalAgentId)
    : null;

  // Check if feature is available
  if (!hasPaidCaregiverFeatures(userTier as TierType)) {
    return (
      <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <div className="text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Paid Caregiver Mode
          </h3>
          <p className="text-amber-700 mb-4">
            Track your caregiver hours and generate documentation for Medicaid waiver reimbursement.
          </p>
          <Badge className="bg-amber-100 text-amber-800 mb-4">
            Requires Core tier or higher
          </Badge>
          <Button className="w-full bg-amber-600 hover:bg-amber-700">
            Upgrade to Unlock
          </Button>
        </div>
      </Card>
    );
  }

  // No waiver profile setup yet
  if (!waiverProfile) {
    return (
      <Card className="p-6 bg-gradient-to-br from-[#FAF7F2] to-blue-50 border-[#6B9080]/20">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-3 bg-[#6B9080]/10 rounded-xl">
            <Building2 className="w-6 h-6 text-[#6B9080]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#6B9080] mb-2">
              Paid Caregiver Mode
            </h3>
            <p className="text-[#6B9080] mb-4">
              Are you a paid caregiver for {childName} through a Medicaid waiver program?
              Set up your waiver profile to track hours and generate service documentation.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {FISCAL_AGENTS.slice(0, 4).map((agent) => (
                <Badge key={agent.id} variant="outline" className="text-sm">
                  {agent.name.split(' ')[0]}
                </Badge>
              ))}
              <Badge variant="outline" className="text-sm">+ more</Badge>
            </div>
            <Button onClick={onSetupWaiver} className="bg-primary hover:bg-[#216982]">
              <Settings className="w-4 h-4 mr-2" />
              Set Up Waiver Profile
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Main caregiver dashboard
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header with fiscal agent */}
      <Card className="p-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Paid Caregiver Mode</h3>
              <p className="text-sm text-teal-100">
                {fiscalAgent?.name || 'Fiscal Agent'} • ID: {waiverProfile.participantId}
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white">
            {waiverProfile.state}
          </Badge>
        </div>
      </Card>

      {/* Current Shift / Clock In */}
      <Card className={`p-6 ${isClockedIn ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
        <div className="text-center">
          {isClockedIn ? (
            <>
              <div className="mb-4">
                <Badge className="bg-green-100 text-green-800 mb-2">
                  Currently Clocked In
                </Badge>
                <div className="text-4xl font-mono font-bold text-green-700 mb-2">
                  {formatTime(elapsedTime)}
                </div>
                <p className="text-sm text-green-600">
                  {currentService.description} ({currentService.code})
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleClockOut}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Clock Out
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowServiceSelector(true)}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Log Activity
                </Button>
              </div>

              {waiverProfile.evvRequired && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
                  <MapPin className="w-4 h-4" />
                  <span>EVV location tracking enabled</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-4">
                <Timer className="w-12 h-12 mx-auto mb-3 text-[#8A9BA8]" />
                <h3 className="text-lg font-semibold text-[#1B2733] mb-2">
                  Ready to Start Your Shift?
                </h3>
                <p className="text-sm text-[#5A6B7A] mb-4">
                  Clock in to track your caregiver hours for {childName}
                </p>
              </div>

              {/* Service selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                  Select Service Type
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white"
                >
                  {Object.entries(WAIVER_SERVICE_CODES).map(([key, service]) => (
                    <option key={key} value={key}>
                      {service.description} ({service.code})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleClockIn}
                size="lg"
                className="w-full bg-primary hover:bg-[#216982]"
              >
                <Play className="w-5 h-5 mr-2" />
                Clock In
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Weekly Hours Summary */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[#1B2733] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#6B9080]" />
            This Week's Hours
          </h4>
          <span className="text-sm text-[#5A6B7A]">
            {formatHours(weeklyHours)} / {authorizedHours}h authorized
          </span>
        </div>

        <Progress value={hoursPercentage} className="h-3 mb-3" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-center">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">
              {formatHours(weeklyHours)}
            </div>
            <div className="text-sm text-[#5A6B7A]">Logged</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {formatHours(hoursRemaining)}
            </div>
            <div className="text-sm text-[#5A6B7A]">Remaining</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {weeklyEntries.filter((e) => e.status === 'completed').length}
            </div>
            <div className="text-sm text-[#5A6B7A]">Entries</div>
          </div>
        </div>
      </Card>

      {/* Recent Time Entries */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[#1B2733]">Recent Entries</h4>
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {weeklyEntries.length === 0 ? (
          <div className="text-center py-6 text-[#5A6B7A]">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No time entries this week</p>
          </div>
        ) : (
          <div className="space-y-2">
            {weeklyEntries.slice(-3).reverse().map((entry) => {
              const service = getServiceInfo(entry.serviceCode);
              const duration = entry.clockOut
                ? (entry.clockOut.getTime() - entry.clockIn.getTime()) / (1000 * 60 * 60)
                : 0;

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      entry.status === 'submitted' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {entry.status === 'submitted' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-[#1B2733]">
                        {service.description}
                      </div>
                      <div className="text-sm text-[#5A6B7A]">
                        {entry.clockIn.toLocaleDateString()} • {formatHours(duration)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {service.code}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Export Actions */}
      <Card className="p-3 sm:p-4">
        <h4 className="font-semibold text-[#1B2733] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#6B9080]" />
          Export Documentation
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" className="justify-start">
            <Download className="w-4 h-4 mr-2" />
            Weekly Summary
          </Button>
          <Button variant="outline" className="justify-start">
            <FileText className="w-4 h-4 mr-2" />
            Service Notes
          </Button>
          <Button variant="outline" className="justify-start">
            <DollarSign className="w-4 h-4 mr-2" />
            Generate Superbill
          </Button>
          <Button variant="outline" className="justify-start">
            <Building2 className="w-4 h-4 mr-2" />
            Submit to {fiscalAgent?.name.split(' ')[0] || 'FMS'}
          </Button>
        </div>
      </Card>

      {/* Help */}
      <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Need Help?</h4>
            <p className="text-sm text-blue-700 mb-2">
              Questions about documentation requirements or submitting to your fiscal agent?
            </p>
            <Button variant="link" className="p-0 h-auto text-blue-600">
              View Documentation Guide
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Waiver Setup Modal
 * Guides users through setting up their waiver profile
 */
export function WaiverSetupFlow({
  onComplete,
  onCancel,
}: {
  onComplete: (profile: WaiverProfile) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState('');
  const [fiscalAgentId, setFiscalAgentId] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [serviceAuth, setServiceAuth] = useState('');
  const [approvedServices, setApprovedServices] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState('40');
  const [evvRequired, setEvvRequired] = useState(false);

  const availableAgents = state ? getAvailableFiscalAgents(state) : [];

  const handleComplete = () => {
    onComplete({
      state,
      fiscalAgentId,
      participantId,
      serviceAuthorization: serviceAuth || undefined,
      approvedServices,
      weeklyAuthorizedHours: parseInt(weeklyHours) || 40,
      evvRequired,
    });
  };

  return (
    <div className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl font-bold text-[#1B2733] mb-2">
          Set Up Waiver Profile
        </h2>
        <p className="text-[#5A6B7A]">
          Step {step} of 3
        </p>
        <Progress value={(step / 3) * 100} className="h-2 mt-2" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3 sm:space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                What state is your waiver in?
              </label>
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setFiscalAgentId('');
                }}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Select your state...</option>
                <option value="AZ">Arizona</option>
                <option value="CA">California</option>
                <option value="CO">Colorado</option>
                <option value="FL">Florida</option>
                <option value="GA">Georgia</option>
                <option value="MI">Michigan</option>
                <option value="NY">New York</option>
                <option value="OH">Ohio</option>
                <option value="PA">Pennsylvania</option>
                <option value="TX">Texas</option>
                {/* Add more states */}
              </select>
            </div>

            {state && availableAgents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                  Who is your Fiscal Management Service (FMS)?
                </label>
                <div className="space-y-2">
                  {availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setFiscalAgentId(agent.id)}
                      className={`w-full p-3 text-left border rounded-lg transition-colors ${
                        fiscalAgentId === agent.id
                          ? 'border-[#6B9080] bg-[#6B9080]/10'
                          : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                      }`}
                    >
                      <div className="font-medium">{agent.name}</div>
                    </button>
                  ))}
                  <button
                    onClick={() => setFiscalAgentId('other')}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      fiscalAgentId === 'other'
                        ? 'border-[#6B9080] bg-[#6B9080]/10'
                        : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                    }`}
                  >
                    <div className="font-medium">Other / Not Listed</div>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!state || !fiscalAgentId}
                className="flex-1 bg-primary hover:bg-[#216982]"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3 sm:space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                Participant ID (from your FMS)
              </label>
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="e.g., 12345678"
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                Service Authorization Number (optional)
              </label>
              <input
                type="text"
                value={serviceAuth}
                onChange={(e) => setServiceAuth(e.target.value)}
                placeholder="If you have one"
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                Weekly Authorized Hours
              </label>
              <input
                type="number"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                min="1"
                max="168"
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!participantId}
                className="flex-1 bg-primary hover:bg-[#216982]"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3 sm:space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#3A4A57] mb-2">
                What services are approved in your plan?
              </label>
              <p className="text-sm text-[#5A6B7A] mb-3">
                Select all that apply. This helps us generate the right documentation.
              </p>
              <div className="space-y-2">
                {Object.entries(WAIVER_SERVICE_CODES).map(([key, service]) => (
                  <label
                    key={key}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      approvedServices.includes(key)
                        ? 'border-[#6B9080] bg-[#6B9080]/10'
                        : 'border-[#E8E4DF] hover:border-[#E8E4DF]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={approvedServices.includes(key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setApprovedServices([...approvedServices, key]);
                        } else {
                          setApprovedServices(approvedServices.filter((s) => s !== key));
                        }
                      }}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{service.description}</div>
                      <div className="text-sm text-[#5A6B7A]">
                        Code: {service.code} • ${service.hourlyRange[0]}-${service.hourlyRange[1]}/hr
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#EEF4F8] rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={evvRequired}
                  onChange={(e) => setEvvRequired(e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-blue-900">
                    My state requires EVV (Electronic Visit Verification)
                  </div>
                  <div className="text-sm text-blue-700">
                    We'll enable location tracking for your time entries
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={approvedServices.length === 0}
                className="flex-1 bg-primary hover:bg-[#216982]"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Setup
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PaidCaregiverMode;
