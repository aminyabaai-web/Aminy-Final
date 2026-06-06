// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileNavigationEnhancerProps {
  activeTab: string;
  onNavigate: (destination: string) => void;
  userTier: string;
  className?: string;
}

export const MobileNavigationEnhancer: React.FC<MobileNavigationEnhancerProps> = ({
  activeTab,
  onNavigate,
  userTier,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Navigation items with enhanced mobile optimization
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 2.5 : 2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      route: 'home'
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'plan' ? 2.5 : 2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      route: 'plan'
    },
    {
      id: 'care',
      label: 'Care',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'care' ? 2.5 : 2} 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      route: 'care'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'reports' ? 2.5 : 2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      route: 'reports'
    },
    {
      id: 'more',
      label: 'More',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'more' ? 2.5 : 2} 
                d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      route: 'more'
    }
  ];

  // Auto-hide navigation on scroll (mobile UX pattern)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Check if user is at the bottom
      setIsAtBottom((windowHeight + currentScrollY) >= (documentHeight - 100));
      
      // Hide/show navigation based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY < 50) {
        // Scrolling up or near top
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    // Throttle scroll events for performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [lastScrollY]);

  const handleNavClick = (route: string) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    
    onNavigate(route);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`
            fixed bottom-0 left-0 right-0 z-50 
            bg-white/95 backdrop-blur-md border-t border-[#E8E4DF]/80
            ${className}
          `}
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
            boxShadow: '0 -2px 20px rgba(0, 0, 0, 0.06), 0 -1px 4px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div className="flex items-center justify-around px-2 pt-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavClick(item.route)}
                  className={`
                    relative flex flex-col items-center justify-center min-h-[56px] px-3 py-2
                    rounded-xl transition-all duration-200 ease-out
                    ${isActive 
                      ? 'text-accent bg-accent/10' 
                      : 'text-[#5A6B7A] hover:text-[#1B2733] hover:bg-[#FAF7F2]'
                    }
                  `}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    minWidth: '60px',
                    WebkitTapHighlightColor: 'rgba(8, 145, 178, 0.2)'
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-accent/10 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon */}
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.1 : 1,
                      color: isActive ? 'var(--accent)' : 'currentColor'
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="relative z-10 mb-1"
                  >
                    {item.icon}
                  </motion.div>
                  
                  {/* Label */}
                  <span className={`
                    relative z-10 text-xs font-medium leading-tight
                    ${isActive ? 'text-accent' : 'text-inherit'}
                  `}>
                    {item.label}
                  </span>
                  
                  {/* Tier badge for special features */}
                  {item.id === 'care' && userTier === 'pro' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Bottom indicator for swipe gesture */}
          <div className="flex justify-center pt-1 pb-1">
            <div className="w-8 h-1 bg-gray-300 rounded-full opacity-50" />
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default MobileNavigationEnhancer;