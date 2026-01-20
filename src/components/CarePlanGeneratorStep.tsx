import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Sparkles, 
  Brain, 
  Target, 
  Clock, 
  BarChart3, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Users, 
  Heart, 
  Star, 
  Activity, 
  Clipboard, 
  Download, 
  Share, 
  ExternalLink, 
  TrendingUp,
  Play,
  Pause,
  RefreshCw,
  Lightbulb,
  Shield,
  UserCheck,
  Zap
} from "lucide-react";

interface CarePlanFormData {
  childName?: string;
  needsDomains?: string[];
  goals?: string[];
  tonePreference?: string;
  [key: string]: unknown;
}

interface CarePlanGeneratorStepProps {
  formData: CarePlanFormData;
  onComplete: () => void;
}

export function CarePlanGeneratorStep({ formData, onComplete }: CarePlanGeneratorStepProps) {
  const [generationPhase, setGenerationPhase] = useState<'initial' | 'analyzing' | 'generating' | 'complete'>('initial');
  const [currentGoal, setCurrentGoal] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Start AI generation process
  useEffect(() => {
    if (generationPhase === 'initial') {
      const timer = setTimeout(() => {
        setGenerationPhase('analyzing');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [generationPhase]);

  useEffect(() => {
    if (generationPhase === 'analyzing') {
      const timer = setTimeout(() => {
        setGenerationPhase('generating');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [generationPhase]);

  useEffect(() => {
    if (generationPhase === 'generating') {
      const timer = setTimeout(() => {
        setGenerationPhase('complete');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [generationPhase]);

  // Helper functions
  const getChildName = () => formData.childName || "your child";
  const getSelectedDomains = () => {
    const domains = formData.needsDomains || [];
    const domainLabels: { [key: string]: string } = {
      speech: "Speech & Communication",
      focus: "Focus & Attention", 
      social: "Social Skills",
      sensory: "Sensory Processing",
      routines: "Daily Routines",
      emotional: "Emotional Regulation",
      sleep: "Sleep & Rest"
    };
    
    return domains.length > 0 
      ? domains.map((id: string) => domainLabels[id] || id)
      : ["General Development Support"];
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

  // AI Analysis Phase Component
  const AnalyzingPhase = () => (
    <div className="space-y-6 plan-populate-animation">
      <div className="text-center space-y-4">
        <div className="care-plan-icon w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
          <Brain className="w-7 h-7 text-accent animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg text-primary font-semibold mb-2">Getting to Know Your Family</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We're taking a moment to understand {getChildName()}'s strengths and your family's needs...
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm">Learning about {getChildName()}'s strengths</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm">Understanding your family's priorities</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Tailoring to how you like to communicate</span>
        </div>
      </div>
    </div>
  );

  // AI Generation Phase Component
  const GeneratingPhase = () => (
    <div className="space-y-6 plan-populate-animation">
      <div className="text-center space-y-4">
        <div className="care-plan-icon w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-accent animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg text-primary font-semibold mb-2">Crafting Your Plan</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We're building something special just for {getChildName()} and your family...
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-white rounded-xl border border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-5 h-5 text-accent" />
            <span className="font-semibold text-primary">SMART Goals</span>
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground">
            Creating specific, measurable goals with baseline data and target milestones
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-accent" />
            <span className="font-semibold text-primary">Daily Strategies</span>
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground">
            Designing practical activities aligned with ABA principles and developmental milestones
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="w-5 h-5 text-accent" />
            <span className="font-semibold text-primary">Progress Tracking</span>
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground">
            Setting up data collection methods and success metrics for ongoing assessment
          </p>
        </div>
      </div>
    </div>
  );

  // Complete Care Plan Component
  const CompletePlan = () => {
    // Generate goals based on user's selected domains
    const generateGoalsForDomains = () => {
      interface GoalTemplate {
        domain: string;
        goal: string;
        baseline: string;
        target: string;
        timeline: string;
        strategies: string[];
      }
      const goalTemplates: Record<string, GoalTemplate> = {
        speech: {
          domain: "Speech & Communication",
          goal: "Increase functional communication requests",
          baseline: "Currently uses 5-10 single words consistently",
          target: "Use 2-3 word phrases for 80% of daily requests",
          timeline: "12 weeks",
          strategies: ["Visual supports", "Modeling", "Natural environment teaching"]
        },
        social: {
          domain: "Social Skills", 
          goal: "Improve parallel and interactive play skills",
          baseline: "Engages in solitary play for 90% of structured time",
          target: "Initiate or respond to peer interaction 3+ times per play session",
          timeline: "16 weeks",
          strategies: ["Structured play activities", "Peer modeling", "Social stories"]
        },
        routines: {
          domain: "Daily Routines",
          goal: "Complete morning routine independently",
          baseline: "Requires physical prompts for 4/6 routine steps",
          target: "Complete routine with visual cues only (90% accuracy)",
          timeline: "8 weeks", 
          strategies: ["Visual schedule", "Task analysis", "Reinforcement system"]
        },
        focus: {
          domain: "Focus & Attention",
          goal: "Increase sustained attention during activities",
          baseline: "Maintains focus for 2-3 minutes on preferred tasks",
          target: "Sustain attention for 10+ minutes during structured activities",
          timeline: "10 weeks",
          strategies: ["Break tasks into chunks", "Visual timers", "Preferred activity choices"]
        },
        sensory: {
          domain: "Sensory Processing",
          goal: "Develop self-regulation strategies for sensory needs",
          baseline: "Shows overwhelm signs in 70% of transitions",
          target: "Use coping strategies independently in 80% of situations",
          timeline: "14 weeks",
          strategies: ["Sensory break cards", "Deep pressure tools", "Environmental modifications"]
        },
        emotional: {
          domain: "Emotional Regulation",
          goal: "Use calming strategies during emotional moments",
          baseline: "Requires adult support for emotional regulation 90% of time",
          target: "Independently use calming strategies in 70% of situations",
          timeline: "12 weeks",
          strategies: ["Emotion cards", "Breathing techniques", "Safe space access"]
        },
        sleep: {
          domain: "Sleep & Rest",
          goal: "Establish consistent bedtime routine",
          baseline: "Takes 45-60 minutes to fall asleep with multiple wake-ups",
          target: "Fall asleep within 20 minutes with minimal wake-ups",
          timeline: "6 weeks",
          strategies: ["Visual bedtime schedule", "Calming activities", "Environment optimization"]
        }
      };

      const selectedDomains = formData.needsDomains || ['speech', 'social', 'routines'];
      return selectedDomains.slice(0, 3).map((domain: string) => 
        goalTemplates[domain] || goalTemplates.speech
      );
    };

    const mockGoals = generateGoalsForDomains();

    return (
      <div className="space-y-6">
        {/* AI Attribution Badge */}
        <div className="ai-attribution-badge">
          <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200/50 rounded-xl">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Generated by Aminy AI</span>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">v1.0</Badge>
            <span className="text-xs text-blue-600">•</span>
            <span className="text-xs text-blue-600">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Care Plan Overview */}
        <div className="plan-populate-animation">
          <div className="p-6 bg-white rounded-2xl aminy-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="care-plan-icon w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Clipboard className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-base text-primary font-semibold">Personalized Care Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Evidence-based support plan for {getChildName()}
                </p>
              </div>
              <div className="version-badge">
                v1.0
              </div>
            </div>

            <div className="clinical-components-grid grid gap-3">
              <div className="clinical-baseline p-3 rounded-lg border border-orange-200 bg-orange-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-800">Baseline Data</span>
                </div>
                <p className="text-xs text-orange-700">Current skill levels documented</p>
              </div>

              <div className="clinical-measurable p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">Measurable Outcomes</span>
                </div>
                <p className="text-xs text-blue-700">SMART goals with clear metrics</p>
              </div>

              <div className="clinical-strategies p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-800">Evidence-Based Strategies</span>
                </div>
                <p className="text-xs text-purple-700">ABA-informed intervention methods</p>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Goal Cards */}
        {mockGoals.map((goal, index) => (
          <div key={index} className="plan-populate-animation" style={{ animationDelay: `${0.4 + index * 0.2}s` }}>
            <div className="p-6 bg-white rounded-2xl aminy-card">
              <div className="clinical-goal-main">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="timeline-badge text-xs">
                        {goal.timeline}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Goal {index + 1}</span>
                    </div>
                    <h4 className="text-base font-semibold text-primary">{goal.goal}</h4>
                    <p className="text-sm text-muted-foreground">{goal.domain}</p>
                  </div>
                </div>

                <div className="clinical-components-grid grid gap-2">
                  <div className="clinical-baseline p-3 rounded-lg border border-orange-200 bg-orange-50/30">
                    <div className="text-xs font-medium text-orange-800 mb-1">Baseline</div>
                    <div className="text-xs text-orange-700">{goal.baseline}</div>
                  </div>

                  <div className="clinical-measurable p-3 rounded-lg border border-blue-200 bg-blue-50/30">
                    <div className="text-xs font-medium text-blue-800 mb-1">Target</div>
                    <div className="text-xs text-blue-700">{goal.target}</div>
                  </div>

                  <div className="clinical-strategies p-3 rounded-lg border border-purple-200 bg-purple-50/30">
                    <div className="text-xs font-medium text-purple-800 mb-1">Key Strategies</div>
                    <div className="flex flex-wrap gap-1">
                      {goal.strategies.map((strategy, idx) => (
                        <Badge key={idx} variant="secondary" className="care-plan-badge strategy-badge-teaching">
                          {strategy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Plan Actions - iOS Toolbar Style */}
        <div className="plan-populate-animation">
          <div className="p-5 bg-white rounded-2xl aminy-card">
            <h4 className="text-base font-semibold text-primary mb-4 text-center">Your Living Plan</h4>
            
            <div className="segmented-control-container">
              <div className="segmented-control-pill">
                <button 
                  className="segmented-control-button ios-toolbar-button"
                  onClick={() => setShowDetails(!showDetails)}
                  aria-label="View detailed reports and analytics"
                >
                  <BarChart3 className="segmented-control-icon" />
                  <span className="segmented-control-label">Reports</span>
                </button>
                
                <button 
                  className="segmented-control-button ios-toolbar-button"
                  aria-label="Export care plan as PDF document"
                >
                  <Download className="segmented-control-icon" />
                  <span className="segmented-control-label">Export PDF</span>
                </button>
                
                <button 
                  className="segmented-control-button ios-toolbar-button"
                  aria-label="Share plan with care team and providers"
                >
                  <Share className="segmented-control-icon" />
                  <span className="segmented-control-label">Share Plan</span>
                </button>
              </div>
            </div>

            <div className="clinical-microcopy p-3 mt-4 bg-gray-50/80 border border-gray-200/60 rounded-lg">
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                This plan will evolve with your progress. Each week creates a new version you can share with teachers, therapists, and family members.
              </p>
            </div>
          </div>
        </div>

        {/* Encouraging Completion Message */}
        <div className="plan-populate-animation care-plan-encouragement p-5 rounded-xl">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-primary">You're all set!</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your personalized care plan is ready. Daily activities and progress tracking will appear on your dashboard, growing smarter with every interaction.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">Expert-Backed</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">Privacy-First</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">Always Learning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="care-plan-final-divider premium-divider"></div>

        {/* Final Actions */}
        <div className="final-actions-layout space-y-4">
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setGenerationPhase('initial')}
              className="make-change-tertiary-button"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate plan
            </Button>
          </div>
          
          <div className="text-center">
            <Button
              onClick={onComplete}
              className="complete-setup-button aminy-gentle-shimmer"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Phase-based rendering */}
      {generationPhase === 'initial' && (
        <div className="text-center space-y-4 plan-populate-animation">
          <div className="care-plan-icon w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h3 className="text-lg text-primary font-semibold mb-2">Ready to Create Your Care Plan</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Aminy AI will now create a personalized, evidence-based care plan for {getChildName()} using professional ABA/IEP standards.
            </p>
          </div>
          
          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Users className="w-4 h-4 text-accent" />
              <span>Child profile: {getChildName()}, {formData.childAge || 'age not specified'}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Target className="w-4 h-4 text-accent" />
              <span>Focus areas: {getSelectedDomains().slice(0, 2).join(', ')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Heart className="w-4 h-4 text-accent" />
              <span>Style: {getToneStyle()}</span>
            </div>
          </div>
        </div>
      )}

      {generationPhase === 'analyzing' && <AnalyzingPhase />}
      {generationPhase === 'generating' && <GeneratingPhase />}
      {generationPhase === 'complete' && <CompletePlan />}
    </div>
  );
}