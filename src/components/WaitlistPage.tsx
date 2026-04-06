// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Waitlist Landing Page
 * Convert interest into signups with clear value proposition
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Users,
  Sparkles,
  Clock,
  Brain,
  MessageCircle,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

interface WaitlistPageProps {
  onClose?: () => void;
}

export function WaitlistPage({ onClose }: WaitlistPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setIsSubmitting(true);

    try {
      // Store in Supabase waitlist table
      const { data, error } = await supabase
        .from('waitlist')
        .insert({ email })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.info("You're already on the list! We'll be in touch soon.");
          setIsSubmitted(true);
        } else {
          throw error;
        }
      } else {
        // Get position in line
        const { count } = await supabase
          .from('waitlist')
          .select('*', { count: 'exact', head: true });

        setPosition(count || 1);
        setIsSubmitted(true);
        toast.success('Welcome to the Aminy family!');
      }
    } catch (error) {
      console.error('Waitlist error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Brain,
      title: 'AI That Understands',
      description: 'Personalized guidance that learns your child and family',
    },
    {
      icon: Target,
      title: 'Evidence-Based Goals',
      description: 'Professional ABA strategies made accessible',
    },
    {
      icon: Clock,
      title: 'Daily Support',
      description: 'Practical tips and activities when you need them',
    },
    {
      icon: Heart,
      title: 'Parent Wellness',
      description: 'Self-care reminders because you matter too',
    },
  ];

  const testimonials = [
    {
      quote: "Finally, support that understands our daily reality.",
      author: "Sarah M.",
      role: "Mom of 2",
    },
    {
      quote: "It's like having a calm, knowledgeable friend in your pocket.",
      author: "Michael T.",
      role: "Dad of an amazing 6-year-old",
    },
    {
      quote: "The insurance help alone saved us hours of frustration.",
      author: "Lisa K.",
      role: "Parent and advocate",
    },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <Card className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              You're on the list!
            </h2>

            {position && (
              <p className="text-gray-600 mb-4">
                You're #{position} in line. We can't wait to have you.
              </p>
            )}

            <div className="bg-teal-50 rounded-xl p-4 mb-4 sm:mb-6">
              <p className="text-sm text-teal-800">
                We'll email you when it's your turn. In the meantime,
                check your inbox for a few helpful resources.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-lg">
                <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Early access perks</p>
                  <p className="text-xs text-gray-600">50% off your first year</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-lg">
                <MessageCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Shape the product</p>
                  <p className="text-xs text-gray-600">Your feedback builds what we make</p>
                </div>
              </div>
            </div>

            {onClose && (
              <Button variant="ghost" onClick={onClose} className="mt-4 sm:mt-6">
                Close
              </Button>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white">
      {/* Hero Section */}
      <section className="pt-12 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="bg-teal-100 text-teal-800 mb-4 sm:mb-6">
              Coming Soon
            </Badge>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              Gentle guidance for
              <br />
              <span className="text-teal-600">calmer parenting days</span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-xl mx-auto">
              Aminy is your AI companion for navigating autism support—personalized
              strategies, insurance help, and daily wins all in one place.
            </p>
          </motion.div>

          {/* Email Signup */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Join waitlist
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.form>

          <p className="text-sm text-gray-500 mt-4">
            Join 2,400+ families. No spam, ever.
          </p>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-12">
            What makes Aminy different
          </h2>

          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">
                    {benefit.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-12">
            Families like yours are waiting
          </h2>

          <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="p-6 h-full">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <p className="font-medium text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-5 h-5 text-teal-600" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-5 h-5 text-teal-600" />
              <span>BCBA Advised</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Heart className="w-5 h-5 text-teal-600" />
              <span>Parent-Founded</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Zap className="w-5 h-5 text-teal-600" />
              <span>HSA/FSA Eligible</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-teal-600 to-teal-700 text-white">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to start your journey?
          </h2>
          <p className="text-teal-100 mb-8">
            Join thousands of families finding calm in the chaos.
            Early access members get 50% off their first year.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-teal-700 hover:bg-teal-50 px-6 py-3 rounded-xl font-medium"
            >
              {isSubmitting ? 'Joining...' : 'Get early access'}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-4xl mx-auto text-center text-sm">
          <p>© {new Date().getFullYear()} Aminy, LLC All rights reserved.</p>
          <p className="mt-2">
            Aminy is an AI companion, not a replacement for professional therapy or medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default WaitlistPage;
