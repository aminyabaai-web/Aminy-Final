/**
 * ROI Calculator
 *
 * Interactive calculator for payers/employers to estimate
 * their return on investment with Aminy.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Calculator,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  Download,
  Mail,
  Building2,
  Heart,
  Shield,
  Clock,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

interface ROIInputs {
  memberCount: number;
  avgAnnualCostPerMember: number;
  currentERVisitsPerYear: number;
  currentCrisisInterventions: number;
  careCoordinatorCalls: number;
  avgABAHoursPerWeek: number;
}

interface ROIResults {
  annualInvestment: number;
  erSavings: number;
  crisisSavings: number;
  callReductionSavings: number;
  abaSavings: number;
  totalSavings: number;
  netSavings: number;
  roi: number;
  paybackMonths: number;
}

const AMINY_COST_PER_MEMBER_ANNUAL = 297; // $24.75/month

// Industry benchmarks
const BENCHMARKS = {
  erVisitCost: 1200,
  crisisInterventionCost: 3500,
  careCoordinatorCallCost: 25,
  abaHourCost: 80,
  erReductionRate: 0.35, // 35% reduction
  crisisReductionRate: 0.40, // 40% reduction
  callReductionRate: 0.40, // 40% reduction
  abaOptimizationRate: 0.15, // 15% fewer hours needed
};

export function ROICalculator() {
  const [inputs, setInputs] = useState<ROIInputs>({
    memberCount: 500,
    avgAnnualCostPerMember: 15000,
    currentERVisitsPerYear: 150,
    currentCrisisInterventions: 75,
    careCoordinatorCalls: 2400,
    avgABAHoursPerWeek: 20,
  });

  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');

  const results = useMemo<ROIResults>(() => {
    const annualInvestment = inputs.memberCount * AMINY_COST_PER_MEMBER_ANNUAL;

    const erSavings = Math.round(
      inputs.currentERVisitsPerYear * BENCHMARKS.erReductionRate * BENCHMARKS.erVisitCost
    );

    const crisisSavings = Math.round(
      inputs.currentCrisisInterventions *
        BENCHMARKS.crisisReductionRate *
        BENCHMARKS.crisisInterventionCost
    );

    const callReductionSavings = Math.round(
      inputs.careCoordinatorCalls *
        BENCHMARKS.callReductionRate *
        BENCHMARKS.careCoordinatorCallCost
    );

    const annualABAHours = inputs.avgABAHoursPerWeek * 52 * inputs.memberCount;
    const abaSavings = Math.round(
      annualABAHours * BENCHMARKS.abaOptimizationRate * BENCHMARKS.abaHourCost
    );

    const totalSavings = erSavings + crisisSavings + callReductionSavings + abaSavings;
    const netSavings = totalSavings - annualInvestment;
    const roi = Math.round((netSavings / annualInvestment) * 100);
    const paybackMonths = Math.max(1, Math.round((annualInvestment / totalSavings) * 12));

    return {
      annualInvestment,
      erSavings,
      crisisSavings,
      callReductionSavings,
      abaSavings,
      totalSavings,
      netSavings,
      roi,
      paybackMonths,
    };
  }, [inputs]);

  const handleInputChange = (field: keyof ROIInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadReport = () => {
    setShowEmailCapture(true);
  };

  const handleSubmitEmail = () => {
    // In production, this would send the email and generate a PDF
    if (import.meta.env.DEV) console.log('Email submitted:', email);
    setShowEmailCapture(false);
    // Show success toast or download PDF
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-teal-600 dark:bg-teal-700 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-white/90 text-sm mb-4">
            <Calculator className="w-4 h-4" />
            ROI Calculator
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Calculate Your Return on Investment
          </h1>
          <p className="text-teal-100 max-w-2xl mx-auto">
            See how Aminy can reduce costs and improve outcomes for your autism and ADHD population.
            Adjust the inputs below to match your organization.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Your Organization
            </h2>

            <div className="space-y-6">
              {/* Member Count */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    Number of Members with ASD/ADHD
                  </Label>
                  <span className="font-semibold text-teal-600">
                    {inputs.memberCount.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[inputs.memberCount]}
                  onValueChange={([v]) => handleInputChange('memberCount', v)}
                  min={50}
                  max={10000}
                  step={50}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>50</span>
                  <span>10,000</span>
                </div>
              </div>

              {/* Current ER Visits */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    ER Visits per Year (behavioral/crisis)
                  </Label>
                  <span className="font-semibold text-teal-600">
                    {inputs.currentERVisitsPerYear}
                  </span>
                </div>
                <Slider
                  value={[inputs.currentERVisitsPerYear]}
                  onValueChange={([v]) => handleInputChange('currentERVisitsPerYear', v)}
                  min={0}
                  max={500}
                  step={5}
                  className="py-4"
                />
                <p className="text-xs text-gray-400">
                  Industry avg: ~30 per 100 members/year
                </p>
              </div>

              {/* Crisis Interventions */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    Crisis Interventions per Year
                  </Label>
                  <span className="font-semibold text-teal-600">
                    {inputs.currentCrisisInterventions}
                  </span>
                </div>
                <Slider
                  value={[inputs.currentCrisisInterventions]}
                  onValueChange={([v]) => handleInputChange('currentCrisisInterventions', v)}
                  min={0}
                  max={300}
                  step={5}
                  className="py-4"
                />
                <p className="text-xs text-gray-400">
                  Mobile crisis, in-home stabilization, etc.
                </p>
              </div>

              {/* Care Coordinator Calls */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    Care Coordinator Calls per Year
                  </Label>
                  <span className="font-semibold text-teal-600">
                    {inputs.careCoordinatorCalls.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[inputs.careCoordinatorCalls]}
                  onValueChange={([v]) => handleInputChange('careCoordinatorCalls', v)}
                  min={0}
                  max={10000}
                  step={100}
                  className="py-4"
                />
                <p className="text-xs text-gray-400">
                  Support calls, questions, guidance requests
                </p>
              </div>

              {/* ABA Hours */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-gray-700 dark:text-gray-300">
                    Avg ABA Hours per Member/Week
                  </Label>
                  <span className="font-semibold text-teal-600">
                    {inputs.avgABAHoursPerWeek} hours
                  </span>
                </div>
                <Slider
                  value={[inputs.avgABAHoursPerWeek]}
                  onValueChange={([v]) => handleInputChange('avgABAHoursPerWeek', v)}
                  min={0}
                  max={40}
                  step={1}
                  className="py-4"
                />
                <p className="text-xs text-gray-400">
                  Aminy helps skills generalize = fewer hours needed
                </p>
              </div>
            </div>
          </Card>

          {/* Results Section */}
          <div className="space-y-4">
            {/* ROI Summary */}
            <Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white">
              <h3 className="text-sm font-medium text-teal-100 mb-1">
                Annual Net Savings
              </h3>
              <p className="text-4xl font-bold mb-4">
                {formatCurrency(results.netSavings)}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-teal-400/30">
                <div>
                  <p className="text-teal-100 text-sm">ROI</p>
                  <p className="text-2xl font-bold">
                    {results.roi > 0 ? '+' : ''}
                    {results.roi}%
                  </p>
                </div>
                <div>
                  <p className="text-teal-100 text-sm">Payback Period</p>
                  <p className="text-2xl font-bold">{results.paybackMonths} mo</p>
                </div>
              </div>
            </Card>

            {/* Savings Breakdown */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Savings Breakdown
              </h3>
              <div className="space-y-3">
                <SavingsLine
                  label="ER Visit Reduction"
                  value={results.erSavings}
                  detail={`${BENCHMARKS.erReductionRate * 100}% fewer visits`}
                />
                <SavingsLine
                  label="Crisis Prevention"
                  value={results.crisisSavings}
                  detail={`${BENCHMARKS.crisisReductionRate * 100}% reduction`}
                />
                <SavingsLine
                  label="Support Call Reduction"
                  value={results.callReductionSavings}
                  detail="AI handles routine questions"
                />
                <SavingsLine
                  label="ABA Hour Optimization"
                  value={results.abaSavings}
                  detail="Better skill generalization"
                />
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900 dark:text-white">Total Savings</span>
                    <span className="text-green-600">
                      {formatCurrency(results.totalSavings)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Aminy Investment</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    -{formatCurrency(results.annualInvestment)}
                  </span>
                </div>
              </div>
            </Card>

            {/* CTA */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Ready to Get Started?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Download a detailed report or schedule a call with our team.
              </p>
              <div className="space-y-2">
                <Button onClick={handleDownloadReport} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                <Button variant="outline" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Sales
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Assumptions & Methodology */}
        <Card className="mt-8 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Methodology & Assumptions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <AssumptionCard
              icon={Shield}
              title="ER Visit Cost"
              value={formatCurrency(BENCHMARKS.erVisitCost)}
              source="CMS average for behavioral ED visits"
            />
            <AssumptionCard
              icon={Heart}
              title="Crisis Intervention"
              value={formatCurrency(BENCHMARKS.crisisInterventionCost)}
              source="Mobile crisis team avg cost"
            />
            <AssumptionCard
              icon={Clock}
              title="ABA Hour Rate"
              value={formatCurrency(BENCHMARKS.abaHourCost)}
              source="National average reimbursement"
            />
            <AssumptionCard
              icon={Users}
              title="Aminy Cost"
              value={formatCurrency(AMINY_COST_PER_MEMBER_ANNUAL) + '/year'}
              source="Enterprise pricing (volume discounts available)"
            />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            * Results are estimates based on industry benchmarks and Aminy pilot data.
            Actual results may vary based on population characteristics and implementation.
          </p>
        </Card>
      </div>

      {/* Email Capture Modal */}
      {showEmailCapture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Get Your Personalized Report
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter your email to receive a detailed PDF report with your custom ROI analysis.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEmailCapture(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitEmail} className="flex-1">
                  Send Report
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SavingsLine({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-xs text-gray-400">{detail}</p>
      </div>
      <span className="font-medium text-green-600">{formatCurrency(value)}</span>
    </div>
  );
}

function AssumptionCard({
  icon: Icon,
  title,
  value,
  source,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  source: string;
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-teal-600" />
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
      </div>
      <p className="text-lg font-semibold text-teal-600">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{source}</p>
    </div>
  );
}

export default ROICalculator;
