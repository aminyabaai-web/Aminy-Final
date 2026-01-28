/**
 * ProviderMarketplace.tsx
 *
 * Premium marketplace experience for booking provider sessions.
 * Positions providers as "guides" who help families navigate the journey.
 *
 * Provider Types:
 * - Behavioral Team: BCBA ($99), RBT ($49)
 * - Therapy Team: LPC ($99), LCSW ($99), SLP ($89), OT ($99)
 * - Medical Team: Psychiatrist ($275 initial, $150 follow-up), Dev Pediatrician ($350/$175)
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
  UserSearch
} from 'lucide-react';
import { EmptyProviders, EmptySearchResults } from './ui/empty-state';
import { providerTypes, type ProviderType, type ProviderTypeInfo } from '../lib/child-profiles';
import { brandColors, getColorForProvider } from '../lib/brand-system';

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
  bio: string;
  approach: string;
  availability: AvailabilitySlot[];
  nextAvailable: string;
  isBookmarked: boolean;
  badges: string[];
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
}

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
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
};

export function ProviderMarketplace({
  childId,
  childName,
  childConditions = [],
  userTier = 'core',
  onBookSession,
  onViewProvider
}: ProviderMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'behavioral' | 'therapy' | 'medical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MarketplaceProvider | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load providers from Supabase with fallback to mock data
  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    console.log('[Marketplace] Loading providers from Supabase...');

    try {
      // Build query based on category filter
      let query = supabase
        .from('provider_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('is_accepting_patients', true);

      // Filter by category
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

      // Execute query
      const { data, error } = await query.order('rating', { ascending: false });

      if (error) {
        console.error('[Marketplace] Supabase error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`[Marketplace] Found ${data.length} providers from DB`);
        // Transform DB data to component format
        const dbProviders: MarketplaceProvider[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          credentials: p.credentials,
          type: p.provider_type as ProviderType,
          photoUrl: p.photo_url,
          rating: p.rating || 4.5,
          reviewCount: p.review_count || 0,
          yearsExperience: p.years_experience || 5,
          specialties: p.specialties || [],
          conditions: p.conditions || [],
          languages: p.languages || ['English'],
          bio: p.bio || '',
          approach: p.approach || '',
          availability: generateAvailability(), // Generate dynamic availability
          nextAvailable: 'Check schedule',
          isBookmarked: false,
          badges: p.badges || []
        }));
        setProviders(dbProviders);
      } else {
        // Fallback to mock data if no DB providers
        console.log('[Marketplace] No DB providers, using mock data');
        setProviders(generateMockProviders());
      }
    } catch (error) {
      console.error('[Marketplace] Failed to load providers:', error);
      // Use mock data as fallback
      setProviders(generateMockProviders());
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const generateMockProviders = (): MarketplaceProvider[] => [
    // BEHAVIORAL TEAM
    {
      id: 'prov-1',
      name: 'Dr. Sarah Chen',
      credentials: 'BCBA-D',
      type: 'bcba',
      rating: 4.9,
      reviewCount: 156,
      yearsExperience: 15,
      specialties: ['Early Intervention', 'Parent Training', 'Complex Cases'],
      conditions: ['Autism', 'ADHD', 'Developmental Delay'],
      languages: ['English', 'Mandarin'],
      bio: 'Clinical Director with 15+ years specializing in early intervention and family-centered ABA.',
      approach: 'I believe parents are the experts on their children. My role is to give you the tools and confidence to help your child thrive.',
      availability: generateAvailability(),
      nextAvailable: 'Tomorrow 10:00 AM',
      isBookmarked: false,
      badges: ['Top Rated', 'Clinical Director']
    },
    {
      id: 'prov-2',
      name: 'Marcus Johnson',
      credentials: 'BCBA',
      type: 'bcba',
      rating: 4.8,
      reviewCount: 98,
      yearsExperience: 10,
      specialties: ['Teen Services', 'Social Skills', 'Transition Planning'],
      conditions: ['Autism', 'ADHD', 'Anxiety'],
      languages: ['English', 'Spanish'],
      bio: 'Specializing in teens and young adults, focusing on independence and life skills.',
      approach: 'Helping young people find their voice and build the skills they need for adult life.',
      availability: generateAvailability(),
      nextAvailable: 'Today 3:00 PM',
      isBookmarked: true,
      badges: ['Teen Specialist']
    },
    {
      id: 'prov-3',
      name: 'Ashley Thompson',
      credentials: 'RBT',
      type: 'rbt',
      rating: 4.9,
      reviewCount: 87,
      yearsExperience: 5,
      specialties: ['Play-Based Learning', 'Daily Routines', 'Early Childhood'],
      conditions: ['Autism', 'Developmental Delay'],
      languages: ['English'],
      bio: 'Energetic and creative RBT who makes learning fun through play.',
      approach: 'I meet kids where they are and build on their interests to teach new skills.',
      availability: generateAvailability(),
      nextAvailable: 'Tomorrow 2:00 PM',
      isBookmarked: false,
      badges: ['Great with Kids']
    },

    // THERAPY TEAM
    {
      id: 'prov-4',
      name: 'Dr. Emily Rodriguez',
      credentials: 'LPC, NCC',
      type: 'lpc',
      rating: 4.9,
      reviewCount: 134,
      yearsExperience: 12,
      specialties: ['Anxiety', 'Emotional Regulation', 'Family Therapy'],
      conditions: ['Anxiety', 'ADHD', 'Autism', 'Depression'],
      languages: ['English', 'Spanish'],
      bio: 'Helping families navigate the emotional landscape of neurodivergence.',
      approach: 'I create a safe space for both children and parents to process feelings and build coping skills.',
      availability: generateAvailability(),
      nextAvailable: 'Today 5:00 PM',
      isBookmarked: false,
      badges: ['Anxiety Specialist', 'Bilingual']
    },
    {
      id: 'prov-5',
      name: 'Jessica Kim',
      credentials: 'LCSW',
      type: 'lcsw',
      rating: 4.8,
      reviewCount: 112,
      yearsExperience: 8,
      specialties: ['System Navigation', 'IEP Advocacy', 'Parent Support'],
      conditions: ['Autism', 'ADHD', 'Learning Disability'],
      languages: ['English', 'Korean'],
      bio: 'Your advocate in navigating schools, insurance, and community resources.',
      approach: 'I help families understand their rights and get the services they deserve.',
      availability: generateAvailability(),
      nextAvailable: 'Thursday 11:00 AM',
      isBookmarked: false,
      badges: ['IEP Expert', 'Advocacy Pro']
    },
    {
      id: 'prov-6',
      name: 'Dr. Michael Chen',
      credentials: 'CCC-SLP',
      type: 'slp',
      rating: 4.9,
      reviewCount: 145,
      yearsExperience: 14,
      specialties: ['AAC', 'Social Communication', 'Feeding'],
      conditions: ['Autism', 'Speech Delay', 'Developmental Delay'],
      languages: ['English', 'Cantonese'],
      bio: 'Speech-language pathologist specializing in AAC and social communication.',
      approach: 'Every child has something to say. My job is to help them find their voice.',
      availability: generateAvailability(),
      nextAvailable: 'Wednesday 9:00 AM',
      isBookmarked: false,
      badges: ['AAC Specialist']
    },
    {
      id: 'prov-7',
      name: 'Rachel Martinez',
      credentials: 'OTR/L',
      type: 'ot',
      rating: 4.8,
      reviewCount: 98,
      yearsExperience: 9,
      specialties: ['Sensory Processing', 'Fine Motor', 'Self-Care Skills'],
      conditions: ['Sensory Processing', 'Autism', 'ADHD'],
      languages: ['English', 'Spanish'],
      bio: 'Helping children regulate their sensory systems and master daily skills.',
      approach: 'I use sensory strategies and play to help kids feel comfortable in their bodies.',
      availability: generateAvailability(),
      nextAvailable: 'Friday 10:00 AM',
      isBookmarked: false,
      badges: ['Sensory Expert']
    },

    // MEDICAL TEAM
    {
      id: 'prov-8',
      name: 'Dr. Amanda Foster',
      credentials: 'MD, Child Psychiatrist',
      type: 'psychiatrist',
      rating: 4.9,
      reviewCount: 167,
      yearsExperience: 18,
      specialties: ['Medication Management', 'Complex Diagnoses', 'ADHD'],
      conditions: ['ADHD', 'Anxiety', 'Autism', 'Depression', 'OCD'],
      languages: ['English'],
      bio: 'Board-certified child psychiatrist with expertise in neurodevelopmental conditions.',
      approach: 'I take a conservative, collaborative approach to medication, always involving families in decisions.',
      availability: generateAvailability(),
      nextAvailable: 'Next Week',
      isBookmarked: false,
      badges: ['Board Certified', 'Top Rated']
    },
    {
      id: 'prov-9',
      name: 'Dr. David Park',
      credentials: 'MD, Developmental Pediatrician',
      type: 'pediatrician',
      rating: 4.9,
      reviewCount: 189,
      yearsExperience: 20,
      specialties: ['Diagnostic Evaluations', 'Developmental Assessments', 'Autism'],
      conditions: ['Autism', 'ADHD', 'Developmental Delay', 'Learning Disability'],
      languages: ['English', 'Korean'],
      bio: 'Developmental pediatrician providing comprehensive evaluations and care coordination.',
      approach: 'I see the whole child and work with families to create a complete picture of their needs.',
      availability: generateAvailability(),
      nextAvailable: '2 Weeks',
      isBookmarked: false,
      badges: ['Diagnostic Expert', 'Highly Sought']
    }
  ];

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
        return matchesName || matchesSpecialty || matchesCondition;
      }

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
        <div className="flex items-start gap-4">
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
                <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                  {provider.name}, {provider.credentials}
                </h3>
                <p className="text-sm text-gray-500">{typeInfo.fullTitle}</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="font-medium">{provider.rating}</span>
                <span className="text-gray-400">({provider.reviewCount})</span>
              </div>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {provider.specialties.slice(0, 3).map((spec, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>

            {/* Quick info */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
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
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Book Session
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Badges */}
        {provider.badges.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Find Your Guide</h1>
              <p className="text-teal-100">
                Expert providers to support {childName ? `${childName}'s` : 'your family\'s'} journey
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, specialty, or condition..."
              className="pl-12 h-12 bg-white text-gray-900 border-0 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Banner (if child conditions provided) */}
      {childConditions.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Recommended for {childName}</h3>
                <p className="text-sm text-gray-600">
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
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} available
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-2xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
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
            <EmptyProviders />
          )
        ) : (
          <div className="space-y-4">
            {filteredProviders.map(renderProviderCard)}
          </div>
        )}
      </div>

      {/* Session Types Reference */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-400" />
            Session Types & Pricing
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Behavioral */}
            <div>
              <h4 className="font-medium text-teal-700 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Behavioral Team
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>BCBA Consultation (50min)</span>
                  <span className="font-medium">$99</span>
                </div>
                <div className="flex justify-between">
                  <span>BCBA Assessment (90min)</span>
                  <span className="font-medium">$175</span>
                </div>
                <div className="flex justify-between">
                  <span>RBT Check-in (30min)</span>
                  <span className="font-medium">$49</span>
                </div>
                <div className="flex justify-between">
                  <span>RBT Session (45min)</span>
                  <span className="font-medium">$69</span>
                </div>
              </div>
            </div>

            {/* Therapy */}
            <div>
              <h4 className="font-medium text-violet-700 mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Therapy Team
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>LPC/LCSW Session (50min)</span>
                  <span className="font-medium">$99</span>
                </div>
                <div className="flex justify-between">
                  <span>Speech Session (45min)</span>
                  <span className="font-medium">$89</span>
                </div>
                <div className="flex justify-between">
                  <span>OT Session (45min)</span>
                  <span className="font-medium">$99</span>
                </div>
              </div>
            </div>

            {/* Medical */}
            <div>
              <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Medical Team
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Psych Initial (60min)</span>
                  <span className="font-medium">$275</span>
                </div>
                <div className="flex justify-between">
                  <span>Psych Follow-up (25min)</span>
                  <span className="font-medium">$150</span>
                </div>
                <div className="flex justify-between">
                  <span>Dev Ped Eval (90min)</span>
                  <span className="font-medium">$350</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            All sessions are caregiver-mediated telehealth. Pro members receive 20% off.
          </p>
        </Card>
      </div>

      {/* Trust Footer */}
      <div className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              HIPAA Compliant
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
    <Card className="p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Understanding Your Care Team</h3>
      <p className="text-gray-600 mb-6">
        Think of your child's care team like building a house:
      </p>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-xl">
          <GraduationCap className="w-6 h-6 text-teal-600 mt-1" />
          <div>
            <h4 className="font-medium text-gray-900">BCBA & RBT - The Architect & Builder</h4>
            <p className="text-sm text-gray-600">
              The BCBA designs the blueprint for behavior support. The RBT helps implement strategies day-to-day.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-violet-50 rounded-xl">
          <Heart className="w-6 h-6 text-violet-600 mt-1" />
          <div>
            <h4 className="font-medium text-gray-900">LPC/LCSW - The Climate Specialist</h4>
            <p className="text-sm text-gray-600">
              They ensure the emotional "atmosphere" is comfortable and healthy, especially during anxiety or ADHD storms.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
          <MessageSquare className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h4 className="font-medium text-gray-900">SLP & OT - The Specialists</h4>
            <p className="text-sm text-gray-600">
              Communication bridge-builders and sensory experts who help with specific skill areas.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
          <Stethoscope className="w-6 h-6 text-red-600 mt-1" />
          <div>
            <h4 className="font-medium text-gray-900">Psychiatrist & Dev Ped - The Medical Captains</h4>
            <p className="text-sm text-gray-600">
              When medication or comprehensive evaluations are needed, they guide the medical aspects.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
