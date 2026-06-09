// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderMarketplace.tsx
 *
 * Premium marketplace experience for booking provider sessions.
 * Positions providers as "guides" who help families navigate the journey.
 *
 * Provider Types & Base Prices (see pricing.ts for source of truth):
 * - Behavioral Team: BCBA ($79-$219), RBT ($49-$89)
 * - Therapy Team: LPC/LCSW ($129-$159), SLP ($129), OT ($129)
 * - Diagnostic: Autism Eval ($899), ADHD Eval ($399), Combined ($1,199)
 *
 * Features:
 * - OpenTable-style availability booking
 * - Insight Navigator integration
 * - Provider profiles with specialties
 * - Recommended providers based on child's conditions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Logo } from './Logo';
import { supabase } from '../utils/supabase/client';
import {
  Search,
  Filter,
  Star,
  Clock,
  Calendar,
  Video,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Heart,
  Shield,
  Sparkles,
  GraduationCap,
  User,
  Users,
  MessageSquare,
  Hand,
  Stethoscope,
  Baby,
  Brain,
  Check,
  ArrowRight,
  Info,
  Bookmark,
  Play,
  UserSearch,
  X,
  DollarSign,
  Globe,
  CreditCard,
  SlidersHorizontal
} from 'lucide-react';
import { EmptyProviders, EmptySearchResults } from './ui/empty-state';
import { DataProvenanceBadge } from './ui/DataProvenanceBadge';
import { LaunchStateBadge } from './ui/LaunchStateBadge';
import { providerTypes, type ProviderType, type ProviderTypeInfo } from '../lib/child-profiles';
import { brandColors, getColorForProvider } from '../lib/brand-system';
import { createDataProvenance, getSurfaceLaunchConfig, type DataProvenance } from '../lib/product-truth';
import { SUPPORTED_PROVIDER_STATES, isSupportedProviderState } from '../lib/insurance/state-market-coverage';
import { VerifiedBadge } from './provider/CredentialBadge';

// Types
interface MarketplaceProvider {
  id: string;
  name: string;
  credentials: string;
  type: ProviderType;
  photoUrl?: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  specialties: string[];
  conditions: string[];
  languages: string[];
  insuranceAccepted: string[];
  sessionRate?: number;
  statesLicensed: string[];
  bio: string;
  approach: string;
  availability: AvailabilitySlot[];
  nextAvailable: string;
  isBookmarked: boolean;
  badges: string[];
  verificationStatus?: 'verified' | 'pending' | 'manual_review' | 'expired' | 'failed';
}

interface AvailabilitySlot {
  date: string;
  times: string[];
}

interface ProviderMarketplaceProps {
  childId?: string;
  childName?: string;
  childConditions?: string[];
  userTier?: string;
  onBookSession?: (providerId: string, sessionType: string, dateTime: string) => void;
  onViewProvider?: (providerId: string) => void;
  onBack?: () => void;
  onNavigateToGroupSessions?: () => void;
}

// Filter state interface
interface MarketplaceFilters {
  state: string;
  languages: string[];
  insurances: string[];
  minRating: number;
  maxPrice: number;
  availableThisWeek: boolean;
  acceptingNewPatients: boolean;
  specialties: string[];
  conditions: string[];
}

// US States for filter dropdown
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

// Common insurance providers
const INSURANCE_PROVIDERS = [
  'Aetna', 'Anthem', 'Blue Cross Blue Shield', 'Cigna', 'Humana',
  'Kaiser Permanente', 'Medicaid', 'Medicare', 'Tricare', 'UnitedHealthcare',
  'Self-Pay', 'Out-of-Network'
];

// Common languages
const LANGUAGES = [
  'English', 'Spanish', 'Mandarin', 'Cantonese', 'Korean', 'Vietnamese',
  'Tagalog', 'Arabic', 'French', 'Portuguese', 'Russian', 'Hindi', 'ASL'
];

// All specialties across provider types
const ALL_SPECIALTIES = [
  'Early Intervention', 'Parent Training', 'Teen Services', 'Social Skills',
  'Transition Planning', 'Play-Based Learning', 'Daily Routines', 'Anxiety',
  'Emotional Regulation', 'Family Therapy', 'System Navigation', 'IEP Advocacy',
  'AAC', 'Social Communication', 'Feeding', 'Sensory Processing', 'Fine Motor',
  'Self-Care Skills', 'Medication Management', 'Complex Diagnoses', 'Diagnostic Evaluations'
];

