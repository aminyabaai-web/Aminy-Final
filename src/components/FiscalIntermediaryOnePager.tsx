// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Fiscal Intermediary One-Pager
 * Printable/exportable partnership overview for FI sales conversations
 */

import React from 'react';
import {
  Building2,
  Users,
  Clock,
  FileText,
  Shield,
  Phone,
  Mail,
  CheckCircle,
  TrendingUp,
  Heart,
  Zap,
  Target,
  BarChart3,
} from 'lucide-react';

interface FiscalIntermediaryOnePagerProps {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function FiscalIntermediaryOnePager({
  contactName = 'Partnership Team',
  contactEmail = 'partnerships@aminy.ai',
  contactPhone = '(555) 123-4567',
}: FiscalIntermediaryOnePagerProps) {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white print:p-4" id="fi-one-pager">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-[#E8E4DF]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-[#1B2733]">Aminy</span>
          </div>
          <p className="text-sm text-[#5A6B7A]">
            AI-Powered Support for Self-Directed Families
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium text-[#1B2733]">{contactName}</p>
          <p className="text-[#5A6B7A]">{contactEmail}</p>
          <p className="text-[#5A6B7A]">{contactPhone}</p>
        </div>
      </div>

      {/* Problem Statement */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#1B2733] mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#6B9080]" />
          The Challenge
        </h2>
        <div className="bg-[#FAF7F2] rounded-xl p-4">
          <p className="text-[#3A4A57] leading-relaxed">
            Self-directed families receive <strong>funding for services</strong> but often lack the{' '}
            <strong>daily guidance</strong> to maximize outcomes. Your care coordinators can't be
            available 24/7, leading to:
          </p>
          <ul className="mt-3 space-y-2 text-[#3A4A57]">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              Frequent "What should I do?" support calls
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              Incomplete or delayed documentation
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              Parent burnout and family stress
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              Lower retention and satisfaction rates
            </li>
          </ul>
        </div>
      </section>

      {/* Solution */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#1B2733] mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#6B9080]" />
          The Aminy Solution
        </h2>
        <p className="text-[#3A4A57] mb-4">
          Aminy is an AI companion that provides <strong>24/7 personalized support</strong> for
          autism families—guidance, activities, and documentation help during the 160+ weekly
          hours when your team isn't available.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-[#6B9080]/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#6B9080]" />
              <span className="font-medium text-[#6B9080]">Daily Guidance</span>
            </div>
            <p className="text-sm text-[#6B9080]">
              Personalized activities and strategies tailored to each child's needs and goals
            </p>
          </div>
          <div className="bg-[#EEF4F8] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Documentation Help</span>
            </div>
            <p className="text-sm text-[#4A6478]">
              EVV-compatible time logs, service notes, and exportable reports
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-900">Parent Support</span>
            </div>
            <p className="text-sm text-purple-800">
              Self-care reminders, stress tracking, and emotional support for caregivers
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900">Progress Tracking</span>
            </div>
            <p className="text-sm text-green-800">
              Visual progress reports shareable with care teams and family members
            </p>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#1B2733] mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6B9080]" />
          Pilot Results
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center p-4 bg-[#FAF7F2] rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">40%</div>
            <div className="text-xs text-[#5A6B7A] mt-1">Fewer support calls</div>
          </div>
          <div className="text-center p-4 bg-[#FAF7F2] rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">2.5hrs</div>
            <div className="text-xs text-[#5A6B7A] mt-1">Saved/family/week</div>
          </div>
          <div className="text-center p-4 bg-[#FAF7F2] rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">94%</div>
            <div className="text-xs text-[#5A6B7A] mt-1">6-month retention</div>
          </div>
          <div className="text-center p-4 bg-[#FAF7F2] rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">92%</div>
            <div className="text-xs text-[#5A6B7A] mt-1">Family satisfaction</div>
          </div>
        </div>
      </section>

      {/* Integration */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#1B2733] mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#6B9080]" />
          Enterprise Ready
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-[#1B2733] text-sm">HIPAA-Conscious</p>
              <p className="text-xs text-[#5A6B7A]">BAA available on request</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-[#1B2733] text-sm">White-Label</p>
              <p className="text-xs text-[#5A6B7A]">Your branding, our tech</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-[#1B2733] text-sm">SSO Integration</p>
              <p className="text-xs text-[#5A6B7A]">Connect to existing systems</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-[#1B2733] text-sm">API Access</p>
              <p className="text-xs text-[#5A6B7A]">Sync data with your platform</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-[#1B2733] text-sm">Bulk Onboarding</p>
              <p className="text-xs text-[#5A6B7A]">Easy family import</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-[#1B2733] text-sm">State Compliance</p>
              <p className="text-xs text-[#5A6B7A]">Waiver-specific features</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-[#1B2733] mb-3">Volume Pricing</h2>
        <div className="overflow-hidden rounded-lg border border-[#E8E4DF]">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF7F2]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[#1B2733]">Family Count</th>
                <th className="px-4 py-2 text-left font-medium text-[#1B2733]">Per Family/Month</th>
                <th className="px-4 py-2 text-left font-medium text-[#1B2733]">Includes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-[#3A4A57]">Up to 100</td>
                <td className="px-4 py-3 text-[#1B2733] font-medium">$3.00</td>
                <td className="px-4 py-3 text-[#5A6B7A]">Core features + support</td>
              </tr>
              <tr className="bg-[#6B9080]/10">
                <td className="px-4 py-3 text-[#3A4A57]">100-500</td>
                <td className="px-4 py-3 text-[#6B9080] font-medium">$2.50</td>
                <td className="px-4 py-3 text-[#5A6B7A]">+ Custom branding + API</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[#3A4A57]">500+</td>
                <td className="px-4 py-3 text-[#1B2733] font-medium">Custom</td>
                <td className="px-4 py-3 text-[#5A6B7A]">+ White-label + SSO + Dedicated support</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#5A6B7A] mt-2">
          * No setup fees. No long-term contracts. Annual billing available for additional discount.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-primary rounded-xl p-6 text-white text-center">
        <h2 className="text-xl font-bold mb-2">Ready to Support More Families?</h2>
        <p className="text-teal-100 mb-4">
          Schedule a demo to see Aminy in action and discuss your specific needs.
        </p>
        <div className="flex justify-center gap-3 sm:gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>{contactEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{contactPhone}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-4 sm:mt-6 pt-4 border-t border-[#E8E4DF] flex justify-between items-center text-xs text-[#5A6B7A]">
        <span>© {new Date().getFullYear()} Aminy, LLC | aminy.ai</span>
        <span>HIPAA-Conscious • BCBA Advised • Parent-Founded</span>
      </div>
    </div>
  );
}

// Export helper function to print one-pager
export function printOnePager() {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const content = document.getElementById('fi-one-pager')?.innerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Aminy - Fiscal Intermediary Partnership</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

export default FiscalIntermediaryOnePager;
