/**
 * ScreeningTools.tsx
 * Validated Developmental Screening Instruments
 *
 * Features:
 * - M-CHAT-R/F (Modified Checklist for Autism in Toddlers)
 * - ASQ-3 (Ages & Stages Questionnaire) style questions
 * - Scoring algorithms
 * - Risk level interpretation
 * - Referral recommendations
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  Download,
  Share2,
  Printer,
  Clock,
  Calendar,
  User,
  Baby,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface ScreeningQuestion {
  id: string;
  text: string;
  description?: string;
  criticalItem?: boolean;
}

interface ScreeningResult {
  totalScore: number;
  criticalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  followUpQuestions?: string[];
}

interface ScreeningToolsProps {
  childName: string;
  childAge: number; // in months
  onComplete?: (result: ScreeningResult) => void;
}

// M-CHAT-R/F Questions (20 questions)
// Note: These are simplified versions for demonstration
// The actual M-CHAT-R/F is a validated instrument with specific licensing
const MCHAT_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'mchat1',
    text: 'If you point at something across the room, does your child look at it?',
    description: 'For example, if you point at a toy or animal, does your child look at the toy or animal?',
    criticalItem: true,
  },
  {
    id: 'mchat2',
    text: 'Have you ever wondered if your child might be deaf?',
    criticalItem: false,
  },
  {
    id: 'mchat3',
    text: 'Does your child play pretend or make-believe?',
    description: 'For example, pretend to drink from an empty cup, pretend to talk on a phone, or pretend to feed a doll or stuffed animal?',
    criticalItem: true,
  },
  {
    id: 'mchat4',
    text: 'Does your child like climbing on things?',
    description: 'For example, furniture, playground equipment, or stairs?',
    criticalItem: false,
  },
  {
    id: 'mchat5',
    text: 'Does your child make unusual finger movements near their eyes?',
    description: 'For example, does your child wiggle fingers close to their eyes?',
    criticalItem: false,
  },
  {
    id: 'mchat6',
    text: 'Does your child point with one finger to ask for something or to get help?',
    description: 'For example, pointing to a snack or toy that is out of reach?',
    criticalItem: true,
  },
  {
    id: 'mchat7',
    text: 'Does your child point with one finger to show you something interesting?',
    description: 'For example, pointing at an airplane in the sky or a big truck in the road?',
    criticalItem: true,
  },
  {
    id: 'mchat8',
    text: 'Is your child interested in other children?',
    description: 'For example, does your child watch other children, smile at them, or go to them?',
    criticalItem: true,
  },
  {
    id: 'mchat9',
    text: 'Does your child show you things by bringing them to you or holding them up for you to see?',
    description: 'Not to get help, but just to share?',
    criticalItem: true,
  },
  {
    id: 'mchat10',
    text: 'Does your child respond when you call their name?',
    description: 'For example, does your child look up, talk or babble, or stop what they are doing when you call their name?',
    criticalItem: true,
  },
  {
    id: 'mchat11',
    text: 'When you smile at your child, do they smile back at you?',
    criticalItem: false,
  },
  {
    id: 'mchat12',
    text: 'Does your child get upset by everyday sounds?',
    description: 'For example, does your child scream or cry to noise such as a vacuum cleaner or loud music?',
    criticalItem: false,
  },
  {
    id: 'mchat13',
    text: 'Does your child walk?',
    criticalItem: false,
  },
  {
    id: 'mchat14',
    text: 'Does your child look you in the eye when you are talking to them, playing with them, or dressing them?',
    criticalItem: true,
  },
  {
    id: 'mchat15',
    text: 'Does your child try to copy what you do?',
    description: 'For example, wave bye-bye, clap, or make a funny noise when you do?',
    criticalItem: false,
  },
  {
    id: 'mchat16',
    text: 'If you turn your head to look at something, does your child look around to see what you are looking at?',
    criticalItem: true,
  },
  {
    id: 'mchat17',
    text: 'Does your child try to get you to watch them?',
    description: 'For example, does your child look at you for praise, or say "look" or "watch me"?',
    criticalItem: false,
  },
  {
    id: 'mchat18',
    text: 'Does your child understand when you tell them to do something?',
    description: 'For example, if you say "put the book on the chair," does your child understand (even if they don\'t follow through)?',
    criticalItem: false,
  },
  {
    id: 'mchat19',
    text: 'If something new happens, does your child look at your face to see how you feel about it?',
    description: 'For example, if they hear a strange or funny noise, or see a new toy, will they look at your face?',
    criticalItem: false,
  },
  {
    id: 'mchat20',
    text: 'Does your child like movement activities?',
    description: 'For example, being swung or bounced on your knee?',
    criticalItem: false,
  },
];

// Questions where YES indicates concern (most are NO = concern)
const REVERSED_QUESTIONS = ['mchat2', 'mchat5', 'mchat12'];

export function ScreeningTools({ childName, childAge, onComplete }: ScreeningToolsProps) {
  const [currentScreen, setCurrentScreen] = useState<'intro' | 'questions' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [result, setResult] = useState<ScreeningResult | null>(null);

  const ageInMonths = childAge;
  const isEligibleAge = ageInMonths >= 16 && ageInMonths <= 30;

  // Calculate scores
  const calculateResults = (): ScreeningResult => {
    let totalScore = 0;
    let criticalScore = 0;

    MCHAT_QUESTIONS.forEach(q => {
      const answer = answers[q.id];
      if (answer === null || answer === undefined) return;

      // Determine if this response indicates concern
      let indicatesConcern: boolean;
      if (REVERSED_QUESTIONS.includes(q.id)) {
        indicatesConcern = answer === true; // YES indicates concern for these
      } else {
        indicatesConcern = answer === false; // NO indicates concern for most
      }

      if (indicatesConcern) {
        totalScore++;
        if (q.criticalItem) {
          criticalScore++;
        }
      }
    });

    // Determine risk level based on M-CHAT-R/F scoring
    let riskLevel: 'low' | 'medium' | 'high';
    let recommendation: string;

    if (totalScore <= 2) {
      riskLevel = 'low';
      recommendation = 'Your child\'s responses do not indicate elevated risk for autism spectrum disorder at this time. Continue to monitor development and discuss any concerns with your pediatrician at regular check-ups.';
    } else if (totalScore >= 3 && totalScore <= 7 && criticalScore < 2) {
      riskLevel = 'medium';
      recommendation = 'Some responses suggest areas that may warrant further discussion with your healthcare provider. Consider scheduling a developmental evaluation to get a clearer picture of your child\'s development.';
    } else {
      riskLevel = 'high';
      recommendation = 'The screening results suggest a need for a comprehensive developmental evaluation. We strongly recommend contacting your pediatrician or a developmental specialist to discuss next steps.';
    }

    return {
      totalScore,
      criticalScore,
      riskLevel,
      recommendation,
    };
  };

  // Handle answer
  const handleAnswer = (answer: boolean) => {
    const question = MCHAT_QUESTIONS[currentQuestionIndex];
    setAnswers(prev => ({ ...prev, [question.id]: answer }));

    if (currentQuestionIndex < MCHAT_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate results
      const newAnswers = { ...answers, [question.id]: answer };
      setAnswers(newAnswers);

      // Wait for state to update then calculate
      setTimeout(() => {
        const calculatedResult = calculateResults();
        setResult(calculatedResult);
        setCurrentScreen('results');
        if (onComplete) {
          onComplete(calculatedResult);
        }
      }, 100);
    }
  };

  // Progress percentage
  const progress = ((currentQuestionIndex + 1) / MCHAT_QUESTIONS.length) * 100;

  // Render intro screen
  if (currentScreen === 'intro') {
    return (
      <Card className="max-w-2xl mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
            Developmental Screening
          </h1>
          <p className="text-neutral-600">
            M-CHAT-R/F Screening for {childName}
          </p>
        </div>

        {!isEligibleAge && (
          <div className="mb-4 sm:mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Age Notice</p>
                <p className="text-sm text-amber-700">
                  The M-CHAT-R/F is validated for children 16-30 months old.
                  {childName}'s current age ({ageInMonths} months) is {ageInMonths < 16 ? 'below' : 'above'} the recommended range.
                  Results may be less accurate.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
            <Clock className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-neutral-900">Takes about 5-10 minutes</p>
              <p className="text-sm text-neutral-500">20 questions about your child's behavior</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
            <Info className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-neutral-900">Answer based on typical behavior</p>
              <p className="text-sm text-neutral-500">Think about what your child usually does, not rare exceptions</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
            <HelpCircle className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-neutral-900">This is a screening, not a diagnosis</p>
              <p className="text-sm text-neutral-500">Results should be discussed with a healthcare provider</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => setCurrentScreen('questions')}
            className="w-full bg-teal-600 hover:bg-teal-700"
            size="lg"
          >
            Begin Screening
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-xs text-center text-neutral-500">
            By proceeding, you acknowledge this screening tool is for educational purposes
            and does not replace professional medical advice.
          </p>
        </div>
      </Card>
    );
  }

  // Render questions screen
  if (currentScreen === 'questions') {
    const currentQuestion = MCHAT_QUESTIONS[currentQuestionIndex];

    return (
      <Card className="max-w-2xl mx-auto p-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
            <span>Question {currentQuestionIndex + 1} of {MCHAT_QUESTIONS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <div className="flex items-start gap-2 mb-4">
            {currentQuestion.criticalItem && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">Key Item</Badge>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-3">
            {currentQuestion.text}
          </h2>
          {currentQuestion.description && (
            <p className="text-neutral-600 bg-neutral-50 p-3 rounded-lg">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Answer Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            onClick={() => handleAnswer(true)}
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2 hover:border-teal-500 hover:bg-teal-50"
          >
            <CheckCircle className="w-6 h-6 mr-2 text-teal-600" />
            Yes
          </Button>
          <Button
            onClick={() => handleAnswer(false)}
            variant="outline"
            size="lg"
            className="h-16 text-lg border-2 hover:border-neutral-400 hover:bg-neutral-50"
          >
            <AlertCircle className="w-6 h-6 mr-2 text-neutral-500" />
            No
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => currentQuestionIndex > 0 && setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Previous
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleAnswer(answers[currentQuestion.id] || false)}
            disabled={answers[currentQuestion.id] === undefined}
          >
            Skip
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </Card>
    );
  }

  // Render results screen
  if (currentScreen === 'results' && result) {
    const riskColors = {
      low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
      medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
      high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    };
    const colors = riskColors[result.riskLevel];

    return (
      <Card className="max-w-2xl mx-auto p-8">
        {/* Result Header */}
        <div className={`${colors.bg} ${colors.border} border rounded-xl p-6 mb-8`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">Screening Complete</h2>
            <Badge className={colors.badge}>
              {result.riskLevel === 'low' && 'Low Risk'}
              {result.riskLevel === 'medium' && 'Medium Risk'}
              {result.riskLevel === 'high' && 'Elevated Risk'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div>
              <p className="text-sm text-neutral-500">Total Score</p>
              <p className="text-xl sm:text-2xl font-bold text-neutral-900">{result.totalScore} / 20</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Critical Items</p>
              <p className="text-xl sm:text-2xl font-bold text-neutral-900">{result.criticalScore} / 10</p>
            </div>
          </div>

          <p className={`${colors.text} text-sm`}>{result.recommendation}</p>
        </div>

        {/* What This Means */}
        <div className="mb-8">
          <h3 className="font-semibold text-neutral-900 mb-3">Understanding Your Results</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg">
              <Info className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-600">
                This screening is a first step, not a diagnosis. Many children who screen positive
                do not have autism, and some who screen negative may still benefit from evaluation.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg">
              <User className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-600">
                Share these results with your pediatrician or a developmental specialist who can
                provide a comprehensive evaluation if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="mb-8">
          <h3 className="font-semibold text-neutral-900 mb-3">Helpful Resources</h3>
          <div className="space-y-2">
            <a
              href="https://www.cdc.gov/ncbddd/autism/screening.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <span className="text-sm text-neutral-700">CDC Autism Screening Information</span>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </a>
            <a
              href="https://www.autismspeaks.org/screen-your-child"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <span className="text-sm text-neutral-700">Autism Speaks - Early Signs</span>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print Results
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share with Provider
          </Button>
        </div>

        {/* Retake */}
        <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentScreen('intro');
              setCurrentQuestionIndex(0);
              setAnswers({});
              setResult(null);
            }}
          >
            Start New Screening
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="mt-4 sm:mt-6 text-xs text-neutral-400 text-center">
          Screening completed on {new Date().toLocaleDateString()} for {childName} (age {ageInMonths} months).
          The M-CHAT-R/F is copyrighted by Diana Robins, Deborah Fein, & Marianne Barton.
          This implementation is for educational demonstration purposes.
        </p>
      </Card>
    );
  }

  return null;
}

