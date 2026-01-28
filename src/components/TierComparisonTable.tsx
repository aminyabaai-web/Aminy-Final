import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Check, X, Minus } from 'lucide-react';

interface TierComparisonTableProps {
  compact?: boolean;
}

export function TierComparisonTable({ compact = false }: TierComparisonTableProps) {
  const features = [
    {
      category: 'Daily Plans & Activities',
      items: [
        { name: 'Personalized daily activities', starter: '3 per day', core: 'Adaptive plans', pro: 'Adaptive plans' },
        { name: 'Basic progress tracking', starter: true, core: true, pro: true },
        { name: 'Streak counts & celebrations', starter: true, core: true, pro: true },
        { name: 'AI adapts plan automatically', starter: false, core: true, pro: true },
        { name: 'Three plan options per day', starter: false, core: true, pro: true },
      ]
    },
    {
      category: 'Aminy Jr (Child Mode)',
      items: [
        { name: 'Calming exercises', starter: '1 exercise', core: 'Unlimited', pro: 'Unlimited' },
        { name: 'Speech activities', starter: false, core: true, pro: true },
        { name: 'Full activity suite', starter: false, core: true, pro: true },
      ]
    },
    {
      category: 'AI Support',
      items: [
        { name: 'Ask Aminy chat access', starter: 'Limited', core: 'Unlimited', pro: 'Unlimited' },
        { name: 'Text & voice conversations', starter: false, core: true, pro: true },
        { name: 'Advanced AI reasoning', starter: false, core: true, pro: true },
        { name: 'Live AI video support', starter: false, core: false, pro: true },
        { name: 'Priority AI responses', starter: false, core: false, pro: true },
      ]
    },
    {
      category: 'Professional Support',
      items: [
        { name: 'Add-on telehealth/RBT sessions', starter: false, core: 'À la carte', pro: 'Discounted' },
        { name: 'Monthly BCBA consultation', starter: false, core: false, pro: true },
        { name: 'Clinical reports (IEPs, progress)', starter: false, core: false, pro: true },
        { name: 'Provider-ready packets', starter: false, core: false, pro: true },
      ]
    },
    {
      category: 'Support & Features',
      items: [
        { name: 'Community access', starter: 'Read-only', core: 'Full access', pro: 'Full access' },
        { name: 'Early access to beta features', starter: false, core: false, pro: true },
        { name: 'Priority support', starter: false, core: false, pro: true },
        { name: 'White-glove assistance', starter: false, core: false, pro: true },
      ]
    }
  ];

  const renderCell = (value: string | boolean) => {
    if (value === true) {
      return <Check className="w-4 h-4 text-green-600 mx-auto" />;
    }
    if (value === false) {
      return <X className="w-4 h-4 text-gray-300 mx-auto" />;
    }
    return <span className="text-xs text-center text-primary font-medium">{value}</span>;
  };

  if (compact) {
    return (
      <Card className="p-4 overflow-x-auto">
        <div className="text-sm font-semibold text-primary mb-3 text-center">
          Quick Comparison
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-muted-foreground">Feature</th>
              <th className="text-center py-2 font-medium text-gray-700">Starter</th>
              <th className="text-center py-2 font-medium text-teal-700">Core</th>
              <th className="text-center py-2 font-medium text-gray-700">Pro Plus</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-muted-foreground">Daily activities</td>
              <td className="text-center">3</td>
              <td className="text-center font-medium">Adaptive</td>
              <td className="text-center font-medium">Adaptive</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-muted-foreground">Jr activities</td>
              <td className="text-center">1</td>
              <td className="text-center font-medium">All</td>
              <td className="text-center font-medium">All</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-muted-foreground">AI chat</td>
              <td className="text-center">Limited</td>
              <td className="text-center font-medium">Unlimited</td>
              <td className="text-center font-medium">Unlimited</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-muted-foreground">Video AI</td>
              <td className="text-center"><X className="w-3 h-3 text-gray-300 mx-auto" /></td>
              <td className="text-center"><X className="w-3 h-3 text-gray-300 mx-auto" /></td>
              <td className="text-center"><Check className="w-3 h-3 text-green-600 mx-auto" /></td>
            </tr>
            <tr>
              <td className="py-2 text-muted-foreground">BCBA consult</td>
              <td className="text-center"><X className="w-3 h-3 text-gray-300 mx-auto" /></td>
              <td className="text-center"><X className="w-3 h-3 text-gray-300 mx-auto" /></td>
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
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">Features</th>
              <th className="text-center py-4 px-4">
                <div className="font-semibold text-primary">Starter</div>
                <div className="text-xl sm:text-2xl font-bold text-primary mt-1">$19</div>
                <div className="text-xs text-muted-foreground">/month</div>
              </th>
              <th className="text-center py-4 px-4 bg-teal-50/50 relative">
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white text-xs">
                  Most Popular
                </Badge>
                <div className="font-semibold text-teal-700 mt-2">Core</div>
                <div className="text-xl sm:text-2xl font-bold text-teal-700 mt-1">$69</div>
                <div className="text-xs text-teal-600">/month</div>
              </th>
              <th className="text-center py-4 px-4">
                <div className="font-semibold text-primary">Pro Plus</div>
                <div className="text-xl sm:text-2xl font-bold text-primary mt-1">$229</div>
                <div className="text-xs text-muted-foreground">/month</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((category, catIndex) => (
              <React.Fragment key={catIndex}>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="py-3 px-4 font-semibold text-sm text-primary">
                    {category.category}
                  </td>
                </tr>
                {category.items.map((item, itemIndex) => (
                  <tr key={itemIndex} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.name}</td>
                    <td className="py-3 px-4 text-center">{renderCell(item.starter)}</td>
                    <td className="py-3 px-4 text-center bg-teal-50/30">{renderCell(item.core)}</td>
                    <td className="py-3 px-4 text-center">{renderCell(item.pro)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 sm:mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <p className="text-sm text-blue-800">
          <strong>All plans include:</strong> 7-day free trial • No credit card required • Cancel anytime • No diagnosis required
        </p>
      </div>
    </div>
  );
}
