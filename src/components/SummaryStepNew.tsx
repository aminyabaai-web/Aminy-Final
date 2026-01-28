import React, { useEffect } from "react";
import { Badge } from "./ui/badge";
import { 
  CheckCircle, 
  Users, 
  Target, 
  Clock, 
  TrendingUp,
  Calendar,
  Heart,
  Star,
  Shield,
  UserCheck,
  BarChart3,
  FileText,
  Share
} from "lucide-react";

interface SummaryFormData {
  childName?: string;
  childAge?: string;
  needsDomains?: string[];
  goals?: string[];
  tonePreference?: string;
  [key: string]: unknown;
}

interface SummaryStepProps {
  formData: SummaryFormData;
  onRestart: () => void;
}

export function SummaryStep({ formData }: SummaryStepProps) {
  // Add confetti effect on load
  useEffect(() => {
    // Simple confetti effect could be added here
  }, []);

  // Helper functions to format data
  const formatName = (name: string) => name || "Your child";
  const formatAge = (age: string) => age ? `${age} years old` : "Age not specified";
  
  const getFocusAreas = () => {
    const domains = formData.needsDomains || [];
    const domainLabels: { [key: string]: string } = {
      speech: "Speech & Communication",
      focus: "Focus & Attention", 
      social: "Social Skills",
      sensory: "Sensory Processing",
      routines: "Daily Routines",
      emotional: "Emotional Regulation"
    };
    
    return domains.length > 0 
      ? domains.map((id: string) => domainLabels[id] || id)
      : ["General Guidance"];
  };

  const getSelectedGoals = () => {
    const goals = formData.goals || [];
    return goals.length > 0 ? goals.slice(0, 3) : ["Building daily structure", "Supporting positive behaviors"];
  };

  const getToneStyle = () => {
    const tone = formData.tonePreference || "Supportive";
    const toneDescriptions: { [key: string]: string } = {
      "Supportive": "gentle encouragement",
      "Direct": "clear, step-by-step guidance", 
      "Playful": "lighthearted + fun approach"
    };
    return toneDescriptions[tone] || "supportive guidance";
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      {/* Plan Created Success Indicator */}
      <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Plan Created</span>
      </div>

      {/* Child Profile Card */}
      <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-primary">Child Profile</h3>
        </div>
        
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium">{formatName(formData.childName)}</span>
            <span className="text-sm text-muted-foreground ml-2">• {formatAge(formData.childAge)}</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {getFocusAreas().map((area, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {area}
              </Badge>
            ))}
          </div>
          
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-accent">
              Connected with Aminy Jr — your child's play informs this plan.
            </p>
          </div>
        </div>
      </div>

      {/* Goals & Outcomes */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-primary">What we'll work on</h3>
        </div>
        
        <div className="grid gap-3">
          {getSelectedGoals().map((goal, index) => (
            <div key={index} className="bg-accent/5 border border-accent/20 rounded-lg p-3">
              <div className="text-sm font-medium text-primary mb-1">{goal}</div>
              <div className="text-xs text-muted-foreground">
                How we'll measure progress: Daily check-ins and milestone tracking
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                How we'll support you: {getToneStyle()} with practical strategies
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Structure */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-primary">Daily Structure</h3>
          <span className="text-xs text-muted-foreground">Simple routines you can actually use</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-16 text-xs text-muted-foreground">Morning</div>
            <div className="text-primary">Gentle wake-up routine with visual supports</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-16 text-xs text-muted-foreground">Daily</div>
            <div className="text-primary">Structured activities with built-in breaks</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-16 text-xs text-muted-foreground">Evening</div>
            <div className="text-primary">Calming wind-down with connection time</div>
          </div>
        </div>
      </div>

      {/* Progress Tracking */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-primary">Progress Tracking</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span>Daily check-ins (quick logs + notes)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Weekly review with suggestions</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>Monthly refresh with provider-style summary (Core+ unlocks full PDF reports)</span>
          </div>
        </div>
      </div>

      {/* Support Network */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-primary">Support Network</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-primary mb-1">Family Support</div>
            <div className="text-xs text-muted-foreground">Parent tips, sibling ideas, extended family guidance</div>
          </div>
          <div>
            <div className="text-sm font-medium text-primary mb-1">Community Resources</div>
            <div className="text-xs text-muted-foreground">Local groups, advocacy, connections</div>
          </div>
          <div>
            <div className="text-sm font-medium text-primary mb-1">Professional Team</div>
            <div className="text-xs text-muted-foreground">Strategy adjustments + expert oversight (Pro only)</div>
          </div>
        </div>
      </div>

      {/* Living Plan */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-primary">Living Plan</h3>
        </div>
        
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
          <div className="text-sm text-primary mb-2">Updates automatically as you use Aminy</div>
          <div className="text-xs text-muted-foreground">
            Every week creates a new version you can share with teachers, therapists, or family.
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Share className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Easy sharing with your care team</span>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
          <div className="flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground">Parent-Tested</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground">HIPAA Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground">Expert-Backed</span>
          </div>
        </div>
        
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          You're not alone — we'll grow this plan with you every day.
        </p>
      </div>
    </div>
  );
}