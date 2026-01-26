import React from 'react';
import { Button } from './ui/button';
import { CalendarCheck, Sparkles, BarChart3, ArrowRight, Shield, Users, GraduationCap } from 'lucide-react';
import aminyLogo from 'figma:asset/6ee92f0834f42dd340e530208a75e78f1e485b26.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SplashScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function SplashScreen({ onGetStarted, onLogin }: SplashScreenProps) {
  const [showBottomNav, setShowBottomNav] = React.useState(false);
  
  React.useEffect(() => {
    // Show bottom nav after 1500ms or on first scroll
    const timer = setTimeout(() => setShowBottomNav(true), 1500);
    
    const handleScroll = () => {
      if (!showBottomNav) {
        setShowBottomNav(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showBottomNav]);

  return (
    <div 
      className="min-h-screen bg-white overflow-hidden" 
      role="main"
      aria-label="Aminy welcome page"
      style={{ 
        minHeight: '100vh',
        maxHeight: '100vh',
        willChange: 'auto',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >
      {/* AI Companion Welcome Strip */}
      <div className="bg-gradient-to-r from-accent/5 via-accent/8 to-accent/5 border-b border-accent/10" role="banner">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="flex-shrink-0" aria-hidden="true">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[14px] sm:text-[15px] leading-[20px] sm:leading-[22px] text-slate-700 font-medium text-center">
              Powered by adaptive AI and grounded in ABA behavioral science.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div 
        className="splash-screen-hero px-4 pt-8 pb-0 sm:px-6 sm:pt-12 sm:pb-20 lg:px-12 overflow-y-auto"
        style={{
          willChange: 'auto',
          maxHeight: 'calc(100vh - 60px)',
          contain: 'layout style'
        }}
      >
        <div className="max-w-4xl mx-auto text-center" style={{ contain: 'layout' }}>
          
          {/* Logo - CRITICAL LCP ELEMENT - Render IMMEDIATELY with fixed dimensions */}
          <div style={{ 
            paddingTop: '40px', 
            marginBottom: '14px', 
            minHeight: '120px',
            contain: 'layout',
            willChange: 'auto'
          }}>
            <div 
              style={{ 
                position: 'relative',
                width: '320px',
                maxWidth: '72%',
                height: '90px',
                margin: '0 auto',
                display: 'block',
                contain: 'layout',
                willChange: 'auto'
              }}
              className="sm:w-[400px] sm:h-[112px] sm:max-w-[85%]"
            >
              <ImageWithFallback 
                src={aminyLogo}
                alt="Aminy - Gentle guidance. Meaningful progress."
                width="320"
                height="90"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                  maxWidth: '100%',
                  contain: 'size layout'
                }}
              />
            </div>
          </div>

          {/* Main Headline - Exact 12-16px spacing after logo */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-[36px] leading-[44px] sm:text-[40px] sm:leading-[48px] md:text-[44px] md:leading-[52px] lg:text-[48px] lg:leading-[56px] text-slate-900 font-semibold tracking-tight px-2 mb-4">
              Finally, calm that works.
            </h1>
            {/* Description - Exact 8-12px after headline */}
            <p className="text-[17px] leading-[26px] sm:text-[18px] sm:leading-[28px] text-slate-600 max-w-2xl mx-auto font-normal px-4 mb-2">
              Aminy uses proven ABA principles and adaptive AI to make family life easier — one calm routine at a time.
            </p>
            {/* Tagline - Gentle visual separation with refined hierarchy */}
            <p className="text-[14px] leading-[20px] sm:text-[15px] sm:leading-[22px] text-slate-500 max-w-2xl mx-auto px-4 mt-4 tracking-wide" style={{ fontWeight: 500 }}>
              Guided by AI. Grounded in ABA. Built for Family Life.
            </p>
          </div>

          {/* CTA Buttons - MOBILE: Right after subhead with 16-20px spacing, nudged up 8px */}
          <div className="flex flex-col gap-0 justify-center items-center mb-4 px-4 sm:hidden" style={{ marginTop: '-8px' }}>
            <Button 
              onClick={onGetStarted}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-white px-8 py-3.5 text-[16px] leading-[20px] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 min-w-[280px] h-[52px]"
              aria-label="Start your 7-day free trial - no credit card needed"
            >
              Start Your 7-Day Free Trial
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
            {/* Trial subtext - below CTA button */}
            <p className="text-xs text-slate-600 text-center max-w-[280px] mt-3">
              No credit card needed. Cancel anytime during your trial.
            </p>
          </div>

          {/* Login Link - MOBILE: Right after CTA */}
          <div className="mb-16 px-4 sm:hidden">
            <button
              onClick={onLogin}
              className="text-slate-600 hover:text-slate-900 transition-colors text-[15px] leading-[20px] font-medium min-h-[44px] flex items-center justify-center w-full"
              aria-label="Sign in to your existing account"
            >
              Already have an account? <span className="text-accent hover:text-accent/80 underline underline-offset-2 ml-1">Sign in</span>
            </button>
          </div>

          {/* Features Grid - MOBILE: Below the fold, DESKTOP: After description */}
          <div 
            className="splash-feature-grid grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 mb-10 sm:mb-16 px-2"
            role="region"
            aria-label="Key features"
          >
            {/* Feature 1 */}
            <div className="text-center group px-4 py-2" style={{ contain: 'layout', minHeight: '200px' }}>
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:bg-accent/15 transition-colors duration-200" aria-hidden="true">
                <CalendarCheck className="w-7 h-7 sm:w-8 sm:h-8 text-accent" strokeWidth={1.75} />
              </div>
              <h3 className="text-[17px] leading-[22px] sm:text-[18px] sm:leading-[24px] text-slate-900 mb-2 font-semibold">Calm & Predictability</h3>
              <p className="text-[12px] leading-[16px] text-slate-500 mb-2 tracking-wide font-medium">(Parent Mode)</p>
              <p className="text-[15px] leading-[22px] sm:text-[15px] sm:leading-[22px] text-slate-600">ABA-based routines that reduce stress through daily structure</p>
            </div>

            {/* Feature 2 */}
            <div className="text-center group px-4 py-2" style={{ contain: 'layout', minHeight: '200px' }}>
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:bg-accent/15 transition-colors duration-200" aria-hidden="true">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-accent" strokeWidth={1.75} />
              </div>
              <h3 className="text-[17px] leading-[22px] sm:text-[18px] sm:leading-[24px] text-slate-900 mb-2 font-semibold">Connection & Confidence</h3>
              <p className="text-[12px] leading-[16px] text-slate-500 mb-2 tracking-wide font-medium">(Child Mode)</p>
              <p className="text-[15px] leading-[22px] sm:text-[15px] sm:leading-[22px] text-slate-600">Gentle practice that empowers parents and celebrates progress</p>
            </div>

            {/* Feature 3 */}
            <div className="text-center group px-4 py-2" style={{ contain: 'layout', minHeight: '200px' }}>
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 group-hover:bg-accent/15 transition-colors duration-200" aria-hidden="true">
                <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-accent" strokeWidth={1.75} />
              </div>
              <h3 className="text-[17px] leading-[22px] sm:text-[18px] sm:leading-[24px] text-slate-900 mb-2 font-semibold">Science & Simplicity</h3>
              <p className="text-[12px] leading-[16px] text-slate-500 mb-2 tracking-wide font-medium">(Sharing & Reports)</p>
              <p className="text-[15px] leading-[22px] sm:text-[15px] sm:leading-[22px] text-slate-600">Track progress with behavioral insights, no clinical jargon</p>
            </div>
          </div>

          {/* CTA Buttons - DESKTOP: After features */}
          <div className="hidden sm:flex flex-col gap-0 justify-center items-center mb-8 sm:mb-12 px-4">
            <Button 
              onClick={onGetStarted}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-white px-8 sm:px-10 py-4 sm:py-4 text-[16px] leading-[20px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-w-[280px] sm:min-w-[320px] h-[52px] sm:h-[56px]"
              aria-label="Start your 7-day free trial - no credit card needed"
            >
              Start Your 7-Day Free Trial
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" aria-hidden="true" />
            </Button>
            {/* Trial subtext - below CTA button */}
            <p className="text-xs text-slate-600 text-center max-w-[320px] mt-3">
              No credit card needed. Cancel anytime during your trial.
            </p>
          </div>

          {/* Login Link - DESKTOP: After CTA */}
          <div className="hidden sm:block mb-10 sm:mb-16 px-4">
            <button
              onClick={onLogin}
              className="text-slate-600 hover:text-slate-900 transition-colors text-[15px] leading-[20px] sm:text-[16px] sm:leading-[22px] font-medium min-h-[44px] flex items-center justify-center mx-auto"
              aria-label="Sign in to your existing account"
            >
              Already have an account? <span className="text-accent hover:text-accent/80 underline underline-offset-2 ml-1">Sign in</span>
            </button>
          </div>

          {/* Trust Badges with bottom safe-area padding and fade-in animation */}
          <div 
            className={`flex justify-center pb-[max(env(safe-area-inset-bottom),28px)] sm:pb-0 transition-opacity duration-300 ${showBottomNav ? 'opacity-100' : 'opacity-0'}`} 
            role="region" 
            aria-label="Trust indicators" 
            style={{ 
              contain: 'layout', 
              minHeight: '60px',
              paddingBottom: 'calc(max(env(safe-area-inset-bottom), 28px) + 64px)' // Extra padding for bottom icons
            }}
          >
            {/* Desktop Layout - Single Row */}
            <div className="hidden md:flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <Users className="w-4 h-4" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium" style={{ color: '#2E3B4E', fontSize: '14px', letterSpacing: '0.2px' }}>Parent-tested</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <Shield className="w-4 h-4" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium" style={{ color: '#2E3B4E', fontSize: '14px', letterSpacing: '0.2px' }}>HIPAA-conscious</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <GraduationCap className="w-4 h-4" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium" style={{ color: '#2E3B4E', fontSize: '14px', letterSpacing: '0.2px' }}>Designed with BCBAs</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <Sparkles className="w-4 h-4" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium" style={{ color: '#2E3B4E', fontSize: '14px', letterSpacing: '0.2px' }}>AI-powered</span>
              </div>
            </div>
            
            {/* Mobile Layout - 2×2 Grid */}
            <div className="md:hidden grid grid-cols-2 gap-x-3 gap-y-4 max-w-sm mx-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <Users className="w-3 h-3" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium text-xs" style={{ color: '#2E3B4E' }}>Parent-tested</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <Shield className="w-3 h-3" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium text-xs" style={{ color: '#2E3B4E' }}>HIPAA-conscious</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <GraduationCap className="w-3 h-3" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium text-xs" style={{ color: '#2E3B4E' }}>Designed with BCBAs</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-full">
                <Sparkles className="w-3 h-3" style={{ color: '#90A3B3' }} aria-hidden="true" />
                <span className="font-medium text-xs" style={{ color: '#2E3B4E' }}>AI-powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
