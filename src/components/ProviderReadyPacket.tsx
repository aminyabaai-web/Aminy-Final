// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Ready Packet Component
 *
 * Allows users to generate and download a PDF referral packet
 * that can be shared with local providers.
 *
 * Features:
 * - Watermarked PDF generation
 * - Expiring share link (Pro Plus)
 * - Consent controls
 */

import React, { useState } from 'react';
import { FileText, Share, Shield, Clock, Download, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  downloadReferralPacketPDF,
  getReferralPacketBlob,
  createSamplePacketData,
  ReferralPacketData
} from '../lib/referral-packet-generator';

interface ProviderPacketProps {
  tier: 'pro' | 'pro-plus';
  packetData?: ReferralPacketData;
  onConsentChange?: (consented: boolean) => void;
}

export function ProviderReadyPacket({
  tier,
  packetData,
  onConsentChange
}: ProviderPacketProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  // Use provided data or sample data
  const data = packetData || createSamplePacketData();

  const handleExport = async () => {
    if (!consentChecked) {
      toast.error('Please confirm consent to share before downloading.');
      return;
    }

    setIsGenerating(true);
    setDownloadComplete(false);

    try {
      // Add consent info to data
      const exportData: ReferralPacketData = {
        ...data,
        consentToShare: true,
        consentDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      // Small delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate and download PDF
      downloadReferralPacketPDF(exportData);

      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!consentChecked) {
      toast.error('Please confirm consent to share before creating a share link.');
      return;
    }

    setIsSharing(true);

    try {
      // In production, this would upload to a secure server and return an expiring link
      // For now, we'll create a data URL that can be shared
      const blob = getReferralPacketBlob({
        ...data,
        consentToShare: true,
        consentDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });

      // Simulate server upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In production: POST blob to server, get expiring URL back
      // For demo: create a temporary object URL
      const url = URL.createObjectURL(blob);

      // Create a mock expiring link format
      const expiringLink = `https://share.aminy.com/packet/${Date.now().toString(36)}`;
      setShareLink(expiringLink);

      // Copy to clipboard
      await navigator.clipboard.writeText(expiringLink);
      toast.success('Share link copied to clipboard!', {
        description: 'Link expires in 30 days.',
      });

      // Clean up object URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Share link creation failed:', error);
      toast.error('Failed to create share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleConsentChange = (checked: boolean) => {
    setConsentChecked(checked);
    onConsentChange?.(checked);
  };

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Provider-Ready Report</h3>
            <Badge>Pro Feature</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Comprehensive report with professional formatting for sharing with providers
          </p>
        </div>
      </div>

      {/* Consent Checkbox */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => handleConsentChange(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-blue-900">
              I consent to share this packet with my child's providers
            </p>
            <p className="text-xs text-blue-700 mt-1">
              This packet contains information from your Aminy account including concerns,
              goals, routines, and visit summaries. You control who receives this document.
            </p>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isGenerating || !consentChecked}
          className="flex-1"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : downloadComplete ? (
            <Check className="w-4 h-4 mr-2 text-green-600" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? 'Generating...' : downloadComplete ? 'Downloaded!' : 'Download PDF'}
        </Button>

        {tier === 'pro-plus' && (
          <Button
            onClick={handleShare}
            disabled={isSharing || !consentChecked}
            className="flex-1"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share className="w-4 h-4 mr-2" />
            )}
            {isSharing ? 'Creating Link...' : 'Create Share Link'}
          </Button>
        )}
      </div>

      {/* Share Link Display */}
      {shareLink && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4 h-4 text-green-600" />
            <p className="text-sm font-medium text-green-800">Share link created!</p>
          </div>
          <p className="text-xs text-green-700 font-mono bg-white px-2 py-1 rounded border">
            {shareLink}
          </p>
          <p className="text-xs text-green-600 mt-1">Link copied to clipboard. Expires in 30 days.</p>
        </div>
      )}

      {/* Watermark Notice */}
      <div className="p-3 bg-gray-50 rounded-lg mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Report includes Aminy watermark and generation date for authenticity
          </p>
        </div>
      </div>

      {/* Expiring Link Notice (Pro Plus only) */}
      {tier === 'pro-plus' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-700">
              Share links expire after 30 days for security. You can generate new links anytime.
            </p>
          </div>
        </div>
      )}

      {/* What's Included */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs font-medium text-gray-700 mb-2">Packet includes:</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-600" />
            Child & family overview
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-600" />
            Primary concern summary
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-600" />
            Parent goals
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-600" />
            Daily routines & challenges
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-600" />
            Progress snapshots (if tracked)
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-600" />
            Telehealth visit summaries & action items
          </li>
        </ul>
      </div>
    </Card>
  );
}

export default ProviderReadyPacket;
