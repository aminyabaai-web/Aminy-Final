/**
 * CashPayPricing — Family-facing pricing display
 *
 * Shows service pricing with category tabs, membership discounts,
 * package deals, and savings calculations. Warm, professional design.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Brain,
  MessageCircle,
  Clock,
  Tag,
  Star,
  Sparkles,
  ChevronRight,
  Check,
  BadgePercent,
  Package,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';
import {
  getAllServices,
  getServicePrice,
  getPackageOptions,
  calculateMembershipSavings,
  getCategoryLabel,
  getTierLabel,
  MEMBERSHIP_DISCOUNTS,
  type ServiceCategory,
  type MembershipTier,
  type CashPayService,
} from '../../lib/pricing/cash-pay-pricing';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CategoryTabProps {
  category: ServiceCategory;
  active: boolean;
  onSelect: () => void;
}

const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  aba: <Brain className="w-4 h-4" />,
  'mental-health': <Heart className="w-4 h-4" />,
  speech: <MessageCircle className="w-4 h-4" />,
};

function CategoryTab({ category, active, onSelect }: CategoryTabProps) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-teal-600 text-white shadow-md'
          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
      }`}
    >
      {CATEGORY_ICONS[category]}
      {getCategoryLabel(category)}
    </button>
  );
}

// ---------------------------------------------------------------------------

interface MembershipBadgeProps {
  tier: MembershipTier;
}

function MembershipBadge({ tier }: MembershipBadgeProps) {
  const colors =
    tier === 'pro'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : tier === 'core'
        ? 'bg-teal-50 text-teal-700 border-teal-200'
        : 'bg-slate-50 text-slate-600 border-slate-200';

  const discount = MEMBERSHIP_DISCOUNTS.find((m) => m.tier === tier);

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors}`}>
      <Star className="w-3 h-3" />
      {getTierLabel(tier)} Member — {discount?.discountPct}% Off Sessions
    </span>
  );
}

// ---------------------------------------------------------------------------

interface ServiceCardProps {
  service: CashPayService;
  tier: MembershipTier;
  onBook: (serviceId: string) => void;
  onViewPackages: (serviceId: string) => void;
}

function ServiceCard({ service, tier, onBook, onViewPackages }: ServiceCardProps) {
  const price = getServicePrice(service.id, tier);
  const hasDiscount = price.totalDiscount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${
        service.popular ? 'border-teal-300 ring-1 ring-teal-100' : 'border-slate-200'
      }`}
    >
      {/* Popular badge */}
      {service.popular && (
        <div className="flex items-center gap-1 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Most Popular</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-base">{service.name}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-400 font-mono">CPT {service.cptCode}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {service.durationMinutes} min
            </span>
            <span className="text-xs text-teal-600 font-medium">{service.providerType}</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          {hasDiscount && (
            <span className="text-sm text-slate-400 line-through block">${service.familyPays.toLocaleString()}</span>
          )}
          <span className="text-2xl font-bold text-slate-900">${price.finalPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-500 leading-relaxed mb-4">{service.description}</p>

      {/* Market context */}
      <div className="text-xs text-slate-400 mb-3">
        National range: ${service.marketRange.low.toLocaleString()}–${service.marketRange.high.toLocaleString()}
      </div>

      {/* Discount badge */}
      {hasDiscount && (
        <div className="flex items-center gap-1.5 mb-4 text-teal-600 text-sm font-medium">
          <BadgePercent className="w-4 h-4" />
          You save ${price.totalDiscount.toFixed(2)} as a {getTierLabel(tier)} member
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onBook(service.id)}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          Book Now
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewPackages(service.id)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 font-medium py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Package className="w-4 h-4" />
          Packages
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

interface PackageModalProps {
  serviceId: string;
  tier: MembershipTier;
  onClose: () => void;
  onBook: (serviceId: string, packageSize: number) => void;
}

function PackageModal({ serviceId, tier, onClose, onBook }: PackageModalProps) {
  const options = getPackageOptions(serviceId, tier);
  const service = getAllServices().find((s) => s.id === serviceId);

  if (!service) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-lg text-slate-900">Session Packages</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">{service.name} — Buy more, save more</p>

        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.sessions}
              onClick={() => onBook(serviceId, opt.sessions)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all text-left"
            >
              <div>
                <div className="font-medium text-slate-900">{opt.label}</div>
                <div className="text-sm text-slate-500">
                  ${opt.pricePerSession}/session
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">${opt.totalPrice.toFixed(2)}</div>
                <div className="text-xs text-teal-600 font-medium">Save ${opt.savings.toFixed(2)}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          Package discounts stack with your membership discount
        </p>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

interface SavingsBannerProps {
  tier: MembershipTier;
  category: ServiceCategory;
}

function SavingsBanner({ tier, category }: SavingsBannerProps) {
  const services = getAllServices(category);
  if (services.length === 0) return null;

  // Use the most popular service in category for savings calc
  const primaryService = services[0];
  const savings = calculateMembershipSavings(tier, 4, primaryService.id);

  if (savings.monthlySavings <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3"
    >
      <Sparkles className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-teal-800">
          As a {getTierLabel(tier)} member, you save ${savings.monthlySavings.toFixed(2)}/month
        </p>
        <p className="text-xs text-teal-600 mt-0.5">
          Based on {savings.sessionsPerMonth} sessions of {primaryService.name} per month.
          That is ${savings.annualSavings.toFixed(2)} saved per year.
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

interface TierSelectorProps {
  tier: MembershipTier;
  onSelect: (tier: MembershipTier) => void;
}

function TierSelector({ tier, onSelect }: TierSelectorProps) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
      {MEMBERSHIP_DISCOUNTS.map((m) => (
        <button
          key={m.tier}
          onClick={() => onSelect(m.tier)}
          className={`flex-1 text-center py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            tier === m.tier
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div>{getTierLabel(m.tier)}</div>
          {m.monthlyPrice > 0 && (
            <div className="text-[10px] text-slate-400 mt-0.5">${m.monthlyPrice}/mo</div>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface CashPayPricingProps {
  initialCategory?: ServiceCategory;
  initialTier?: MembershipTier;
  onBook?: (serviceId: string, packageSize?: number) => void;
}

export default function CashPayPricing({
  initialCategory = 'aba',
  initialTier = 'starter',
  onBook,
}: CashPayPricingProps) {
  const [category, setCategory] = useState<ServiceCategory>(initialCategory);
  const [tier, setTier] = useState<MembershipTier>(initialTier);
  const [packageModal, setPackageModal] = useState<string | null>(null);

  const services = useMemo(() => getAllServices(category), [category]);

  const handleBook = (serviceId: string, packageSize?: number) => {
    onBook?.(serviceId, packageSize);
    setPackageModal(null);
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Transparent Pricing</h1>
        <p className="text-sm text-slate-500 mt-1">
          No insurance needed. No surprise bills. Just clear, honest pricing for your family.
        </p>
        <p className="text-xs text-teal-600 mt-2 font-medium">
          All prices include telehealth platform, Ease activities, and superbill for out-of-network reimbursement.
        </p>
      </div>

      {/* Tier Selector */}
      <div className="px-5 mb-4">
        <TierSelector tier={tier} onSelect={setTier} />
      </div>

      {/* Membership Badge */}
      <div className="px-5 mb-4">
        <MembershipBadge tier={tier} />
      </div>

      {/* Category Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['aba', 'mental-health', 'speech'] as ServiceCategory[]).map((cat) => (
            <CategoryTab
              key={cat}
              category={cat}
              active={category === cat}
              onSelect={() => setCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* Savings Banner */}
      <div className="px-5 mb-4">
        <SavingsBanner tier={tier} category={category} />
      </div>

      {/* Service Cards */}
      <div className="px-5 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                tier={tier}
                onBook={(id) => handleBook(id)}
                onViewPackages={(id) => setPackageModal(id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer trust badges */}
      <div className="px-5 mt-8">
        <div className="flex items-center justify-center gap-6 text-slate-400 text-xs">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            HIPAA Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Superbill Provided
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            No Contracts
          </span>
        </div>
      </div>

      {/* Package Modal */}
      <AnimatePresence>
        {packageModal && (
          <PackageModal
            serviceId={packageModal}
            tier={tier}
            onClose={() => setPackageModal(null)}
            onBook={handleBook}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