// Conditions
const ALL_CONDITIONS = [
  'Autism', 'ADHD', 'Anxiety', 'Developmental Delay', 'Depression', 'OCD',
  'Sensory Processing', 'Speech Delay', 'Learning Disability'
];

// Icon mapping for provider types
const providerIcons: Record<ProviderType, React.ElementType> = {
  bcba: GraduationCap,
  rbt: User,
  lpc: Heart,
  lcsw: Users,
  slp: MessageSquare,
  ot: Hand,
  psychiatrist: Stethoscope,
  pediatrician: Baby
};

// Color classes for provider types
const providerColorClasses: Record<string, { bg: string; text: string; border: string }> = {
  teal: { bg: 'bg-[#6B9080]/10', text: 'text-[#6B9080]', border: 'border-[#6B9080]/20' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-[#C8DDE8]' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  cyan: { bg: 'bg-[#6B9080]/10', text: 'text-cyan-700', border: 'border-[#6B9080]/20' },
};

export function ProviderMarketplace({
  childId,
  childName,
  childConditions = [],
  userTier = 'core',
  onBookSession,
  onViewProvider,
  onNavigateToGroupSessions,
}: ProviderMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'behavioral' | 'therapy' | 'medical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MarketplaceProvider | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [providerProvenance, setProviderProvenance] = useState<DataProvenance | null>(null);
  const [providerLoadMessage, setProviderLoadMessage] = useState<string | null>(null);

  const launchConfig = getSurfaceLaunchConfig('marketplace');

  // Advanced filters state
  const [filters, setFilters] = useState<MarketplaceFilters>({
    state: '',
    languages: [],
    insurances: [],
    minRating: 0,
    maxPrice: 500,
    availableThisWeek: false,
    acceptingNewPatients: false,
    specialties: [],
    conditions: []
  });

  // Track active filter count
  const activeFilterCount = [
    filters.state !== '',
    filters.languages.length > 0,
    filters.insurances.length > 0,
    filters.minRating > 0,
    filters.maxPrice < 500,
    filters.availableThisWeek,
    filters.acceptingNewPatients,
    filters.specialties.length > 0,
    filters.conditions.length > 0
  ].filter(Boolean).length;

  // Reset filters
  const resetFilters = () => {
    setFilters({
      state: '',
      languages: [],
      insurances: [],
      minRating: 0,
      maxPrice: 500,
      availableThisWeek: false,
      acceptingNewPatients: false,
      specialties: [],
      conditions: []
    });
  };

  // Toggle array filter
  const toggleArrayFilter = (key: keyof MarketplaceFilters, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[];
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...arr, value] };
    });
  };

  // Load providers from Supabase with verified live data only
  const loadProviders = useCallback(async () => {
    setIsLoading(true);

    // Demo-mode shortcut: hydrate marketplace with 5 well-rounded providers so
    // investor + AACT walk-throughs see a populated screen.
    try {
      const { isDemoMode, DEMO_PROVIDERS } = await import('../lib/demo-seed');
      if (isDemoMode()) {
        setProviders(DEMO_PROVIDERS.map(p => ({
          id: p.id,
          name: p.name,
          credentials: p.credentials,
          type: (p.credentials.toLowerCase().includes('slp') ? 'slp'
                 : p.credentials.toLowerCase().includes('psy.d') ? 'lcsw'
                 : p.credentials.toLowerCase().includes('lmft') || p.credentials.toLowerCase().includes('lcsw') ? 'lcsw'
                 : 'bcba') as ProviderType,
          photoUrl: '',
          rating: p.rating,
          reviewCount: p.reviewCount,
          yearsExperience: p.yearsExperience,
          specialties: [p.specialty],
          conditions: ['Autism', 'ADHD', 'Anxiety'],
          languages: ['English'],
          insuranceAccepted: p.payers,
          sessionRate: p.hourlyRate,
          statesLicensed: p.states,
          bio: p.bio,
          approach: p.specialty,
          availability: generateAvailability(),
          nextAvailable: p.nextAvailable,
          isBookmarked: false,
          badges: ['Telehealth', `${p.yearsExperience}y experience`],
          verificationStatus: 'verified' as MarketplaceProvider['verificationStatus'],
        })));
        setProviderProvenance(createDataProvenance('live', 'Demo mode — synthetic provider directory', {
          isVerified: true,
          lastUpdatedAt: new Date().toISOString(),
        }));
        setProviderLoadMessage(null);
        setIsLoading(false);
        return;
      }
    } catch { /* fall through to real query */ }

    try {
      // Build query with server-side filters
      let query = supabase
        .from('provider_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('is_accepting_patients', true)
        .eq('verification_status', 'verified');

      // Category filter
      if (selectedCategory !== 'all') {
        const categoryTypes: Record<string, string[]> = {
          behavioral: ['bcba', 'rbt'],
          therapy: ['lpc', 'lcsw', 'slp', 'ot'],
          medical: ['psychiatrist', 'pediatrician']
        };
        const types = categoryTypes[selectedCategory] || [];
        if (types.length > 0) {
          query = query.in('provider_type', types);
        }
      }

      // Server-side search (name or credentials)
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`name.ilike.%${q}%,credentials.ilike.%${q}%`);
      }

      // Server-side rating filter
      if (filters.minRating > 0) {
        query = query.gte('rating', filters.minRating);
      }

      // Server-side price filter
      if (filters.maxPrice < 500) {
        query = query.lte('session_rate', filters.maxPrice);
      }

      // Server-side insurance filter
      if (filters.insurances.length > 0) {
        query = query.overlaps('insurance_accepted', filters.insurances);
      }

      // Server-side language filter
      if (filters.languages.length > 0) {
        query = query.overlaps('languages', filters.languages);
      }

      // Server-side specialties filter
      if (filters.specialties.length > 0) {
        query = query.overlaps('specialties', filters.specialties);
      }

      // Server-side state filter
      if (filters.state) {
        query = query.contains('states_licensed', [filters.state]);
      }

      const { data, error } = await query.order('rating', { ascending: false });

      if (error) {
        console.error('[Marketplace] Supabase error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        interface ProviderRow {
          id: string;
          name?: string;
          first_name?: string;
          last_name?: string;
          credentials?: string;
          provider_type?: string;
          photo_url?: string;
          rating?: string;
          review_count?: number;
          years_experience?: number;
          specialties?: string[];
          conditions?: string[];
          languages?: string[];
          insurance_accepted?: string[];
          session_rate?: number;
          states_licensed?: string[];
          bio?: string;
          approach?: string;
          next_available?: string;
          badges?: string[];
          verification_status?: string;
        }
        const dbProviders: MarketplaceProvider[] = (data as ProviderRow[])
          .filter((p) => (p.states_licensed || []).some((state) => isSupportedProviderState(state)))
          .map((p) => ({
          id: p.id,
          name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Provider',
          credentials: p.credentials || '',
          type: (p.provider_type || 'bcba') as ProviderType,
          photoUrl: p.photo_url || '',
          rating: parseFloat(p.rating || '4.5') || 4.5,
          reviewCount: p.review_count || 0,
          yearsExperience: p.years_experience || 5,
          specialties: p.specialties || [],
          conditions: p.conditions || [],
          languages: p.languages || ['English'],
          insuranceAccepted: p.insurance_accepted || [],
          sessionRate: p.session_rate || undefined,
          statesLicensed: p.states_licensed || [],
          bio: p.bio || '',
          approach: p.approach || '',
          availability: generateAvailability(),
          nextAvailable: p.next_available ? new Date(p.next_available).toLocaleDateString() : 'Check schedule',
          isBookmarked: false,
          badges: p.badges || [],
          verificationStatus: (p.verification_status || 'verified') as MarketplaceProvider['verificationStatus']
        }));
        setProviders(dbProviders);
        setProviderProvenance(createDataProvenance('live', 'Verified provider availability', {
          isVerified: true,
          lastUpdatedAt: new Date().toISOString(),
        }));
        setProviderLoadMessage(null);
      } else {
        setProviders([]);
        setProviderProvenance(null);
        setProviderLoadMessage(`We only show verified provider availability in live Aminy markets (${SUPPORTED_PROVIDER_STATES.join(' · ')}).`);
      }
    } catch (error) {
      console.error('[Marketplace] Failed to load providers:', error);
      setProviders([]);
      setProviderProvenance(null);
      setProviderLoadMessage('Live provider availability is temporarily unavailable. Use Aminy guidance now and check back for verified openings.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, filters]);

  // Pre-filter from screening routing data (set by FreeScreeningFlow → App.tsx)
  const [screeningBanner, setScreeningBanner] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('aminy_screening_routing');
      if (!raw) return;
      const routing = JSON.parse(raw);
      // Map recommended provider types to category filter
      const providerTypes = (routing.recommendedProviders || []).map((p: string) => p.toLowerCase());
      if (providerTypes.some((p: string) => p.includes('bcba') || p.includes('behavioral') || p.includes('rbt'))) {
        setSelectedCategory('behavioral');
      } else if (providerTypes.some((p: string) => p.includes('therap') || p.includes('counselor') || p.includes('slp') || p.includes('ot'))) {
        setSelectedCategory('therapy');
      } else if (providerTypes.some((p: string) => p.includes('pediatr') || p.includes('neuro') || p.includes('diagnostic'))) {
        setSelectedCategory('medical');
      }
      // Show contextual banner
      if (routing.riskLevel === 'high') {
        setScreeningBanner(`Based on your screening results, we recommend a diagnostic evaluation. We've pre-filtered providers who can help.`);
      } else if (routing.riskLevel === 'moderate') {
        setScreeningBanner(`Your screening suggests some areas of concern. Here are providers who specialize in evaluation and support.`);
      }
      // Clean up — only use once
      localStorage.removeItem('aminy_screening_routing');
    } catch { /* ignore parse errors */ }
  }, []);

  // Debounced provider loading — 300ms delay for search/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProviders();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadProviders]);

  const generateAvailability = (): AvailabilitySlot[] => {
    const slots: AvailabilitySlot[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const times = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM']
        .filter(() => Math.random() > 0.4); // Randomly remove some slots

      if (times.length > 0) {
        slots.push({
          date: date.toISOString().split('T')[0],
          times
        });
      }
    }
    return slots;
  };

  const filterProviders = (provs: MarketplaceProvider[]) => {
    return provs.filter(prov => {
      // Category filter
      if (selectedCategory !== 'all') {
        const behavioral = ['bcba', 'rbt'];
        const therapy = ['lpc', 'lcsw', 'slp', 'ot'];
        const medical = ['psychiatrist', 'pediatrician'];

        if (selectedCategory === 'behavioral' && !behavioral.includes(prov.type)) return false;
        if (selectedCategory === 'therapy' && !therapy.includes(prov.type)) return false;
        if (selectedCategory === 'medical' && !medical.includes(prov.type)) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = prov.name.toLowerCase().includes(query);
        const matchesSpecialty = prov.specialties.some(s => s.toLowerCase().includes(query));
        const matchesCondition = prov.conditions.some(c => c.toLowerCase().includes(query));
        if (!(matchesName || matchesSpecialty || matchesCondition)) return false;
      }

      // Advanced filters
      // Rating filter
      if (filters.minRating > 0 && prov.rating < filters.minRating) return false;

      // Language filter
      if (filters.languages.length > 0) {
        const hasLanguage = filters.languages.some(lang => prov.languages.includes(lang));
        if (!hasLanguage) return false;
      }

      // Specialty filter
      if (filters.specialties.length > 0) {
        const hasSpecialty = filters.specialties.some(spec => prov.specialties.includes(spec));
        if (!hasSpecialty) return false;
      }

      // Condition filter
      if (filters.conditions.length > 0) {
        const hasCondition = filters.conditions.some(cond => prov.conditions.includes(cond));
        if (!hasCondition) return false;
      }

      // Insurance filter (client-side for mock data)
      if (filters.insurances.length > 0) {
        const hasInsurance = filters.insurances.some(ins => prov.insuranceAccepted?.includes(ins));
        if (!hasInsurance) return false;
      }

      // State filter (client-side for mock data)
      if (filters.state) {
        const hasState = prov.statesLicensed?.includes(filters.state);
        if (!hasState) return false;
      }

      // Price filter (client-side for mock data)
      if (filters.maxPrice < 500 && prov.sessionRate) {
        if (prov.sessionRate > filters.maxPrice) return false;
      }

      // Available this week filter
      if (filters.availableThisWeek && prov.availability.length === 0) return false;

      return true;
    });
  };

  const getProviderTypeInfo = (type: ProviderType) => providerTypes[type];

  const renderProviderCard = (provider: MarketplaceProvider) => {
    const typeInfo = getProviderTypeInfo(provider.type);
    const color = getColorForProvider(provider.type);
    const colorClasses = providerColorClasses[color] || providerColorClasses.teal;
    const Icon = providerIcons[provider.type];

    return (
      <Card
        key={provider.id}
        className="p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group"
        onClick={() => setSelectedProvider(provider)}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl ${colorClasses.bg} flex items-center justify-center flex-shrink-0`}>
            {provider.photoUrl ? (
              <img src={provider.photoUrl} alt={provider.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <Icon className={`w-7 h-7 ${colorClasses.text}`} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#1B2733] group-hover:text-[#6B9080] transition-colors">
                    {provider.name}, {provider.credentials}
                  </h3>
                  {provider.verificationStatus && (
                    <VerifiedBadge status={provider.verificationStatus} />
                  )}
                </div>
                <p className="text-sm text-[#5A6B7A]">{typeInfo.fullTitle}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onViewProvider?.(provider.id); }}
                className="flex items-center gap-1 text-sm hover:underline"
              >
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="font-medium">{provider.rating}</span>
                <span className="text-[#8A9BA8]">({provider.reviewCount})</span>
              </button>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {provider.specialties.slice(0, 3).map((spec, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>

            {/* Insurance & Price */}
            {(provider.insuranceAccepted?.length > 0 || provider.sessionRate) && (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {provider.sessionRate && (
                  <span className="text-xs font-semibold text-[#6B9080] bg-[#6B9080]/10 px-2 py-0.5 rounded-full">
                    From ${provider.sessionRate}
                  </span>
                )}
                {provider.insuranceAccepted?.slice(0, 3).map((ins, idx) => (
                  <span key={idx} className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    {ins}
                  </span>
                ))}
                {(provider.insuranceAccepted?.length || 0) > 3 && (
                  <span className="text-xs text-[#5A6B7A]">
                    +{provider.insuranceAccepted.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Quick info */}
            <div className="flex items-center gap-3 sm:gap-4 text-sm text-[#5A6B7A] mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {provider.yearsExperience}+ years
              </span>
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                Telehealth
              </span>
              {provider.languages.length > 1 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {provider.languages.join(', ')}
                </span>
              )}
            </div>

            {/* Availability & CTA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">
                  Next: {provider.nextAvailable}
                </span>
              </div>
              <Button size="sm" className="bg-primary hover:bg-[#216982] opacity-0 group-hover:opacity-100 transition-opacity">
                Book Session
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Badges */}
        {provider.badges.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-[#E8E4DF]">
            {provider.badges.map((badge, idx) => (
              <Badge key={idx} className={`${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    );
  };

  const filteredProviders = filterProviders(providers);

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Find Your Guide</h1>
              <h2 className="sr-only">Provider discovery</h2>
              <h3 className="sr-only">Recommended care options</h3>
              <p className="text-teal-100">
                Expert providers to support {childName ? `${childName}'s` : 'your family\'s'} journey
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <LaunchStateBadge state={launchConfig.state} label={launchConfig.badgeLabel} />
            {providerProvenance ? <DataProvenanceBadge provenance={providerProvenance} /> : null}
          </div>

          <p className="mb-4 max-w-2xl text-sm text-teal-50">
            {launchConfig.message}
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8A9BA8]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, specialty, or condition..."
              className="pl-12 h-12 bg-white text-[#1B2733] border-0 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-[#E8E4DF] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {[
              { id: 'all', label: 'All Guides', icon: Users },
              { id: 'behavioral', label: 'Behavioral', icon: Brain, desc: 'BCBA, RBT' },
              { id: 'therapy', label: 'Therapy', icon: Heart, desc: 'LPC, SLP, OT' },
              { id: 'medical', label: 'Medical', icon: Stethoscope, desc: 'Psychiatry' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-[#6B9080]/10 text-[#6B9080]'
                    : 'text-[#5A6B7A] hover:bg-[#F0EDE8]'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Screening Routing Banner */}
      {screeningBanner && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">Recommended for You</p>
                <p className="text-xs text-emerald-600 mt-0.5">{screeningBanner}</p>
              </div>
              <button
                onClick={() => setScreeningBanner(null)}
                className="ml-auto text-emerald-400 hover:text-emerald-600 text-lg"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Banner (if child conditions provided) */}
      {childConditions.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1B2733]">Recommended for {childName}</h3>
                <p className="text-sm text-[#5A6B7A]">
                  Based on {childConditions.join(', ')}, we suggest starting with a BCBA consultation
                </p>
              </div>
              <Button size="sm" variant="outline" className="border-violet-300 text-violet-700">
                View Recommended
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Provider Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {providerLoadMessage && (
          <Card className="mb-4 border-sky-200 bg-sky-50/80 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 text-sky-700" />
              <div>
                <p className="text-sm font-medium text-sky-900">Verified network availability only</p>
                <p className="text-sm text-sky-700">{providerLoadMessage}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Group Training CTA — ClassPass for ABA parent training */}
        {onNavigateToGroupSessions && (
          <button
            onClick={onNavigateToGroupSessions}
            className="w-full mb-4 p-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-left hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
                  <Users className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-emerald-900">Group BCBA Sessions</p>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">NEW</span>
                  </div>
                  <p className="text-sm text-emerald-800 mt-0.5">
                    Expert-led parent training with up to 4 families · $50/family · Live topics: sleep, meltdowns, school, transitions
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </button>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-[#5A6B7A]">
            {filteredProviders.length > 0
              ? `${filteredProviders.length} verified provider${filteredProviders.length !== 1 ? 's' : ''} available`
              : 'Verified availability updates when Aminy has live coverage in your area.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={activeFilterCount > 0 ? 'border-[#6B9080] text-[#6B9080]' : ''}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-primary text-white text-xs px-1.5 py-0.5">
                {activeFilterCount}
              </Badge>
            )}
            {showFilters ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
        </div>

        {/* Advanced Filter Panel */}
        {showFilters && (
          <Card className="p-4 mb-6 border-[#6B9080]/20 bg-gradient-to-br from-[#FAF7F2]/50 to-cyan-50/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1B2733] flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#6B9080]" />
                Filter Providers
              </h3>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-[#5A6B7A] hover:text-[#3A4A57]">
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* State Filter */}
              <div>
                <label className="text-sm font-medium text-[#3A4A57] mb-1 block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Licensed State
                </label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E8E4DF] rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-[#6B9080]"
                >
                  <option value="">All States</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* Min Rating Filter */}
              <div>
                <label className="text-sm font-medium text-[#3A4A57] mb-1 block flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  Minimum Rating
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-[#E8E4DF] rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-[#6B9080]"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={4.7}>4.7+ Stars</option>
                  <option value={4.9}>4.9+ Stars</option>
                </select>
              </div>

              {/* Availability Filter */}
              <div>
                <label className="text-sm font-medium text-[#3A4A57] mb-1 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Availability
                </label>
                <div className="flex items-center gap-2 h-[38px]">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, availableThisWeek: !prev.availableThisWeek }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      filters.availableThisWeek
                        ? 'bg-[#6B9080]/10 border-[#6B9080]/30 text-[#6B9080]'
                        : 'bg-white border-[#E8E4DF] text-[#3A4A57] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 inline mr-1 ${filters.availableThisWeek ? 'opacity-100' : 'opacity-0'}`} />
                    Available This Week
                  </button>
                </div>
              </div>

              {/* Max Price Filter */}
              <div>
                <label className="text-sm font-medium text-[#3A4A57] mb-1 block flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Max Price: {filters.maxPrice >= 500 ? 'Any' : `$${filters.maxPrice}`}
                </label>
                <input
                  type="range"
                  min={25}
                  max={500}
                  step={25}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                  className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="flex justify-between text-xs text-[#8A9BA8] mt-1">
                  <span>$25</span>
                  <span>$500+</span>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="mt-4">
              <label className="text-sm font-medium text-[#3A4A57] mb-2 block flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                Languages
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.slice(0, 8).map(lang => (
                  <button
                    key={lang}
                    onClick={() => toggleArrayFilter('languages', lang)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.languages.includes(lang)
                        ? 'bg-[#6B9080]/10 border-[#6B9080]/30 text-[#6B9080] border'
                        : 'bg-white border-[#E8E4DF] text-[#5A6B7A] border hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditions */}
            <div className="mt-4">
              <label className="text-sm font-medium text-[#3A4A57] mb-2 block flex items-center gap-1">
                <Brain className="w-3.5 h-3.5" />
                Experience With
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_CONDITIONS.map(cond => (
                  <button
                    key={cond}
                    onClick={() => toggleArrayFilter('conditions', cond)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.conditions.includes(cond)
                        ? 'bg-violet-100 border-violet-300 text-violet-700 border'
                        : 'bg-white border-[#E8E4DF] text-[#5A6B7A] border hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Specialties */}
            <div className="mt-4">
              <label className="text-sm font-medium text-[#3A4A57] mb-2 block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Specialties
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_SPECIALTIES.slice(0, 12).map(spec => (
                  <button
                    key={spec}
                    onClick={() => toggleArrayFilter('specialties', spec)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.specialties.includes(spec)
                        ? 'bg-[#6B9080]/10 border-cyan-300 text-cyan-700 border'
                        : 'bg-white border-[#E8E4DF] text-[#5A6B7A] border hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Insurance */}
            <div className="mt-4">
              <label className="text-sm font-medium text-[#3A4A57] mb-2 block flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Insurance Accepted
              </label>
              <div className="flex flex-wrap gap-2">
                {INSURANCE_PROVIDERS.slice(0, 8).map(ins => (
                  <button
                    key={ins}
                    onClick={() => toggleArrayFilter('insurances', ins)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.insurances.includes(ins)
                        ? 'bg-green-100 border-green-300 text-green-700 border'
                        : 'bg-white border-[#E8E4DF] text-[#5A6B7A] border hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {ins}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-4 border-t border-[#6B9080]/20">
                <div className="flex items-center gap-2 text-sm text-[#6B9080]">
                  <Check className="w-4 h-4" />
                  <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied</span>
                  <span className="text-[#8A9BA8]">·</span>
                  <span>{filteredProviders.length} matching provider{filteredProviders.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex gap-3 sm:gap-4">
                  <div className="w-16 h-16 bg-[#E8E4DF] rounded-2xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-[#E8E4DF] rounded w-1/3" />
                    <div className="h-3 bg-[#E8E4DF] rounded w-1/4" />
                    <div className="h-3 bg-[#E8E4DF] rounded w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          searchQuery ? (
            <EmptySearchResults
              searchTerm={searchQuery}
              onClear={() => setSearchQuery('')}
            />
          ) : (
            <EmptyProviders
              headline="Verified providers are not available yet"
              description="Aminy only shows real provider availability during limited launch. Use AI guidance today and check back when live openings are verified."
            />
          )
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredProviders.map(renderProviderCard)}
          </div>
        )}
      </div>

      {/* Session Types - Clean, Parent-Friendly Display */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Card className="p-5 sm:p-6 bg-gradient-to-br from-white to-gray-50">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-[#1B2733] mb-2">
              Expert Support for Your Family
            </h3>
            <p className="text-sm text-[#5A6B7A] max-w-xl mx-auto">
              Every session includes a video call, written summary, personalized recommendations, and follow-up support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Behavioral Support */}
            <div className="bg-white rounded-xl p-4 border border-[#E8E4DF]">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-[#6B9080]/10 rounded-lg">
                  <Brain className="w-4 h-4 text-[#6B9080]" />
                </div>
                <h4 className="font-medium text-[#1B2733]">Behavioral Support</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">ABA Specialist Consultation</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 60 min with a BCBA</p>
                  </div>
                  <span className="font-semibold text-[#6B9080]">$149</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">ABA Assessment</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 90 min comprehensive review</p>
                  </div>
                  <span className="font-semibold text-[#6B9080]">$269</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">ABA Coaching Session</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 30 min skill-building</p>
                  </div>
                  <span className="font-semibold text-[#6B9080]">$49</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">ABA Extended Coaching</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 60 min deeper practice</p>
                  </div>
                  <span className="font-semibold text-[#6B9080]">$89</span>
                </div>
              </div>
            </div>

            {/* Therapy & Wellness */}
            <div className="bg-white rounded-xl p-4 border border-[#E8E4DF]">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Heart className="w-4 h-4 text-violet-600" />
                </div>
                <h4 className="font-medium text-[#1B2733]">Therapy & Wellness</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">Family Therapy</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 45 min with licensed therapist</p>
                  </div>
                  <span className="font-semibold text-violet-600">$129</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">Extended Therapy Session</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 60 min for complex needs</p>
                  </div>
                  <span className="font-semibold text-violet-600">$149</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">Speech Therapy</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 45 min communication support</p>
                  </div>
                  <span className="font-semibold text-violet-600">$139</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium text-[#1B2733] text-sm">Occupational Therapy</p>
                    <p className="text-xs text-[#5A6B7A]">Up to 45 min sensory & motor skills</p>
                  </div>
                  <span className="font-semibold text-violet-600">$139</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluations */}
          <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="font-medium text-[#1B2733]">Diagnostic Evaluations</h4>
                <p className="text-xs text-[#5A6B7A]">Skip the 12-month waitlist. Get answers in days.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="font-medium text-[#1B2733] text-sm">ADHD Evaluation</p>
                <p className="text-xs text-[#5A6B7A] mb-1">Up to 60 min</p>
                <span className="font-semibold text-amber-600 text-lg">$299</span>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="font-medium text-[#1B2733] text-sm">Autism Evaluation</p>
                <p className="text-xs text-[#5A6B7A] mb-1">Up to 90 min</p>
                <span className="font-semibold text-amber-600 text-lg">$799</span>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="font-medium text-[#1B2733] text-sm">Combined Evaluation</p>
                <p className="text-xs text-[#5A6B7A] mb-1">Up to 120 min</p>
                <span className="font-semibold text-amber-600 text-lg">$999</span>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="mt-5 pt-5 border-t border-[#E8E4DF]">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#5A6B7A]">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" />
                Video session from home
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" />
                Written summary & recommendations
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" />
                Follow-up messaging included
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" />
                Superbill for insurance
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Trust Footer */}
      <div className="bg-white border-t border-[#E8E4DF] py-6">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 sm:gap-6 text-sm text-[#5A6B7A]">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              HIPAA-conscious
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Licensed Providers
            </span>
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4 text-green-500" />
              Secure Telehealth
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              24hr Cancellation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Provider type explanation card for parents
 */
export function ProviderTeamExplainer() {
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <h3 className="font-semibold text-[#1B2733] mb-4">Understanding Your Care Team</h3>
      <p className="text-[#5A6B7A] mb-4 sm:mb-6">
        Think of your child's care team like building a house:
      </p>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-start gap-3 p-4 bg-[#6B9080]/10 rounded-xl">
          <GraduationCap className="w-6 h-6 text-[#6B9080] mt-1" />
          <div>
            <h4 className="font-medium text-[#1B2733]">BCBA & RBT - The Architect & Builder</h4>
            <p className="text-sm text-[#5A6B7A]">
              The BCBA designs the blueprint for behavior support. The RBT helps implement strategies day-to-day.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-violet-50 rounded-xl">
          <Heart className="w-6 h-6 text-violet-600 mt-1" />
          <div>
            <h4 className="font-medium text-[#1B2733]">LPC/LCSW - The Climate Specialist</h4>
            <p className="text-sm text-[#5A6B7A]">
              They ensure the emotional "atmosphere" is comfortable and healthy, especially during anxiety or ADHD storms.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
          <MessageSquare className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h4 className="font-medium text-[#1B2733]">SLP & OT - The Specialists</h4>
            <p className="text-sm text-[#5A6B7A]">
              Communication bridge-builders and sensory experts who help with specific skill areas.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
          <Stethoscope className="w-6 h-6 text-red-600 mt-1" />
          <div>
            <h4 className="font-medium text-[#1B2733]">Psychiatrist & Dev Ped - The Medical Captains</h4>
            <p className="text-sm text-[#5A6B7A]">
              When medication or comprehensive evaluations are needed, they guide the medical aspects.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
