/**
 * DevelopmentalScreener
 * Multi-area developmental screening tool for parents without a formal diagnosis.
 * Inspired by M-CHAT-R, PEDS, and PHQ-A validated instruments.
 * NOT a diagnostic tool — for screening and evaluation guidance only.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

export interface ScreenerResult {
  totalScore: number;
  recommendation: 'routine' | 'early_eval' | 'prompt_eval';
  primaryConcernArea: 'developmental' | 'speech' | 'social_emotional' | 'mixed';
  areaScores: {
    developmental: number;
    speech: number;
    socialEmotional: number;
  };
}

export interface DevelopmentalScreenerProps {
  onComplete: (result: ScreenerResult) => void;
  onNavigate: (screen: string) => void;
  childName?: string;
  childAge?: number;
}

type AnswerOption = {
  label: string;
  value: number; // 0 = not concerning, 1 = concerning
};

type Question = {
  id: string;
  area: 'developmental' | 'speech' | 'social_emotional';
  text: string;
  options: AnswerOption[];
};

const QUESTIONS: Question[] = [
  // Autism / Developmental (10 questions)
  {
    id: 'd1',
    area: 'developmental',
    text: 'Does your child respond to their name when called?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 'd2',
    area: 'developmental',
    text: 'Does your child make eye contact during play or conversation?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 'd3',
    area: 'developmental',
    text: 'Does your child point to show you things they find interesting?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 'd4',
    area: 'developmental',
    text: 'Does your child play pretend or make-believe?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 'd5',
    area: 'developmental',
    text: 'Does your child have unusual or repetitive behaviors (hand flapping, rocking, lining up objects)?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 'd6',
    area: 'developmental',
    text: 'Does your child have strong reactions to sensory input (sounds, textures, lights)?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 'd7',
    area: 'developmental',
    text: 'Does your child have difficulty with transitions or changes in routine?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 'd8',
    area: 'developmental',
    text: 'Does your child use gestures (waving, nodding, shaking head)?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 'd9',
    area: 'developmental',
    text: 'Does your child show interest in other children?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 'd10',
    area: 'developmental',
    text: 'Does your child have specific intense interests that seem unusual in focus or intensity?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  // Speech / Language (5 questions)
  {
    id: 's1',
    area: 'speech',
    text: 'Can your child combine words into phrases or sentences?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 's2',
    area: 'speech',
    text: 'Do strangers understand most of what your child says?',
    options: [
      { label: 'Yes', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'No', value: 1 },
    ],
  },
  {
    id: 's3',
    area: 'speech',
    text: 'Does your child have difficulty following 2-step directions?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 's4',
    area: 'speech',
    text: 'Does your child stutter or have difficulty with certain sounds?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 's5',
    area: 'speech',
    text: 'Has your child lost words or language skills they previously had?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Not sure', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  // Social-Emotional / Mental Health (5 questions)
  {
    id: 'se1',
    area: 'social_emotional',
    text: 'Does your child seem unusually anxious, worried, or fearful?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 'se2',
    area: 'social_emotional',
    text: 'Does your child have frequent meltdowns beyond what you\'d expect for their age?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 'se3',
    area: 'social_emotional',
    text: 'Does your child have difficulty making or keeping friends?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 'se4',
    area: 'social_emotional',
    text: 'Does your child seem sad or withdrawn for extended periods?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
  {
    id: 'se5',
    area: 'social_emotional',
    text: 'Does your child have trouble controlling impulses or sitting still?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Sometimes', value: 1 },
      { label: 'Yes', value: 1 },
    ],
  },
];

const AREA_LABELS: Record<Question['area'], string> = {
  developmental: 'Autism / Developmental',
  speech: 'Speech & Language',
  social_emotional: 'Social-Emotional',
};

const AREA_QUESTION_COUNTS = {
  developmental: QUESTIONS.filter((q) => q.area === 'developmental').length,
  speech: QUESTIONS.filter((q) => q.area === 'speech').length,
  social_emotional: QUESTIONS.filter((q) => q.area === 'social_emotional').length,
};

function computeResult(answers: Record<string, number>): ScreenerResult {
  let developmental = 0;
  let speech = 0;
  let socialEmotional = 0;

  for (const q of QUESTIONS) {
    const val = answers[q.id] ?? 0;
    if (q.area === 'developmental') developmental += val;
    else if (q.area === 'speech') speech += val;
    else socialEmotional += val;
  }

  const totalScore = developmental + speech + socialEmotional;

  let recommendation: ScreenerResult['recommendation'];
  if (totalScore <= 3) recommendation = 'routine';
  else if (totalScore <= 7) recommendation = 'early_eval';
  else recommendation = 'prompt_eval';

  // Normalize scores by area question count for fair comparison
  const devNorm = developmental / AREA_QUESTION_COUNTS.developmental;
  const spNorm = speech / AREA_QUESTION_COUNTS.speech;
  const seNorm = socialEmotional / AREA_QUESTION_COUNTS.social_emotional;

  const maxNorm = Math.max(devNorm, spNorm, seNorm);
  const countAtMax = [devNorm, spNorm, seNorm].filter((v) => v === maxNorm).length;

  let primaryConcernArea: ScreenerResult['primaryConcernArea'];
  if (countAtMax > 1) {
    primaryConcernArea = 'mixed';
  } else if (devNorm === maxNorm) {
    primaryConcernArea = 'developmental';
  } else if (spNorm === maxNorm) {
    primaryConcernArea = 'speech';
  } else {
    primaryConcernArea = 'social_emotional';
  }

  return {
    totalScore,
    recommendation,
    primaryConcernArea,
    areaScores: { developmental, speech, socialEmotional },
  };
}

const RECOMMENDATION_CONFIG = {
  routine: {
    color: '#2A7D99',
    bgColor: 'rgba(67, 170, 139, 0.08)',
    borderColor: 'rgba(67, 170, 139, 0.25)',
    icon: CheckCircle,
    label: 'Routine monitoring suggested',
    description:
      'Your responses don\'t indicate significant concerns at this time. Continue with regular well-child visits and developmental check-ins with your pediatrician.',
  },
  early_eval: {
    color: '#E6A817',
    bgColor: 'rgba(230, 168, 23, 0.08)',
    borderColor: 'rgba(230, 168, 23, 0.25)',
    icon: AlertTriangle,
    label: 'Early evaluation recommended',
    description:
      'Some of your responses suggest it may be helpful to speak with a specialist. An early evaluation can provide clarity and, if needed, give your child a head start on support.',
  },
  prompt_eval: {
    color: '#E07A5F',
    bgColor: 'rgba(224, 122, 95, 0.08)',
    borderColor: 'rgba(224, 122, 95, 0.25)',
    icon: AlertCircle,
    label: 'Prompt evaluation recommended',
    description:
      'Your responses indicate several areas of concern. We recommend scheduling an evaluation with a specialist soon. Early support makes a meaningful difference.',
  },
};

const AREA_CONCERN_LABELS: Record<string, string> = {
  developmental: 'Autism / Developmental',
  speech: 'Speech & Language',
  social_emotional: 'Social-Emotional',
  mixed: 'Multiple Areas',
};

const fontStack =
  'Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif';

export function DevelopmentalScreener({
  onComplete,
  onNavigate,
  childName,
}: DevelopmentalScreenerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const totalQuestions = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIndex];
  const progress = ((currentIndex) / totalQuestions) * 100;
  const hasAnswered = selectedOptionIndex[currentQuestion?.id] !== undefined;
  const isLast = currentIndex === totalQuestions - 1;

  // Area section header display
  const prevArea = currentIndex > 0 ? QUESTIONS[currentIndex - 1].area : null;
  const showAreaHeader = currentQuestion && currentQuestion.area !== prevArea;

  const handleAnswer = (optionIndex: number) => {
    const concernValue = QUESTIONS[currentIndex].options[optionIndex].value;
    // Store concern value (0 or 1) keyed by question id
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: concernValue }));
    // Also store option index for UI highlight (we use a separate derived check)
    setSelectedOptionIndex((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleNext = () => {
    if (!hasAnswered) return;
    if (isLast) {
      const computed = computeResult({ ...answers });
      setResult(computed);
      onComplete(computed);
    } else {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      onNavigate('pre-diagnosis');
      return;
    }
    setDirection(-1);
    setCurrentIndex((i) => i - 1);
  };

  const childLabel = childName ? childName : 'your child';

  if (result) {
    const config = RECOMMENDATION_CONFIG[result.recommendation];
    const IconComponent = config.icon;
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F8F8F6',
          fontFamily: fontStack,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(17,24,39,0.06)',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <p style={{ fontSize: '13px', color: 'rgba(17,24,39,0.45)', fontWeight: 500 }}>
              Developmental Screener — Results
            </p>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 20px 48px',
          }}
        >
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            {/* Disclaimer banner */}
            <div
              style={{
                backgroundColor: 'rgba(87,117,144,0.08)',
                border: '1px solid rgba(87,117,144,0.18)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '24px',
              }}
            >
              <p style={{ fontSize: '12px', color: 'rgba(17,24,39,0.55)', lineHeight: 1.5, margin: 0 }}>
                <strong>Disclaimer:</strong> This is not a medical diagnosis. It is a screening tool to help you understand when to seek professional evaluation.
              </p>
            </div>

            {/* Result card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                backgroundColor: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                borderRadius: '20px',
                padding: '28px 24px',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              <IconComponent
                style={{ width: '40px', height: '40px', color: config.color, margin: '0 auto 16px' }}
              />
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 650,
                  color: 'rgba(17,24,39,0.88)',
                  marginBottom: '10px',
                  letterSpacing: '-0.01em',
                }}
              >
                {config.label}
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(17,24,39,0.62)', lineHeight: 1.6, margin: 0 }}>
                {config.description}
              </p>
            </motion.div>

            {/* Area breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(17,24,39,0.07)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(17,24,39,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '16px',
                }}
              >
                Area Summary
              </h3>
              {(
                [
                  { key: 'developmental', score: result.areaScores.developmental, max: AREA_QUESTION_COUNTS.developmental },
                  { key: 'speech', score: result.areaScores.speech, max: AREA_QUESTION_COUNTS.speech },
                  { key: 'social_emotional', score: result.areaScores.socialEmotional, max: AREA_QUESTION_COUNTS.social_emotional },
                ] as const
              ).map(({ key, score, max }) => {
                const pct = max > 0 ? (score / max) * 100 : 0;
                const barColor = pct === 0 ? '#2A7D99' : pct <= 40 ? '#E6A817' : '#E07A5F';
                return (
                  <div key={key} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(17,24,39,0.72)', fontWeight: 500 }}>
                        {AREA_LABELS[key as keyof typeof AREA_LABELS]}
                      </span>
                      <span style={{ fontSize: '12px', color: 'rgba(17,24,39,0.45)' }}>
                        {score}/{max}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        backgroundColor: 'rgba(17,24,39,0.06)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: barColor,
                          borderRadius: '3px',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {result.primaryConcernArea !== 'mixed' && result.totalScore > 0 && (
                <p style={{ fontSize: '12px', color: 'rgba(17,24,39,0.45)', marginTop: '8px', marginBottom: 0 }}>
                  Highest concern area: <strong>{AREA_CONCERN_LABELS[result.primaryConcernArea]}</strong>
                </p>
              )}
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <button
                onClick={() => onNavigate('marketplace')}
                style={{
                  backgroundColor: '#577590',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '0 24px',
                  height: '52px',
                  fontSize: '15px',
                  fontWeight: 550,
                  fontFamily: fontStack,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '-0.008em',
                }}
              >
                Find a specialist
                <ArrowRight style={{ width: '15px', height: '15px' }} />
              </button>
              <button
                onClick={() => onNavigate('ask-aminy')}
                style={{
                  backgroundColor: '#ffffff',
                  color: 'rgba(17,24,39,0.78)',
                  border: '1px solid rgba(17,24,39,0.10)',
                  borderRadius: '14px',
                  padding: '0 24px',
                  height: '52px',
                  fontSize: '15px',
                  fontWeight: 500,
                  fontFamily: fontStack,
                  cursor: 'pointer',
                }}
              >
                Talk to Aminy AI
              </button>
              <button
                onClick={() => onNavigate('resources')}
                style={{
                  backgroundColor: 'transparent',
                  color: 'rgba(13,148,136,0.85)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '0 24px',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: fontStack,
                  cursor: 'pointer',
                }}
              >
                Learn more about these areas →
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Intro screen (before first question)
  if (currentIndex === -1) {
    return null; // unused; we start at 0
  }

  const areaOrder: Question['area'][] = ['developmental', 'speech', 'social_emotional'];
  const currentAreaIndex = areaOrder.indexOf(currentQuestion.area);
  const areaColors = ['#577590', '#2A7D99', '#E07A5F'];
  const areaColor = areaColors[currentAreaIndex] ?? '#577590';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F8F6',
        fontFamily: fontStack,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with back + progress */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(17,24,39,0.06)',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(17,24,39,0.5)',
              }}
              aria-label="Go back"
            >
              <ArrowLeft style={{ width: '20px', height: '20px' }} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(17,24,39,0.45)', fontWeight: 500 }}>
                  {currentIndex + 1} of {totalQuestions}
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(17,24,39,0.45)' }}>
                  {AREA_LABELS[currentQuestion.area]}
                </span>
              </div>
              <div
                style={{
                  height: '4px',
                  backgroundColor: 'rgba(17,24,39,0.06)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: areaColor,
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Area section header */}
      {showAreaHeader && (
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: `${areaColor}14`,
            borderBottom: `1px solid ${areaColor}28`,
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 600, color: areaColor, textAlign: 'center', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {AREA_LABELS[currentQuestion.area]}
          </p>
        </div>
      )}

      {/* Question */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 20px 48px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.22 }}
              style={{ flex: 1 }}
            >
              {/* Disclaimer on first question */}
              {currentIndex === 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(87,117,144,0.07)',
                    border: '1px solid rgba(87,117,144,0.15)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '24px',
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'rgba(17,24,39,0.52)', lineHeight: 1.5, margin: 0 }}>
                    This is not a medical diagnosis. It is a screening tool to help you understand when to seek professional evaluation.
                  </p>
                </div>
              )}

              <h2
                style={{
                  fontSize: 'clamp(1.1rem, 4vw, 1.35rem)',
                  fontWeight: 600,
                  color: 'rgba(17,24,39,0.88)',
                  lineHeight: 1.4,
                  letterSpacing: '-0.01em',
                  marginBottom: '8px',
                }}
              >
                {currentQuestion.text.replace('your child', childLabel)}
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(17,24,39,0.4)', marginBottom: '28px' }}>
                Think about typical recent behavior, not occasional events.
              </p>

              {/* Answer options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQuestion.options.map((opt, idx) => {
                  const selected = selectedOptionIndex[currentQuestion.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: '14px',
                        border: selected
                          ? `2px solid ${areaColor}`
                          : '2px solid rgba(17,24,39,0.08)',
                        backgroundColor: selected ? `${areaColor}12` : '#ffffff',
                        cursor: 'pointer',
                        fontFamily: fontStack,
                        fontSize: '15px',
                        fontWeight: selected ? 600 : 400,
                        color: selected ? 'rgba(17,24,39,0.88)' : 'rgba(17,24,39,0.7)',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                        minHeight: '56px',
                      }}
                    >
                      <span>{opt.label}</span>
                      {selected && (
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: areaColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Next button */}
          <div style={{ marginTop: '28px' }}>
            <button
              onClick={handleNext}
              disabled={!hasAnswered}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: hasAnswered ? areaColor : 'rgba(17,24,39,0.08)',
                color: hasAnswered ? '#ffffff' : 'rgba(17,24,39,0.3)',
                fontSize: '15px',
                fontWeight: 550,
                fontFamily: fontStack,
                cursor: hasAnswered ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s ease',
                letterSpacing: '-0.008em',
              }}
            >
              {isLast ? 'See my results' : 'Next question'}
              <ArrowRight style={{ width: '15px', height: '15px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevelopmentalScreener;
