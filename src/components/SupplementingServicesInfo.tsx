/**
 * Supplementing Services Information
 * Explains how Aminy complements (not replaces) professional therapy
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  CheckCircle,
  Users,
  Clock,
  Calendar,
  MessageCircle,
  Target,
  Shield,
  ArrowRight,
  Sparkles,
  Brain,
  BookOpen,
  Home,
  AlertCircle,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface SupplementingServicesInfoProps {
  onLearnMore?: () => void;
  variant?: 'full' | 'compact' | 'modal';
}

export function SupplementingServicesInfo({
  onLearnMore,
  variant = 'full',
}: SupplementingServicesInfoProps) {
  const supplementAreas = [
    {
      icon: Clock,
      title: 'Between Sessions',
      description: 'Guidance for the 160+ hours weekly when therapy isn't happening',
      example: 'Try this calming activity before bedtime tonight',
    },
    {
      icon: Home,
      title: 'At Home Practice',
      description: 'Reinforce therapy goals with daily activities you can do together',
      example: 'Practice turn-taking during this game',
    },
    {
      icon: Calendar,
      title: 'Routine Support',
      description: 'Visual schedules and transition help that match your family's rhythms',
      example: 'Morning routine cards customized for your child',
    },
    {
      icon: MessageCircle,
      title: 'Parent Questions',
      description: 'Get answers to those 2am worries without waiting for the next appointment',
      example: 'Here's what's normal for meltdowns at this age',
    },
    {
      icon: Heart,
      title: 'Self-Care Nudges',
      description: 'Because you need support too, and burned-out parents can't pour from an empty cup',
      example: 'Take 5 minutes for yourself today',
    },
    {
      icon: BookOpen,
      title: 'Insurance Navigation',
      description: 'Handle paperwork so you spend less time on hold and more time with your child',
      example: 'Here's a draft appeal letter ready for your review',
    },
  ];

  const whyItMatters = [
    {
      stat: '168',
      label: 'hours/week',
      context: 'Therapy covers a fraction. Aminy helps with the rest.',
    },
    {
      stat: '40%',
      label: 'of parents',
      context: 'report feeling isolated. You're not alone in this.',
    },
    {
      stat: '3x',
      label: 'faster progress',
      context: 'when home practice aligns with therapy goals.',
    },
  ];

  if (variant === 'compact') {
    return (
      <Card className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-100 rounded-full flex-shrink-0">
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-teal-900 mb-1">
              Supplementing, Not Replacing
            </h3>
            <p className="text-sm text-teal-700 mb-3">
              Aminy works alongside your therapy team to support you during the
              160+ weekly hours when professional help isn't available.
            </p>
            {onLearnMore && (
              <Button
                variant="link"
                className="p-0 h-auto text-teal-600"
                onClick={onLearnMore}
              >
                Learn more <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Your AI Companion, Not Replacement
          </h2>
          <p className="text-gray-600">
            Aminy supplements professional therapy—we're here for the daily moments in between.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 mb-1">Important</p>
              <p className="text-sm text-amber-700">
                Aminy is not a substitute for ABA therapy, BCBA supervision, or medical advice.
                Always consult your care team for clinical decisions.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {supplementAreas.slice(0, 4).map((area, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <area.icon className="w-5 h-5 text-teal-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{area.title}</p>
                <p className="text-sm text-gray-600">{area.description}</p>
              </div>
            </div>
          ))}
        </div>

        {onLearnMore && (
          <Button onClick={onLearnMore} className="w-full">
            Understood
          </Button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto">
        <Badge className="bg-teal-100 text-teal-800 mb-4">
          How Aminy Works
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Your Companion for the Hours
          <br />
          <span className="text-teal-600">Between Therapy</span>
        </h1>
        <p className="text-xl text-gray-600">
          ABA therapy is powerful. But your child's life happens in all the other hours.
          Aminy helps you make those moments count.
        </p>
      </section>

      {/* Stats */}
      <section className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {whyItMatters.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-teal-600 mb-1">
                {item.stat}
              </div>
              <div className="text-sm font-medium text-gray-900 mb-2">
                {item.label}
              </div>
              <p className="text-sm text-gray-600">
                {item.context}
              </p>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* What We Supplement */}
      <section className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          How Aminy Supplements Your Care Team
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supplementAreas.map((area, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                  <area.icon className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {area.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {area.description}
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Example:</p>
                  <p className="text-sm text-gray-700 italic">
                    "{area.example}"
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What We're NOT */}
      <section className="max-w-3xl mx-auto">
        <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <h2 className="font-bold text-lg text-amber-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Important: What Aminy Is NOT
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-800 text-xs font-bold">×</span>
              </div>
              <p className="text-amber-800">
                <strong>Not ABA therapy.</strong> We don't replace the clinical interventions
                your BCBA designs and your RBT delivers.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-800 text-xs font-bold">×</span>
              </div>
              <p className="text-amber-800">
                <strong>Not medical advice.</strong> Always consult your pediatrician,
                neurologist, or specialist for health decisions.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-800 text-xs font-bold">×</span>
              </div>
              <p className="text-amber-800">
                <strong>Not a diagnosis tool.</strong> If you suspect autism or need assessment,
                please see a qualified professional.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* How We Work Together */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Better Together
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Your Therapy Team
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                <span className="text-gray-700">Clinical assessment & diagnosis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                <span className="text-gray-700">Behavior intervention plans</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                <span className="text-gray-700">Direct therapy sessions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                <span className="text-gray-700">Professional supervision</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                <span className="text-gray-700">Insurance authorization</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <h3 className="font-semibold text-teal-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-600" />
              Aminy Supplements With
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-1" />
                <span className="text-teal-800">24/7 guidance between sessions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-1" />
                <span className="text-teal-800">Daily activity suggestions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-1" />
                <span className="text-teal-800">Progress tracking & celebrations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-1" />
                <span className="text-teal-800">Parent education & support</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-1" />
                <span className="text-teal-800">Insurance paperwork help</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center max-w-xl mx-auto">
        <Card className="p-8 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
          <h2 className="text-2xl font-bold mb-4">
            Support for the whole journey
          </h2>
          <p className="text-teal-100 mb-6">
            Your therapy team handles the clinical work.
            Aminy helps with everything else.
          </p>
          {onLearnMore && (
            <Button
              onClick={onLearnMore}
              className="bg-white text-teal-700 hover:bg-teal-50"
            >
              Get started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </Card>
      </section>
    </div>
  );
}

export default SupplementingServicesInfo;
