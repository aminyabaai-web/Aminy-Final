// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Wow Moment Components
 * Creates instant emotional connection in the first 60 seconds
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Star,
  Quote,
  Sparkles,
  ArrowRight,
  Play,
  Check,
  MessageCircle,
  Users,
  Brain,
  Shield,
  Clock,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { Button } from './ui/button';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

// Parent testimonials that hit emotional core
const TESTIMONIALS = [
  {
    quote: "For the first time in 3 years, mornings don't feel like a battle.",
    parent: "Sarah M.",
    childAge: "Mom of 5-year-old with autism",
    highlight: "mornings don't feel like a battle",
  },
  {
    quote: "Aminy understood my son better in 10 minutes than doctors did in years.",
    parent: "Marcus T.",
    childAge: "Dad of 7-year-old with ADHD",
    highlight: "understood my son better",
  },
  {
    quote: "I finally feel like I'm not doing this alone. Aminy is like having an expert on call 24/7.",
    parent: "Jennifer L.",
    childAge: "Mom of twins with sensory processing",
    highlight: "not doing this alone",
  },
  {
    quote: "The meltdowns have decreased by 80%. I didn't think that was possible.",
    parent: "David K.",
    childAge: "Dad of 4-year-old with anxiety",
    highlight: "decreased by 80%",
  },
];

// Quick transformation stats
const TRANSFORMATION_STATS = [
  { value: "73%", label: "reduction in daily meltdowns", icon: Heart },
  { value: "2.3x", label: "faster progress on goals", icon: Zap },
  { value: "89%", label: "of parents feel less alone", icon: Users },
  { value: "24/7", label: "expert guidance available", icon: Clock },
];

// The "aha" moments that hook users
const AHA_MOMENTS = [
  {
    before: "I don't know why my child melts down at dinner",
    after: "Aminy helped me see it was the fluorescent lights. One change = peaceful meals.",
  },
  {
    before: "I spend hours researching every symptom",
    after: "Aminy knows my child and gives personalized answers in seconds.",
  },
  {
    before: "I feel guilty I'm not doing enough",
    after: "Aminy celebrates the small wins and reminds me I'm doing great.",
  },
  {
    before: "I'm exhausted explaining my child's needs",
    after: "Aminy generates letters for schools and doctors in one click.",
  },
];

interface WowHeroProps {
  onGetStarted: () => void;
  variant?: 'emotional' | 'transformation' | 'testimonial';
}

/**
 * Emotional hook hero section
 */
export function WowHero({ onGetStarted, variant = 'emotional' }: WowHeroProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-accent/5 to-white">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-rose-100/50 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-4 py-12 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          {/* Emotional hook headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-primary mb-4 leading-tight">
              You're not alone.
              <br />
              <span className="text-accent">And you don't have to figure this out yourself.</span>
            </h1>
          </motion.div>

          {/* Empathy statement */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-8"
          >
            Raising a neurodivergent child is exhausting. The research. The appointments.
            The guilt. <span className="font-semibold text-primary">What if you had an expert in your pocket who actually knows your child?</span>
          </motion.p>

          {/* Rotating testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-accent/10"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center"
              >
                <Quote className="w-8 h-8 text-accent/30 mb-3" />
                <p className="text-lg md:text-xl font-medium text-primary mb-4 italic">
                  "{TESTIMONIALS[currentTestimonial].quote}"
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-semibold">{TESTIMONIALS[currentTestimonial].parent}</span>
                  {" — "}
                  {TESTIMONIALS[currentTestimonial].childAge}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Testimonial dots */}
            <div className="flex justify-center gap-2 mt-4">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === currentTestimonial ? "bg-accent w-6" : "bg-gray-300"
                  )}
                />
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Button
              onClick={() => {
                triggerHaptic('medium');
                onGetStarted();
              }}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              See How Aminy Helps
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Free to try. No credit card needed.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ChevronDown className="w-6 h-6 text-accent/50" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * Before/After transformation section
 */
