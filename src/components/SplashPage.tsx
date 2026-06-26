// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SplashPage - Calm / Apple / Premium
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import aminyLogoCropped from "../assets/aminy-logo-cropped.png";
import { MedicalDisclaimer } from './MedicalDisclaimer';

interface SplashPageProps {
  onStartTrial: () => void;
  onWatchDemo?: () => void;
  onStartReflection?: () => void;
  onSignIn?: () => void;
  onForProviders?: () => void;
  onFreeScreening?: () => void;
  onPreDiagnosis?: () => void;
  onJustDiagnosed?: () => void;
  onTeleABA?: () => void;
  onPricing?: () => void;
}

const fontStack = "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif";

const fontSmoothing: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

export function SplashPage({
  onStartTrial,
  onSignIn,
  onForProviders,
  onFreeScreening,
  onPreDiagnosis,
  onJustDiagnosed,
}: SplashPageProps) {

  useEffect(() => {
    document.title = "Aminy — AI-Powered ABA Support";

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'AI-powered ABA support for neurodivergent families. BCBA-designed techniques, insurance navigation, and a 24/7 AI coach — in your pocket.');
  }, []);

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #F6FBFB 0%, #EAF3F7 55%, #E4EFF5 100%)',
        fontFamily: fontStack,
        ...fontSmoothing,
      }}
    >
      <nav
        aria-label="Primary"
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '18px 24px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: '920px',
            alignItems: 'center',
            justifyContent: 'space-between',  // spacer left, CTAs right
            gap: '12px',
          }}
        >
          {/* Spacer — no wordmark: the hero logo image below is the brand mark. */}
          <div style={{ width: '80px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onForProviders && (
              <button
                onClick={onForProviders}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(17, 24, 39, 0.6)',
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  ...fontSmoothing,
                }}
              >
                For providers
              </button>
            )}
            {onSignIn && (
              <button
                onClick={onSignIn}
                className="action-button"
                style={{
                  border: '1px solid rgba(17, 24, 39, 0.08)',
                  background: 'rgba(255,255,255,0.72)',
                  color: 'rgba(17, 24, 39, 0.82)',
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  ...fontSmoothing,
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col items-center px-6 sm:px-8"
        style={{
          paddingTop: 'clamp(48px, 10vh, 96px)',
          paddingBottom: '48px',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '620px', margin: '0 auto' }}>

          {/* Top Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0 }}
            style={{
              textAlign: 'center',
              marginBottom: '32px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                border: '1px solid rgba(17, 24, 39, 0.03)',
                borderRadius: '14px',
                color: 'rgba(17, 24, 39, 0.42)',
                fontFamily: fontStack,
                fontSize: '12px',
                fontWeight: 450,
                letterSpacing: '0.015em',
                ...fontSmoothing,
              }}
            >
              TeleABA · Takes insurance · AI-powered
            </span>
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.1 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '36px',
            }}
          >
            <img
              src={aminyLogoCropped}
              alt="Aminy - Gentle Guidance. Meaningful Progress."
              className="aminy-logo-breathe"
              style={{
                width: 'min(58vw, 240px)',
                aspectRatio: '827 / 338',
                objectFit: 'contain',
              }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25 }}
            style={{
              color: 'rgba(17, 24, 39, 0.88)',
              fontFamily: fontStack,
              fontWeight: 540,
              fontSize: 'clamp(1.75rem, 5.5vw, 2.15rem)',
              lineHeight: 1.24,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              marginBottom: '28px',
              ...fontSmoothing,
            }}
          >
            The Family OS for neurodivergent care.
          </motion.h1>

          {/* Context line */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            style={{
              color: 'rgba(17, 24, 39, 0.44)',
              fontFamily: fontStack,
              fontWeight: 400,
              fontSize: '15px',
              lineHeight: 1.6,
              letterSpacing: '-0.006em',
              textAlign: 'center',
              marginBottom: '40px',
              maxWidth: '44ch',
              marginLeft: 'auto',
              marginRight: 'auto',
              ...fontSmoothing,
            }}
          >
            One place for every kind of care your child needs — ABA, speech, mental health — coordinated by an AI that actually knows your family. From finding the right provider to tracking progress to handling insurance.
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.55 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <button
              onClick={onStartTrial}
              className="action-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#2A7D99',
                color: '#FFFFFF',
                fontFamily: fontStack,
                fontWeight: 500,
                fontSize: '15px',
                letterSpacing: '-0.008em',
                padding: '0 32px',
                height: '52px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(42,125,153,0.22), 0 4px 12px rgba(42,125,153,0.14)',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#216982';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(42,125,153,0.32), 0 8px 20px rgba(42,125,153,0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2A7D99';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(42,125,153,0.22), 0 4px 12px rgba(42,125,153,0.14)';
              }}
            >
              Start free
              <ArrowRight style={{ width: '15px', height: '15px', strokeWidth: 2 }} />
            </button>
          </motion.div>

          {/* Trial note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            style={{
              textAlign: 'center',
              marginBottom: '12px',
              color: 'rgba(17, 24, 39, 0.38)',
              fontFamily: fontStack,
              fontSize: '12.5px',
              fontWeight: 400,
              letterSpacing: '0.01em',
              ...fontSmoothing,
            }}
          >
            7-day free trial · No credit card required
          </motion.p>

          {/* Provider entry intentionally lives in two places only: the top-right
             "For providers" nav and the "Provider pilot by invitation" link below.
             Removed the duplicate "Are you a provider?" CTA that pointed to the same
             onForProviders handler — it was the third provider entry and cluttered
             the secondary stack. */}

          {/* "No diagnosis yet? You belong here too" standalone CTA removed to
             declutter the secondary stack — the boxed "Concerned about your child?
             Free screening" CTA below serves the same concerned/undiagnosed-parent
             audience. onPreDiagnosis remains wired and can be re-surfaced if a
             distinct pre-diagnosis entry point is wanted later. */}

          {/* Secondary acquisition CTAs — two chips in a clean row */}
          {(onFreeScreening || onJustDiagnosed) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.75 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                padding: '0 20px',
              }}
            >
              {/* Divider label */}
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(17,24,39,0.30)',
                letterSpacing: '0.08em',
                ...fontSmoothing,
              }}>
                OR
              </div>
              {/* Chip row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {onFreeScreening && (
                  <button
                    onClick={onFreeScreening}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(42,125,153,0.07)',
                      border: '1px solid rgba(42,125,153,0.22)',
                      borderRadius: '100px',
                      color: '#2A7D99',
                      fontFamily: fontStack,
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '9px 16px',
                      transition: 'all 0.18s ease',
                      ...fontSmoothing,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(42,125,153,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(42,125,153,0.40)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(42,125,153,0.07)';
                      e.currentTarget.style.borderColor = 'rgba(42,125,153,0.22)';
                    }}
                  >
                    Concerned? Free screening →
                  </button>
                )}
                {onJustDiagnosed && (
                  <button
                    onClick={onJustDiagnosed}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(106,169,188,0.07)',
                      border: '1px solid rgba(106,169,188,0.25)',
                      borderRadius: '100px',
                      color: '#4A8A9C',
                      fontFamily: fontStack,
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '9px 16px',
                      transition: 'all 0.18s ease',
                      ...fontSmoothing,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(106,169,188,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(106,169,188,0.45)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(106,169,188,0.07)';
                      e.currentTarget.style.borderColor = 'rgba(106,169,188,0.25)';
                    }}
                  >
                    Just diagnosed? First 30 Days plan →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Sign in */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            style={{
              textAlign: 'center',
              marginBottom: '44px',
            }}
          >
            {onSignIn && (
              <button
                onClick={onSignIn}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(17, 24, 39, 0.45)',
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 400,
                  cursor: 'pointer',
                  padding: '8px 16px',
                  transition: 'color 0.2s ease',
                  ...fontSmoothing,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.65)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(17, 24, 39, 0.45)'}
              >
                Already have an account? Sign in
              </button>
            )}

            {onForProviders && (
              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={onForProviders}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(42, 125, 153, 0.75)',
                    fontFamily: fontStack,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    transition: 'color 0.2s ease',
                    ...fontSmoothing,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(42, 125, 153, 1)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(42, 125, 153, 0.75)'}
                >
                  Provider pilot by invitation →
                </button>
              </div>
            )}
          </motion.div>

          {/* Bottom Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.95 }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px',
              rowGap: '8px',
            }}
          >
            {['Built by Parents', 'Backed by ABA Experts', 'HIPAA-Conscious', 'Private by Design'].map((text) => (
              <span
                key={text}
                style={{
                  display: 'inline-block',
                  padding: '4px 11px',
                  backgroundColor: 'rgba(255, 255, 255, 0.35)',
                  border: '1px solid rgba(17, 24, 39, 0.03)',
                  borderRadius: '12px',
                  color: 'rgba(17, 24, 39, 0.38)',
                  fontFamily: fontStack,
                  fontSize: '12px',
                  fontWeight: 450,
                  letterSpacing: '0.01em',
                  ...fontSmoothing,
                }}
              >
                {text}
              </span>
            ))}
          </motion.div>

          {/* Value Proposition - Forta Differentiation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.1 }}
            style={{
              marginTop: '40px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '20px',
              }}
            >
              {[
                { icon: '⚡', text: 'Start Today', subtext: 'No waitlist' },
                { icon: '🌙', text: 'AI guidance, anytime', subtext: 'Here whenever you need it' },
                { icon: '✓', text: 'No Diagnosis', subtext: 'Required' },
              ].map((item) => (
                <div
                  key={item.text}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span
                    style={{
                      color: 'rgba(17, 24, 39, 0.55)',
                      fontFamily: fontStack,
                      fontSize: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                      ...fontSmoothing,
                    }}
                  >
                    {item.text}
                  </span>
                  <span
                    style={{
                      color: 'rgba(17, 24, 39, 0.35)',
                      fontFamily: fontStack,
                      fontSize: '12px',
                      fontWeight: 400,
                      ...fontSmoothing,
                    }}
                  >
                    {item.subtext}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </main>

      {/* Trust line */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.25 }}
        style={{
          textAlign: 'center',
          color: 'rgba(17, 24, 39, 0.32)',
          fontFamily: fontStack,
          fontSize: '11.5px',
          fontWeight: 400,
          letterSpacing: '0.01em',
          padding: '0 24px',
          marginTop: '28px',
          ...fontSmoothing,
        }}
      >
        Trusted by ABA providers and pediatric behavioral health families
      </motion.p>

      {/* Medical Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.3 }}
        style={{
          padding: '0 24px',
          marginTop: '12px',
        }}
      >
        <MedicalDisclaimer variant="inline" className="text-center max-w-md mx-auto" />
      </motion.div>

      {/* Footer spacer — extra room for cookie consent banner on mobile */}
      <div style={{ height: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 80px))' }} />
    </div>
  );
}

export default SplashPage;
