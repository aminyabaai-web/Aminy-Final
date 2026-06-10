// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * SplashPage — Aminy Design System · marketing landing surface
 * Teal (#2A7D99) · Schibsted Grotesk · Mist background
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Zap, Moon, CheckCircle, Shield, Star, Clock } from 'lucide-react';
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

// Design system font stack — Schibsted Grotesk is primary
const fontStack = "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const fontSmoothing: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

// Design system tokens
const TEAL = '#2A7D99';
const TEAL_DARK = '#1F6080';
const TEAL_LIGHT = 'rgba(42,125,153,0.08)';
const TEAL_BORDER = 'rgba(42,125,153,0.20)';
const TEXT = 'rgba(19,47,67,0.90)';
const TEXT_MUTED = 'rgba(19,47,67,0.50)';
const TEXT_FAINT = 'rgba(19,47,67,0.36)';

export function SplashPage({
  onStartTrial,
  onSignIn,
  onForProviders,
  onFreeScreening,
  onJustDiagnosed,
  onTeleABA,
  onPricing,
}: SplashPageProps) {

  useEffect(() => {
    document.title = "Aminy — The calm center of your child's care";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'ABA-grounded support for neurodivergent families. Routines, AI guidance, and progress tools — coordinated by an AI that knows your child.');
  }, []);

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #F6FBFB 0%, #EDF4F7 100%)',
        fontFamily: fontStack,
        ...fontSmoothing,
      }}
    >
      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav
        aria-label="Primary"
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '16px 24px 0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'rgba(246,251,251,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: '960px',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(42,125,153,0.07)',
          }}
        >
          {/* Wordmark */}
          <img
            src={aminyLogoCropped}
            alt="Aminy"
            style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
          />

          {/* Nav links — hidden on small screens */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
            className="hidden sm:flex"
          >
            {[
              { label: 'For families', action: onFreeScreening || onStartTrial },
              { label: 'For providers', action: onForProviders },
              { label: 'TeleABA', action: onTeleABA },
              { label: 'Pricing', action: onPricing },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action || undefined}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: TEXT_MUTED,
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: action ? 'pointer' : 'default',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  transition: 'color 0.15s, background 0.15s',
                  ...fontSmoothing,
                }}
                onMouseEnter={(e) => {
                  if (action) {
                    e.currentTarget.style.color = TEXT;
                    e.currentTarget.style.background = TEAL_LIGHT;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = TEXT_MUTED;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Auth CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onSignIn && (
              <button
                onClick={onSignIn}
                className="action-button"
                style={{
                  border: `1px solid rgba(42,125,153,0.18)`,
                  background: 'rgba(255,255,255,0.80)',
                  color: TEXT,
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  transition: 'all 0.15s',
                  ...fontSmoothing,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = TEAL_BORDER; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(42,125,153,0.18)'; }}
              >
                Sign in
              </button>
            )}
            <button
              onClick={onStartTrial}
              className="action-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: TEAL,
                color: '#FFFFFF',
                fontFamily: fontStack,
                fontWeight: 600,
                fontSize: '13px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = TEAL_DARK; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = TEAL; }}
            >
              Start free
              <ArrowRight style={{ width: '13px', height: '13px', strokeWidth: 2.5 }} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col items-center px-6 sm:px-8"
        style={{
          paddingTop: 'clamp(52px, 11vh, 104px)',
          paddingBottom: '48px',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>

          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0 }}
            style={{ textAlign: 'center', marginBottom: '28px' }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                backgroundColor: TEAL_LIGHT,
                border: `1px solid ${TEAL_BORDER}`,
                borderRadius: '999px',
                color: TEAL,
                fontFamily: fontStack,
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.01em',
                ...fontSmoothing,
              }}
            >
              <Star style={{ width: '11px', height: '11px', fill: TEAL, color: TEAL }} />
              The Family OS for neurodivergent care
            </span>
          </motion.div>

          {/* Logo lockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <img
              src={aminyLogoCropped}
              alt="Aminy — Gentle Guidance. Meaningful Progress."
              style={{
                width: 'min(52vw, 220px)',
                aspectRatio: '827 / 338',
                objectFit: 'contain',
              }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18 }}
            style={{
              color: TEXT,
              fontFamily: fontStack,
              fontWeight: 700,
              fontSize: 'clamp(1.85rem, 5.8vw, 2.25rem)',
              lineHeight: 1.22,
              letterSpacing: '-0.025em',
              textAlign: 'center',
              marginBottom: '20px',
              ...fontSmoothing,
            }}
          >
            The calm center of<br />your child's care.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.30 }}
            style={{
              color: TEXT_MUTED,
              fontFamily: fontStack,
              fontWeight: 400,
              fontSize: '15.5px',
              lineHeight: 1.62,
              letterSpacing: '-0.005em',
              textAlign: 'center',
              marginBottom: '36px',
              maxWidth: '44ch',
              marginLeft: 'auto',
              marginRight: 'auto',
              ...fontSmoothing,
            }}
          >
            One place for ABA, speech, OT, and mental health — coordinated by an AI that knows your family. From finding a provider to tracking progress to navigating insurance.
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.42 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '14px',
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
                backgroundColor: TEAL,
                color: '#FFFFFF',
                fontFamily: fontStack,
                fontWeight: 600,
                fontSize: '15.5px',
                letterSpacing: '-0.008em',
                padding: '0 36px',
                height: '54px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 16px rgba(42,125,153,0.28)',
                transition: 'background-color 0.18s, box-shadow 0.18s',
                ...fontSmoothing,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = TEAL_DARK;
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(42,125,153,0.38)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = TEAL;
                e.currentTarget.style.boxShadow = '0 2px 16px rgba(42,125,153,0.28)';
              }}
            >
              Start free
              <ArrowRight style={{ width: '16px', height: '16px', strokeWidth: 2 }} />
            </button>
          </motion.div>

          {/* Trial note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.54 }}
            style={{
              textAlign: 'center',
              marginBottom: '10px',
              color: TEXT_FAINT,
              fontFamily: fontStack,
              fontSize: '12.5px',
              fontWeight: 400,
              letterSpacing: '0.005em',
              ...fontSmoothing,
            }}
          >
            7-day free trial · No credit card required
          </motion.p>

          {/* Intent pills */}
          {(onFreeScreening || onJustDiagnosed) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.60 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                padding: '0 16px',
              }}
            >
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: TEXT_FAINT,
                letterSpacing: '0.08em',
                ...fontSmoothing,
              }}>
                OR
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {onFreeScreening && (
                  <button
                    onClick={onFreeScreening}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: TEAL_LIGHT,
                      border: `1px solid ${TEAL_BORDER}`,
                      borderRadius: '999px',
                      color: TEAL,
                      fontFamily: fontStack,
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '9px 16px',
                      transition: 'all 0.16s',
                      ...fontSmoothing,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(42,125,153,0.13)';
                      e.currentTarget.style.borderColor = 'rgba(42,125,153,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = TEAL_LIGHT;
                      e.currentTarget.style.borderColor = TEAL_BORDER;
                    }}
                  >
                    <Shield style={{ width: '13px', height: '13px' }} />
                    Concerned? Free screening →
                  </button>
                )}
                {onJustDiagnosed && (
                  <button
                    onClick={onJustDiagnosed}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(19,47,67,0.04)',
                      border: '1px solid rgba(19,47,67,0.10)',
                      borderRadius: '999px',
                      color: TEXT_MUTED,
                      fontFamily: fontStack,
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '9px 16px',
                      transition: 'all 0.16s',
                      ...fontSmoothing,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(19,47,67,0.07)';
                      e.currentTarget.style.color = TEXT;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(19,47,67,0.04)';
                      e.currentTarget.style.color = TEXT_MUTED;
                    }}
                  >
                    <Clock style={{ width: '13px', height: '13px' }} />
                    Just diagnosed? First 30 Days plan →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Sign in / provider links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.68 }}
            style={{ textAlign: 'center', marginBottom: '44px' }}
          >
            {onSignIn && (
              <button
                onClick={onSignIn}
                style={{
                  background: 'none',
                  border: 'none',
                  color: TEXT_FAINT,
                  fontFamily: fontStack,
                  fontSize: '13px',
                  fontWeight: 400,
                  cursor: 'pointer',
                  padding: '8px 16px',
                  transition: 'color 0.16s',
                  ...fontSmoothing,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_FAINT; }}
              >
                Already have an account? Sign in
              </button>
            )}
            {onForProviders && (
              <div style={{ marginTop: '6px' }}>
                <button
                  onClick={onForProviders}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(42,125,153,0.65)',
                    fontFamily: fontStack,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    transition: 'color 0.16s',
                    ...fontSmoothing,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = TEAL; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(42,125,153,0.65)'; }}
                >
                  Provider pilot by invitation →
                </button>
              </div>
            )}
          </motion.div>

          {/* Trust chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0, delay: 0.80 }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {[
              'Built by Parents',
              'Backed by ABA Experts',
              'HIPAA-Conscious',
              'Private by Design',
            ].map((text) => (
              <span
                key={text}
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(42,125,153,0.08)',
                  borderRadius: '10px',
                  color: TEXT_FAINT,
                  fontFamily: fontStack,
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.005em',
                  ...fontSmoothing,
                }}
              >
                {text}
              </span>
            ))}
          </motion.div>

          {/* Value props */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0, delay: 0.95 }}
            style={{ marginTop: '44px', textAlign: 'center' }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '28px',
              }}
            >
              {[
                { Icon: Zap, text: 'Start Today', subtext: 'No waitlist' },
                { Icon: Moon, text: 'AI guidance, anytime', subtext: 'Here when you need it' },
                { Icon: CheckCircle, text: 'No Diagnosis', subtext: 'Required' },
              ].map(({ Icon, text, subtext }) => (
                <div
                  key={text}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Icon
                    style={{
                      width: '18px',
                      height: '18px',
                      color: TEAL,
                      strokeWidth: 1.8,
                    }}
                  />
                  <span
                    style={{
                      color: TEXT_MUTED,
                      fontFamily: fontStack,
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.005em',
                      ...fontSmoothing,
                    }}
                  >
                    {text}
                  </span>
                  <span
                    style={{
                      color: TEXT_FAINT,
                      fontFamily: fontStack,
                      fontSize: '12px',
                      fontWeight: 400,
                      ...fontSmoothing,
                    }}
                  >
                    {subtext}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </main>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.10 }}
        style={{
          textAlign: 'center',
          color: TEXT_FAINT,
          fontFamily: fontStack,
          fontSize: '11.5px',
          fontWeight: 400,
          letterSpacing: '0.005em',
          padding: '0 24px',
          marginTop: '24px',
          ...fontSmoothing,
        }}
      >
        Trusted by ABA providers and pediatric behavioral health families
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.15 }}
        style={{ padding: '0 24px', marginTop: '10px' }}
      >
        <MedicalDisclaimer variant="inline" className="text-center max-w-md mx-auto" />
      </motion.div>

      {/* Footer spacer */}
      <div style={{ height: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 80px))' }} />
    </div>
  );
}

export default SplashPage;