export function TransformationSection() {
  return (
    <div className="py-16 px-4 bg-[#FAF7F2]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-2xl sm:text-3xl font-bold text-center text-primary mb-4">
          Life Before vs. After Aminy
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
          Real transformations from parents just like you
        </p>

        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          {AHA_MOMENTS.map((moment, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="grid md:grid-cols-2">
                {/* Before */}
                <div className="p-6 border-b md:border-b-0 md:border-r border-[#E8E4DF]">
                  <div className="flex items-center gap-2 text-rose-500 mb-3">
                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                      <span className="text-xs font-bold">X</span>
                    </div>
                    <span className="text-sm font-medium">BEFORE</span>
                  </div>
                  <p className="text-muted-foreground italic">"{moment.before}"</p>
                </div>

                {/* After */}
                <div className="p-6 bg-accent/5">
                  <div className="flex items-center gap-2 text-accent mb-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium">AFTER</span>
                  </div>
                  <p className="text-primary font-medium">{moment.after}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Stats section showing transformation results
 */
export function StatsSection() {
  return (
    <div className="py-16 px-4 bg-gradient-to-b from-white to-accent/5">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-2xl sm:text-3xl font-bold text-center text-primary mb-12">
          Real Results for Real Families
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 sm:gap-6">
          {TRANSFORMATION_STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 bg-white rounded-xl shadow-sm"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-accent" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive demo teaser - shows AI capability preview
 */
export function DemoTeaser({ onTryDemo }: { onTryDemo?: () => void }) {
  const [showDemo, setShowDemo] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const demoMessage = "My 5-year-old has meltdowns every morning before school. I've tried everything. What should I do?";
  const demoResponse = "I understand how exhausting morning meltdowns can be. Based on what you've shared, let me suggest 3 things you can try TODAY:\n\n1. **Visual Schedule** - Show your child exactly what's happening next\n2. **Transition Warning** - Give 5-minute warnings before changes\n3. **Sensory Check** - Is there something overwhelming about mornings? (lights, sounds, textures?)\n\nWhich of these resonates most? I can walk you through implementing it step by step.";

  useEffect(() => {
    if (showDemo && typedMessage.length < demoMessage.length) {
      const timeout = setTimeout(() => {
        setTypedMessage(demoMessage.slice(0, typedMessage.length + 1));
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [showDemo, typedMessage]);

  return (
    <div className="py-16 px-4 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-2xl sm:text-3xl font-bold text-primary mb-4">
            See Aminy in Action
          </h2>
          <p className="text-muted-foreground">
            Watch how Aminy provides personalized, expert guidance instantly
          </p>
        </div>

        {/* Demo preview */}
        <div className="bg-[#FAF7F2] rounded-2xl p-6 shadow-inner">
          {!showDemo ? (
            <motion.button
              onClick={() => {
                triggerHaptic('medium');
                setShowDemo(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-12 flex flex-col items-center gap-3 sm:gap-4 text-accent hover:text-accent/80 transition-colors"
            >
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 fill-current" />
              </div>
              <span className="font-semibold text-lg">Watch Demo</span>
            </motion.button>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-accent text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                  <p className="text-sm">{typedMessage}<span className="animate-pulse">|</span></p>
                </div>
              </div>

              {/* AI response */}
              {typedMessage.length >= demoMessage.length && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-[#E8E4DF] px-4 py-3 rounded-2xl rounded-bl-md max-w-[90%] shadow-sm">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#E8E4DF]">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold text-accent">Aminy</span>
                    </div>
                    <p className="text-sm text-primary whitespace-pre-line">{demoResponse}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {showDemo && typedMessage.length >= demoMessage.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4 sm:mt-6"
          >
            <Button
              onClick={() => {
                triggerHaptic('medium');
                onTryDemo?.();
              }}
              className="bg-accent hover:bg-accent/90"
            >
              Try It With Your Child's Situation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * Trust signals strip
 */
export function TrustStrip() {
  return (
    <div className="bg-accent/5 py-6 px-4">
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center items-center gap-3 sm:gap-4 sm:gap-6 md:gap-12">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-5 h-5 text-accent" />
          <span className="font-medium text-primary">HIPAA Conscious</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Brain className="w-5 h-5 text-accent" />
          <span className="font-medium text-primary">Designed with BCBAs</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-5 h-5 text-accent" />
          <span className="font-medium text-primary">10,000+ Families</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Heart className="w-5 h-5 text-accent" />
          <span className="font-medium text-primary">4.9 Star Rating</span>
        </div>
      </div>
    </div>
  );
}

export default {
  WowHero,
  TransformationSection,
  StatsSection,
  DemoTeaser,
  TrustStrip,
};
