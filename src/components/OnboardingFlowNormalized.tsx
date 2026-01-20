import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { JrSetupInterstitial } from './JrSetupInterstitial';
import { JrSetupWizard } from './JrSetupWizard';
import { ZIndexFixer } from './ZIndexFixer';
import { titleCase } from '../utils/format';
import { setCaregiverName, setChildName, broadcastNamesUpdated } from '../lib/name-store';
import { toast } from 'sonner';
import compassIcon from 'figma:asset/35ab3eb983f3091e601179cd6ce1629bbe517507.png';
import { 
  ArrowLeft,
  ArrowRight,
  Compass,
  Heart,
  User,
  Baby,
  Target,
  Brain,
  Shield,
  FileText,
  Sparkles,
  CheckCircle,
  Info,
  Upload,
  MessageSquare,
  Users,
  Clock,
  Zap,
  Puzzle,
  Volume2,
  Eye,
  Hand,
  AlertTriangle,
  School,
  Sunset,
  Moon,
  Calendar,
  Play,
  Award,
  Download,
  Share,
  HelpCircle,
  Sun,
  Sunrise,
  Edit3,
  CreditCard,
  GraduationCap,
  MapPin,
  X,
  ChevronRight
} from 'lucide-react';

// Data Interfaces
interface ParentProfile {
  firstName: string;
  lastName: string;
  preferredName?: string;
  relationship: string;
  state: string;
  email: string;
  insurance?: string;
}

interface ChildProfile {
  name: string;
  age: number;
  diagnoses: string[];
  communicationLevel: string;
  interests: string[];
  triggers: string[];
}

interface NeedsProfile {
  focusAreas: string[];
  tone: string;
  goals: string[];
  schedule: string[];
  additionalNeeds?: string;
}

interface SoftDxProfile {
  responses: Record<string, any>;
  uploads: string[];
  severity: string;
  concerns: string[];
  snapshot?: {
    strengths: string[];
    needs: string[];
    suggestedGoals: string[];
  };
  suggestedGoals?: string[];
}

interface CoverageProfile {
  hasDiagnosis: boolean;
  state: string;
  insurance?: string;
  resources: string[];
  benefitsChecklist?: {
    insurance?: 'covered' | 'unsure' | 'not-covered';
    earlyIntervention?: 'covered' | 'unsure' | 'not-covered';
    schoolSupports?: 'covered' | 'unsure' | 'not-covered';
    localCommunity?: 'covered' | 'unsure' | 'not-covered';
  };
  planTasks?: string[];
}

interface JrProfile {
  childNickname: string;
  childPin: string;
  voiceMode: 'off' | 'auto-captions' | 'voice-only';
  contentLevel: 'gentle' | 'standard';
  rewardsEnabled: boolean;
  baselineCompleted?: boolean;
  calibratedAt?: Date;
  pairedAt?: Date;
  deviceType?: 'this-device' | 'another-device';
  pairingCode?: string;
}

interface CarePlan {
  domains: string[];
  goals: any[];
  dailyTasks: any[];
  reinforcement: string[];
  timeline: string;
}

interface OnboardingData {
  parentProfile?: ParentProfile;
  childProfile?: ChildProfile;
  needsProfile?: NeedsProfile;
  jrProfile?: JrProfile;
  softDxProfile?: SoftDxProfile;
  coverageProfile?: CoverageProfile;
  carePlan?: CarePlan;
}

interface OnboardingFlowProps {
  onComplete: (planData?: any, skippedSteps?: string[]) => void;
}

// Step Components
const WelcomeStep: React.FC<{
  onNext: () => void;
  onLearnMore: () => void;
}> = ({ onNext, onLearnMore }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col px-4 py-8">
        {/* Progress Bar */}
        <div className="max-w-md mx-auto w-full mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Step 1 of 7</span>
            <span className="text-sm text-muted-foreground">14%</span>
          </div>
          <Progress value={14} className="h-2" />
        </div>

        {/* Card Body */}
        <div className="max-w-md mx-auto w-full">
          <div className="p-8 bg-white rounded-2xl aminy-card text-center">
            {/* Welcome Icon */}
            <div className="mb-6 flex justify-center">
              <div className="p-4 rounded-full compass-animate">
                <img 
                  src={compassIcon} 
                  alt="Compass" 
                  className="w-20 h-20" 
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-primary mb-4">
              Welcome to Aminy
            </h1>

            {/* Copy */}
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
              A companion for you and your child — creating calm routines, fun learning, and real progress.
            </p>

            {/* CTA Button */}
            <Button 
              onClick={onNext}
              className="w-full aminy-button-primary text-lg py-6 rounded-xl mb-4"
              size="lg"
            >
              Begin my journey
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            {/* Learn More Link */}

          </div>
        </div>
      </div>
    </div>
  );
};

