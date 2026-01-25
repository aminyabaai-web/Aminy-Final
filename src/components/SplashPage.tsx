/**
 * SplashPage - Calm / Apple / Premium
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import aminyLogoCropped from "../assets/aminy-logo-cropped.png";

interface SplashPageProps {
  onStartTrial: () => void;
  onWatchDemo?: () => void;
  onStartReflection?: () => void;
  onSignIn?: () => void;
}

const fontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const fontSmoothing: React.CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
} as React.CSSProperties;

export function SplashPage({
  onStartTrial,
  onSignIn
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
                fontSize: '10px',
                fontWeight: 450,
                letterSpacing: '0.015em',
                ...fontSmoothing,
              }}
            >
              Powered by Adaptive AI · Grounded in ABA Science
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
            Your AI companion for raising<br />
            a neurodivergent child.
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
            ABA-informed strategies, expert provider network, all in one place. Get started in 12 weeks or less.
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
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#5a7380',
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
                e.currentTarget.style.backgroundColor = '#4f6872';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#5a7380';
              }}
            >
              Begin calmly
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
              marginBottom: '20px',
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
                  fontSize: '10px',
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
                { icon: '🌙', text: '24/7 Support', subtext: 'Always there' },
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
                      fontSize: '11px',
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
                      fontSize: '10px',
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

      {/* Footer spacer */}
      <div style={{ height: '40px' }} />
    </div>
  );
}

export default SplashPage;
