// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Sparkles, 
  Check, 
  X, 
  Copy, 
  Eye,
  Palette,
  Type,
  MessageSquare,
  Shield,
  Heart,
  Target,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

export function BrandGuideComponent() {
  const [copiedItem, setCopiedItem] = useState<string>('');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedItem(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#C9EAD9] via-[#FFE2B6] to-[#E6E0F8] opacity-20 blur-2xl rounded-full"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-accent to-teal-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 mb-4">
            Aminy Brand Guide
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-2">
            Guided by AI. Grounded in ABA. Built for Family Life.
          </p>
          
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            An AI-powered behavioral wellness companion for neurodivergent children and their families.
          </p>
        </div>

        <Tabs defaultValue="identity" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="voice">Voice & Tone</TabsTrigger>
            <TabsTrigger value="lexicon">Do/Don't</TabsTrigger>
            <TabsTrigger value="microcopy">Microcopy</TabsTrigger>
          </TabsList>

          {/* IDENTITY TAB */}
          <TabsContent value="identity" className="space-y-3 sm:space-y-4 sm:space-y-6">
            <Card className="p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">Brand Identity</h2>
                  <p className="text-slate-600">Core positioning and messaging framework</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 sm:space-y-6">
                {/* Tagline */}
                <div className="bg-gradient-to-r from-accent/5 to-teal-50 rounded-xl p-6 border border-accent/20">
                  <h3 className="font-semibold text-slate-900 mb-2">Official Tagline</h3>
                  <p className="text-2xl font-semibold text-accent mb-3">
                    Guided by AI. Grounded in ABA. Built for Family Life.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      "Guided by AI. Grounded in ABA. Built for Family Life.",
                      "Tagline"
                    )}
                    className="gap-2"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedItem === "Tagline" ? "Copied!" : "Copy"}
                  </Button>
                </div>

                {/* Positioning Statement */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Positioning Statement</h3>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-200">
                    Aminy is an AI-powered behavioral wellness app that uses the proven principles of 
                    Applied Behavior Analysis (ABA) to help families create calm routines, improve 
                    communication, and celebrate progress—without clinical complexity.
                  </p>
                </div>

                {/* Category */}
                <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Category</h3>
                    <Badge className="bg-accent text-white">AI Behavioral Wellness</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Subcategory</h3>
                    <Badge variant="outline">AI Family Coaching</Badge>
                  </div>
                </div>

                {/* Value Pillars */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Three Value Pillars</h3>
                  <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-blue-900 mb-2">Calm & Predictability</h4>
                      <p className="text-sm text-blue-800">
                        Reduce stress through daily structure using gentle ABA-based routines.
                      </p>
                    </Card>

                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-3">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-green-900 mb-2">Connection & Confidence</h4>
                      <p className="text-sm text-green-800">
                        Empower parents and celebrate every bit of progress with your child.
                      </p>
                    </Card>

                    <Card className="p-4 bg-purple-50 border-purple-200">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mb-3">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-purple-900 mb-2">Science & Simplicity</h4>
                      <p className="text-sm text-purple-800">
                        Behavioral insights grounded in proven ABA principles, no clinical jargon.
                      </p>
                    </Card>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* COLORS TAB */}
          <TabsContent value="colors" className="space-y-3 sm:space-y-4 sm:space-y-6">
            <Card className="p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Palette className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">Color Palette</h2>
                  <p className="text-slate-600">AI gradient system and brand colors</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* AI Gradient Colors */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">AI Gradient Palette</h3>
                  <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <div className="h-24 rounded-lg bg-[#C9EAD9] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Aminy Mint</p>
                        <p className="text-slate-500 font-mono text-xs">#C9EAD9</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("#C9EAD9", "Mint color")}
                          className="h-6 px-2 mt-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-24 rounded-lg bg-[#FFE2B6] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Aminy Amber</p>
                        <p className="text-slate-500 font-mono text-xs">#FFE2B6</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("#FFE2B6", "Amber color")}
                          className="h-6 px-2 mt-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-24 rounded-lg bg-[#E6E0F8] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Aminy Lavender</p>
                        <p className="text-slate-500 font-mono text-xs">#E6E0F8</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("#E6E0F8", "Lavender color")}
                          className="h-6 px-2 mt-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Gradient Demo */}
                  <div className="mt-4 space-y-2">
                    <div 
                      className="h-24 rounded-lg border-2 border-slate-200"
                      style={{ 
                        background: 'linear-gradient(120deg, #C9EAD9, #FFE2B6, #E6E0F8)'
                      }}
                    ></div>
                    <p className="text-sm text-slate-600 font-mono">
                      linear-gradient(120deg, var(--aminy-mint), var(--aminy-amber), var(--aminy-lavender))
                    </p>
                  </div>
                </div>

                {/* Primary Accent */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Primary Accent</h3>
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <div className="h-24 rounded-lg bg-[#0891b2] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Teal Accent</p>
                        <p className="text-slate-500 font-mono text-xs">#0891b2</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("#0891b2", "Accent color")}
                          className="h-6 px-2 mt-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-24 rounded-lg bg-[#F9F8F4] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Neutral Base</p>
                        <p className="text-slate-500 font-mono text-xs">#F9F8F4</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard("#F9F8F4", "Neutral color")}
                          className="h-6 px-2 mt-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tier Colors */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Tier Colors</h3>
                  <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[#3B82F6] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Starter Blue</p>
                        <p className="text-slate-500 font-mono text-xs">#3B82F6</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[#0891b2] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Core Teal</p>
                        <p className="text-slate-500 font-mono text-xs">#0891b2</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[#9333EA] border-2 border-slate-200"></div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">Plus Purple</p>
                        <p className="text-slate-500 font-mono text-xs">#9333EA</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* VOICE & TONE TAB */}
          <TabsContent value="voice" className="space-y-3 sm:space-y-4 sm:space-y-6">
            <Card className="p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">Voice & Tone</h2>
                  <p className="text-slate-600">How Aminy communicates with families</p>
                </div>
              </div>

              {/* Voice Description */}
              <div className="bg-gradient-to-r from-accent/5 to-teal-50 rounded-xl p-6 border border-accent/20 mb-4 sm:mb-6">
                <h3 className="font-semibold text-slate-900 mb-2">Voice: Warm-Expert</h3>
                <p className="text-slate-700 mb-3">
                  60% compassionate coach, 40% intelligent assistant
                </p>
                <p className="text-sm text-slate-600">
                  Talk like texting a close friend who's a behavioral science expert. Use contractions, 
                  natural pauses, conversational flow. Show personality with warm, light humor when appropriate.
                </p>
              </div>

              {/* Tone Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Tone</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">When to Use</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 px-4">
                        <Badge className="bg-green-500">Warm-Expert</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        Default tone for guidance
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        "Let's make mornings smoother together."
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 px-4">
                        <Badge className="bg-blue-500">Calm</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        During stressful moments
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        "Take a breath. You've got this."
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-3 px-4">
                        <Badge className="bg-amber-500">Encouraging</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        Celebrating progress
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        "That's progress we can celebrate together!"
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">
                        <Badge className="bg-purple-500">Intelligent</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        Explaining ABA concepts
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        "Using ABA principles, Aminy helps create calm morning routines."
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Characteristics */}
              <div className="mt-4 sm:mt-6 grid md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">✓ Do This</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Use contractions (you're, it's, let's)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Short sentences for breathing pace</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Pair ABA with AI credibility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Show empathy first, solutions second</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">✗ Avoid This</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>Formal or robotic ("Great! To start...")</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>Clinical language (treatment, patient)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>Diagnostic terms (disorder, cure)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>Overwhelming parents with complexity</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* LEXICON TAB */}
          <TabsContent value="lexicon" className="space-y-3 sm:space-y-4 sm:space-y-6">
            <Card className="p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Type className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">Language Framework</h2>
                  <p className="text-slate-600">Words to use and avoid</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
                {/* DO USE */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">Use These Words</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2 text-sm">Core Terms</h4>
                      <div className="flex flex-wrap gap-2">
                        {['calm', 'connect', 'cue', 'progress', 'gentle', 'routine'].map(word => (
                          <Badge key={word} className="bg-green-600 text-white">{word}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2 text-sm">Empowerment</h4>
                      <div className="flex flex-wrap gap-2">
                        {['support', 'growth', 'celebration', 'together', 'guidance'].map(word => (
                          <Badge key={word} className="bg-green-600 text-white">{word}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2 text-sm">Science Terms</h4>
                      <div className="flex flex-wrap gap-2">
                        {['ABA principles', 'behavioral science', 'reinforcement', 'adaptive AI'].map(word => (
                          <Badge key={word} className="bg-green-600 text-white">{word}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DON'T USE */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">Avoid These Words</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2 text-sm">Clinical Terms</h4>
                      <div className="flex flex-wrap gap-2">
                        {['therapy', 'treatment', 'patient', 'prescription', 'clinical'].map(word => (
                          <Badge key={word} variant="destructive">{word}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2 text-sm">Diagnostic</h4>
                      <div className="flex flex-wrap gap-2">
                        {['diagnosis', 'disorder', 'cure', 'fix', 'broken'].map(word => (
                          <Badge key={word} variant="destructive">{word}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2 text-sm">Medical</h4>
                      <div className="flex flex-wrap gap-2">
                        {['medical device', 'intervention', 'symptom', 'pathology'].map(word => (
                          <Badge key={word} variant="destructive">{word}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Replacement Guide */}
              <div className="mt-4 sm:mt-6 bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Say This Instead</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Badge variant="destructive" className="min-w-[100px]">therapy</Badge>
                    <span className="text-slate-400">→</span>
                    <Badge className="bg-green-600 min-w-[100px]">support</Badge>
                    <span className="text-slate-600">or "behavioral wellness"</span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Badge variant="destructive" className="min-w-[100px]">patient</Badge>
                    <span className="text-slate-400">→</span>
                    <Badge className="bg-green-600 min-w-[100px]">child</Badge>
                    <span className="text-slate-600">or "family"</span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Badge variant="destructive" className="min-w-[100px]">disorder</Badge>
                    <span className="text-slate-400">→</span>
                    <Badge className="bg-green-600 min-w-[100px]">neurodivergent</Badge>
                    <span className="text-slate-600">or "developmental needs"</span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Badge variant="destructive" className="min-w-[100px]">cure</Badge>
                    <span className="text-slate-400">→</span>
                    <Badge className="bg-green-600 min-w-[100px]">progress</Badge>
                    <span className="text-slate-600">or "growth"</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* MICROCOPY TAB */}
          <TabsContent value="microcopy" className="space-y-3 sm:space-y-4 sm:space-y-6">
            <Card className="p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">Microcopy Examples</h2>
                  <p className="text-slate-600">Real-world usage across the app</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 sm:space-y-6">
                {/* Headlines */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Headlines</h3>
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-lg font-semibold text-slate-900">"Finally, calm that works."</p>
                      <p className="text-xs text-slate-500 mt-1">Splash screen hero</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-lg font-semibold text-slate-900">"Today's Calm Plan"</p>
                      <p className="text-xs text-slate-500 mt-1">Dashboard header</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-lg font-semibold text-slate-900">"Progress You Can See"</p>
                      <p className="text-xs text-slate-500 mt-1">Reports section</p>
                    </div>
                  </div>
                </div>

                {/* Supportive Messages */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Supportive Messages</h3>
                  <div className="space-y-2">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-900">"Small steps. Big calm."</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-900">"You've got this — Aminy helps it work."</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-900">"That's progress we can celebrate together!"</p>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Calls to Action</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Button className="bg-accent hover:bg-accent/90">
                      Start Your 7-Day Free Trial
                    </Button>
                    <Button className="bg-accent hover:bg-accent/90">
                      Build My Calm Plan
                    </Button>
                    <Button variant="outline">
                      Aminy 💬
                    </Button>
                    <Button variant="outline">
                      See How It Works
                    </Button>
                  </div>
                </div>

                {/* AI + ABA Pairings */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">AI + ABA Pairings</h3>
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-accent/5 to-teal-50 rounded-lg p-4 border border-accent/20">
                      <p className="text-sm text-slate-900">"Powered by adaptive AI and grounded in ABA behavioral science."</p>
                    </div>
                    <div className="bg-gradient-to-r from-accent/5 to-teal-50 rounded-lg p-4 border border-accent/20">
                      <p className="text-sm text-slate-900">"Using proven ABA principles, Aminy's AI creates calm routines."</p>
                    </div>
                    <div className="bg-gradient-to-r from-accent/5 to-teal-50 rounded-lg p-4 border border-accent/20">
                      <p className="text-sm text-slate-900">"AI-guided plans based on ABA behavioral science."</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Download Guide CTA */}
        <Card className="p-6 bg-gradient-to-r from-accent/5 to-teal-50 border-accent/20 text-center mt-8">
          <h3 className="font-semibold text-slate-900 mb-2">Ready to use this system?</h3>
          <p className="text-sm text-slate-600 mb-4">
            All brand assets, tokens, and guidelines are available in the codebase.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button className="bg-accent hover:bg-accent/90 gap-2">
              <Download className="w-4 h-4" />
              View Design Tokens
            </Button>
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              See Implementation
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