const CaregiverInfoStep: React.FC<{
  data: ParentProfile;
  onUpdate: (data: ParentProfile) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ data, onUpdate, onNext, onBack }) => {
  const [formData, setFormData] = useState<ParentProfile>(() => ({
    firstName: data?.firstName || '',
    lastName: data?.lastName || '',
    preferredName: data?.preferredName || '',
    relationship: data?.relationship || '',
    state: data?.state || '',
    email: data?.email || '',
    insurance: data?.insurance || ''
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [insuranceInput, setInsuranceInput] = useState(() => data?.insurance || '');
  const [showInsuranceSuggestions, setShowInsuranceSuggestions] = useState(false);

  const relationships = [
    'Parent',
    'Caregiver',
    'Grandparent', 
    'Guardian',
    'Other'
  ];

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const insuranceProviders = [
    // Major National Insurers
    'Aetna',
    'Anthem Blue Cross Blue Shield',
    'Blue Cross Blue Shield',
    'Cigna',
    'UnitedHealthcare',
    'Humana',
    'Kaiser Permanente',
    'Molina Healthcare',
    'WellCare',
    'Centene Corporation',
    'Independence Blue Cross',
    
    // Government Programs
    'Medicaid',
    'Medicare',
    'Medicare Advantage',
    'TRICARE',
    'VA Healthcare',
    'CHIP (Children\'s Health Insurance Program)',
    
    // Regional Blues Plans
    'Anthem (Indiana, Kentucky, etc.)',
    'CareFirst BlueCross BlueShield',
    'Florida Blue',
    'Horizon Blue Cross Blue Shield of New Jersey',
    'Independence Blue Cross (Pennsylvania)',
    'Premera Blue Cross',
    'Regence BlueShield',
    'Wellmark Blue Cross Blue Shield',
    
    // Regional HMOs & PPOs
    'Geisinger Health Plan',
    'Group Health Cooperative',
    'Harvard Pilgrim Health Care',
    'Health Net',
    'HealthPartners',
    'Highmark',
    'L.A. Care Health Plan',
    'Medical Mutual of Ohio',
    'Priority Health',
    'UPMC Health Plan',
    
    // Medicaid Managed Care
    'Amerigroup',
    'CareSource',
    'Fidelis Care',
    'IlliniCare Health',
    'Meridian Health Plan',
    'Peach State Health Plan',
    'Simply Healthcare Plans',
    'Sunshine Health',
    'UnitedHealthcare Community Plan',
    'WellCare of Georgia',
    
    // Employer-Sponsored & Others
    'BCBS Federal Employee Program',
    'EmblemHealth',
    'Excellus BlueCross BlueShield',
    'Fallon Health',
    'Hawaii Medical Service Association',
    'Martin\'s Point Health Care',
    'Oscar Health',
    'SelectHealth',
    'Tufts Health Plan',
    
    // State-Specific Plans
    'Covered California',
    'NY State of Health',
    'MassHealth',
    'Apple Health (Washington)',
    'ConnectiCare',
    'Rhode Island Medicaid',
    
    'Other'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.relationship) newErrors.relationship = 'Relationship is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      // Persist caregiver name to localStorage - use preferred name if provided, otherwise first name
      const displayName = formData.preferredName?.trim() || formData.firstName;
      setCaregiverName(displayName);
      broadcastNamesUpdated();
      
      onUpdate(formData);
      onNext();
    }
  };

  const updateField = (field: keyof ParentProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleInsuranceChange = (value: string) => {
    setInsuranceInput(value);
    updateField('insurance', value);
    setShowInsuranceSuggestions(value.length > 0);
  };

  const selectInsurance = (provider: string) => {
    setInsuranceInput(provider);
    updateField('insurance', provider);
    setShowInsuranceSuggestions(false);
  };

  const filteredInsuranceProviders = insuranceProviders.filter(provider =>
    provider.toLowerCase().includes(insuranceInput.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white" style={{
      /* Create z-index token scale */
      '--z-tooltip': '800',
      '--z-select': '850', 
      '--z-popover': '900',
      '--z-modal': '1000'
    }}>
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step 2 of 7</span>
            <Badge variant="outline" className="text-xs">Caregiver Info</Badge>
          </div>
          <Progress value={28} className="h-2" />
        </div>
      </div>

      <div 
        className="max-w-md mx-auto px-4 py-8"
        style={{
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          position: 'relative',
          /* Remove transforms to avoid stacking context issues */
          /* Removed: transform, top, left that could break stacking */
        }}
      >
        <div className="text-center mb-8">
          <div className="p-3 bg-blue-100 rounded-full inline-flex mb-4">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-primary mb-2">Tell us about yourself</h2>
          <p className="text-muted-foreground">
            We'll use this to personalize recommendations.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium text-primary">
                First Name *
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="First name"
                className={`mt-2 aminy-input-left ${errors.firstName ? 'border-red-500' : ''}`}
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="lastName" className="text-sm font-medium text-primary">
                Last Name *
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Last name"
                className={`mt-2 aminy-input-left ${errors.lastName ? 'border-red-500' : ''}`}
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="preferredName" className="text-sm font-medium text-primary">
              Preferred Name
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              id="preferredName"
              value={formData.preferredName || ''}
              onChange={(e) => updateField('preferredName', e.target.value)}
              placeholder="What would you like to be called?"
              className="mt-2 aminy-input-left"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be used in personalized communications
            </p>
          </div>

          <div className="onboarding-relationship-select">
            <Label htmlFor="relationship" className="text-sm font-medium text-primary">
              Relationship to child *
            </Label>
            <Select value={formData.relationship} onValueChange={(value) => updateField('relationship', value)}>
              <SelectTrigger 
                className={`mt-2 aminy-state-select ${errors.relationship ? 'border-red-500' : ''}`}
                aria-expanded="false"
                aria-controls="relationship-content"
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: 1.2,
                  fontFeatureSettings: '"liga" 1',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  /* Removed transforms to avoid stacking context issues */
                }}
              >
                <SelectValue 
                  placeholder="Select relationship"
                  style={{
                    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: 1.2,
                    fontFeatureSettings: '"liga" 1',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}
                />
              </SelectTrigger>
              <SelectContent
                id="relationship-content"
                position="popper"
                sideOffset={6}
                avoidCollisions
                className="z-select rounded-xl shadow-lg border border-slate-200 bg-white will-change-transform"
                data-field-type="relationship"
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  zIndex: 'var(--z-select)',
                  /* Removed transforms to avoid stacking context issues */
                }}
              >
                {relationships.map((rel) => (
                  <SelectItem 
                    key={rel} 
                    value={rel.toLowerCase()}
                    style={{
                      fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: 1.2,
                      fontFeatureSettings: '"liga" 1',
                      textRendering: 'optimizeLegibility',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      /* Removed transforms to avoid stacking context issues */
                    }}
                  >
                    {rel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.relationship && (
              <p className="text-red-500 text-xs mt-1">{errors.relationship}</p>
            )}
          </div>

          <div className="onboarding-state-select">
            <Label htmlFor="state" className="text-sm font-medium text-primary">
              State *
            </Label>
            <Select value={formData.state} onValueChange={(value) => updateField('state', value)}>
              <SelectTrigger 
                className={`mt-2 aminy-state-select ${errors.state ? 'border-red-500' : ''}`}
                aria-expanded="false"
                aria-controls="state-content"
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: 1.2,
                  fontFeatureSettings: '"liga" 1',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  /* Removed transforms to avoid stacking context issues */
                }}
              >
                <SelectValue 
                  placeholder="Select your state"
                  style={{
                    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: 1.2,
                    fontFeatureSettings: '"liga" 1',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}
                />
              </SelectTrigger>
              <SelectContent
                id="state-content"
                position="popper"
                sideOffset={6}
                avoidCollisions
                className="z-select rounded-xl shadow-lg border border-slate-200 bg-white will-change-transform"
                data-field-type="state"
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  zIndex: 'var(--z-select)',
                  /* Removed transforms to avoid stacking context issues */
                }}
              >
                {states.map((state) => (
                  <SelectItem 
                    key={state} 
                    value={state.toLowerCase()}
                    style={{
                      fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: 1.2,
                      fontFeatureSettings: '"liga" 1',
                      textRendering: 'optimizeLegibility',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      /* Removed transforms to avoid stacking context issues */
                    }}
                  >
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-red-500 text-xs mt-1">{errors.state}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-primary">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="your.email@example.com"
              className={`mt-2 aminy-input-left ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div className="relative">
            <Label htmlFor="insurance" className="text-sm font-medium text-primary">
              Insurance Provider
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              id="insurance"
              value={insuranceInput || formData.insurance || ''}
              onChange={(e) => handleInsuranceChange(e.target.value)}
              onFocus={() => setShowInsuranceSuggestions(true)}
              onBlur={() => setTimeout(() => setShowInsuranceSuggestions(false), 200)}
              placeholder="Start typing or select from suggestions..."
              className="mt-2 aminy-input-left"
            />
            {showInsuranceSuggestions && filteredInsuranceProviders.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-popover max-h-40 overflow-y-auto" 
                   style={{ zIndex: 'var(--z-popover)' }}>
                {filteredInsuranceProviders.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm"
                    onClick={() => selectInsurance(provider)}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between aminy-form-navigation-breathing">
          <Button
            onClick={onBack}
            variant="outline"
            className="aminy-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="aminy-continue-button aminy-gentle-shimmer"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ChildInfoStep: React.FC<{
  data: ChildProfile;
  onUpdate: (data: ChildProfile) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ data, onUpdate, onNext, onBack }) => {
  const [formData, setFormData] = useState<ChildProfile>(() => ({
    name: data?.name || '',
    age: data?.age || 0,
    diagnoses: data?.diagnoses || [],
    communicationLevel: data?.communicationLevel || '',
    interests: data?.interests || [],
    triggers: data?.triggers || []
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [interestSearch, setInterestSearch] = useState('');
  const [showDiagnosisDropdown, setShowDiagnosisDropdown] = useState(false);
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);

  const ageOptions = Array.from({ length: 18 }, (_, i) => i + 1);

  const diagnosisOptions = [
    'Autism Spectrum Disorder',
    'ADHD',
    'Speech/Language Delay',
    'Childhood Apraxia of Speech',
    'Social Communication Disorder',
    'Sensory Processing Disorder',
    'Developmental Delay/Global Delay',
    'Learning Disability',
    'Down Syndrome',
    'Anxiety',
    'OCD',
    'ODD',
    'Tourette',
    'Epilepsy/Seizures',
    'Sleep Disorder',
    'GI issues',
    'Other'
  ];

  const communicationLevels = [
    'Single words',
    'Short phrases',
    'Sentences',
    'Fluent'
  ];

  const interestOptions = [
    'Animals',
    'Music',
    'Blocks',
    'Books',
    'Screens',
    'Bubbles',
    'Puzzles',
    'Lights',
    'Cars',
    'Trains',
    'Dinosaurs',
    'LEGO',
    'Water play',
    'Outdoor play',
    'Drawing',
    'Pretend play',
    'Board games',
    'Art',
    'Sports',
    'Other'
  ];

  const triggerOptions = [
    'Loud noise',
    'Transitions',
    'Textures',
    'Waiting',
    'Bright lights',
    'Crowds',
    'Scratchy clothing',
    'Smells',
    'Haircuts',
    'Dentist',
    'New places',
    'Other'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Child name is required';
    if (!formData.age || formData.age < 1 || formData.age > 18) {
      newErrors.age = 'Please select age between 1-18';
    }
    if (!formData.communicationLevel) newErrors.communicationLevel = 'Communication level is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      // Persist child name to localStorage
      setChildName(formData.name);
      broadcastNamesUpdated();
      
      onUpdate(formData);
      onNext();
    }
  };

  const updateField = (field: keyof ChildProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleArrayItem = (array: string[], item: string, field: 'interests' | 'triggers' | 'diagnoses') => {
    const newArray = array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
    updateField(field, newArray);
  };

  const addCustomItem = (value: string, field: 'diagnoses' | 'interests') => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      const newArray = [...formData[field], value.trim()];
      updateField(field, newArray);
    }
  };

  const filteredDiagnoses = diagnosisOptions.filter(diagnosis =>
    diagnosis.toLowerCase().includes(diagnosisSearch.toLowerCase())
  );

  const filteredInterests = interestOptions.filter(interest =>
    interest.toLowerCase().includes(interestSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step 3 of 7</span>
            <Badge variant="outline" className="text-xs">Child Info</Badge>
          </div>
          <Progress value={42} className="h-2" />
        </div>
      </div>

      <div 
        className="max-w-md mx-auto px-4 py-8"
        style={{
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          position: 'relative',
          top: Math.round(0), /* Snap to whole pixel */
          left: Math.round(0)  /* Snap to whole pixel */
        }}
      >
        <div className="text-center mb-8">
          <div className="p-3 bg-green-100 rounded-full inline-flex mb-4">
            <Baby className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-primary mb-2">About your child</h2>
          <p className="text-muted-foreground">
            Help us understand their unique needs and interests.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="childName" className="text-sm font-medium text-primary">
              Child's Name *
            </Label>
            <Input
              id="childName"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter your child's name"
              className={`mt-2 aminy-input-left ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="age" className="text-sm font-medium text-primary">
              Age *
            </Label>
            <Select value={formData.age?.toString() || ''} onValueChange={(value) => updateField('age', parseInt(value))}>
              <SelectTrigger 
                className={`mt-2 aminy-state-select ${errors.age ? 'border-red-500' : ''}`}
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: 1.2,
                  fontFeatureSettings: '"liga" 1',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  transform: 'translateZ(0)', // Hardware acceleration
                  backfaceVisibility: 'hidden'
                }}
              >
                <SelectValue 
                  placeholder="Select age"
                  style={{
                    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: 1.2,
                    fontFeatureSettings: '"liga" 1',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}
                />
              </SelectTrigger>
              <SelectContent
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                {ageOptions.map((age) => (
                  <SelectItem 
                    key={age} 
                    value={age.toString()}
                    style={{
                      fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: 1.2,
                      fontFeatureSettings: '"liga" 1',
                      textRendering: 'optimizeLegibility',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {age} {age === 1 ? 'year' : 'years'} old
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.age && (
              <p className="text-red-500 text-xs mt-1">{errors.age}</p>
            )}
          </div>

          <div className="relative">
            <Label className="text-sm font-medium text-primary">
              Diagnosis
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            
            {/* Selected diagnoses chips */}
            {formData.diagnoses && formData.diagnoses.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.diagnoses.map((diagnosis) => (
                  <span
                    key={diagnosis}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                  >
                    {diagnosis}
                    <button
                      type="button"
                      onClick={() => toggleArrayItem(formData.diagnoses || [], diagnosis, 'diagnoses')}
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input for diagnoses */}
            <div className="relative mt-2">
              <Input
                value={diagnosisSearch}
                onChange={(e) => {
                  setDiagnosisSearch(e.target.value);
                  setShowDiagnosisDropdown(true);
                }}
                onFocus={() => setShowDiagnosisDropdown(true)}
                onBlur={() => setTimeout(() => setShowDiagnosisDropdown(false), 200)}
                placeholder="Search or add diagnosis..."
                className="aminy-input-left"
              />
              
              {/* Diagnosis dropdown */}
              {showDiagnosisDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredDiagnoses.map((diagnosis) => (
                    <button
                      key={diagnosis}
                      type="button"
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm ${
                        formData.diagnoses?.includes(diagnosis) ? 'bg-blue-50 text-blue-800' : ''
                      }`}
                      onClick={() => {
                        if (diagnosis === 'Other' && diagnosisSearch && diagnosisSearch !== 'Other') {
                          addCustomItem(diagnosisSearch, 'diagnoses');
                        } else {
                          toggleArrayItem(formData.diagnoses || [], diagnosis, 'diagnoses');
                        }
                        setDiagnosisSearch('');
                        setShowDiagnosisDropdown(false);
                      }}
                    >
                      {diagnosis}
                      {formData.diagnoses?.includes(diagnosis) && (
                        <span className="float-right text-blue-600">✓</span>
                      )}
                    </button>
                  ))}
                  
                  {/* Add custom option */}
                  {diagnosisSearch && !filteredDiagnoses.some(d => d.toLowerCase() === diagnosisSearch.toLowerCase()) && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-accent font-medium"
                      onClick={() => {
                        addCustomItem(diagnosisSearch, 'diagnoses');
                        setDiagnosisSearch('');
                        setShowDiagnosisDropdown(false);
                      }}
                    >
                      Add "{diagnosisSearch}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-primary">
              Communication Level *
            </Label>
            <Select value={formData.communicationLevel} onValueChange={(value) => updateField('communicationLevel', value)}>
              <SelectTrigger 
                className={`mt-2 aminy-state-select ${errors.communicationLevel ? 'border-red-500' : ''}`}
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: 1.2,
                  fontFeatureSettings: '"liga" 1',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  transform: 'translateZ(0)', // Hardware acceleration
                  backfaceVisibility: 'hidden'
                }}
              >
                <SelectValue 
                  placeholder="Select communication level"
                  style={{
                    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: 1.2,
                    fontFeatureSettings: '"liga" 1',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}
                />
              </SelectTrigger>
              <SelectContent
                style={{
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                {communicationLevels.map((level) => (
                  <SelectItem 
                    key={level} 
                    value={level.toLowerCase()}
                    style={{
                      fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: 1.2,
                      fontFeatureSettings: '"liga" 1',
                      textRendering: 'optimizeLegibility',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.communicationLevel && (
              <p className="text-red-500 text-xs mt-1">{errors.communicationLevel}</p>
            )}
          </div>

          <div className="relative">
            <Label className="text-sm font-medium text-primary">
              Interests
            </Label>
            
            {/* Selected interests chips */}
            {formData.interests && formData.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.interests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => toggleArrayItem(formData.interests || [], interest, 'interests')}
                      className="text-green-600 hover:text-green-800 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input for interests */}
            <div className="relative mt-2">
              <Input
                value={interestSearch}
                onChange={(e) => {
                  setInterestSearch(e.target.value);
                  setShowInterestDropdown(true);
                }}
                onFocus={() => setShowInterestDropdown(true)}
                onBlur={() => setTimeout(() => setShowInterestDropdown(false), 200)}
                placeholder="Search or add interests..."
                className="aminy-input-left"
              />
              
              {/* Interest dropdown */}
              {showInterestDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredInterests.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm ${
                        formData.interests?.includes(interest) ? 'bg-green-50 text-green-800' : ''
                      }`}
                      onClick={() => {
                        if (interest === 'Other' && interestSearch && interestSearch !== 'Other') {
                          addCustomItem(interestSearch, 'interests');
                        } else {
                          toggleArrayItem(formData.interests || [], interest, 'interests');
                        }
                        setInterestSearch('');
                        setShowInterestDropdown(false);
                      }}
                    >
                      {interest}
                      {formData.interests?.includes(interest) && (
                        <span className="float-right text-green-600">✓</span>
                      )}
                    </button>
                  ))}
                  
                  {/* Add custom option */}
                  {interestSearch && !filteredInterests.some(i => i.toLowerCase() === interestSearch.toLowerCase()) && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-accent font-medium"
                      onClick={() => {
                        addCustomItem(interestSearch, 'interests');
                        setInterestSearch('');
                        setShowInterestDropdown(false);
                      }}
                    >
                      Add "{interestSearch}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-primary mb-3 block">
              Triggers / Sensitivities
            </Label>
            
            {/* Selected triggers chips */}
            {formData.triggers && formData.triggers.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {formData.triggers.map((trigger) => (
                  <span
                    key={trigger}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full"
                  >
                    {trigger}
                    <button
                      type="button"
                      onClick={() => toggleArrayItem(formData.triggers || [], trigger, 'triggers')}
                      className="text-red-600 hover:text-red-800 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Trigger option buttons */}
            <div className="flex flex-wrap gap-2">
              {triggerOptions.map((trigger) => (
                <button
                  key={trigger}
                  type="button"
                  onClick={() => toggleArrayItem(formData.triggers || [], trigger, 'triggers')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.triggers?.includes(trigger)
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {trigger}
                  {formData.triggers?.includes(trigger) && (
                    <span className="ml-1">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between aminy-form-navigation-breathing">
          <Button
            onClick={onBack}
            variant="outline"
            className="aminy-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="aminy-continue-button aminy-gentle-shimmer"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const NeedsAndScheduleStep: React.FC<{
  data: NeedsProfile;
  onUpdate: (data: NeedsProfile) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ data, onUpdate, onNext, onBack }) => {
  const [formData, setFormData] = useState<NeedsProfile>(data || {
    focusAreas: [],
    tone: '',
    goals: [],
    schedule: [],
    additionalNeeds: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [goalSearches, setGoalSearches] = useState(['', '', '']);
  const [showGoalDropdowns, setShowGoalDropdowns] = useState([false, false, false]);

  const focusAreaOptions = [
    'Speech',
    'Sensory',
    'Social',
    'Routines',
    'Emotional regulation',
    'Focus'
  ];

  const toneOptions = [
    { id: 'supportive', label: 'Supportive', description: 'Gentle, encouraging guidance' },
    { id: 'direct', label: 'Direct', description: 'Clear, straightforward advice' },
    { id: 'playful', label: 'Playful', description: 'Fun, engaging approach' }
  ];

  const goalLibrary = [
    'Greetings',
    'Waiting',
    'Transitions',
    'Following directions (1-step → 2-step)',
    'Toothbrush',
    'Asking for help',
    'Token economy',
    'Calm-down routine',
    'Sleep routine',
    'Visual schedule',
    'Toilet independence',
    'Mealtime variety (food exposure)',
    'Sharing/turn-taking',
    'Expressive requests ("I want…")',
    'Receptive ID (body parts/items)',
    'Sensory regulation (deep pressure breaks)'
  ];

  const scheduleOptions = [
    'Morning',
    'Afternoon', 
    'Evening',
    'Bedtime'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.focusAreas.length === 0) {
      newErrors.focusAreas = 'Please select at least one focus area';
    }
    if (!formData.tone) {
      newErrors.tone = 'Please select a tone preference';
    }
    if (formData.goals.length === 0) {
      newErrors.goals = 'Please select at least one goal';
    }
    if (formData.schedule.length === 0) {
      newErrors.schedule = 'Please select at least one time period';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onUpdate(formData);
      onNext();
    }
  };

  const updateField = (field: keyof NeedsProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleArrayItem = (array: string[], item: string, field: 'focusAreas' | 'schedule') => {
    const newArray = array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
    updateField(field, newArray);
  };

  const handleGoalSearch = (index: number, value: string) => {
    const newSearches = [...goalSearches];
    newSearches[index] = value;
    setGoalSearches(newSearches);
    
    const newDropdowns = [...showGoalDropdowns];
    newDropdowns[index] = value.length > 0;
    setShowGoalDropdowns(newDropdowns);
  };

  const selectGoal = (goal: string, index: number) => {
    if (formData.goals.length < 3 && !formData.goals.includes(goal)) {
      const newGoals = [...formData.goals, goal];
      updateField('goals', newGoals);
      
      // Clear the search for this input
      const newSearches = [...goalSearches];
      newSearches[index] = '';
      setGoalSearches(newSearches);
      
      const newDropdowns = [...showGoalDropdowns];
      newDropdowns[index] = false;
      setShowGoalDropdowns(newDropdowns);
    }
  };

  const removeGoal = (goalToRemove: string) => {
    const newGoals = formData.goals.filter(goal => goal !== goalToRemove);
    updateField('goals', newGoals);
  };

  const addCustomGoal = (customGoal: string, index: number) => {
    if (customGoal.trim() && formData.goals.length < 3 && !formData.goals.includes(customGoal.trim())) {
      const newGoals = [...formData.goals, customGoal.trim()];
      updateField('goals', newGoals);
      
      // Clear the search for this input
      const newSearches = [...goalSearches];
      newSearches[index] = '';
      setGoalSearches(newSearches);
      
      const newDropdowns = [...showGoalDropdowns];
      newDropdowns[index] = false;
      setShowGoalDropdowns(newDropdowns);
    }
  };

  const getFilteredGoals = (searchTerm: string) => {
    return goalLibrary.filter(goal => 
      goal.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !formData.goals.includes(goal)
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step 4 of 7</span>
            <Badge variant="outline" className="text-xs">Needs & Schedule</Badge>
          </div>
          <Progress value={57} className="h-2" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="p-3 bg-purple-100 rounded-full inline-flex mb-4">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-semibold text-primary mb-2">Personalize your support</h2>
          <p className="text-muted-foreground">
            Tell us what you'd like to focus on and when.
          </p>
        </div>

        <div className="space-y-8">
          {/* Focus Areas */}
          <div>
            <Label className="text-sm font-medium text-primary mb-3 block">
              Focus Areas *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {focusAreaOptions.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArrayItem(formData.focusAreas, area.toLowerCase(), 'focusAreas')}
                  className={`relative p-4 rounded-xl border-2 text-center transition-all aminy-focus-area-pill ${
                    formData.focusAreas.includes(area.toLowerCase())
                      ? 'aminy-focus-area-selected text-primary'
                      : 'aminy-focus-area-unselected text-primary'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {area === 'Speech' && <MessageSquare className="w-5 h-5" />}
                    {area === 'Sensory' && <Hand className="w-5 h-5" />}
                    {area === 'Social' && <Users className="w-5 h-5" />}
                    {area === 'Routines' && <Clock className="w-5 h-5" />}
                    {area === 'Emotional regulation' && <Heart className="w-5 h-5" />}
                    {area === 'Focus' && <Zap className="w-5 h-5" />}
                    <span className="text-sm font-medium">{area}</span>
                    {formData.focusAreas.includes(area.toLowerCase()) && (
                      <CheckCircle className="w-4 h-4 text-accent absolute top-2 right-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {errors.focusAreas && (
              <p className="text-red-500 text-xs mt-2">{errors.focusAreas}</p>
            )}
          </div>

          {/* Tone Preference */}
          <div>
            <Label className="text-sm font-medium text-primary mb-3 block">
              Tone Preference *
            </Label>
            <div className="space-y-3">
              {toneOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateField('tone', option.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.tone === option.id
                      ? 'aminy-goal-selected text-primary'
                      : 'aminy-goal-unselected text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-primary">{option.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
                    </div>
                    {formData.tone === option.id && (
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {errors.tone && (
              <p className="text-red-500 text-xs mt-2">{errors.tone}</p>
            )}
          </div>

          {/* Top 3 Goals with Autocomplete */}
          <div>
            <Label className="text-sm font-medium text-primary mb-3 block">
              Top 3 Goals *
            </Label>
            
            {/* Selected Goals Display */}
            {formData.goals.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {formData.goals.map((goal, index) => (
                    <span
                      key={`${goal}-${index}`}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-full"
                    >
                      {goal}
                      <button
                        type="button"
                        onClick={() => removeGoal(goal)}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.goals.length}/3 goals selected
                </p>
              </div>
            )}

            {/* Goal Search Inputs */}
            {formData.goals.length < 3 && (
              <div className="space-y-3">
                {[0, 1, 2].slice(0, 3 - formData.goals.length).map((index) => (
                  <div key={index} className="relative">
                    <Input
                      value={goalSearches[index]}
                      onChange={(e) => handleGoalSearch(index, e.target.value)}
                      onFocus={() => {
                        const newDropdowns = [...showGoalDropdowns];
                        newDropdowns[index] = true;
                        setShowGoalDropdowns(newDropdowns);
                      }}
                      onBlur={() => setTimeout(() => {
                        const newDropdowns = [...showGoalDropdowns];
                        newDropdowns[index] = false;
                        setShowGoalDropdowns(newDropdowns);
                      }, 200)}
                      placeholder="Search goals or add your own..."
                      className="aminy-input-left"
                    />
                    
                    {/* Goal Suggestions Dropdown */}
                    {showGoalDropdowns[index] && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {getFilteredGoals(goalSearches[index]).map((goal) => (
                          <button
                            key={goal}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm"
                            onClick={() => selectGoal(goal, index)}
                          >
                            {goal}
                          </button>
                        ))}
                        
                        {/* Add Custom Goal Option */}
                        {goalSearches[index] && !goalLibrary.some(g => g.toLowerCase() === goalSearches[index].toLowerCase()) && !formData.goals.includes(goalSearches[index]) && (
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-accent font-medium"
                            onClick={() => addCustomGoal(goalSearches[index], index)}
                          >
                            Add "{goalSearches[index]}"
                          </button>
                        )}
                        
                        {getFilteredGoals(goalSearches[index]).length === 0 && !goalSearches[index] && (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            Start typing to search goals...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {errors.goals && (
              <p className="text-red-500 text-xs mt-2">{errors.goals}</p>
            )}
          </div>

          {/* Schedule */}
          <div>
            <Label className="text-sm font-medium text-primary mb-3 block">
              When would you like support? *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {scheduleOptions.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggleArrayItem(formData.schedule, time.toLowerCase(), 'schedule')}
                  className={`relative p-4 rounded-xl border-2 text-center transition-all aminy-focus-area-pill ${
                    formData.schedule.includes(time.toLowerCase())
                      ? 'aminy-focus-area-selected text-primary'
                      : 'aminy-focus-area-unselected text-primary'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 relative">
                    {time === 'Morning' && <Sunrise className="w-5 h-5" />}
                    {time === 'Afternoon' && <Sun className="w-5 h-5" />}
                    {time === 'Evening' && <Sunset className="w-5 h-5" />}
                    {time === 'Bedtime' && <Moon className="w-5 h-5" />}
                    <span className="text-sm font-medium">{time}</span>
                    {formData.schedule.includes(time.toLowerCase()) && (
                      <CheckCircle className="w-4 h-4 text-accent absolute top-0 right-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {errors.schedule && (
              <p className="text-red-500 text-xs mt-2">{errors.schedule}</p>
            )}
          </div>

          {/* Additional Needs */}
          <div>
            <Label htmlFor="additionalNeeds" className="text-sm font-medium text-primary">
              Additional Needs
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Textarea
              id="additionalNeeds"
              value={formData.additionalNeeds || ''}
              onChange={(e) => updateField('additionalNeeds', e.target.value)}
              placeholder="Anything else we should know about your child's needs?"
              className="mt-2 aminy-additional-needs"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between aminy-form-navigation-breathing">
          <Button
            onClick={onBack}
            variant="outline"
            className="aminy-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="aminy-continue-button aminy-gentle-shimmer"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const SoftDiagnosisStep: React.FC<{
  data: SoftDxProfile;
  onUpdate: (data: SoftDxProfile) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}> = ({ data, onUpdate, onNext, onBack, onSkip }) => {
  const [formData, setFormData] = useState<SoftDxProfile>(data || {
    responses: {},
    uploads: [],
    severity: '',
    concerns: []
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [snapshot, setSnapshot] = useState<any>({});

  // Enhanced micro-questions across all domains
  const questions = [
    {
      id: 'communication_expression',
      domain: 'communication',
      question: 'How does your child typically express when they want something?',
      options: ['Uses clear words or signs', 'Points and makes sounds', 'Shows or pulls you to what they want', 'Gets upset until someone figures it out']
    },
    {
      id: 'social_interaction',
      domain: 'social', 
      question: 'When other children are playing nearby, what does your child usually do?',
      options: ['Joins in easily', 'Watches first, then joins', 'Plays alongside but separately', 'Prefers to play alone']
    },
    {
      id: 'sensory_sounds',
      domain: 'sensory',
      question: 'How does your child react to unexpected loud sounds?',
      options: ['Doesn\'t seem bothered', 'Notices but adapts quickly', 'Gets startled but recovers', 'Covers ears or gets very upset']
    },
    {
      id: 'routines_changes',
      domain: 'routines',
      question: 'When your usual routine changes unexpectedly, your child:',
      options: ['Goes with the flow', 'Needs a little explanation', 'Gets worried but adjusts', 'Becomes very upset or distressed']
    },
    {
      id: 'behavior_frustration',
      domain: 'behavior',
      question: 'When your child gets frustrated, they usually:',
      options: ['Uses words to tell you', 'Whines or cries briefly', 'Has meltdowns that last several minutes', 'Has intense outbursts that are hard to calm']
    },
    {
      id: 'sleep_patterns',
      domain: 'sleep',
      question: 'How would you describe your child\'s sleep?',
      options: ['Sleeps well most nights', 'Sometimes has trouble falling asleep', 'Often wakes up during the night', 'Sleep is a constant struggle']
    },
    {
      id: 'feeding_eating',
      domain: 'feeding',
      question: 'At mealtimes, your child:',
      options: ['Eats a variety of foods', 'Prefers familiar foods but tries new ones', 'Sticks to a few favorite foods', 'Is very selective and meals are difficult']
    },
    {
      id: 'communication_understanding',
      domain: 'communication',
      question: 'When you give your child instructions, they:',
      options: ['Follow multi-step directions easily', 'Need simple, one-step instructions', 'Need instructions repeated or shown', 'Often seem confused by verbal directions']
    },
    {
      id: 'social_emotions',
      domain: 'social',
      question: 'Your child shows concern when others are upset:',
      options: ['Often tries to comfort others', 'Sometimes notices and responds', 'Rarely seems to notice', 'Doesn\'t seem to understand others\' emotions']
    },
    {
      id: 'current_services',
      domain: 'services',
      question: 'Does your child currently receive any special services or support?',
      options: ['No services currently', 'Receives some help at school', 'Gets speech, OT, or other therapy', 'Receives multiple types of support']
    }
  ];

  const handleAnswerSelect = (answer: string) => {
    const newResponses = { ...formData.responses, [questions[currentQuestion].id]: answer };
    setFormData(prev => ({ ...prev, responses: newResponses }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // All questions answered - generate snapshot
      generateSnapshot(newResponses);
    }
  };

  const generateSnapshot = (responses: Record<string, string>) => {
    // Analyze responses to determine strengths, needs, and suggested goals
    const strengths: string[] = [];
    const needs: string[] = [];
    const suggestedGoals: string[] = [];

    // Communication strengths and needs
    if (responses.communication_expression === 'Uses clear words or signs') {
      strengths.push('Strong communication skills');
    } else if (responses.communication_expression === 'Gets upset until someone figures it out') {
      needs.push('Communication support');
      suggestedGoals.push('Develop communication tools');
    }

    if (responses.communication_understanding === 'Follow multi-step directions easily') {
      strengths.push('Good listening and following directions');
    } else if (responses.communication_understanding === 'Often seem confused by verbal directions') {
      needs.push('Processing verbal instructions');
      suggestedGoals.push('Practice following simple directions');
    }

    // Social strengths and needs
    if (responses.social_interaction === 'Joins in easily') {
      strengths.push('Social engagement with peers');
    } else if (responses.social_interaction === 'Prefers to play alone') {
      needs.push('Social interaction skills');
      suggestedGoals.push('Encourage peer play activities');
    }

    if (responses.social_emotions === 'Often tries to comfort others') {
      strengths.push('Empathy and caring for others');
    } else if (responses.social_emotions === 'Doesn\'t seem to understand others\' emotions') {
      needs.push('Understanding emotions');
    }

    // Sensory strengths and needs
    if (responses.sensory_sounds === 'Doesn\'t seem bothered') {
      strengths.push('Good sensory regulation');
    } else if (responses.sensory_sounds === 'Covers ears or gets very upset') {
      needs.push('Sensory sensitivity support');
      suggestedGoals.push('Build sensory coping strategies');
    }

    // Routine strengths and needs
    if (responses.routines_changes === 'Goes with the flow') {
      strengths.push('Flexible with changes');
    } else if (responses.routines_changes === 'Becomes very upset or distressed') {
      needs.push('Support with transitions');
    }

    // Behavior strengths and needs
    if (responses.behavior_frustration === 'Uses words to tell you') {
      strengths.push('Self-regulation skills');
    } else if (responses.behavior_frustration === 'Has intense outbursts that are hard to calm') {
      needs.push('Emotional regulation support');
    }

    // Sleep and feeding
    if (responses.sleep_patterns === 'Sleep is a constant struggle') {
      needs.push('Sleep routine support');
    }
    if (responses.feeding_eating === 'Is very selective and meals are difficult') {
      needs.push('Mealtime support');
    }

    // Default suggestions if no specific needs identified
    if (strengths.length === 0) {
      strengths.push('Unique learning style', 'Individual strengths to discover');
    }
    if (needs.length === 0) {
      needs.push('Continue building on current skills');
    }
    if (suggestedGoals.length === 0) {
      suggestedGoals.push('Morning routine practice', 'Social interaction opportunities', 'Communication building');
    }

    // Limit to top 3 for each category
    const finalSnapshot = {
      strengths: strengths.slice(0, 3),
      needs: needs.slice(0, 3),
      suggestedGoals: suggestedGoals.slice(0, 3)
    };

    setSnapshot(finalSnapshot);
    setShowSnapshot(true);

    // Update form data with snapshot
    const severity = needs.length >= 2 ? 'moderate' : needs.length >= 1 ? 'mild' : 'low';
    const updatedData = { 
      ...formData, 
      responses, 
      severity, 
      concerns: needs,
      snapshot: finalSnapshot
    };
    setFormData(updatedData);
  };

  const handleContinueFromSnapshot = () => {
    try {
      // Pass the suggested goals to be merged with user goals in the plan
      const updatedData = { 
        ...formData,
        suggestedGoals: snapshot.suggestedGoals
      };
      onUpdate(updatedData);

      // Mark Insight as ready in both stores (survives reloads)
      sessionStorage.setItem("aminy:insightReady", "1");
      localStorage.setItem("aminy:insightReady", "1");

      // Live update Home → Connector without a reload
      window.dispatchEvent(new CustomEvent("connector:changed", { detail: { tile: "insight" } }));
    } finally {
      // Proceed with navigation to Step 6
      onNext();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step 5 of 7</span>
            <Badge variant="outline" className="text-xs">Insight Navigator</Badge>
          </div>
          <Progress value={71} className="h-2" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        {!showSnapshot ? (
          <>
            <div className="text-center mb-8">
              <div className="p-3 bg-purple-100 rounded-full inline-flex mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-primary mb-2">Insight Navigator</h2>
              <p className="text-muted-foreground">
                A personalized conversation to understand your child's unique journey. This will take about 6-10 minutes.
              </p>
            </div>

            {/* Adaptive Interview Chat */}
            <Card className="p-6 mb-6 bg-gradient-to-br from-purple-50/30 to-blue-50/30">
              {/* Current Domain Indicator with Safety Checks */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  {(() => {
                    try {
                      const domains = ['communication', 'social', 'sensory', 'routines', 'sleep', 'school'];
                      const questionIndex = Math.max(0, Math.min(currentQuestion || 0, questions?.length - 1 || 0));
                      const domainIndex = Math.floor(questionIndex / 2);
                      const currentDomain = domains[Math.min(domainIndex, domains.length - 1)] || 'communication';
                      
                      const icons = {
                        communication: <MessageSquare className="w-4 h-4 text-purple-600" />,
                        social: <Users className="w-4 h-4 text-green-600" />,
                        sensory: <Eye className="w-4 h-4 text-orange-600" />,
                        routines: <Clock className="w-4 h-4 text-blue-600" />,
                        sleep: <Moon className="w-4 h-4 text-indigo-600" />,
                        school: <GraduationCap className="w-4 h-4 text-teal-600" />
                      };
                      return icons[currentDomain] || icons.communication;
                    } catch (error) {
                      return <MessageSquare className="w-4 h-4 text-purple-600" />;
                    }
                  })()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">
                    {(() => {
                      try {
                        const domains = ['Communication', 'Social & Play', 'Sensory Processing', 'Routines & Behavior', 'Sleep & Feeding', 'School & Services'];
                        const questionIndex = Math.max(0, Math.min(currentQuestion || 0, questions?.length - 1 || 0));
                        const domainIndex = Math.floor(questionIndex / 2);
                        return domains[Math.min(domainIndex, domains.length - 1)] || 'Communication';
                      } catch (error) {
                        return 'Communication';
                      }
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Question {Math.max(1, (currentQuestion || 0) + 1)} • {Math.round(((Math.max(0, currentQuestion || 0) + 1) / Math.max(1, questions?.length || 1)) * 100)}% complete
                  </div>
                </div>
              </div>

              {/* Chat-style Question with Error Boundary */}
              <div className="space-y-4 mb-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-accent mb-1">Aminy</div>
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {(() => {
                          try {
                            const questionIndex = Math.max(0, Math.min(currentQuestion || 0, questions?.length - 1 || 0));
                            const question = questions?.[questionIndex];
                            return question?.question || "Let's learn more about your child's development journey.";
                          } catch (error) {
                            return "Let's learn more about your child's development journey.";
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adaptive Response Options with Safety Checks */}
              <div className="space-y-3">
                {(() => {
                  try {
                    const questionIndex = Math.max(0, Math.min(currentQuestion || 0, questions?.length - 1 || 0));
                    const question = questions?.[questionIndex];
                    const options = question?.options || [];
                    
                    if (!options.length) {
                      return (
                        <div className="text-center p-6 text-muted-foreground">
                          <p className="text-sm">Loading questions...</p>
                        </div>
                      );
                    }
                    
                    return options.map((option, index) => (
                      <button
                        key={`${questionIndex}-${index}`}
                        onClick={() => {
                          try {
                            handleAnswerSelect(option);
                          } catch (error) {
                          }
                        }}
                        className="w-full p-4 text-left rounded-xl border-2 border-gray-200 hover:border-accent hover:bg-accent/5 transition-all bg-white/80 backdrop-blur-sm"
                        disabled={!handleAnswerSelect}
                      >
                        <span className="font-medium text-sm">{option}</span>
                      </button>
                    ));
                  } catch (error) {
                    return (
                      <div className="text-center p-6 text-muted-foreground">
                        <p className="text-sm">Unable to load options. Please try refreshing.</p>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Answer History Preview with Safety Checks */}
              {(currentQuestion || 0) > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="text-xs text-muted-foreground mb-2">Previous insights gathered:</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: Math.min(Math.max(0, currentQuestion || 0), 3) }).map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-accent/30 rounded-full"></div>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      Building your child's profile...
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                onClick={onBack}
                variant="outline"
                className="aminy-back-button"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    try {
                      const maxQuestion = Math.max(0, (questions?.length || 1) - 1);
                      setCurrentQuestion(prev => Math.min((prev || 0) + 1, maxQuestion));
                    } catch (error) {
                    }
                  }}
                  variant="ghost"
                  className="text-muted-foreground"
                  disabled={(currentQuestion || 0) >= Math.max(0, (questions?.length || 1) - 1)}
                >
                  Skip This
                </Button>
                
                {(currentQuestion || 0) > 0 && (
                  <Button
                    onClick={() => {
                      try {
                        setCurrentQuestion(prev => Math.max(0, (prev || 0) - 1));
                      } catch (error) {
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Enhanced Insight Snapshot */}
            <div className="text-center mb-8">
              <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full inline-flex mb-4">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-primary mb-2">Your Insight Snapshot</h2>
              <p className="text-muted-foreground">
                Based on our conversation, here's your child's personalized profile.
              </p>
            </div>

            {/* Enhanced Snapshot Card with Safety Checks */}
            <Card className="p-6 mb-6 bg-gradient-to-br from-green-50/40 to-blue-50/40 border-green-200/40">
              <div className="space-y-6">
                {/* Confidence Level */}
                <div className="bg-white/60 rounded-xl p-4 border border-white/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-blue-100 rounded-full">
                        <Brain className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-primary">Confidence Level</h3>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium">
                      {(() => {
                        try {
                          const confidence = snapshot?.confidence || 'building';
                          return confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Building';
                        } catch (error) {
                          return 'Building';
                        }
                      })()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {(() => {
                      try {
                        const confidence = snapshot?.confidence || 'building';
                        return confidence === 'high' 
                          ? 'Strong pattern recognition across multiple domains'
                          : confidence === 'medium'
                          ? 'Good insights with some areas for more exploration'
                          : 'Initial insights gathered, more interaction will improve accuracy';
                      } catch (error) {
                        return 'Initial insights gathered, more interaction will improve accuracy';
                      }
                    })()}
                  </p>
                </div>

                {/* Top Strengths (exactly 2) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-primary">Top Strengths</h3>
                    <Badge variant="outline" className="text-xs">2 identified</Badge>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const strengths = snapshot?.strengths || ['Shows curiosity and engagement', 'Responds well to routines'];
                        return strengths.slice(0, 2).map((strength, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm bg-green-50/50 rounded-lg p-2">
                            <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700">{strength}</span>
                          </div>
                        ));
                      } catch (error) {
                        return (
                          <div className="text-center p-4 text-muted-foreground">
                            <p className="text-sm">Strengths will appear after completing the assessment.</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* Growth Areas (exactly 3) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-blue-100 rounded-full">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-primary">Growth Areas</h3>
                    <Badge variant="outline" className="text-xs">3 identified</Badge>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const needs = snapshot?.needs || ['Communication skills', 'Social interaction', 'Sensory processing'];
                        return needs.slice(0, 3).map((need, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm bg-blue-50/50 rounded-lg p-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700">{need}</span>
                          </div>
                        ));
                      } catch (error) {
                        return (
                          <div className="text-center p-4 text-muted-foreground">
                            <p className="text-sm">Growth areas will appear after completing the assessment.</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* Suggested Goals (exactly 3 chips) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-purple-100 rounded-full">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-primary">Recommended Goals</h3>
                    <Badge variant="outline" className="text-xs">Top 3 priorities</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      try {
                        const suggestedGoals = snapshot?.suggestedGoals || ['Improve communication', 'Build social skills', 'Enhance focus'];
                        return suggestedGoals.slice(0, 3).map((goal, index) => (
                          <button
                            key={index}
                            className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer"
                            onClick={() => {
                              try {
                              } catch (error) {
                              }
                            }}
                          >
                            <Target className="w-3 h-3 mr-1" />
                            {goal}
                          </button>
                        ));
                      } catch (error) {
                        return (
                          <div className="text-center p-4 text-muted-foreground">
                            <p className="text-sm">Recommended goals will appear after completing the assessment.</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Click any goal to explore alternatives and see how it affects your plan
                  </p>
                </div>

                {/* Aminy Junior Difficulty Preview */}
                <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-accent/20 rounded-full">
                      <Puzzle className="w-4 h-4 text-accent" />
                    </div>
                    <h4 className="font-medium text-primary text-sm">Aminy Junior Settings</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/50 rounded p-2">
                      <div className="font-medium">Communication</div>
                      <div className="text-muted-foreground">Moderate level</div>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <div className="font-medium">Social Play</div>
                      <div className="text-muted-foreground">Gentle level</div>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <div className="font-medium">Routines</div>
                      <div className="text-muted-foreground">Adaptive level</div>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <div className="font-medium">Sensory</div>
                      <div className="text-muted-foreground">Calm level</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Enhanced Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">Important Note</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Educational guidance, not a diagnosis. This adaptive assessment provides personalized recommendations based on your responses. These insights will customize your Aminy Junior experience and help prioritize support resources. Always consult healthcare professionals for medical evaluations.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between aminy-form-navigation-breathing">
              <Button
                onClick={() => {
                  try {
                    setShowSnapshot(false);
                  } catch (error) {
                  }
                }}
                variant="outline"
                className="aminy-back-button"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Revise Answers
              </Button>
              
              <Button
                onClick={() => {
                  try {
                    handleContinueFromSnapshot();
                  } catch (error) {
                  }
                }}
                className="aminy-continue-button aminy-gentle-shimmer"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Benefits status types and safe data access
type BenefitStatus = 'covered' | 'unsure' | 'not_covered';
type BenefitsChecklist = Record<string, BenefitStatus>;

const BenefitsNavigatorStep: React.FC<{
  data: CoverageProfile;
  parentProfile: ParentProfile;
  onUpdate: (data: CoverageProfile) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}> = ({ data, parentProfile, onUpdate, onNext, onBack, onSkip }) => {
  // Insight flag backfill - set flag if snapshot exists but flag isn't set
  useEffect(() => {
    const hasSnapshot = !!(window as any).state?.insight?.snapshot;
    const flagged = sessionStorage.getItem("aminy:insightReady") === "1" 
                 || localStorage.getItem("aminy:insightReady") === "1";
    if (hasSnapshot && !flagged) {
      sessionStorage.setItem("aminy:insightReady", "1");
      localStorage.setItem("aminy:insightReady", "1");
      window.dispatchEvent(new CustomEvent("connector:changed", { detail: { tile: "insight" } }));
    }
  }, []);

  // Safe getter for checklist - always returns an object
  const getChecklist = (): BenefitsChecklist => {
    try {
      const stored = localStorage.getItem('aminy_benefitsChecklist');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (error) {
    }
    
    // Fallback to formData or defaults
    const items = data?.benefitsChecklist?.items || [];
    const checklist: BenefitsChecklist = {};
    items.forEach(item => {
      checklist[item.id] = item.status || 'unsure';
    });
    
    // Initialize missing keys to "unsure"
    const defaultItems = ['insurance', 'earlyIntervention', 'schoolSupports', 'localCommunity'];
    defaultItems.forEach(key => {
      if (!(key in checklist)) {
        checklist[key] = key === 'schoolSupports' ? 'covered' : 'unsure'; // Default school supports to covered
      }
    });
    
    return checklist;
  };

  // Safe setter that writes to app state and localStorage
  const setChecklist = (updater: (prev: BenefitsChecklist) => BenefitsChecklist) => {
    const currentChecklist = getChecklist();
    const newChecklist = updater(currentChecklist);
    
    // Save to localStorage
    try {
      localStorage.setItem('aminy_benefitsChecklist', JSON.stringify(newChecklist));
    } catch (error) {
    }
    
    // Update app state
    setFormData(prev => {
      const items = Object.entries(newChecklist).map(([id, status]) => ({
        id,
        name: getItemName(id),
        status
      }));
      
      return {
        ...prev,
        benefitsChecklist: {
          items,
          saved: true
        }
      };
    });
  };

  const getItemName = (id: string): string => {
    const names = {
      insurance: 'Insurance coverage',
      earlyIntervention: 'Early Intervention & state programs',
      schoolSupports: 'School supports',
      localCommunity: 'Local & community'
    };
    return names[id] || id;
  };

  const [formData, setFormData] = useState<CoverageProfile>(() => {
    const checklist = getChecklist();
    const items = Object.entries(checklist).map(([id, status]) => ({
      id,
      name: getItemName(id),
      status
    }));
    
    return data || {
      hasDiagnosis: false,
      state: '',
      insurance: '',
      resources: [],
      benefitsChecklist: {
        items,
        saved: false
      }
    };
  });
  
  const [showResources, setShowResources] = useState(false);
  const [showWhyTheseSheet, setShowWhyTheseSheet] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize missing items on first render
  React.useEffect(() => {
    const checklist = getChecklist();
    const hasAllItems = ['insurance', 'earlyIntervention', 'schoolSupports', 'localCommunity']
      .every(key => key in checklist);
    
    if (!hasAllItems) {
      setChecklist(prev => ({
        insurance: prev.insurance || 'unsure',
        earlyIntervention: prev.earlyIntervention || 'unsure', 
        schoolSupports: prev.schoolSupports || 'covered',
        localCommunity: prev.localCommunity || 'unsure',
        ...prev
      }));
    }
  }, []);

  // Calculate benefit counts from real data as specified
  const checklist = getChecklist();
  const benefitCounts = {
    covered: Object.values(checklist).filter(status => status === 'covered').length,
    unsure: Object.values(checklist).filter(status => status === 'unsure').length,
    notCovered: Object.values(checklist).filter(status => status === 'not_covered').length
  };

  // Handler for status change with debounce protection
  const [lastClickTime, setLastClickTime] = useState(0);
  const onStatusChange = (key: string, status: BenefitStatus) => {
    const now = Date.now();
    if (now - lastClickTime < 150 || isExporting) return; // Debounce double-clicks and bail if exporting
    setLastClickTime(now);

    setChecklist(prev => ({
      ...prev,
      [key]: status
    }));
  };

  // Handle build plan action and inject 2-3 tasks for covered items
  const handleBuildPlan = () => {
    setIsExporting(true);
    
    // Generate concrete tasks based on covered items only
    const concreteTaskMap: Record<string, string[]> = {
      insurance: ['Contact insurance to verify autism coverage', 'Request prior authorization template', 'Review benefits coverage details'],
      earlyIntervention: ['Call Early Intervention services', 'Schedule intake assessment', 'Gather developmental history'],
      schoolSupports: ['Send evaluation request letter', 'Gather progress documentation', 'Review IEP process'],
      localCommunity: ['Find local parent support group', 'Research respite care options', 'Connect with family resource center']
    };

    const tasksToInject: string[] = [];
    const currentChecklist = getChecklist();
    
    // Only inject tasks for items with status 'covered'
    Object.entries(currentChecklist)
      .filter(([_, status]) => status === 'covered')
      .forEach(([itemId, _]) => {
        const tasks = concreteTaskMap[itemId];
        if (tasks) {
          // Add 2-3 tasks per covered area as specified
          const taskCount = Math.min(3, Math.max(2, tasks.length));
          tasksToInject.push(...tasks.slice(0, taskCount));
        }
      });
    
    // Ensure at least 2 tasks are added if any items are covered
    const finalTasks = tasksToInject.length >= 2 ? tasksToInject : [
      'Review your coverage options',
      'Contact support services for guidance'
    ];
    
    const updatedData = {
      ...formData,
      benefitsChecklist: {
        items: Object.entries(currentChecklist).map(([id, status]) => ({
          id,
          name: getItemName(id),
          status
        })),
        saved: true
      },
      planTasks: finalTasks.slice(0, 8) // Allow more tasks for better coverage
    };
    
    onUpdate(updatedData);
    onNext();
  };

  // Handle continue
  const handleContinue = () => {
    onUpdate(formData);
    onNext();
  };

  const generateResources = () => {
    const state = parentProfile?.state || 'your state';
    const insurance = parentProfile?.insurance || 'your insurance';
    
    const baseResources = [
      `Early Intervention services in ${state}`,
      `${state} autism insurance mandates`,
      `Medicaid waiver programs for ${state}`,
      'Sample insurance authorization letters',
      'IEP advocacy resources',
      'Parent support groups near you'
    ];

    if (formData.hasDiagnosis) {
      baseResources.push(
        `${insurance} coverage checklist`,
        'Provider network directory',
        'Appeals process guide'
      );
    } else {
      baseResources.push(
        'Pre-diagnosis support checklist',
        'How to request evaluations',
        'School-based assessment guide'
      );
    }

    setFormData(prev => ({ ...prev, resources: baseResources }));
    setShowResources(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step 6 of 7</span>
            <Badge variant="outline" className="text-xs">Coverage Coach</Badge>
          </div>
          <Progress value={85} className="h-2" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="p-3 bg-teal-100 rounded-full inline-flex mb-4">
            <Shield className="w-6 h-6 text-teal-600" />
          </div>
          <h2 className="text-2xl font-semibold text-primary mb-3">Find your support</h2>
          <p className="text-muted-foreground mb-2">
            Discover programs you can use in {titleCase(parentProfile?.state)} based on your answers.
          </p>
          
          {/* Why these? link */}
          <button
            onClick={() => setShowWhyTheseSheet(true)}
            className="text-accent hover:text-accent/80 transition-colors text-sm font-medium mb-4 inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg px-2 py-1"
          >
            Why these? <HelpCircle className="w-3 h-3" />
          </button>
          
          {/* Meta chips */}
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
              State: {titleCase(parentProfile?.state) || "Not added"}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
              Insurance: {parentProfile?.insurance || "Not added"}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
              Diagnosis: {formData.hasDiagnosis ? "Selected" : "Not selected"}
            </span>
          </div>
        </div>

        {/* Four tidy cards */}
        <div className="grid gap-6 mb-8">
          {/* Insurance Coverage Card */}
          <Card className={`p-6 rounded-xl shadow-sm border-gray-200 hover:shadow-md transition-all ${
            checklist.insurance === 'covered' ? 'benefits-card-covered' : 
            checklist.insurance === 'not_covered' ? 'benefits-card-not-covered' : ''
          }`}>
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-2 overflow-wrap-anywhere">Insurance coverage</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Autism coverage overview ({parentProfile?.insurance || "your plan"}), Prior auth basics, Out-of-pocket estimator, Sample appeal letter
                </p>
              </div>
            </div>
            
            {/* Accessible Radio Button Group */}
            <div 
              role="radiogroup" 
              aria-label="Insurance coverage status"
              className="benefits-status-chip-group"
              style={{ pointerEvents: 'auto' }}
            >
              {(['covered', 'unsure', 'not_covered'] as const).map((status) => (
                <button
                  key={status}
                  role="radio"
                  aria-checked={checklist.insurance === status}
                  data-status={status}
                  tabIndex={checklist.insurance === status ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onStatusChange('insurance', status);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.insurance);
                      const newIndex = currentIndex > 0 ? currentIndex - 1 : statuses.length - 1;
                      onStatusChange('insurance', statuses[newIndex]);
                    } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.insurance);
                      const newIndex = currentIndex < statuses.length - 1 ? currentIndex + 1 : 0;
                      onStatusChange('insurance', statuses[newIndex]);
                    } else if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onStatusChange('insurance', status);
                    }
                  }}
                  className="benefits-status-chip"
                >
                  {status === 'covered' ? '✓ Covered' : status === 'not_covered' ? '✕ Not covered' : '? Unsure'}
                </button>
              ))}
            </div>
          </Card>

          {/* Early Intervention Card */}
          <Card className={`p-6 rounded-xl shadow-sm border-gray-200 hover:shadow-md transition-all ${
            checklist.earlyIntervention === 'covered' ? 'benefits-card-covered' : 
            checklist.earlyIntervention === 'not_covered' ? 'benefits-card-not-covered' : ''
          }`}>
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Baby className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-2 overflow-wrap-anywhere">Early Intervention & state programs</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Part C Early Intervention ({titleCase(parentProfile?.state)}), Medicaid waivers ({titleCase(parentProfile?.state)}), Family support grants ({titleCase(parentProfile?.state)})
                </p>
              </div>
            </div>
            
            {/* Accessible Radio Button Group */}
            <div 
              role="radiogroup" 
              aria-label="Early Intervention status"
              className="benefits-status-chip-group"
              style={{ pointerEvents: 'auto' }}
            >
              {(['covered', 'unsure', 'not_covered'] as const).map((status) => (
                <button
                  key={status}
                  role="radio"
                  aria-checked={checklist.earlyIntervention === status}
                  data-status={status}
                  tabIndex={checklist.earlyIntervention === status ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onStatusChange('earlyIntervention', status);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.earlyIntervention);
                      const newIndex = currentIndex > 0 ? currentIndex - 1 : statuses.length - 1;
                      onStatusChange('earlyIntervention', statuses[newIndex]);
                    } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.earlyIntervention);
                      const newIndex = currentIndex < statuses.length - 1 ? currentIndex + 1 : 0;
                      onStatusChange('earlyIntervention', statuses[newIndex]);
                    } else if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onStatusChange('earlyIntervention', status);
                    }
                  }}
                  className="benefits-status-chip"
                >
                  {status === 'covered' ? '✓ Covered' : status === 'not_covered' ? '✕ Not covered' : '? Unsure'}
                </button>
              ))}
            </div>
          </Card>

          {/* School Supports Card - Request an evaluation pinned to top and default covered */}
          <Card className={`p-6 rounded-xl shadow-sm border-gray-200 hover:shadow-md transition-all ${
            checklist.schoolSupports === 'covered' ? 'border-l-4 border-l-green-400 bg-neutral-50' : 
            checklist.schoolSupports === 'not_covered' ? 'border-l-4 border-l-red-300' : ''
          }`}>
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <School className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-2 overflow-wrap-anywhere">School supports</h3>
                
                {/* Pinned evaluation template at top */}
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Request an evaluation (template)</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                      ✓ Covered
                    </Badge>
                  </div>
                  <p className="text-xs text-green-700 mt-1 ml-4">Default covered - ready to generate</p>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  IEP vs. 504, Progress data to bring, Rights & advocacy resources
                </p>
              </div>
            </div>
            
            {/* Accessible Radio Button Group */}
            <div 
              role="radiogroup" 
              aria-label="School supports status"
              className="benefits-status-chip-group"
              style={{ pointerEvents: 'auto' }}
            >
              {(['covered', 'unsure', 'not_covered'] as const).map((status) => (
                <button
                  key={status}
                  role="radio"
                  aria-checked={checklist.schoolSupports === status}
                  data-status={status}
                  tabIndex={checklist.schoolSupports === status ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onStatusChange('schoolSupports', status);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.schoolSupports);
                      const newIndex = currentIndex > 0 ? currentIndex - 1 : statuses.length - 1;
                      onStatusChange('schoolSupports', statuses[newIndex]);
                    } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.schoolSupports);
                      const newIndex = currentIndex < statuses.length - 1 ? currentIndex + 1 : 0;
                      onStatusChange('schoolSupports', statuses[newIndex]);
                    } else if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onStatusChange('schoolSupports', status);
                    }
                  }}
                  className="benefits-status-chip"
                >
                  {status === 'covered' ? '✓ Covered' : status === 'not_covered' ? '✕ Not covered' : '? Unsure'}
                </button>
              ))}
            </div>
          </Card>

          {/* Local & Community Card */}
          <Card className={`p-6 rounded-xl shadow-sm border-gray-200 hover:shadow-md transition-all ${
            checklist.localCommunity === 'covered' ? 'border-l-4 border-l-green-400 bg-neutral-50' : 
            checklist.localCommunity === 'not_covered' ? 'border-l-4 border-l-red-300' : ''
          }`}>
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-2 overflow-wrap-anywhere">Local & community</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Parent groups near you, Respite resources ({titleCase(parentProfile?.state)}), Transportation & services directory
                </p>
              </div>
            </div>
            
            {/* Accessible Radio Button Group */}
            <div 
              role="radiogroup" 
              aria-label="Local & community status"
              className="benefits-status-chip-group"
              style={{ pointerEvents: 'auto' }}
            >
              {(['covered', 'unsure', 'not_covered'] as const).map((status) => (
                <button
                  key={status}
                  role="radio"
                  aria-checked={checklist.localCommunity === status}
                  data-status={status}
                  tabIndex={checklist.localCommunity === status ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onStatusChange('localCommunity', status);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.localCommunity);
                      const newIndex = currentIndex > 0 ? currentIndex - 1 : statuses.length - 1;
                      onStatusChange('localCommunity', statuses[newIndex]);
                    } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
                      e.preventDefault();
                      const statuses: BenefitStatus[] = ['covered', 'unsure', 'not_covered'];
                      const currentIndex = statuses.indexOf(checklist.localCommunity);
                      const newIndex = currentIndex < statuses.length - 1 ? currentIndex + 1 : 0;
                      onStatusChange('localCommunity', statuses[newIndex]);
                    } else if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onStatusChange('localCommunity', status);
                    }
                  }}
                  className="benefits-status-chip"
                >
                  {status === 'covered' ? '✓ Covered' : status === 'not_covered' ? '✕ Not covered' : '? Unsure'}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Export Block */}
        <Card className="p-6 bg-gradient-to-br from-accent/5 to-teal-50 border-accent/20 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Download className="w-5 h-5 text-accent" />
            <h4 className="font-medium text-primary">Export your checklist</h4>
            <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
              Core+
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Get a comprehensive PDF with contact information, sample letters, and state-specific resources for {titleCase(parentProfile?.state)}.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            className="text-accent border-accent/30 hover:bg-accent/10"
            onClick={() => alert('Upgrade to Core+ to export your personalized coverage checklist and unlock detailed Reports & Benefits tracking!')}
          >
            <Download className="w-4 h-4 mr-1" />
            Export PDF
          </Button>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between aminy-form-navigation-breathing">
          <Button
            onClick={onBack}
            variant="outline"
            className="aminy-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button
              onClick={onSkip}
              variant="ghost"
              className="text-muted-foreground"
            >
              Skip
            </Button>
            
            <Button
              onClick={handleContinue}
              className="aminy-continue-button aminy-gentle-shimmer"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar - Enhanced with live counts and enabled CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 pb-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold leading-none">✓</span>
              </span>
              {benefitCounts.covered}
            </span>
            <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full font-medium inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold leading-none">?</span>
              </span>
              {benefitCounts.unsure}
            </span>
            <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full font-medium inline-flex items-center gap-1">
              <span className="w-3 h-3 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold leading-none">✕</span>
              </span>
              {benefitCounts.notCovered}
            </span>
          </div>
          <Button
            onClick={handleBuildPlan}
            disabled={isExporting}
            className={`
              bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200
              ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
          >
            {isExporting ? 'Building...' : 'Build my plan from these'}
          </Button>
        </div>
      </div>

      {/* Why These? Sheet Modal */}
      {showWhyTheseSheet && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowWhyTheseSheet(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-lg w-full mx-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-primary font-semibold">Why these?</h2>
              <button
                onClick={() => setShowWhyTheseSheet(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                These items are based on your state, insurance, and whether you have a diagnosis. 
              </p>
              
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-primary">Toggle 'Covered/Unsure/Not covered'</strong> so we can prioritize next steps and add relevant tasks to your daily plan.
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">✓</span>
                <span>Covered - will add related tasks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-bold text-xs">?</span>
                <span>Unsure - will add exploration tasks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-xs">✕</span>
                <span>Not covered - will skip for now</span>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <Button
                onClick={() => setShowWhyTheseSheet(false)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlanPreviewStep: React.FC<{
  data: CarePlan;
  allData: OnboardingData;
  onUpdate: (data: CarePlan) => void;
  onComplete: (planData: any, skippedSteps: string[]) => void;
  onBack: () => void;
  skippedSteps: string[];
  onNavigate?: (destination: string) => void;
}> = ({ data, allData, onUpdate, onComplete, onBack, skippedSteps, onNavigate }) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [planData, setPlanData] = useState<CarePlan>(data || {
    domains: [],
    goals: [],
    dailyTasks: [],
    reinforcement: [],
    timeline: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoals, setEditingGoals] = useState<Array<{id?: string, text: string, timeline: string}>>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    x: number;
    y: number;
    color: string;
    shape: 'circle' | 'square';
    delay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    // Simulate AI plan generation
    const timer = setTimeout(() => {
      try {
        const generatedPlan = generateAIPlan(allData);
        setPlanData(generatedPlan);
        onUpdate(generatedPlan);
        setIsGenerating(false);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error generating plan:', error);
        }
        // Fallback plan
        const fallbackPlan = {
          domains: ['speech', 'social', 'routines'],
          goals: [
            {
              id: 'goal-1',
              domain: 'speech',
              text: 'Improve daily communication',
              timeline: '2-4 weeks',
              measurable: 'Use 5 new words in daily conversation'
            }
          ],
          dailyTasks: [
            {
              id: 'task-1',
              domain: 'speech',
              title: 'Morning greetings practice',
              description: 'Practice saying good morning to family members',
              timeEstimate: '5 minutes',
              schedule: 'morning'
            }
          ],
          reinforcement: [
            'Praise specific behaviors immediately',
            'Use visual rewards and charts',
            'Celebrate small wins daily'
          ],
          timeline: '30-day initial plan'
        };
        setPlanData(fallbackPlan);
        onUpdate(fallbackPlan);
        setIsGenerating(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [allData, onUpdate]);

  const generateAIPlan = (data: OnboardingData): CarePlan => {
    const childName = data.childProfile?.name || 'your child';
    const focusAreas = data.needsProfile?.focusAreas || [];
    const goals = data.needsProfile?.goals?.filter(g => g && g.trim()) || [];
    const schedule = data.needsProfile?.schedule || [];

    const domains = focusAreas.length > 0 ? focusAreas : ['speech', 'social', 'routines'];
    
    const generatedGoals = goals.length > 0 ? goals.map((goal, index) => ({
      id: `goal-${index}`,
      domain: domains[index % domains.length],
      text: goal,
      timeline: '2-4 weeks',
      measurable: `Track progress daily for ${goal.toLowerCase()}`
    })) : [
      {
        id: 'goal-1',
        domain: 'speech',
        text: 'Improve daily communication',
        timeline: '2-4 weeks',
        measurable: 'Use 5 new words in daily conversation'
      },
      {
        id: 'goal-2', 
        domain: 'social',
        text: 'Build social connections',
        timeline: '3-6 weeks',
        measurable: 'Engage in 2 social activities per week'
      }
    ];

    const dailyTasks = [
      {
        id: 'task-1',
        domain: 'speech',
        title: 'Morning greetings practice',
        description: `Help ${childName} practice saying "good morning" to family members`,
        timeEstimate: '5 minutes',
        schedule: 'morning'
      },
      {
        id: 'task-2',
        domain: 'routines', 
        title: 'Visual schedule review',
        description: `Go through the day's activities with ${childName} using pictures`,
        timeEstimate: '10 minutes',
        schedule: 'morning'
      },
      {
        id: 'task-3',
        domain: 'social',
        title: 'Turn-taking games',
        description: `Play simple games that involve waiting and taking turns`,
        timeEstimate: '15 minutes',
        schedule: 'afternoon'
      }
    ];

    const reinforcement = [
      'Praise specific behaviors immediately',
      'Use visual rewards and charts',
      'Celebrate small wins daily',
      'Keep activities short and engaging'
    ];

    return {
      domains,
      goals: generatedGoals,
      dailyTasks,
      reinforcement,
      timeline: '30-day initial plan'
    };
  };

  // Get all focus areas as pills
  const getAllFocusAreas = () => {
    const userSelected = allData.needsProfile?.focusAreas || [];
    const planDomains = planData.domains || [];
    const allAreas = [...new Set([...userSelected, ...planDomains])];
    
    // Ensure we show at least some focus areas
    if (allAreas.length === 0) {
      return ['Communication', 'Social Skills', 'Daily Routines'];
    }
    
    return allAreas;
  };

  // Get exactly 3 goals, filling from focus areas if needed
  const getExactly3Goals = () => {
    const currentGoals = planData.goals || [];
    const insightGoals = allData.softDxProfile?.suggestedGoals || [];
    
    // Ensure we have exactly 3 goals
    const allGoals = [...currentGoals];
    
    // Fill with insight suggestions if we have fewer than 3
    if (allGoals.length < 3) {
      insightGoals.forEach((suggestion, index) => {
        if (allGoals.length < 3) {
          allGoals.push({
            id: `insight-${index}`,
            text: suggestion,
            timeline: '3-6 months',
            domain: ['speech', 'social', 'routines'][allGoals.length % 3]
          });
        }
      });
    }
    
    // Fill with focus area based goals if still needed
    if (allGoals.length < 3) {
      const focusAreas = allData.needsProfile?.focusAreas || [];
      const focusBasedGoals = [
        'Greetings',
        'Waiting',
        'Transitions',
        'Asking For Help',
        'Token Economy',
        'Calm-Down Routine'
      ];
      
      focusBasedGoals.forEach((goal, index) => {
        if (allGoals.length < 3) {
          allGoals.push({
            id: `focus-${index}`,
            text: goal,
            timeline: '3-6 months',
            domain: focusAreas[index % focusAreas.length] || 'routines'
          });
        }
      });
    }
    
    // Fill with defaults if still needed
    const defaultGoals = [
      'Improve Communication Skills',
      'Build Social Connections',
      'Establish Healthy Routines'
    ];
    
    while (allGoals.length < 3) {
      allGoals.push({
        id: `default-${allGoals.length}`,
        text: defaultGoals[allGoals.length] || 'Support Developmental Growth',
        timeline: '3-6 months',
        domain: ['speech', 'social', 'routines'][allGoals.length % 3]
      });
    }
    
    return allGoals.slice(0, 3);
  };

  // Generate minimum 6 activities with schedule badges
  const generateMinimum6Activities = () => {
    const focusAreas = allData.needsProfile?.focusAreas || ['speech', 'social', 'routines'];
    const schedules = ['Morning', 'After school', 'Evening', 'Bedtime'];
    
    const activities = [
      {
        title: 'Practice morning greeting routine',
        duration: '5-10 minutes',
        schedule: 'Morning',
        focus: 'speech'
      },
      {
        title: 'Communication practice session',
        duration: '15 minutes',
        schedule: 'After school',
        focus: 'speech'
      },
      {
        title: 'Social skills story time',
        duration: '10 minutes',
        schedule: 'Evening',
        focus: 'social'
      },
      {
        title: 'Calm-down breathing exercise',
        duration: '5 minutes',
        schedule: 'Bedtime',
        focus: 'emotional regulation'
      },
      {
        title: 'Transition practice with visual schedule',
        duration: '10 minutes',
        schedule: 'Morning',
        focus: 'routines'
      },
      {
        title: 'Sensory break activities',
        duration: '15 minutes',
        schedule: 'After school',
        focus: 'sensory'
      },
      {
        title: 'Turn-taking games practice',
        duration: '20 minutes',
        schedule: 'Evening',
        focus: 'social'
      },
      {
        title: 'Bedtime routine practice',
        duration: '15 minutes',
        schedule: 'Bedtime',
        focus: 'routines'
      }
    ];
    
    // Ensure minimum 6 activities
    return activities.slice(0, Math.max(6, activities.length));
  };

  const getScheduleBadgeStyle = (schedule: string) => {
    switch (schedule) {
      case 'Morning':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'After school':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'Evening':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'Bedtime':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getRewardFromInterests = () => {
    const interests = allData.childProfile?.interests || [];
    const rewardableInterests = ['Bubbles', 'Stickers', 'Music', 'Books', 'Puzzles', 'Lights', 'Animals'];
    
    // Find a suitable reward from interests
    const reward = interests.find(interest => 
      rewardableInterests.some(rewardable => 
        interest.toLowerCase().includes(rewardable.toLowerCase())
      )
    );
    
    if (reward) {
      return titleCase(reward);
    }
    
    // Default fallback
    return 'pick a reward in Settings';
  };

  // Generate confetti pieces
  const generateConfetti = () => {
    const colors = ['#0891b2', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];
    const pieces = [];
    
    for (let i = 0; i < 50; i++) {
      pieces.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.5 ? 'circle' : 'square',
        delay: Math.random() * 1000,
        duration: 1000 + Math.random() * 1500
      });
    }
    
    return pieces;
  };

  const handleEditGoals = () => {
    const currentGoals = getExactly3Goals();
    setEditingGoals(currentGoals.map(goal => ({
      id: goal.id,
      text: goal.text,
      timeline: goal.timeline || '3-6 months'
    })));
    setShowEditModal(true);
  };

  const updateGoal = (index: number, text: string) => {
    const updated = [...editingGoals];
    updated[index] = { ...updated[index], text };
    setEditingGoals(updated);
  };

  const moveGoal = (fromIndex: number, toIndex: number) => {
    const updated = [...editingGoals];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setEditingGoals(updated);
  };

  const saveAllGoals = () => {
    const updatedGoals = editingGoals.map((goal, index) => ({
      id: goal.id || `goal-${index}`,
      domain: ['speech', 'social', 'routines'][index % 3],
      text: goal.text.trim(),
      timeline: goal.timeline,
      measurable: `Track progress for ${goal.text.toLowerCase()}`
    }));

    const updatedPlan = { ...planData, goals: updatedGoals };
    setPlanData(updatedPlan);
    onUpdate(updatedPlan);
    setShowEditModal(false);
  };

  const handleComplete = () => {
    // Show confetti animation
    const pieces = generateConfetti();
    setConfettiPieces(pieces);
    setShowConfetti(true);
    
    // Inject activities into Today's Plan and show toast
    const activities = generateMinimum6Activities();
    const goals = getExactly3Goals();
    const planWithActivities = {
      ...planData,
      goals: goals,
      dailyTasks: activities.map((activity, index) => ({
        id: `activity-${index}`,
        title: activity.title,
        description: `${activity.duration} activity focused on ${activity.focus}`,
        timeEstimate: activity.duration,
        schedule: activity.schedule,
        domain: activity.focus,
        completed: false
      }))
    };
    
    // Hide confetti after animation
    setTimeout(() => {
      setShowConfetti(false);
      // Show success toast and route to Home
      toast.success('Plan created—see it in Today\'s Plan', {
        duration: 4000,
        position: 'top-center'
      });
      onComplete(planWithActivities, skippedSteps);
    }, 2000);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-white">
        {/* Progress Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Step 7 of 7</span>
              <Badge variant="outline" className="text-xs">Plan Preview</Badge>
            </div>
            <Progress value={100} className="h-2" />
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-16">
          <div className="text-center">
            <div className="p-4 bg-accent/10 rounded-full inline-flex mb-6 compass-animate">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Creating your personalized plan...
            </h2>
            <p className="text-muted-foreground mb-8">
              Our AI is analyzing your responses to create a tailored support plan.
            </p>
            
            <div className="space-y-3 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                Analyzing focus areas and goals
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                Matching developmentally appropriate activities
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                Creating your daily routine
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Step 7 of 7</span>
            <Badge variant="outline" className="text-xs">Plan Preview</Badge>
          </div>
          <Progress value={100} className="h-2" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="p-3 bg-green-100 rounded-full inline-flex mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-primary mb-2">
            Your Living Plan is ready!
          </h2>
          <p className="text-muted-foreground">
            Here's your child's personalized support plan.
          </p>
        </div>

        {/* Plan Preview Card */}
        <Card className="p-6 mb-6 care-plan-completion">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-primary">
              {allData.childProfile?.name || 'Your Child'}'s Living Plan
            </h3>
            <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
              AI-Generated
            </Badge>
          </div>

          {/* All Focus Areas as Pills */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-primary mb-3">Focus Areas</h4>
            <div className="flex flex-wrap gap-2">
              {getAllFocusAreas().map((area, index) => (
                <Badge key={index} variant="outline" className="capitalize aminy-focus-area-pill bg-cyan-50 border-cyan-200 text-primary">
                  {titleCase(area)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Always Exactly 3 Primary Goals in Title Case */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-primary mb-3">Primary Goals</h4>
            <div className="space-y-3">
              {getExactly3Goals().map((goal, index) => (
                <div key={goal.id || index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Target className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{titleCase(goal.text)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Timeline: {goal.timeline || '3-6 months'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Activities with Schedule Badges (≥6) */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-primary mb-3">Daily Activities</h4>
            <div className="space-y-3">
              {generateMinimum6Activities().map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-primary flex-1">{activity.title}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-1 flex-shrink-0 ${getScheduleBadgeStyle(activity.schedule)}`}
                      >
                        {activity.schedule}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards Row with Exact Format */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-primary mb-3">Rewards</h4>
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <Award className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">
                  Earn 3 tokens → {getRewardFromInterests()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Token system based on completed activities
                </p>
              </div>
              <button
                onClick={() => onNavigate?.('profile')}
                className="text-accent hover:text-accent/80 transition-colors text-sm font-medium inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-lg px-2 py-1"
              >
                Pick reward <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <Button
              onClick={handleEditGoals}
              variant="outline"
              size="sm"
              className="px-6"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit Goals
            </Button>
          </div>
        </Card>

        {/* Encouragement */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your plan will continue to evolve as we learn more about {allData.childProfile?.name || 'your child'}'s 
            progress and preferences. This is just the beginning!
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="aminy-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          <Button
            onClick={handleComplete}
            className="aminy-continue-button aminy-gentle-shimmer"
          >
            Finish Setup
            <CheckCircle className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Enhanced Edit Goals Modal - All 3 Goals */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-primary mb-4">Edit All Goals</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Update your three primary goals. Drag to reorder or edit the text.
            </p>
            
            <div className="space-y-4 mb-6">
              {editingGoals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Goal {index + 1}</Label>
                    <div className="flex gap-1">
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveGoal(index, index - 1)}
                          className="h-6 w-6 p-0"
                        >
                          ↑
                        </Button>
                      )}
                      {index < editingGoals.length - 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveGoal(index, index + 1)}
                          className="h-6 w-6 p-0"
                        >
                          ↓
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={goal.text}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    placeholder={`Enter goal ${index + 1}...`}
                    className="min-h-[60px]"
                    rows={2}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={saveAllGoals}
                className="flex-1"
              >
                Save All Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confetti Container */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiPieces.map((piece, index) => (
            <div
              key={index}
              className="absolute animate-enhanced-confetti"
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                backgroundColor: piece.color,
                width: '8px',
                height: '8px',
                borderRadius: piece.shape === 'circle' ? '50%' : '0%',
                animationDelay: `${piece.delay}ms`,
                animationDuration: `${piece.duration}ms`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Onboarding Flow Component
export function OnboardingFlowNormalized({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showJrInterstitial, setShowJrInterstitial] = useState(false);
  const [showJrWizard, setShowJrWizard] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    parentProfile: {
      name: '',
      relationship: '',
      state: '',
      email: '',
      insurance: ''
    },
    childProfile: {
      name: '',
      age: 0,
      diagnoses: [],
      communicationLevel: '',
      interests: [],
      triggers: []
    },
    needsProfile: {
      focusAreas: [],
      tone: '',
      goals: [],
      schedule: [],
      additionalNeeds: ''
    },
    jrProfile: undefined,
    softDxProfile: {
      responses: {},
      uploads: [],
      severity: '',
      concerns: []
    },
    coverageProfile: {
      hasDiagnosis: false,
      state: '',
      insurance: '',
      resources: []
    },
    carePlan: {
      domains: [],
      goals: [],
      dailyTasks: [],
      reinforcement: [],
      timeline: ''
    }
  });
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Modal slides data
  const slides = [
    {
      icon: Calendar,
      title: "Build a daily plan",
      body: "Pick goals and times of day; Aminy turns them into doable steps.",
      audience: "caregiver"
    },
    {
      icon: Sparkles,
      title: "Practice & play", 
      body: "Kid-friendly speech, social, sensory, and routine games. Tokens = rewards.",
      audience: "child"
    },
    {
      icon: FileText,
      title: "Progress you can share",
      body: "Your practice rolls into tidy reports. Email or download anytime.",
      audience: "school/providers"
    }
  ];

  const updateData = (section: keyof OnboardingData, newData: any) => {
    setData(prev => ({ ...prev, [section]: newData }));
  };

  const nextStep = () => {
    // After Step 4 (Needs & Schedule), show Jr interstitial
    if (currentStep === 3) { // Step 4 is index 3
      setShowJrInterstitial(true);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const skipStep = (stepName: string) => {
    setSkippedSteps(prev => [...prev, stepName]);
    nextStep();
  };

  // Jr Setup Handlers
  const handleJrSetupNow = () => {
    setShowJrInterstitial(false);
    setShowJrWizard(true);
  };

  const handleJrSkip = () => {
    setShowJrInterstitial(false);
    setSkippedSteps(prev => [...prev, 'Jr Setup']);
    setCurrentStep(prev => prev + 1); // Go to step 5
  };

  const handleJrComplete = (jrProfile: any) => {
    setData(prev => ({ ...prev, jrProfile }));
    setShowJrWizard(false);
    setCurrentStep(prev => prev + 1); // Go to step 5
  };

  const handleJrCancel = () => {
    setShowJrWizard(false);
    setShowJrInterstitial(true);
  };

  const handleJrInterstitialBack = () => {
    setShowJrInterstitial(false);
    // Don't change currentStep since we're still on step 4
  };

  const handleComplete = (planData: any, skipped: string[]) => {
    const allSkippedSteps = [...skippedSteps, ...skipped];
    onComplete(planData, allSkippedSteps);
  };

  // How It Works Modal handlers
  const handleHowItWorksClick = () => {
    setShowHowItWorksModal(true);
    setCurrentSlide(0);
  };

  const handleCloseModal = () => {
    setShowHowItWorksModal(false);
    setCurrentSlide(0);
  };

  const handleStartNow = () => {
    setShowHowItWorksModal(false);
    // Continue with onboarding
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Handle keyboard navigation and ESC key for modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showHowItWorksModal) return;
      
      switch (e.key) {
        case 'Escape':
          handleCloseModal();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextSlide();
          break;
      }
    };

    if (showHowItWorksModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHowItWorksModal, currentSlide]);

  const steps = [
    // Step 1 - Welcome
    <WelcomeStep
      key="welcome"
      onNext={nextStep}
      onLearnMore={handleHowItWorksClick}
    />,
    
    // Step 2 - Caregiver Info
    <CaregiverInfoStep
      key="caregiver"
      data={data.parentProfile!}
      onUpdate={(newData) => updateData('parentProfile', newData)}
      onNext={nextStep}
      onBack={prevStep}
    />,
    
    // Step 3 - Child Info
    <ChildInfoStep
      key="child"
      data={data.childProfile!}
      onUpdate={(newData) => updateData('childProfile', newData)}
      onNext={nextStep}
      onBack={prevStep}
    />,
    
    // Step 4 - Needs & Schedule
    <NeedsAndScheduleStep
      key="needs"
      data={data.needsProfile!}
      onUpdate={(newData) => updateData('needsProfile', newData)}
      onNext={nextStep}
      onBack={prevStep}
    />,
    
    // Step 5 - Insight Navigator (formerly Soft Diagnosis)
    <SoftDiagnosisStep
      key="diagnosis"
      data={data.softDxProfile!}
      onUpdate={(newData) => updateData('softDxProfile', newData)}
      onNext={nextStep}
      onBack={prevStep}
      onSkip={() => skipStep('Insight Navigator')}
    />,
    
    // Step 6 - Coverage Coach (formerly Benefits Navigator)
    <BenefitsNavigatorStep
      key="benefits"
      data={data.coverageProfile!}
      parentProfile={data.parentProfile!}
      onUpdate={(newData) => updateData('coverageProfile', newData)}
      onNext={nextStep}
      onBack={prevStep}
      onSkip={() => skipStep('Coverage Coach')}
    />,
    
    // Step 7 - Plan Preview
    <PlanPreviewStep
      key="plan"
      data={data.carePlan!}
      allData={data}
      onUpdate={(newData) => updateData('carePlan', newData)}
      onComplete={handleComplete}
      onBack={prevStep}
      skippedSteps={skippedSteps}
    />
  ];

  // Handle Jr Setup flows
  if (showJrInterstitial) {
    return (
      <JrSetupInterstitial
        onSetupNow={handleJrSetupNow}
        onSkip={handleJrSkip}
        onBack={handleJrInterstitialBack}
      />
    );
  }

  if (showJrWizard) {
    return (
      <JrSetupWizard
        childName={data.childProfile?.name || 'Child'}
        onComplete={handleJrComplete}
        onCancel={handleJrCancel}
      />
    );
  }

  return (
    <>
      {steps[currentStep]}
      
      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
          style={{ 
            animation: prefersReducedMotion ? 'none' : 'fadeIn 0.3s ease-out'
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-[560px] w-full mx-auto shadow-2xl text-crisp"
            style={{
              borderRadius: '16px',
              animation: prefersReducedMotion ? 'none' : 'slideUp 0.3s ease-out'
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative p-6 pb-4">
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 id="modal-title" className="text-2xl font-semibold text-primary text-center pr-8">
                How Aminy works
              </h2>
            </div>

            {/* Slide Content */}
            <div className="px-6 pb-4">
              <div className="text-center">
                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-accent/10 rounded-xl">
                  {React.createElement(slides[currentSlide].icon, {
                    className: "w-8 h-8 text-accent",
                    strokeWidth: 1.75
                  })}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-primary mb-3 text-crisp">
                  {slides[currentSlide].title}
                </h3>

                {/* Body */}
                <p className="text-muted-foreground text-base leading-relaxed mb-6 max-w-md mx-auto text-crisp">
                  {slides[currentSlide].body}
                </p>

                {/* Audience Badge */}
                <div className="inline-flex items-center px-3 py-1 bg-muted/50 rounded-full mb-8">
                  <span className="text-sm font-medium text-muted-foreground">
                    ({slides[currentSlide].audience})
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center space-x-2 px-6 pb-6">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                    index === currentSlide
                      ? 'bg-accent'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation Arrows (Desktop) */}
            <div className="hidden sm:block">
              {currentSlide > 0 && (
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentSlide < slides.length - 1 && (
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row gap-3 p-6 pt-2 border-t border-gray-100">
              <Button
                onClick={handleStartNow}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Start now
              </Button>
              <Button
                onClick={handleCloseModal}
                variant="outline"
                className="flex-1 sm:flex-none sm:min-w-[100px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}