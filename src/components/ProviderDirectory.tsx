import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { DisclaimerFooter } from './DisclaimerFooter';
import { UrgentHelpModal } from './UrgentHelpModal';
import { HelpCenter } from './HelpCenter';
import { ChildProfileChip } from './ChildProfileChip';
import { useDisplayNames } from '../lib/name-store';
import { toast } from 'sonner';
import {
  Bell,
  Search,
  MapPin,
  Star,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  Filter,
  Heart,
  MessageSquare,
  Calendar,
  ArrowRight,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Share,
  AlertTriangle,
  User,
  Building,
  Award,
  Zap,
  Shield
} from 'lucide-react';

interface ProviderDirectoryProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier?: string;
  onClose?: () => void;
  onPaywallTrigger?: () => void;
}

interface Provider {
  id: string;
  name: string;
  title: string;
  practice: string;
  specialty: string[];
  rating: number;
  reviewCount: number;
  distance: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  acceptingNew: boolean;
  insuranceAccepted: string[];
  languages: string[];
  availability: string;
  experience: string;
  approach: string;
  isBookmarked: boolean;
  profileImage?: string;
  badges: string[];
}

export function ProviderDirectory({ 
  userData, 
  userTier = 'starter',
  onClose,
  onPaywallTrigger 
}: ProviderDirectoryProps) {
  const { caregiverShort, childShort } = useDisplayNames();
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'aba' | 'speech' | 'occupational' | 'behavioral'>('all');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Safe data extraction
  const safeUserData = userData || { parentName: 'Parent', childName: 'Child' };
  const safeChildName = safeUserData.childName || childShort || 'Child';
  const safeCaregiverName = safeUserData.parentName || caregiverShort || 'Parent';

  // Aminy Provider Network - Verified providers available through the platform
  const [providers, setProviders] = useState<Provider[]>([
    {
      id: '1',
      name: 'Dr. Sarah Chen, BCBA-D',
      title: 'Clinical Director & Board Certified Behavior Analyst - Doctoral',
      practice: 'Aminy Provider Network',
      specialty: ['ABA Therapy', 'Autism Spectrum Disorders', 'Parent Training', 'Early Intervention'],
      rating: 4.9,
      reviewCount: 156,
      distance: 'Gilbert, AZ',
      address: 'Available via Telehealth',
      phone: '(480) 555-0101',
      email: 'providers@aminy.app',
      acceptingNew: true,
      insuranceAccepted: ['AHCCCS/DDD', 'Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealth', 'Cash Pay'],
      languages: ['English', 'Mandarin'],
      availability: 'Telehealth: Mon-Fri 7AM-7PM MST',
      experience: '15+ years',
      approach: 'Family-centered ABA with focus on naturalistic teaching and parent empowerment. Specializes in early intervention and complex cases.',
      isBookmarked: false,
      badges: ['BHCOE Accredited', 'Telehealth', 'Clinical Director', '$175/session']
    },
    {
      id: '2',
      name: 'Marcus Johnson, BCBA',
      title: 'Senior Board Certified Behavior Analyst',
      practice: 'Aminy Provider Network',
      specialty: ['ABA Therapy', 'Social Skills', 'Transition Planning', 'Teen/Adult Services'],
      rating: 4.8,
      reviewCount: 98,
      distance: 'Mesa, AZ',
      address: 'Available via Telehealth',
      phone: '(480) 555-0102',
      email: 'providers@aminy.app',
      acceptingNew: true,
      insuranceAccepted: ['AHCCCS/DDD', 'Blue Cross Blue Shield', 'Aetna', 'Cash Pay'],
      languages: ['English', 'Spanish'],
      availability: 'Telehealth: Mon-Thu 8AM-6PM MST',
      experience: '10+ years',
      approach: 'Specializes in teens and young adults with autism. Focus on social skills, independence, and life transitions.',
      isBookmarked: false,
      badges: ['BHCOE Accredited', 'Telehealth', 'Teen Specialist', '$150/session']
    },
    {
      id: '3',
      name: 'Dr. Emily Rodriguez, BCBA-D',
      title: 'Board Certified Behavior Analyst - Doctoral',
      practice: 'Aminy Provider Network',
      specialty: ['ABA Therapy', 'Speech/Communication', 'Feeding Challenges', 'Sensory Integration'],
      rating: 4.9,
      reviewCount: 134,
      distance: 'Gilbert, AZ',
      address: 'Available via Telehealth',
      phone: '(480) 555-0103',
      email: 'providers@aminy.app',
      acceptingNew: true,
      insuranceAccepted: ['AHCCCS/DDD', 'Cigna', 'UnitedHealth', 'Cash Pay'],
      languages: ['English', 'Spanish'],
      availability: 'Telehealth: Tue-Sat 9AM-5PM MST',
      experience: '12+ years',
      approach: 'Integrates speech and language goals with ABA. Expert in feeding therapy and sensory challenges.',
      isBookmarked: false,
      badges: ['BHCOE Accredited', 'Telehealth', 'Feeding Specialist', '$175/session']
    },
    {
      id: '4',
      name: 'Ashley Thompson, RBT',
      title: 'Registered Behavior Technician',
      practice: 'Aminy Provider Network',
      specialty: ['ABA Therapy', 'Play-Based Learning', 'Daily Living Skills', 'Routine Building'],
      rating: 4.9,
      reviewCount: 87,
      distance: 'Mesa, AZ',
      address: 'Available via Telehealth',
      phone: '(480) 555-0104',
      email: 'providers@aminy.app',
      acceptingNew: true,
      insuranceAccepted: ['AHCCCS/DDD', 'Cash Pay'],
      languages: ['English'],
      availability: 'Telehealth: Mon-Fri 3PM-7PM MST',
      experience: '5+ years',
      approach: 'Energetic and creative approach. Specializes in making learning fun through play-based interventions.',
      isBookmarked: false,
      badges: ['BHCOE Accredited', 'Telehealth', 'Great with Kids', '$75/session']
    },
    {
      id: '5',
      name: 'David Park, BCBA',
      title: 'Board Certified Behavior Analyst',
      practice: 'Aminy Provider Network',
      specialty: ['ABA Therapy', 'Challenging Behaviors', 'Crisis Prevention', 'School Consultation'],
      rating: 4.8,
      reviewCount: 112,
      distance: 'Gilbert, AZ',
      address: 'Available via Telehealth',
      phone: '(480) 555-0105',
      email: 'providers@aminy.app',
      acceptingNew: true,
      insuranceAccepted: ['AHCCCS/DDD', 'Blue Cross Blue Shield', 'Aetna', 'Cash Pay'],
      languages: ['English', 'Korean'],
      availability: 'Telehealth: Mon-Fri 8AM-4PM MST',
      experience: '8+ years',
      approach: 'Expert in functional behavior assessments and behavior intervention plans. Works closely with schools.',
      isBookmarked: false,
      badges: ['BHCOE Accredited', 'Telehealth', 'Behavior Specialist', '$150/session']
    },
    {
      id: '6',
      name: 'Jennifer Martinez, RBT',
      title: 'Registered Behavior Technician',
      practice: 'Aminy Provider Network',
      specialty: ['ABA Therapy', 'Early Childhood', 'Communication', 'Parent Coaching'],
      rating: 4.9,
      reviewCount: 76,
      distance: 'Mesa, AZ',
      address: 'Available via Telehealth',
      phone: '(480) 555-0106',
      email: 'providers@aminy.app',
      acceptingNew: true,
      insuranceAccepted: ['AHCCCS/DDD', 'Cash Pay'],
      languages: ['English', 'Spanish'],
      availability: 'Telehealth: Mon-Wed-Fri 9AM-3PM MST',
      experience: '4+ years',
      approach: 'Bilingual specialist focusing on early learners. Strong emphasis on parent coaching and home strategies.',
      isBookmarked: false,
      badges: ['BHCOE Accredited', 'Telehealth', 'Bilingual', '$75/session']
    }
  ]);

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = searchQuery === '' || 
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.specialty.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      provider.practice.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
      provider.specialty.some(s => s.toLowerCase().includes(selectedFilter));
    
    return matchesSearch && matchesFilter;
  });

  const getSpecialtyColor = (specialty: string) => {
    if (specialty.includes('ABA') || specialty.includes('Behavior')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (specialty.includes('Speech') || specialty.includes('Language')) return 'bg-green-100 text-green-800 border-green-200';
    if (specialty.includes('Occupational') || specialty.includes('Sensory')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const toggleBookmark = (providerId: string) => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    setProviders(prev => prev.map(provider => 
      provider.id === providerId 
        ? { ...provider, isBookmarked: !provider.isBookmarked }
        : provider
    ));

    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      toast.success(provider.isBookmarked ? 'Bookmark removed' : 'Provider bookmarked', {
        description: provider.isBookmarked 
          ? `${provider.name} removed from bookmarks` 
          : `${provider.name} added to bookmarks`,
        duration: 2000,
      });
    }
  };

  const handleContactProvider = (provider: Provider, method: 'phone' | 'email' | 'website') => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    switch (method) {
      case 'phone':
        window.open(`tel:${provider.phone}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:${provider.email}?subject=Inquiry for ${safeChildName}`, '_blank');
        break;
      case 'website':
        if (provider.website) {
          window.open(`https://${provider.website}`, '_blank');
        }
        break;
    }

    toast.success('Contact initiated', {
      description: `Opening ${method} for ${provider.name}`,
      duration: 2000,
    });
  };

  const handleScheduleConsultation = (provider: Provider) => {
    if (userTier === 'starter' && onPaywallTrigger) {
      onPaywallTrigger();
      return;
    }

    toast.success('Consultation request sent', {
      description: `Your request has been sent to ${provider.name}. They will contact you within 24-48 hours.`,
      duration: 4000,
    });
  };

  const renderProviderCard = (provider: Provider) => (
    <Card key={provider.id} className="p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {provider.name}
              </h3>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-current" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {provider.rating}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ({provider.reviewCount})
                </span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-1">{provider.title}</p>
            <p className="text-slate-500 dark:text-slate-500 text-sm mb-2">{provider.practice}</p>
            
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{provider.distance}</span>
              {provider.acceptingNew ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Accepting New Patients
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  Waitlist Available
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {provider.specialty.slice(0, 3).map((specialty, index) => (
                <Badge key={index} className={getSpecialtyColor(specialty)}>
                  {specialty}
                </Badge>
              ))}
              {provider.specialty.length > 3 && (
                <Badge variant="outline">
                  +{provider.specialty.length - 3} more
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {provider.badges.map((badge, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {badge === 'Insurance Verified' && <Shield className="w-3 h-3 mr-1" />}
                  {badge === 'Top Rated' && <Award className="w-3 h-3 mr-1" />}
                  {badge === 'Telehealth Available' && <Zap className="w-3 h-3 mr-1" />}
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleBookmark(provider.id)}
          className="p-2"
          disabled={userTier === 'starter'}
        >
          {provider.isBookmarked ? (
            <BookmarkCheck className="w-5 h-5 text-blue-600" />
          ) : (
            <Bookmark className="w-5 h-5 text-slate-400" />
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">{provider.availability}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">{provider.experience} experience</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">
              {provider.languages.join(', ')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">
              {provider.insuranceAccepted.length} insurances accepted
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => handleScheduleConsultation(provider)}
          disabled={userTier === 'starter'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Consultation
          {userTier === 'starter' && <Badge variant="secondary" className="ml-2">Pro</Badge>}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleContactProvider(provider, 'phone')}
          disabled={userTier === 'starter'}
        >
          <Phone className="w-4 h-4 mr-2" />
          Call
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleContactProvider(provider, 'email')}
          disabled={userTier === 'starter'}
        >
          <Mail className="w-4 h-4 mr-2" />
          Email
        </Button>
        
        {provider.website && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleContactProvider(provider, 'website')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Website
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl text-slate-900 dark:text-slate-100">Provider Directory</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Find qualified providers for {safeChildName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUrgentHelp(true)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Bell className="w-4 h-4" />
              </Button>
              <ChildProfileChip 
                child={{
                  name: safeChildName,
                  profileImage: undefined
                }}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {/* Tier Notice for Starter Users */}
        {userTier === 'starter' && (
          <Card className="mb-4 sm:mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-900 dark:text-amber-100">
                    Provider Directory (Pro Feature)
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Upgrade to Pro to contact providers, schedule consultations, and access verified care teams.
                  </p>
                </div>
                <Button
                  onClick={onPaywallTrigger}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Upgrade to Pro
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-4 sm:mb-6">
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search providers, specialties, or practices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={selectedFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('all')}
                >
                  All Providers
                </Button>
                <Button
                  variant={selectedFilter === 'aba' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('aba')}
                >
                  ABA
                </Button>
                <Button
                  variant={selectedFilter === 'speech' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('speech')}
                >
                  Speech
                </Button>
                <Button
                  variant={selectedFilter === 'occupational' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('occupational')}
                >
                  OT
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {filteredProviders.length} Providers Found
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Verified providers in your area accepting new patients
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
            <Button variant="outline" size="sm">
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </Button>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {filteredProviders.map(renderProviderCard)}
        </div>

        {/* No Results */}
        {filteredProviders.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No providers found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Try adjusting your search criteria or filters to find more providers.
            </p>
            <Button onClick={() => { setSearchQuery(''); setSelectedFilter('all'); }}>
              Clear Filters
            </Button>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <div className="p-4 sm:p-5 md:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Need Help Finding the Right Provider?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <Button variant="outline" className="h-auto p-4 justify-start">
                <MessageSquare className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Chat with Care Team</div>
                  <div className="text-sm text-slate-500">Get personalized recommendations</div>
                </div>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 justify-start">
                <Phone className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Call Support</div>
                  <div className="text-sm text-slate-500">Speak with a care coordinator</div>
                </div>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 justify-start">
                <Heart className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Request Referral</div>
                  <div className="text-sm text-slate-500">Get matched with providers</div>
                </div>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      {showUrgentHelp && (
        <UrgentHelpModal onClose={() => setShowUrgentHelp(false)} />
      )}

      {showHelpCenter && (
        <HelpCenter onClose={() => setShowHelpCenter(false)} />
      )}

      <DisclaimerFooter />
    </div>
  );
}