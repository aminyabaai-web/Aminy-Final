// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.

/**
 * SplashPage — Aminy Design System · marketing landing
 * "AI companion · TeleABA · Always There"
 * Teal #2A7D99 · Schibsted Grotesk · Mist background
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, Brain, Video, Zap, Shield,
  Star, Clock, CheckCircle, HeartHandshake,
} from 'lucide-react';
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

const fontStack = "'Schibsted Grotesk', 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const smooth: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

const TEAL       = '#2A7D99';
const TEAL_DARK  = '#1F6080';
const TEAL_BG    = 'rgba(42,125,153,0.08)';
const TEAL_BD    = 'rgba(42,125,153,0.20)';
const INK        = '#132F43';
const TEXT       = 'rgba(19,47,67,0.90)';
const MUTED      = 'rgba(19,47,67,0.52)';
const FAINT      = 'rgba(19,47,67,0.36)';

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
    document.title = "Aminy — The AI Companion for Neurodivergent Families";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'Your AI companion for the neurodivergent journey — ABA guidance, board-certified TeleABA, and 24/7 support that knows your child.');
  }, []);

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col"
      style={{ background: 'linear-gradient(175deg, #F6FBFB 0%, #EAF3F7 55%, #E4EFF5 100%)', fontFamily: fontStack, ...smooth }}
    >
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav
        aria-label="Primary"
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          backgroundColor: 'rgba(246,251,251,0.90)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(42,125,153,0.07)',
        }}
      >
        <div style={{ display: 'flex', maxWidth: '980px', margin: '0 auto', padding: '14px 24px', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={aminyLogoCropped} alt="Aminy" style={{ height: '26px', width: 'auto', objectFit: 'contain' }} />

          <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '2px' }}>
            {([
              ['For families',   onFreeScreening || onStartTrial],
              ['For providers',  onForProviders],
              ['TeleABA',        onTeleABA],
              ['Pricing',        onPricing],
            ] as [string, (() => void) | undefined][]).map(([label, fn]) => (
              <button
                key={label}
                onClick={fn ?? undefined}
                style={{
                  border: 'none', background: 'transparent', color: MUTED,
                  fontFamily: fontStack, fontSize: '13px', fontWeight: 500,
                  cursor: fn ? 'pointer' : 'default',
                  padding: '7px 11px', borderRadius: '9px', transition: 'color 0.14s, background 0.14s',
                  ...smooth,
                }}
                onMouseEnter={e => { if (fn) { e.currentTarget.style.color = TEXT; e.currentTarget.style.background = TEAL_BG; } }}
                onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent'; }}
              >{label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onSignIn && (
              <button onClick={onSignIn} className="action-button" style={{ border: `1px solid rgba(42,125,153,0.18)`, background: 'rgba(255,255,255,0.80)', color: TEXT, fontFamily: fontStack, fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px 15px', borderRadius: '9px', transition: 'border-color 0.14s', ...smooth }}
                onMouseEnter={e => e.currentTarget.style.borderColor = TEAL_BD}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(42,125,153,0.18)'}>
                Sign in
              </button>
            )}
            <button onClick={onStartTrial} className="action-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: TEAL, color: '#fff', fontFamily: fontStack, fontWeight: 700, fontSize: '13px', padding: '8px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(42,125,153,0.30)', transition: 'all 0.14s', ...smooth }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK; e.currentTarget.style.boxShadow = '0 4px 20px rgba(42,125,153,0.40)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL; e.currentTarget.style.boxShadow = '0 2px 12px rgba(42,125,153,0.30)'; }}>
              Start free <ArrowRight style={{ width: '12px', height: '12px', strokeWidth: 2.5 }} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-5 sm:px-8" style={{ paddingTop: 'clamp(48px, 10vh, 96px)', paddingBottom: '48px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '660px', margin: '0 auto' }}>

          {/* Eyebrow */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            style={{ textAlign: 'center', marginBottom: '26px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', backgroundColor: TEAL_BG, border: `1px solid ${TEAL_BD}`, borderRadius: '999px', color: TEAL, fontFamily: fontStack, fontSize: '12px', fontWeight: 700, letterSpacing: '0.01em', ...smooth }}>
              <Star style={{ width: '11px', height: '11px', fill: TEAL, color: TEAL }} />
              AI Companion · Board-Certified TeleABA · Always There
            </span>
          </motion.div>

          {/* Logo */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.06, ease: [0.16,1,0.3,1] }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
            <img src={aminyLogoCropped} alt="Aminy — Gentle Guidance. Meaningful Progress." style={{ width: 'min(52vw, 210px)', aspectRatio: '827/338', objectFit: 'contain' }} />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.14 }}
            style={{ color: INK, fontFamily: fontStack, fontWeight: 800, fontSize: 'clamp(1.9rem, 6vw, 2.4rem)', lineHeight: 1.18, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: '18px', ...smooth }}>
            The calm center of<br />your child's care.
          </motion.h1>

          {/* Power subheadline */}
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.24 }}
            style={{ color: MUTED, fontFamily: fontStack, fontWeight: 400, fontSize: '15.5px', lineHeight: 1.65, letterSpacing: '-0.005em', textAlign: 'center', marginBottom: '32px', maxWidth: '46ch', marginLeft: 'auto', marginRight: 'auto', ...smooth }}>
            An AI that knows your child's goals, behaviors, and wins —
            available at 3am when you need it, connecting you to
            board-certified BCBAs in minutes, and navigating insurance
            so you can focus on what matters.{' '}
            <strong style={{ color: TEXT, fontWeight: 600 }}>
              This is what modern neurodivergent family care looks like.
            </strong>
          </motion.p>

          {/* Primary CTA */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.34 }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <button
              onClick={onStartTrial}
              className="action-button"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: TEAL, color: '#fff', fontFamily: fontStack, fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em', padding: '0 40px', height: '56px', borderRadius: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 3px 20px rgba(42,125,153,0.32)', transition: 'all 0.16s', ...smooth }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = TEAL_DARK; e.currentTarget.style.boxShadow = '0 6px 28px rgba(42,125,153,0.42)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = TEAL; e.currentTarget.style.boxShadow = '0 3px 20px rgba(42,125,153,0.32)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              Start your free trial
              <ArrowRight style={{ width: '16px', height: '16px', strokeWidth: 2.2 }} />
            </button>
          </motion.div>

          {/* Trial note */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.46 }}
            style={{ textAlign: 'center', marginBottom: '8px', color: FAINT, fontFamily: fontStack, fontSize: '12.5px', fontWeight: 400, letterSpacing: '0.005em', ...smooth }}>
            7-day free trial · No credit card required
          </motion.p>

          {/* Intent pills */}
          {(onFreeScreening || onJustDiagnosed) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.52 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px', marginBottom: '20px', padding: '0 16px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: FAINT, letterSpacing: '0.08em', ...smooth }}>OR START HERE</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {onFreeScreening && (
                  <button onClick={onFreeScreening}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: TEAL_BG, border: `1px solid ${TEAL_BD}`, borderRadius: '999px', color: TEAL, fontFamily: fontStack, fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '9px 16px', transition: 'all 0.14s', ...smooth }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42,125,153,0.14)'; e.currentTarget.style.borderColor = 'rgba(42,125,153,0.38)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = TEAL_BG; e.currentTarget.style.borderColor = TEAL_BD; }}>
                    <Shield style={{ width: '13px', height: '13px' }} />
                    Concerned? Free screening →
                  </button>
                )}
                {onJustDiagnosed && (
                  <button onClick={onJustDiagnosed}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(19,47,67,0.04)', border: '1px solid rgba(19,47,67,0.11)', borderRadius: '999px', color: MUTED, fontFamily: fontStack, fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '9px 16px', transition: 'all 0.14s', ...smooth }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(19,47,67,0.08)'; e.currentTarget.style.color = TEXT; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(19,47,67,0.04)'; e.currentTarget.style.color = MUTED; }}>
                    <Clock style={{ width: '13px', height: '13px' }} />
                    Just diagnosed? First 30 Days plan →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Sign in / provider */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.58 }}
            style={{ textAlign: 'center', marginBottom: '52px' }}>
            {onSignIn && (
              <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: FAINT, fontFamily: fontStack, fontSize: '13px', fontWeight: 400, cursor: 'pointer', padding: '8px 16px', transition: 'color 0.14s', ...smooth }}
                onMouseEnter={e => e.currentTarget.style.color = MUTED}
                onMouseLeave={e => e.currentTarget.style.color = FAINT}>
                Already have an account? Sign in
              </button>
            )}
            {onForProviders && (
              <div style={{ marginTop: '5px' }}>
                <button onClick={onForProviders} style={{ background: 'none', border: 'none', color: 'rgba(42,125,153,0.60)', fontFamily: fontStack, fontSize: '12px', fontWeight: 500, cursor: 'pointer', padding: '5px 12px', transition: 'color 0.14s', ...smooth }}
                  onMouseEnter={e => e.currentTarget.style.color = TEAL}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(42,125,153,0.60)'}>
                  Provider pilot by invitation →
                </button>
              </div>
            )}
          </motion.div>

          {/* ── AI Feature Grid ────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.66 }}>
            <p style={{ textAlign: 'center', fontFamily: fontStack, fontSize: '11px', fontWeight: 700, color: FAINT, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '16px', ...smooth }}>
              What Aminy does for your family
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                {
                  Icon: Brain,
                  color: '#2A7D99',
                  bg: 'rgba(42,125,153,0.07)',
                  title: 'AI that knows YOUR child',
                  body: 'Personalized behavioral guidance from an AI trained on ABA — updated with every session, behavior, and win.',
                },
                {
                  Icon: Video,
                  color: '#1B6B8A',
                  bg: 'rgba(27,107,138,0.07)',
                  title: 'TeleABA on demand',
                  body: 'Board-certified BCBAs without a 6-month waitlist. Start your first session this week, not next year.',
                },
                {
                  Icon: Zap,
                  color: '#E07A5F',
                  bg: 'rgba(224,122,95,0.07)',
                  title: '24/7 AI companion',
                  body: "2am meltdown? Behavior question? Your AI expert never sleeps, never judges, and always knows your child's history.",
                },
                {
                  Icon: HeartHandshake,
                  color: '#43AA8B',
                  bg: 'rgba(67,170,139,0.07)',
                  title: 'Caregiver empowerment',
                  body: "You're the expert on your child. Aminy gives you the clinical tools, language, and data to advocate like a pro.",
                },
              ].map(({ Icon, color, bg, title, body }) => (
                <div
                  key={title}
                  style={{
                    background: bg,
                    border: `1px solid ${color}22`,
                    borderRadius: '14px',
                    padding: '16px',
                    transition: 'box-shadow 0.16s, transform 0.16s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${color}22`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <Icon style={{ width: '20px', height: '20px', color, marginBottom: '8px', strokeWidth: 1.8 }} />
                  <div style={{ fontFamily: fontStack, fontSize: '13.5px', fontWeight: 700, color: TEXT, marginBottom: '5px', ...smooth }}>{title}</div>
                  <div style={{ fontFamily: fontStack, fontSize: '12px', fontWeight: 400, color: MUTED, lineHeight: 1.55, ...smooth }}>{body}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── "Trusted by families dealing with:" ────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.82 }}
            style={{ marginTop: '36px', textAlign: 'center' }}>
            <p style={{ fontFamily: fontStack, fontSize: '11px', fontWeight: 700, color: FAINT, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '12px', ...smooth }}>
              Trusted by families navigating
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '7px' }}>
              {['Autism · ASD', 'ADHD', 'Sensory Processing', 'Speech Delays', 'Anxiety', 'Apraxia', 'Down Syndrome', 'Developmental Delays'].map(c => (
                <span key={c} style={{ display: 'inline-block', padding: '4px 11px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(42,125,153,0.10)', borderRadius: '9px', color: MUTED, fontFamily: fontStack, fontSize: '12px', fontWeight: 500, ...smooth }}>{c}</span>
              ))}
            </div>
          </motion.div>

          {/* ── Trust chips ─────────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.94 }}
            style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '7px', marginTop: '28px' }}>
            {[
              { Icon: CheckCircle, text: 'ABA-Grounded' },
              { Icon: Shield,      text: 'HIPAA-Conscious' },
              { Icon: HeartHandshake, text: 'Built by Parents' },
              { Icon: Star,        text: 'Backed by ABA Experts' },
            ].map(({ Icon, text }) => (
              <span key={text} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 11px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(42,125,153,0.08)', borderRadius: '9px', color: FAINT, fontFamily: fontStack, fontSize: '12px', fontWeight: 500, ...smooth }}>
                <Icon style={{ width: '11px', height: '11px', color: TEAL }} />
                {text}
              </span>
            ))}
          </motion.div>

        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 1.05 }}
        style={{ textAlign: 'center', color: FAINT, fontFamily: fontStack, fontSize: '11.5px', fontWeight: 400, letterSpacing: '0.005em', padding: '0 24px', marginTop: '20px', ...smooth }}>
        Trusted by ABA providers and pediatric behavioral health families across the country
      </motion.p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 1.08 }}
        style={{ padding: '0 24px', marginTop: '8px' }}>
        <MedicalDisclaimer variant="inline" className="text-center max-w-md mx-auto" />
      </motion.div>

      <div style={{ height: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 80px))' }} />
    </div>
  );
}

export default SplashPage;
