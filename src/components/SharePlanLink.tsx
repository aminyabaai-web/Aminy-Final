// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Link, Copy, Mail, Check, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface SharePlanLinkProps {
  tier: 'pro' | 'pro-plus';
  onGenerateLink: (expiryDays: number) => Promise<string>;
}

export function SharePlanLink({ tier, onGenerateLink }: SharePlanLinkProps) {
  const [expiryDays, setExpiryDays] = useState(30);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    const link = await onGenerateLink(expiryDays);
    setGeneratedLink(link);
    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const subject = 'Shared Care Plan - Aminy';
    const body = `Here's a link to view the care plan:\n\n${generatedLink}\n\nThis link will expire in ${expiryDays} days.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Share Care Plan</h3>
        {tier === 'pro-plus' && (
          <Badge className="bg-purple-100 text-purple-700">
            Pro Plus
          </Badge>
        )}
      </div>

      {!generatedLink ? (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <Label>Link Expiry</Label>
            <select
              className="w-full p-2 border rounded-lg mt-2"
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          <div className="p-3 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">Time-Limited Access</p>
            </div>
            <p className="text-sm text-blue-700">
              The link will expire after {expiryDays} days for security
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            <Link className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Share Link'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <Label>Share Link</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={generatedLink}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                aria-label={copied ? "Link copied" : "Copy link to clipboard"}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Link
            </Button>
            <Button
              variant="outline"
              onClick={() => setGeneratedLink('')}
            >
              New Link
            </Button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              This link will expire on {new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
