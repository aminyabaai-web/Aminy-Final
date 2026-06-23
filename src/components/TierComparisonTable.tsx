// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Check, X, Minus } from 'lucide-react';
import { tierPricing } from '../lib/tier-utils';

interface TierComparisonTableProps {
  compact?: boolean;
}

export function TierComparisonTable({ compact = false }: TierComparisonTableProps) {
  const features = [
    {
      category: 'Daily Plans & Activities',
      items: [
        { name: 'Personalized daily activities', core: 'Adaptive plans', pro: 'Adaptive plans', family: 'Adaptive plans' },
        { name: 'Basic progress tracking', core: true, pro: true, family: true },
        { name: 'Streak counts & celebrations', core: true, pro: true, family: true },
        { name: 'AI adapts plan automatically', core: true, pro: true, family: true },
        { name: 'Three plan options per day', core: true, pro: true, family: true },
      ]
    },
    {
      category: 'Aminy Jr (Child Mode)',
      items: [
        { name: 'Calming exercises', core: 'Unlimited', pro: 'Unlimited', family: 'Unlimited' },
        { name: 'Speech activities', core: true, pro: true, family: true },
        { name: 'Full activity suite', core: true, pro: true, family: true },
      ]
    },
    {
      category: 'Profiles & Caregivers',
      items: [
        { name: 'Child profiles', core: 'Up to 2', pro: 'Up to 3', family: 'Unlimited' },
        { name: 'Caregiver accounts', core: false, pro: false, family: '4 accounts' },
      ]
    },
    {
      category: 'AI Support',
      items: [
        { name: 'Aminy chat access', core: 'Unlimited', pro: 'Unlimited', family: 'Unlimited' },
        { name: 'Text & voice conversations', core: true, pro: true, family: true },
        { name: 'Advanced AI reasoning', core: true, pro: true, family: true },
        { name: 'Live AI video support', core: false, pro: true, family: true },
        { name: 'Priority AI responses', core: false, pro: true, family: true },
      ]
    },
    {
      category: 'Documents & Records',
      items: [
        { name: 'Document vault', core: true, pro: true, family: true },
        { name: 'AI document analysis (IEPs, records)', core: true, pro: true, family: true },
        { name: 'Caregiver reports', core: true, pro: true, family: true },
      ]
    },
    {
      category: 'Professional Support',
      items: [
        { name: 'Marketplace session booking', core: true, pro: true, family: true },
        { name: 'Session discount', core: false, pro: '20% off', family: '30% off' },
        { name: 'Priority booking', core: false, pro: true, family: true },
        { name: 'Monthly BCBA consultation', core: false, pro: false, family: true },
        { name: 'Clinical reports (IEPs, progress)', core: false, pro: true, family: true },
        { name: 'Provider sharing portal', core: false, pro: true, family: true },
      ]
    },
    {
      category: 'Support & Features',
      items: [
        { name: 'Community access', core: 'Full access', pro: 'Full access', family: 'Full access' },
        { name: 'Care coordinator (async)', core: false, pro: false, family: true },
        { name: 'Advanced analytics dashboard', core: false, pro: false, family: true },
        { name: 'Priority support', core: false, pro: true, family: true },
        { name: 'Dedicated support channel', core: false, pro: false, family: true },
      ]
    }
  ];

  const renderCell = (value: string | boolean) => {
    if (value === true) {
      return <Check className="w-4 h-4 text-green-600 mx-auto" />;
    }
    if (value === false) {
      return <X className="w-4 h-4 text-[#8A9BA8] mx-auto" />;
    }
    return <span className="text-sm text-center text-primary font-medium">{value}</span>;
  };

  if (compact) {
    return (
      <Card className="p-4 overflow-x-auto">
        <div className="text-sm font-semibold text-primary mb-3 text-center">
          Quick Comparison
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E4DF]">
              <th className="text-left py-2 font-medium text-muted-foreground">Feature</th>
              <th className="text-center py-2 font-medium text-[#3A4A57]">Core</th>
              <th className="text-center py-2 font-medium text-[#6B9080]">Pro</th>
              <th className="text-center py-2 font-medium text-[#3A4A57]">Family</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E8E4DF]">
              <td className="py-2 text-muted-foreground">Daily activities</td>
              <td className="text-center font-medium">Adaptive</td>
              <td className="text-center font-medium">Adaptive</td>
              <td className="text-center font-medium">Adaptive</td>
            </tr>
            <tr className="border-b border-[#E8E4DF]">
              <td className="py-2 text-muted-foreground">Jr activities</td>
              <td className="text-center font-medium">All</td>
              <td className="text-center font-medium">All</td>
              <td className="text-center font-medium">All</td>
            </tr>
            <tr className="border-b border-[#E8E4DF]">
              <td className="py-2 text-muted-foreground">AI chat</td>
              <td className="text-center font-medium">Unlimited</td>
              <td className="text-center font-medium">Unlimited</td>
              <td className="text-center font-medium">Unlimited</td>
            </tr>
            <tr className="border-b border-[#E8E4DF]">
              <td className="py-2 text-muted-foreground">Video AI</td>
              <td className="text-center"><X className="w-3 h-3 text-[#8A9BA8] mx-auto" /></td>
              <td className="text-center"><Check className="w-3 h-3 text-green-600 mx-auto" /></td>
              <td className="text-center"><Check className="w-3 h-3 text-green-600 mx-auto" /></td>
            </tr>
            <tr>
              <td className="py-2 text-muted-foreground">BCBA consult</td>
              <td className="text-center"><X className="w-3 h-3 text-[#8A9BA8] mx-auto" /></td>
              <td className="text-center"><X className="w-3 h-3 text-[#8A9BA8] mx-auto" /></td>
              <td className="text-center"><Check className="w-3 h-3 text-green-600 mx-auto" /></td>
            </tr>
          </tbody>
        </table>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-2xl font-semibold text-primary mb-2">Compare All Features</h2>
        <p className="text-sm text-muted-foreground">
          See exactly what you get with each tier
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#E8E4DF]">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">Features</th>
              <th className="text-center py-4 px-4">
                <div className="font-semibold text-primary">Core</div>
                <div className="text-xl sm:text-2xl font-bold text-primary mt-1">${tierPricing.core.monthly}</div>
                <div className="text-sm text-muted-foreground">/month</div>
              </th>
              <th className="text-center py-4 px-4 bg-[#6B9080]/10/50 relative">
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-white text-sm">
                  Most Popular
                </Badge>
                <div className="font-semibold text-[#6B9080] mt-2">Pro</div>
                <div className="text-xl sm:text-2xl font-bold text-[#6B9080] mt-1">${tierPricing.pro.monthly}</div>
                <div className="text-sm text-[#6B9080]">/month</div>
              </th>
              <th className="text-center py-4 px-4">
                <div className="font-semibold text-primary">Family</div>
                <div className="text-xl sm:text-2xl font-bold text-primary mt-1">${tierPricing.proplus.monthly}</div>
                <div className="text-sm text-muted-foreground">/month</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((category, catIndex) => (
              <React.Fragment key={catIndex}>
                <tr className="bg-[#FAF7F2]">
                  <td colSpan={4} className="py-3 px-4 font-semibold text-sm text-primary">
                    {category.category}
                  </td>
                </tr>
                {category.items.map((item, itemIndex) => (
                  <tr key={itemIndex} className="border-b border-[#E8E4DF] hover:bg-[#FAF7F2]/50">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.name}</td>
                    <td className="py-3 px-4 text-center">{renderCell(item.core)}</td>
                    <td className="py-3 px-4 text-center bg-[#6B9080]/10/30">{renderCell(item.pro)}</td>
                    <td className="py-3 px-4 text-center">{renderCell(item.family)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 sm:mt-6 p-4 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg text-center">
        <p className="text-sm text-[#4A6478]">
          <strong>All plans include:</strong> 7-day free trial • No credit card required • Cancel anytime • No diagnosis required
        </p>
      </div>
    </div>
  );
}