export default ScreeningTools;

// ============================================================================
// GAD-7 ANXIETY SCREENING
// Generalized Anxiety Disorder 7-item Scale
// A validated self-report questionnaire for anxiety screening
// ============================================================================

interface GAD7Question {
  id: string;
  text: string;
}

interface GAD7Result {
  totalScore: number;
  severityLevel: 'minimal' | 'mild' | 'moderate' | 'severe';
  interpretation: string;
  recommendation: string;
}

// GAD-7 Questions - Validated questionnaire
const GAD7_QUESTIONS: GAD7Question[] = [
  {
    id: 'gad1',
    text: 'Feeling nervous, anxious, or on edge',
  },
  {
    id: 'gad2',
    text: 'Not being able to stop or control worrying',
  },
  {
    id: 'gad3',
    text: 'Worrying too much about different things',
  },
  {
    id: 'gad4',
    text: 'Trouble relaxing',
  },
  {
    id: 'gad5',
    text: 'Being so restless that it\'s hard to sit still',
  },
  {
    id: 'gad6',
    text: 'Becoming easily annoyed or irritable',
  },
  {
    id: 'gad7',
    text: 'Feeling afraid, as if something awful might happen',
  },
];

// Response options with scores
const GAD7_RESPONSES = [
  { label: 'Not at all', score: 0 },
  { label: 'Several days', score: 1 },
  { label: 'More than half the days', score: 2 },
  { label: 'Nearly every day', score: 3 },
];

