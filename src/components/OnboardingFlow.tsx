import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  User,
  Target,
  Clock,
  BookOpen,
  TrendingUp,
  Heart,
  Star,
  Calendar,
  Brain,
  Lightbulb,
  CheckCircle,
  Users,
  Activity,
  Clipboard,
  BarChart3,
  FileText,
  Download,
  Share,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { SummaryStep } from "./SummaryStepNew";
import { PreferencesStep } from "./PreferencesStepNew";
import { CarePlanGeneratorStep } from "./CarePlanGeneratorStep";

interface OnboardingFlowProps {
  onComplete: (carePlanData?: any) => void;
}

export function OnboardingFlow({
  onComplete,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showShimmer, setShowShimmer] = useState(false);
  const [showComingSoonSheet, setShowComingSoonSheet] = useState(false);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    // Create Account step fields
    caregiverRole: "",
    caregiverName: "",
    email: "",
    state: "",
    insurance: "",
    agreeToTrial: true,
    // Child Profile fields
    childName: "",
    childAge: "",
    conditions: [] as string[], // NEW: neurotype/condition multi-select
    diagnosisStatus: "", // NEW: formal, in-process, suspected, none
    languages: [] as string[],
    verbalAbility: "",
    interests: "",
    triggers: "",
    // Multi-child support
    children: [] as any[], // NEW: array of child profiles
    currentChildIndex: 0, // NEW: which child is being edited
    // Tone & Schedule fields
    tonePreference: "",
    timeSlots: [] as string[],
    // Existing fields
    preferredName: "",
    pronouns: "",
    relationshipToChild: "",
    diagnosis: "",
    currentFocus: "",
    anythingElse: "",
    freeformConcerns: "",
    needsDomains: [] as string[],
    additionalNeeds: "",
    goals: [] as string[],
    whatMatters: "",
    whatHelpWith: "",
    schedule: "",
    // Legacy support for existing references
    parentName: "",
  });

  const steps = [
    {
      title: "Create Account",
      subtitle: "Tell us about yourself so we can personalize your experience.",
      content: (
        <CreateAccountStep
          formData={formData}
          setFormData={setFormData}
          errors={validationErrors}
        />
      ),
    },
    {
      title: "Child Profile",
      subtitle: "Tell us about your child so we can create the perfect plan and activities.",
      content: (
        <ChildInfoStep
          formData={formData}
          setFormData={setFormData}
          onAddAnotherChild={() => setShowComingSoonSheet(true)}
          errors={validationErrors}
        />
      ),
    },
    {
      title: "Focus Areas",
      subtitle: "Where would you like the most support right now?",
      content: (
        <NeedsDomainsStep
          formData={formData}
          setFormData={setFormData}
        />
      ),
    },
    {
      title: "Tone & Schedule",
      subtitle: "How can we make Aminy work perfectly for your family?",
      content: (
        <PreferencesStep
          formData={formData}
          setFormData={setFormData}
        />
      ),
    },
    {
      title: "Creating Your Care Plan ✨",
      subtitle: "Aminy AI is building a personalized plan with evidence-based goals and daily strategies tailored for your family.",
      content: (
        <CarePlanGeneratorStep
          formData={formData}
          onComplete={() => setCurrentStep(currentStep + 1)}
        />
      ),
    },
    {
      title: "You're all set! Here's your tailored plan 🎉",
      subtitle:
        "Based on your child's profile and goals, Aminy built a daily support plan that grows with you.",
      content: (
        <SummaryStep
          formData={formData}
          onRestart={() => setCurrentStep(0)}
        />
      ),
    },
  ];

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Email validation regex
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Age validation
  const isValidAge = (age: string) => {
    const num = parseInt(age, 10);
    return !isNaN(num) && num >= 1 && num <= 99;
  };

  // Validate current step before proceeding
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Create Account
        if (!formData.caregiverRole) {
          errors.caregiverRole = 'Please select your role';
        }
        if (!formData.caregiverName?.trim()) {
          errors.caregiverName = 'Please enter your name';
        }
        if (!formData.email?.trim()) {
          errors.email = 'Please enter your email';
        } else if (!isValidEmail(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
        if (!formData.state) {
          errors.state = 'Please select your state';
        }
        break;

      case 1: // Child Profile
        if (!formData.childName?.trim()) {
          errors.childName = "Please enter your child's name";
        }
        if (!formData.childAge?.trim()) {
          errors.childAge = "Please enter your child's age";
        } else if (!isValidAge(formData.childAge)) {
          errors.childAge = 'Please enter a valid age (1-99)';
        }
        if (!formData.conditions || formData.conditions.length === 0) {
          errors.conditions = 'Please select at least one option';
        }
        break;

      case 2: // Focus Areas
        // Focus areas are optional - no validation needed
        break;

      case 3: // Tone & Schedule
        // Optional preferences - no validation needed
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    // Validate before proceeding (skip validation for summary/generator steps)
    if (currentStep < 4 && !validateCurrentStep()) {
      return; // Don't proceed if validation fails
    }

    if (currentStep < steps.length - 1) {
      setValidationErrors({}); // Clear errors on successful validation
      setCurrentStep(currentStep + 1);
    } else {
      // On completion, pass the care plan data with enhanced structure
      const caregiverProfile = {
        name: formData.caregiverName || formData.parentName,
        role: formData.caregiverRole,
        preferred_name: formData.preferredName,
        pronouns: formData.pronouns,
        relationship: formData.relationshipToChild || formData.caregiverRole,
        state: formData.state,
        email: formData.email,
        insurance: formData.insurance
      };

      // If no support areas selected, backend will default to "General Guidance"
      const finalFormData = {
        ...formData,
        needsDomains: formData.needsDomains?.length > 0 ? formData.needsDomains : ["general"]
      };

      // Enhanced care plan data structure with AI generation metadata
      const carePlanData = {
        formData: finalFormData,
        caregiverProfile,
        planDate: new Date().toISOString(),
        version: '1.0',
        dateCreated: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
        planType: 'comprehensive_aba_iep',
        status: 'active',
        smartGoals: true,
        baselineData: true,
        progressTracking: true,
        reportsIntegration: true
      };
      onComplete(carePlanData);
    }
    resetInactivityTimer();
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
    resetInactivityTimer();
  };

  const resetInactivityTimer = () => {
    setShowShimmer(false);
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      setShowShimmer(true);
    }, 3500); // 3.5 seconds for subtle encouragement
  };

  // Set up inactivity tracking
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [currentStep]);

  // Reset shimmer on any form interaction
  useEffect(() => {
    const handleUserActivity = () => resetInactivityTimer();

    document.addEventListener("click", handleUserActivity);
    document.addEventListener("keydown", handleUserActivity);
    document.addEventListener("input", handleUserActivity);

    return () => {
      document.removeEventListener("click", handleUserActivity);
      document.removeEventListener(
        "keydown",
        handleUserActivity,
      );
      document.removeEventListener("input", handleUserActivity);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 px-4 py-6">
      {/* Coming Soon Sheet */}
      {showComingSoonSheet && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowComingSoonSheet(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🚧</div>
              <h2 className="text-xl text-primary font-semibold mb-4">
                Coming Soon!
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                We're working on multi-child support. For now, you can create a plan for one child and add others later.
              </p>
              <button
                onClick={() => setShowComingSoonSheet(false)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(
                ((currentStep + 1) / steps.length) * 100,
              )}
              %
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="space-y-6">
          <div
            className="text-center"
            style={{ marginBottom: "24px" }}
          >
            <h2
              className="text-xl tracking-tight text-primary"
              style={{ marginBottom: "12px" }}
            >
              {steps[currentStep].title}
            </h2>
            <p className="text-muted-foreground">
              {steps[currentStep].subtitle}
            </p>
          </div>

          <Card className="p-6 aminy-card">
            {steps[currentStep].content}
          </Card>
        </div>

        {/* Navigation */}
        <div className="aminy-form-navigation-breathing">
          {/* Final Summary Step (Step 6) Final Actions Layout */}
          {currentStep === steps.length - 1 ? (
            <div className="final-actions-layout space-y-4">
              {/* Make a Change Tertiary Button */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(0)}
                  className="make-change-tertiary-button text-muted-foreground hover:text-foreground hover:bg-muted/50 h-10 px-4 rounded-lg transition-all duration-200 inline-flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Make a change
                </Button>
              </div>
              
              {/* Complete Setup Button with Enhanced Shimmer */}
              <div className="text-center">
                <Button
                  onClick={nextStep}
                  className="complete-setup-button bg-primary hover:bg-primary/90 rounded-xl h-12 px-8 shadow-lg text-white font-semibold text-base completion-checkmark aminy-gentle-shimmer transform hover:scale-105 transition-all duration-300"
                >
                  Complete Setup
                </Button>
              </div>
            </div>
          ) : currentStep === 4 ? (
            /* Care Plan Generator Step (Step 5) - No navigation, handled internally */
            null
          ) : (
            /* Regular Navigation for Steps 1-4 */
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="rounded-xl aminy-button-secondary aminy-back-button h-12 text-muted-foreground hover:text-foreground"
                style={{ fontSize: "15px", fontWeight: 500 }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                className={`bg-primary hover:bg-primary/90 rounded-xl aminy-button-primary h-12 aminy-continue-button shadow-lg ${showShimmer ? "aminy-gentle-shimmer" : ""}`}
                style={{ fontSize: "16px", fontWeight: 600 }}
              >
                {currentStep === 0 ? "Continue → Child Profile" : currentStep === 3 ? "Generate Care Plan" : "Continue"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateAccountStep({ formData, setFormData, errors = {} }: any) {
  const roleOptions = [
    { id: "parent", label: "Parent" },
    { id: "grandparent", label: "Grandparent" },
    { id: "guardian", label: "Guardian" },
    { id: "paid-caregiver", label: "Paid caregiver" },
    { id: "other", label: "Other" }
  ];

  const toggleRole = (roleId: string) => {
    setFormData({
      ...formData,
      caregiverRole: formData.caregiverRole === roleId ? "" : roleId,
    });
  };

  // Error display helper
  const ErrorMessage = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
        <span className="text-red-500">*</span> {errors[field]}
      </p>
    ) : null;

  return (
    <div className="space-y-5">
      {/* Your role - Chip select */}
      <div>
        <Label className={`mb-3 block ${errors.caregiverRole ? 'text-red-600' : ''}`}>
          Your role *
        </Label>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((role) => {
            const isSelected = formData.caregiverRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 aminy-tone-badge ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : errors.caregiverRole
                    ? "border-red-300 hover:border-red-400"
                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>
        <ErrorMessage field="caregiverRole" />
      </div>

      {/* Your name - Required */}
      <div>
        <Label htmlFor="caregiverName" className={`mb-2 block ${errors.caregiverName ? 'text-red-600' : ''}`}>
          Your name *
        </Label>
        <Input
          id="caregiverName"
          value={formData.caregiverName}
          onChange={(e) => setFormData({
            ...formData,
            caregiverName: e.target.value,
            parentName: e.target.value, // Legacy support
          })}
          placeholder="Enter your name"
          className={`rounded-xl aminy-input-left ${errors.caregiverName ? 'border-red-300 focus:border-red-500' : ''}`}
          required
        />
        <ErrorMessage field="caregiverName" />
      </div>

      {/* Email - Required */}
      <div>
        <Label htmlFor="email" className={`mb-2 block ${errors.email ? 'text-red-600' : ''}`}>
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          placeholder="Enter your email"
          className={`rounded-xl aminy-input-left ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
          required
        />
        <ErrorMessage field="email" />
      </div>

      {/* State - Required */}
      <div>
        <Label htmlFor="state" className={`mb-2 block ${errors.state ? 'text-red-600' : ''}`}>
          State *
        </Label>
        <Select
          value={formData.state}
          onValueChange={(value) =>
            setFormData({ ...formData, state: value })
          }
        >
          <SelectTrigger className={`rounded-xl aminy-state-select ${errors.state ? 'border-red-300' : ''}`}>
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            <SelectItem value="AL">Alabama</SelectItem>
            <SelectItem value="AK">Alaska</SelectItem>
            <SelectItem value="AZ">Arizona</SelectItem>
            <SelectItem value="AR">Arkansas</SelectItem>
            <SelectItem value="CA">California</SelectItem>
            <SelectItem value="CO">Colorado</SelectItem>
            <SelectItem value="CT">Connecticut</SelectItem>
            <SelectItem value="DE">Delaware</SelectItem>
            <SelectItem value="DC">District of Columbia</SelectItem>
            <SelectItem value="FL">Florida</SelectItem>
            <SelectItem value="GA">Georgia</SelectItem>
            <SelectItem value="HI">Hawaii</SelectItem>
            <SelectItem value="ID">Idaho</SelectItem>
            <SelectItem value="IL">Illinois</SelectItem>
            <SelectItem value="IN">Indiana</SelectItem>
            <SelectItem value="IA">Iowa</SelectItem>
            <SelectItem value="KS">Kansas</SelectItem>
            <SelectItem value="KY">Kentucky</SelectItem>
            <SelectItem value="LA">Louisiana</SelectItem>
            <SelectItem value="ME">Maine</SelectItem>
            <SelectItem value="MD">Maryland</SelectItem>
            <SelectItem value="MA">Massachusetts</SelectItem>
            <SelectItem value="MI">Michigan</SelectItem>
            <SelectItem value="MN">Minnesota</SelectItem>
            <SelectItem value="MS">Mississippi</SelectItem>
            <SelectItem value="MO">Missouri</SelectItem>
            <SelectItem value="MT">Montana</SelectItem>
            <SelectItem value="NE">Nebraska</SelectItem>
            <SelectItem value="NV">Nevada</SelectItem>
            <SelectItem value="NH">New Hampshire</SelectItem>
            <SelectItem value="NJ">New Jersey</SelectItem>
            <SelectItem value="NM">New Mexico</SelectItem>
            <SelectItem value="NY">New York</SelectItem>
            <SelectItem value="NC">North Carolina</SelectItem>
            <SelectItem value="ND">North Dakota</SelectItem>
            <SelectItem value="OH">Ohio</SelectItem>
            <SelectItem value="OK">Oklahoma</SelectItem>
            <SelectItem value="OR">Oregon</SelectItem>
            <SelectItem value="PA">Pennsylvania</SelectItem>
            <SelectItem value="RI">Rhode Island</SelectItem>
            <SelectItem value="SC">South Carolina</SelectItem>
            <SelectItem value="SD">South Dakota</SelectItem>
            <SelectItem value="TN">Tennessee</SelectItem>
            <SelectItem value="TX">Texas</SelectItem>
            <SelectItem value="UT">Utah</SelectItem>
            <SelectItem value="VT">Vermont</SelectItem>
            <SelectItem value="VA">Virginia</SelectItem>
            <SelectItem value="WA">Washington</SelectItem>
            <SelectItem value="WV">West Virginia</SelectItem>
            <SelectItem value="WI">Wisconsin</SelectItem>
            <SelectItem value="WY">Wyoming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Insurance - Optional */}
      <div>
        <Label htmlFor="insurance" className="mb-2 block">
          Insurance (optional)
        </Label>
        <Input
          id="insurance"
          value={formData.insurance}
          onChange={(e) =>
            setFormData({ ...formData, insurance: e.target.value })
          }
          placeholder="Plan name (e.g., Blue Cross, Aetna)"
          className="rounded-xl aminy-input-left"
        />
      </div>

      {/* Trial checkbox - Default checked */}
      <div className="flex items-start gap-3 pt-4">
        <Checkbox
          id="agreeToTrial"
          checked={formData.agreeToTrial}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, agreeToTrial: checked })
          }
          className="mt-1"
        />
        <Label 
          htmlFor="agreeToTrial" 
          className="text-sm leading-relaxed cursor-pointer"
        >
          I'm okay starting with a free Core trial (7 days).
        </Label>
      </div>

      {/* Helper text */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          We'll personalize benefits info by state later.
        </p>
      </div>
    </div>
  );
}

function ChildInfoStep({ formData, setFormData, onAddAnotherChild, errors = {} }: any) {
  const [showAddChild, setShowAddChild] = useState(false);

  // Error display helper
  const ErrorMessage = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
        <span className="text-red-500">*</span> {errors[field]}
      </p>
    ) : null;

  // Expanded neurotype/condition options
  const conditionOptions = [
    { id: "autism", label: "Autism/ASD", icon: "🧩", color: "teal" },
    { id: "adhd", label: "ADHD", icon: "⚡", color: "violet" },
    { id: "anxiety", label: "Anxiety", icon: "💭", color: "blue" },
    { id: "sensory-processing", label: "Sensory Processing", icon: "🌊", color: "orange" },
    { id: "speech-delay", label: "Speech/Language Delay", icon: "💬", color: "green" },
    { id: "developmental-delay", label: "Developmental Delay", icon: "🌱", color: "cyan" },
    { id: "learning-disability", label: "Learning Disability", icon: "📚", color: "pink" },
    { id: "ocd", label: "OCD", icon: "🔄", color: "amber" },
    { id: "depression", label: "Depression", icon: "🌧️", color: "slate" },
    { id: "still-figuring-out", label: "Still figuring it out", icon: "🔍", color: "neutral" },
    { id: "other", label: "Other", icon: "✨", color: "purple" }
  ];

  const languageOptions = [
    { id: "english", label: "English" },
    { id: "spanish", label: "Spanish" },
    { id: "french", label: "French" },
    { id: "chinese", label: "Chinese" },
    { id: "arabic", label: "Arabic" },
    { id: "other", label: "Other" }
  ];

  const verbalAbilityOptions = [
    { id: "nonverbal", label: "Nonverbal", description: "Uses no spoken words" },
    { id: "single-words", label: "Single words", description: "1-2 word phrases" },
    { id: "phrases", label: "Phrases", description: "Short sentences" },
    { id: "conversational", label: "Conversational", description: "Full conversations" }
  ];

  const diagnosisStatusOptions = [
    { id: "formal", label: "Formal diagnosis" },
    { id: "in-process", label: "In evaluation process" },
    { id: "suspected", label: "Suspected/self-identified" },
    { id: "none", label: "No diagnosis" }
  ];

  const toggleCondition = (conditionId: string) => {
    const current = formData.conditions || [];
    if (current.includes(conditionId)) {
      setFormData({
        ...formData,
        conditions: current.filter((id: string) => id !== conditionId),
      });
    } else {
      setFormData({
        ...formData,
        conditions: [...current, conditionId],
      });
    }
  };

  const toggleLanguage = (languageId: string) => {
    const current = formData.languages || [];
    if (current.includes(languageId)) {
      setFormData({
        ...formData,
        languages: current.filter((id: string) => id !== languageId),
      });
    } else {
      setFormData({
        ...formData,
        languages: [...current, languageId],
      });
    }
  };

  // Multi-child support
  const children = formData.children || [];
  const currentChildIndex = formData.currentChildIndex || 0;

  const addChild = () => {
    const newChild = {
      id: `child-${Date.now()}`,
      name: '',
      age: '',
      conditions: [],
      languages: ['english'],
      verbalAbility: '',
      diagnosisStatus: '',
      interests: '',
      triggers: ''
    };
    setFormData({
      ...formData,
      children: [...children, newChild],
      currentChildIndex: children.length
    });
    setShowAddChild(false);
  };

  const getConditionColor = (color: string, isSelected: boolean) => {
    if (!isSelected) return "border-border hover:border-accent/50 hover:bg-accent/5";
    const colors: Record<string, string> = {
      teal: "border-teal-400 bg-teal-50 text-teal-700",
      violet: "border-violet-400 bg-violet-50 text-violet-700",
      blue: "border-blue-400 bg-blue-50 text-blue-700",
      orange: "border-orange-400 bg-orange-50 text-orange-700",
      green: "border-green-400 bg-green-50 text-green-700",
      cyan: "border-cyan-400 bg-cyan-50 text-cyan-700",
      pink: "border-pink-400 bg-pink-50 text-pink-700",
      amber: "border-amber-400 bg-amber-50 text-amber-700",
      slate: "border-slate-400 bg-slate-50 text-slate-700",
      neutral: "border-neutral-400 bg-neutral-50 text-neutral-700",
      purple: "border-purple-400 bg-purple-50 text-purple-700"
    };
    return colors[color] || "border-accent bg-accent/10 text-accent";
  };

  return (
    <div className="space-y-6">
      {/* Multi-child tabs (if more than one child) */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map((child: any, index: number) => (
            <button
              key={child.id}
              onClick={() => setFormData({ ...formData, currentChildIndex: index })}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                currentChildIndex === index
                  ? "bg-accent text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {child.name || `Child ${index + 1}`}
            </button>
          ))}
          <button
            onClick={() => setShowAddChild(true)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all"
          >
            + Add
          </button>
        </div>
      )}

      {/* Child's Name - Required */}
      <div>
        <Label htmlFor="childName" className={`mb-2 block ${errors.childName ? 'text-red-600' : ''}`}>
          Child's name *
        </Label>
        <Input
          id="childName"
          value={formData.childName}
          onChange={(e) =>
            setFormData({
              ...formData,
              childName: e.target.value,
            })
          }
          placeholder="Enter your child's name"
          className={`rounded-xl aminy-input-left ${errors.childName ? 'border-red-300 focus:border-red-500' : ''}`}
          required
        />
        <ErrorMessage field="childName" />
      </div>

      {/* Age - Required */}
      <div>
        <Label htmlFor="childAge" className={`mb-2 block ${errors.childAge ? 'text-red-600' : ''}`}>
          Age *
        </Label>
        <Input
          id="childAge"
          type="number"
          min="1"
          max="99"
          value={formData.childAge}
          onChange={(e) =>
            setFormData({
              ...formData,
              childAge: e.target.value,
            })
          }
          placeholder="Enter age (e.g., 5)"
          className={`rounded-xl aminy-input-left ${errors.childAge ? 'border-red-300 focus:border-red-500' : ''}`}
          required
        />
        <ErrorMessage field="childAge" />
      </div>

      {/* Neurotype/Conditions - Multi-select */}
      <div>
        <Label className={`mb-2 block ${errors.conditions ? 'text-red-600' : ''}`}>
          What best describes your child? (select all that apply) *
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          This helps us personalize activities and guidance for your family
        </p>
        <div className={`grid grid-cols-2 gap-2 ${errors.conditions ? 'ring-2 ring-red-200 rounded-xl p-1' : ''}`}>
          {conditionOptions.map((condition) => {
            const isSelected = (formData.conditions || []).includes(condition.id);
            return (
              <button
                key={condition.id}
                onClick={() => toggleCondition(condition.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${getConditionColor(condition.color, isSelected)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{condition.icon}</span>
                  <span className="font-medium text-sm">{condition.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        <ErrorMessage field="conditions" />
        {!errors.conditions && (formData.conditions || []).length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Select at least one, or choose "Still figuring it out"
          </p>
        )}
      </div>

      {/* Diagnosis Status */}
      <div>
        <Label className="mb-3 block">
          Diagnosis status
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {diagnosisStatusOptions.map((option) => {
            const isSelected = formData.diagnosisStatus === option.id;
            return (
              <button
                key={option.id}
                onClick={() =>
                  setFormData({
                    ...formData,
                    diagnosisStatus: isSelected ? "" : option.id,
                  })
                }
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Languages - Chips */}
      <div>
        <Label className="mb-3 block">
          Languages (select all that apply)
        </Label>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((language) => {
            const isSelected = (formData.languages || []).includes(language.id);
            return (
              <button
                key={language.id}
                onClick={() => toggleLanguage(language.id)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                {language.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Verbal Ability */}
      <div>
        <Label className="mb-3 block">
          Verbal ability
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {verbalAbilityOptions.map((option) => {
            const isSelected = formData.verbalAbility === option.id;
            return (
              <button
                key={option.id}
                onClick={() =>
                  setFormData({
                    ...formData,
                    verbalAbility: isSelected ? "" : option.id,
                  })
                }
                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <div className="font-semibold text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interests & Motivators */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor="interests">Interests & motivators</Label>
          <div className="flex items-center gap-1 text-accent">
            <span className="text-sm">🎵</span>
            <span className="text-sm">🧸</span>
            <span className="text-sm">🗣️</span>
          </div>
        </div>
        <Textarea
          id="interests"
          value={formData.interests}
          onChange={(e) =>
            setFormData({
              ...formData,
              interests: e.target.value,
            })
          }
          placeholder="What lights up your child? (dinosaurs, music, Legos, animals…)"
          className="rounded-xl aminy-input-left min-h-[80px]"
        />
      </div>

      {/* Triggers */}
      <div>
        <Label htmlFor="triggers" className="mb-2 block">
          Triggers or challenges
        </Label>
        <Textarea
          id="triggers"
          value={formData.triggers}
          onChange={(e) =>
            setFormData({
              ...formData,
              triggers: e.target.value,
            })
          }
          placeholder="What situations, sounds, or changes tend to be challenging?"
          className="rounded-xl aminy-input-left min-h-[80px]"
        />
      </div>

      {/* Add Another Child Link */}
      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={() => setShowAddChild(true)}
          className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1 text-sm font-medium"
        >
          <Users className="w-4 h-4" />
          + Add another child
        </button>
        <p className="text-xs text-muted-foreground mt-1">
          Support multiple children with unique plans
        </p>
      </div>

      {/* Add Child Modal */}
      {showAddChild && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddChild(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                Add Another Child
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Each child gets their own personalized care plan and activities
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddChild(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addChild}
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  Add Child
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supportive microcopy at bottom */}
      <div className="pt-2">
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Every child is unique. Your answers help Aminy create the perfect plan for them.
        </p>
      </div>
    </div>
  );
}

function NeedsDomainsStep({ formData, setFormData }: any) {
  const domains = [
    { 
      id: "speech", 
      label: "Speech & Communication",
      description: "words, phrases, understanding"
    },
    { 
      id: "focus", 
      label: "Focus & Attention",
      description: "staying on task, following directions"
    },
    { 
      id: "social", 
      label: "Social Skills",
      description: "making friends, play, group time"
    },
    { 
      id: "sensory", 
      label: "Sensory",
      description: "calming tools, sensory play, sensitivities"
    },
    { 
      id: "routines", 
      label: "Daily Routines",
      description: "morning, bedtime, transitions"
    },
    { 
      id: "emotional", 
      label: "Emotional Regulation",
      description: "meltdowns, big feelings, coping skills"
    },
    { 
      id: "sleep", 
      label: "Sleep",
      description: "bedtime routines, sleep quality, rest"
    },
  ];

  const toggleDomain = (domainId: string) => {
    const current = formData.needsDomains || [];
    if (current.includes(domainId)) {
      setFormData({
        ...formData,
        needsDomains: current.filter(
          (id: string) => id !== domainId,
        ),
      });
    } else if (current.length < 3) {
      setFormData({
        ...formData,
        needsDomains: [...current, domainId],
      });
    }
  };

  const currentCount = (formData.needsDomains || []).length;
  const isAtLimit = currentCount >= 3;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {domains.map((domain) => {
          const isSelected = (formData.needsDomains || []).includes(domain.id);
          const isDisabled = !isSelected && isAtLimit;
          
          return (
            <button
              key={domain.id}
              onClick={() => toggleDomain(domain.id)}
              disabled={isDisabled}
              className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 aminy-focus-area-pill ${
                isSelected
                  ? "border-accent bg-accent/10 text-accent-foreground aminy-focus-area-selected shadow-lg"
                  : isDisabled
                    ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                    : "border-border hover:border-accent/50 hover:bg-accent/5 aminy-focus-area-unselected hover:shadow-md"
              }`}
            >
              <div className="space-y-2">
                <div className="font-semibold text-base">{domain.label}</div>
                <div className="text-sm opacity-75 text-muted-foreground">
                  {domain.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection counter - only show when at limit */}
      {isAtLimit && (
        <div className="text-center">
          <p className="text-xs text-accent font-medium">
            You've selected 3 focus areas (maximum reached)
          </p>
        </div>
      )}

      <div style={{ marginTop: "24px" }}>
        <Label htmlFor="additionalNeeds" className="mb-2 block">
          Anything unique we should know? (optional)
        </Label>
        <Textarea
          id="additionalNeeds"
          value={formData.additionalNeeds}
          onChange={(e) =>
            setFormData({
              ...formData,
              additionalNeeds: e.target.value,
            })
          }
          placeholder="Tell us if your child has unique needs not listed above."
          className="rounded-xl aminy-input-left aminy-additional-needs"
          style={{ fontSize: "14px" }}
        />
      </div>

      {/* Supportive messaging at bottom */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Pick the areas where your child could use extra help. You can choose up to 3 — or skip if you're not sure.
        </p>
      </div>
    </div>
  );
}

function PreferencesStep({ formData, setFormData }: any) {
  const tones = [
    { 
      id: "Supportive", 
      label: "Supportive",
      description: "gentle encouragement"
    },
    { 
      id: "Direct", 
      label: "Direct",
      description: "clear, step-by-step"
    },
    { 
      id: "Playful", 
      label: "Playful",
      description: "lighthearted + fun"
    }
  ];
  
  const goalOptions = [
    "Improve your child's communication",
    "Create calmer daily routines",
    "Reduce meltdowns and challenging behaviors",
    "Build social confidence",
    "Support better sleep",
    "Sensory regulation",
  ];

  const toggleGoal = (goal: string) => {
    const current = formData.goals || [];
    if (current.includes(goal)) {
      setFormData({
        ...formData,
        goals: current.filter((g: string) => g !== goal),
      });
    } else if (current.length < 3) {
      setFormData({
        ...formData,
        goals: [...current, goal],
      });
    }
  };

  const currentCount = (formData.goals || []).length;
  const isAtLimit = currentCount >= 3;

  return (
    <div className="space-y-8">
      {/* Tone Preference */}
      <div>
        <Label className="mb-3 block">
          What tone works best for your family?
        </Label>
        <div className="grid grid-cols-1 gap-3">
          {tones.map((tone) => {
            const isSelected = formData.tonePreference === tone.id;
            return (
              <button
                key={tone.id}
                onClick={() => 
                  setFormData({
                    ...formData,
                    tonePreference: isSelected ? "" : tone.id,
                  })
                }
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 aminy-tone-badge ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <div className="space-y-1">
                  <div className="font-semibold">{tone.label}</div>
                  <div className="text-sm opacity-75 text-muted-foreground">
                    {tone.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Goals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>What are your top goals? (Pick up to 3)</Label>
          <span className="text-xs text-muted-foreground">
            {currentCount}/3 selected
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {goalOptions.map((goal) => {
            const isSelected = (formData.goals || []).includes(goal);
            const isDisabled = !isSelected && isAtLimit;
            
            return (
              <button
                key={goal}
                onClick={() => toggleGoal(goal)}
                disabled={isDisabled}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 aminy-goal-pill ${
                  isSelected
                    ? "border-accent bg-accent/10 text-accent-foreground aminy-goal-selected shadow-lg"
                    : isDisabled
                      ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                      : "border-border hover:border-accent/50 hover:bg-accent/5 aminy-goal-unselected hover:shadow-md"
                }`}
              >
                <div className="font-medium text-sm">{goal}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* What matters most */}
      <div>
        <Label htmlFor="whatMatters" className="mb-2 block">
          What matters most to you as a caregiver right now? (optional)
        </Label>
        <Textarea
          id="whatMatters"
          value={formData.whatMatters}
          onChange={(e) =>
            setFormData({
              ...formData,
              whatMatters: e.target.value,
            })
          }
          placeholder="e.g., Finding more patience, getting better sleep, feeling less overwhelmed..."
          className="rounded-xl aminy-input-left aminy-what-matters"
          style={{ fontSize: "14px" }}
        />
      </div>

      {/* Supportive messaging at bottom */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Your preferences help Aminy speak to you in a way that feels right for your family.
        </p>
      </div>
    </div>
  );
}