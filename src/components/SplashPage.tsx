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
}

const fontStack = 'Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

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
}: SplashPageProps) {

  useEffect(() => {
    document.title = "Aminy — ABA for Everyday Life";

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Gentle, always-there support grounded in ABA—routines, guidance, and progress tools for neurodivergent family life.');
  }, []);

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col"
      style={{
        backgroundColor: '#F8F8F6',
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
            justifyContent: 'flex-end',  // CTAs only — hero logo below carries the brand
            gap: '12px',
          }}
        >
          {/* No duplicate wordmark: the hero logo image below is the brand mark. */}
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
              ABA-Based · Clinically Grounded · Built for Families
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
              marginBottom: '52px',
            }}
          >
            <img
              src={aminyLogoCropped}
              alt="Aminy - Gentle Guidance. Meaningful Progress."
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
            One place for every kind of care your child needs — ABA, speech, OT, mental health — coordinated by an AI that actually knows your family. From finding the right provider to tracking progress to handling insurance.
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
                backgroundColor: '#6B9080',
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
                transition: 'background-color 0.2s ease',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5A7D6E';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6B9080';
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
            14-day free trial · No credit card required
          </motion.p>

          {/* Provider secondary CTA */}
          {onForProviders && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.72 }}
              style={{ textAlign: 'center', marginBottom: '20px' }}
            >
              <button
                onClick={onForProviders}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(13, 148, 136, 0.75)',
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  transition: 'color 0.2s ease',
                  ...fontSmoothing,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(13, 148, 136, 1)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(13, 148, 136, 0.75)'}
              >
                Are you a provider? →
              </button>
            </motion.div>
          )}

          {/* Pre-diagnosis entry — families with concerns, no label yet */}
          {onPreDiagnosis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.74 }}
              style={{ textAlign: 'center', marginBottom: '20px' }}
            >
              <button
                onClick={onPreDiagnosis}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(100, 116, 139, 0.7)',
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  transition: 'color 0.2s ease',
                  ...fontSmoothing,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 116, 139, 1)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(100, 116, 139, 0.7)'}
              >
                No diagnosis yet? You belong here too →
              </button>
            </motion.div>
          )}

          {/* Free Screening CTA — the acquisition hook */}
          {onFreeScreening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.75 }}
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <button
                onClick={onFreeScreening}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: '1px solid rgba(13, 148, 136, 0.25)',
                  borderRadius: '12px',
                  color: 'rgba(13, 148, 136, 0.85)',
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '10px 20px',
                  transition: 'all 0.2s ease',
                  ...fontSmoothing,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.25)';
                }}
              >
                Concerned about your child? Free screening →
              </button>
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
                    color: 'rgba(13, 148, 136, 0.7)',
                    fontFamily: fontStack,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    transition: 'color 0.2s ease',
                    ...fontSmoothing,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(13, 148, 136, 1)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(13, 148, 136, 0.7)'}
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