interface GAD7ScreeningProps {
  userName: string;
  onComplete?: (result: GAD7Result) => void;
  forCaregiver?: boolean; // If true, screening is for the caregiver; otherwise for context about home environment
}

export function GAD7Screening({ userName, onComplete, forCaregiver = true }: GAD7ScreeningProps) {
  const [currentScreen, setCurrentScreen] = useState<'intro' | 'questions' | 'results'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GAD7Result | null>(null);

  // Calculate GAD-7 score
  const calculateResults = (finalAnswers: Record<string, number>): GAD7Result => {
    const totalScore = Object.values(finalAnswers).reduce((sum, score) => sum + score, 0);

    let severityLevel: GAD7Result['severityLevel'];
    let interpretation: string;
    let recommendation: string;

    if (totalScore <= 4) {
      severityLevel = 'minimal';
      interpretation = 'Your responses indicate minimal anxiety symptoms.';
      recommendation = 'Continue practicing self-care and monitoring your well-being. If you notice symptoms increasing, consider reaching out for support.';
    } else if (totalScore <= 9) {
      severityLevel = 'mild';
      interpretation = 'Your responses indicate mild anxiety symptoms.';
      recommendation = 'Consider incorporating stress-management techniques into your routine. Aminy\'s calm tools can help. If symptoms persist or worsen, consider talking to a healthcare provider.';
    } else if (totalScore <= 14) {
      severityLevel = 'moderate';
      interpretation = 'Your responses indicate moderate anxiety symptoms.';
      recommendation = 'We recommend discussing these results with a healthcare provider. Anxiety at this level can be effectively managed with proper support and treatment.';
    } else {
      severityLevel = 'severe';
      interpretation = 'Your responses indicate severe anxiety symptoms.';
      recommendation = 'We strongly recommend speaking with a healthcare provider or mental health professional as soon as possible. You don\'t have to manage this alone.';
    }

    return {
      totalScore,
      severityLevel,
      interpretation,
      recommendation,
    };
  };

  // Handle answer selection
  const handleAnswer = (score: number) => {
    const question = GAD7_QUESTIONS[currentQuestionIndex];
    const newAnswers = { ...answers, [question.id]: score };
    setAnswers(newAnswers);

    if (currentQuestionIndex < GAD7_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate results
      const calculatedResult = calculateResults(newAnswers);
      setResult(calculatedResult);
      setCurrentScreen('results');
      if (onComplete) {
        onComplete(calculatedResult);
      }
    }
  };

  // Go back to previous question
  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Progress percentage
  const progress = ((currentQuestionIndex + 1) / GAD7_QUESTIONS.length) * 100;

  // Render intro screen
  if (currentScreen === 'intro') {
    return (
      <Card className="max-w-2xl mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Caregiver Wellness Check
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            GAD-7 Anxiety Screening
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4 mb-8">
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Why We Ask
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Caring for a child with developmental needs can be demanding. This brief screening helps us understand how you're doing so we can provide better support. Your answers are confidential.
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              About This Screening
            </h3>
            <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>7 simple questions about the past 2 weeks</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Takes about 2-3 minutes to complete</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Validated screening tool used by healthcare providers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Not a diagnosis - a helpful conversation starter</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => setCurrentScreen('questions')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            Begin Wellness Check
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
          This screening is for informational purposes only and is not a substitute for professional medical advice.
        </p>
      </Card>
    );
  }

  // Render questions
  if (currentScreen === 'questions') {
    const currentQuestion = GAD7_QUESTIONS[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id];

    return (
      <Card className="max-w-2xl mx-auto p-8">
        {/* Progress bar */}
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Question {currentQuestionIndex + 1} of {GAD7_QUESTIONS.length}
            </span>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            Over the <strong>last 2 weeks</strong>, how often have you been bothered by:
          </p>
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">
            {currentQuestion.text}
          </h2>
        </div>

        {/* Response options */}
        <div className="space-y-3 mb-8">
          {GAD7_RESPONSES.map((response) => (
            <button
              key={response.score}
              onClick={() => handleAnswer(response.score)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                currentAnswer === response.score
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer === response.score
                      ? 'border-purple-500 bg-purple-500 dark:border-purple-400 dark:bg-purple-400'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {currentAnswer === response.score && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span
                  className={`font-medium ${
                    currentAnswer === response.score
                      ? 'text-purple-900 dark:text-purple-100'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {response.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </Card>
    );
  }

  // Render results
  if (currentScreen === 'results' && result) {
    const severityColors = {
      minimal: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle },
      mild: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: AlertCircle },
      moderate: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: AlertTriangle },
      severe: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertTriangle },
    };

    const { bg, text, icon: Icon } = severityColors[result.severityLevel];

    return (
      <Card className="max-w-2xl mx-auto p-8">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-8 h-8 ${text}`} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Your Results
          </h1>
          <Badge className={`${bg} ${text} capitalize`}>
            {result.severityLevel} anxiety
          </Badge>
        </div>

        {/* Score display */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              GAD-7 Score
            </span>
            <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
              {result.totalScore} / 21
            </span>
          </div>
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                result.severityLevel === 'minimal'
                  ? 'bg-green-500'
                  : result.severityLevel === 'mild'
                  ? 'bg-yellow-500'
                  : result.severityLevel === 'moderate'
                  ? 'bg-orange-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${(result.totalScore / 21) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>0-4 Minimal</span>
            <span>5-9 Mild</span>
            <span>10-14 Moderate</span>
            <span>15+ Severe</span>
          </div>
        </div>

        {/* Interpretation */}
        <div className={`${bg} rounded-lg p-6 mb-4 sm:mb-6`}>
          <h3 className={`font-semibold ${text} mb-2`}>
            What This Means
          </h3>
          <p className={`text-sm ${text}`}>
            {result.interpretation}
          </p>
        </div>

        {/* Recommendation */}
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6 mb-4 sm:mb-6">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Our Recommendation
          </h3>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            {result.recommendation}
          </p>
        </div>

        {/* Crisis resources if needed */}
        {result.severityLevel === 'severe' && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 sm:mb-6">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Need Support Now?
            </h4>
            <ul className="text-sm text-red-800 dark:text-red-200 space-y-2">
              <li>
                <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988
              </li>
              <li>
                <strong>Crisis Text Line:</strong> Text HOME to 741741
              </li>
              <li>
                <strong>SAMHSA Helpline:</strong> 1-800-662-4357
              </li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => {
              setCurrentScreen('intro');
              setCurrentQuestionIndex(0);
              setAnswers({});
              setResult(null);
            }}
            variant="outline"
            className="w-full"
          >
            Take Again
          </Button>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4 sm:mt-6">
          The GAD-7 is a screening tool, not a diagnostic instrument.
          Please consult with a healthcare professional for proper evaluation and treatment.
        </p>
      </Card>
    );
  }

  return null;
}
