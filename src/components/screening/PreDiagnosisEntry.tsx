/**
 * PreDiagnosisEntry
 * Landing screen for parents who have concerns about their child
 * but have not yet received a formal diagnosis.
 * Screen name: 'pre-diagnosis'
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ClipboardList, MessageCircle, Search } from 'lucide-react';
import { DevelopmentalScreener, type ScreenerResult } from './DevelopmentalScreener';

interface PreDiagnosisEntryProps {
  onNavigate: (screen: string) => void;
  childName?: string;
  childAge?: number;
}

const fontStack =
  'Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif';

const fontSmoothing: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

export function PreDiagnosisEntry({ onNavigate, childName, childAge }: PreDiagnosisEntryProps) {
  const [showScreener, setShowScreener] = useState(false);

  const handleScreenerComplete = (result: ScreenerResult) => {
    // Screener shows its own results view internally; this callback fires after
    // the parent clicks an action button inside the screener result.
    // The screener's action buttons call onNavigate directly, so we just
    // keep showScreener true to let the result display inside.
    void result; // acknowledged
  };

  if (showScreener) {
    return (
      <DevelopmentalScreener
        onComplete={handleScreenerComplete}
        onNavigate={(screen) => {
          if (screen === 'pre-diagnosis') {
            setShowScreener(false);
          } else {
            onNavigate(screen);
          }
        }}
        childName={childName}
        childAge={childAge}
      />
    );
  }

  const cards = [
    {
      icon: ClipboardList,
      iconColor: '#577590',
      iconBg: 'rgba(87,117,144,0.10)',
      title: 'Take a free developmental screener',
      description: '20 research-informed questions. Takes about 4 minutes. No account required.',
      cta: 'Start screener',
      action: () => setShowScreener(true),
      primary: true,
    },
    {
      icon: MessageCircle,
      iconColor: '#4E93A8',
      iconBg: 'rgba(78,147,168,0.10)',
      title: 'Talk to Aminy AI about your concerns',
      description: 'Describe what you\'re noticing. Aminy can help you make sense of it and know what questions to ask.',
      cta: 'Start a conversation',
      action: () => onNavigate('ask-aminy'),
      primary: false,
    },
    {
      icon: Search,
      iconColor: '#E07A5F',
      iconBg: 'rgba(224,122,95,0.10)',
      title: 'Browse specialists who work with undiagnosed children',
      description: 'Find BCBAs, psychologists, and speech therapists who welcome families at any stage.',
      cta: 'Browse specialists',
      action: () => onNavigate('marketplace'),
      primary: false,
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F8F6',
        fontFamily: fontStack,
        ...fontSmoothing,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Back nav */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => onNavigate('splash')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'rgba(17,24,39,0.5)',
            fontFamily: fontStack,
            fontSize: '13px',
            fontWeight: 500,
          }}
          aria-label="Back to home"
        >
          <ArrowLeft style={{ width: '18px', height: '18px' }} />
          Back
        </button>
      </div>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 20px 56px',
        }}
      >
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ marginBottom: '36px' }}
          >
            <div
              style={{
                display: 'inline-block',
                backgroundColor: 'rgba(87,117,144,0.10)',
                borderRadius: '10px',
                padding: '5px 12px',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#577590',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                No diagnosis needed
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.5rem, 5vw, 1.9rem)',
                fontWeight: 650,
                color: 'rgba(17,24,39,0.90)',
                lineHeight: 1.22,
                letterSpacing: '-0.02em',
                marginBottom: '14px',
              }}
            >
              You noticed something.
              <br />
              That's the first step.
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: 'rgba(17,24,39,0.52)',
                lineHeight: 1.65,
                maxWidth: '42ch',
              }}
            >
              Many families start their journey here — before any diagnosis, before any label. Aminy is here for you right now.
            </p>
          </motion.div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                >
                  <button
                    onClick={card.action}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      backgroundColor: '#ffffff',
                      border: card.primary
                        ? '1.5px solid rgba(87,117,144,0.28)'
                        : '1px solid rgba(17,24,39,0.07)',
                      borderRadius: '18px',
                      padding: '20px',
                      cursor: 'pointer',
                      fontFamily: fontStack,
                      display: 'block',
                      transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                      boxShadow: card.primary ? '0 2px 12px rgba(87,117,144,0.10)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(17,24,39,0.10)';
                      e.currentTarget.style.borderColor = card.primary
                        ? 'rgba(87,117,144,0.45)'
                        : 'rgba(17,24,39,0.14)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = card.primary
                        ? '0 2px 12px rgba(87,117,144,0.10)'
                        : 'none';
                      e.currentTarget.style.borderColor = card.primary
                        ? 'rgba(87,117,144,0.28)'
                        : 'rgba(17,24,39,0.07)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: card.iconBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon style={{ width: '20px', height: '20px', color: card.iconColor }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 650,
                            color: 'rgba(17,24,39,0.88)',
                            marginBottom: '5px',
                            letterSpacing: '-0.008em',
                          }}
                        >
                          {card.title}
                        </h3>
                        <p
                          style={{
                            fontSize: '13px',
                            color: 'rgba(17,24,39,0.52)',
                            lineHeight: 1.55,
                            marginBottom: '12px',
                          }}
                        >
                          {card.description}
                        </p>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: card.iconColor,
                          }}
                        >
                          {card.cta} →
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            style={{
              textAlign: 'center',
              padding: '16px',
              backgroundColor: 'rgba(78,147,168,0.06)',
              border: '1px solid rgba(78,147,168,0.15)',
              borderRadius: '14px',
            }}
          >
            <p style={{ fontSize: '13px', color: 'rgba(17,24,39,0.55)', lineHeight: 1.55, margin: 0 }}>
              No diagnosis required for any Aminy service.{' '}
              <strong style={{ color: 'rgba(17,24,39,0.72)' }}>Cash-pay sessions available</strong>{' '}
              for immediate access — no insurance, no paperwork.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default PreDiagnosisEntry;
