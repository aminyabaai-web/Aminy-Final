// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Provider Data Sharing Component
 *
 * Allows parents to securely share child data with providers
 * - FHIR-compatible export
 * - Time-limited share links
 * - Access control and audit logging
 */

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Link,
  Copy,
  Check,
  Clock,
  Eye,
  EyeOff,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  FileJson,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  createShareLink,
  validateShareLink,
  revokeShareLink,
  saveShareLink,
  getShareLinksForChild,
  createFHIRBundle,
  exportBundleAsJSON,
  generateProviderSummary,
  ShareLink,
  FHIRBundle,
  ProviderSummary,
} from '../lib/provider-api';
import { ChildProfile } from '../lib/child-profiles';

interface ProviderDataSharingProps {
  child: ChildProfile;
  userId: string;
  onClose?: () => void;
}

type TabType = 'share' | 'links' | 'export';

export const ProviderDataSharing: React.FC<ProviderDataSharingProps> = ({
  child,
  userId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('share');
  const [existingLinks, setExistingLinks] = useState<ShareLink[]>([]);
  const [copied, setCopied] = useState(false);
  const [newLink, setNewLink] = useState<ShareLink | null>(null);

  // Share form state
  const [accessLevel, setAccessLevel] = useState<'summary' | 'full' | 'clinical'>('summary');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [maxViews, setMaxViews] = useState(10);
  const [useAccessCode, setUseAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [providerEmail, setProviderEmail] = useState('');
  const [includeOptions, setIncludeOptions] = useState({
    patient: true,
    carePlan: true,
    goals: true,
    observations: false,
    insightNavigator: false,
  });

  // Export state
  const [exportFormat, setExportFormat] = useState<'fhir' | 'summary'>('fhir');
  const [exportPreview, setExportPreview] = useState<string | null>(null);

  useEffect(() => {
    loadExistingLinks();
  }, [child.id]);

  const loadExistingLinks = () => {
    const links = getShareLinksForChild(child.id);
    setExistingLinks(links.filter(l => !l.isRevoked && new Date(l.expiresAt) > new Date()));
  };

  const handleCreateLink = () => {
    const link = createShareLink(child.id, userId, {
      accessLevel,
      expiresInHours,
      maxViews,
      accessCode: useAccessCode ? accessCode : undefined,
      providerEmail: providerEmail || undefined,
      includePatient: includeOptions.patient,
      includeCarePlan: includeOptions.carePlan,
      includeGoals: includeOptions.goals,
      includeObservations: includeOptions.observations,
      includeInsightNavigator: includeOptions.insightNavigator,
    });

    saveShareLink(link);
    setNewLink(link);
    loadExistingLinks();
  };

  const handleRevokeLink = (link: ShareLink) => {
    const revoked = revokeShareLink(link);
    saveShareLink(revoked);
    loadExistingLinks();
    if (newLink?.id === link.id) {
      setNewLink(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareUrl = (linkId: string) => {
    return `${window.location.origin}/provider-view/${linkId}`;
  };

  const handleExport = () => {
    if (exportFormat === 'fhir') {
      const bundle = createFHIRBundle(child, {
        includePatient: includeOptions.patient,
        includeCarePlan: includeOptions.carePlan,
        includeGoals: includeOptions.goals,
        includeObservations: includeOptions.observations,
      });
      const json = exportBundleAsJSON(bundle);
      setExportPreview(json);
    } else {
      const summary = generateProviderSummary(child, child.insightNavigator);
      setExportPreview(JSON.stringify(summary, null, 2));
    }
  };

  const downloadExport = () => {
    if (!exportPreview) return;

    const filename = exportFormat === 'fhir'
      ? `${child.firstName}-fhir-bundle-${new Date().toISOString().split('T')[0]}.json`
      : `${child.firstName}-provider-summary-${new Date().toISOString().split('T')[0]}.json`;

    const blob = new Blob([exportPreview], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatExpiry = (expiresAt: string) => {
    const hours = Math.round((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${hours} hours`;
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const accessLevelDescriptions = {
    summary: 'Basic profile, current goals, and recent progress only',
    full: 'Complete profile including care plan, routines, and detailed history',
    clinical: 'Full clinical data including observations and provider notes',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Share {child.firstName}'s Data</h2>
              <p className="text-sm text-teal-100">Securely share with providers</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex">
        <button
          onClick={() => setActiveTab('share')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'share'
              ? 'text-[#6B9080] border-b-2 border-[#6B9080]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link className="w-4 h-4 inline mr-1.5" />
          Create Link
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'links'
              ? 'text-[#6B9080] border-b-2 border-[#6B9080]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />
          Active Links ({existingLinks.length})
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'export'
              ? 'text-[#6B9080] border-b-2 border-[#6B9080]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileJson className="w-4 h-4 inline mr-1.5" />
          Export
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        {/* Create Link Tab */}
        {activeTab === 'share' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Success state - show new link */}
            {newLink && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">Share link created!</p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getShareUrl(newLink.id)}
                        className="flex-1 text-sm bg-white border rounded px-3 py-2"
                      />
                      <button
                        onClick={() => copyToClipboard(getShareUrl(newLink.id))}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Expires in {formatExpiry(newLink.expiresAt)}
                      {newLink.accessCode && ' - PIN protected'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Access Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level
              </label>
              <div className="space-y-2">
                {(['summary', 'full', 'clinical'] as const).map((level) => (
                  <label
                    key={level}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      accessLevel === level
                        ? 'border-[#6B9080] bg-[#6B9080]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessLevel"
                      value={level}
                      checked={accessLevel === level}
                      onChange={(e) => setAccessLevel(e.target.value as typeof accessLevel)}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium capitalize">{level}</span>
                      <p className="text-sm text-gray-500">{accessLevelDescriptions[level]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Data to Include */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Data
              </label>
              <div className="space-y-2">
                {[
                  { key: 'patient', label: 'Basic Profile', desc: 'Name, age, conditions' },
                  { key: 'carePlan', label: 'Care Plan', desc: 'Routines and strategies' },
                  { key: 'goals', label: 'Goals', desc: 'Current goals and progress' },
                  { key: 'observations', label: 'Observations', desc: 'Detailed tracking data' },
                  { key: 'insightNavigator', label: 'Insight Navigator', desc: 'Full history and insights' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-3 p-2">
                    <input
                      type="checkbox"
                      checked={includeOptions[key as keyof typeof includeOptions]}
                      onChange={(e) =>
                        setIncludeOptions((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="rounded text-[#6B9080]"
                    />
                    <div>
                      <span className="font-medium">{label}</span>
                      <span className="text-sm text-gray-500 ml-2">{desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Expiration
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
                <option value={336}>2 weeks</option>
                <option value={720}>30 days</option>
              </select>
            </div>

            {/* Max Views */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Views
              </label>
              <select
                value={maxViews}
                onChange={(e) => setMaxViews(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value={1}>1 view</option>
                <option value={5}>5 views</option>
                <option value={10}>10 views</option>
                <option value={25}>25 views</option>
                <option value={100}>100 views</option>
              </select>
            </div>

            {/* PIN Protection */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAccessCode}
                  onChange={(e) => setUseAccessCode(e.target.checked)}
                  className="rounded text-[#6B9080]"
                />
                <span className="font-medium">Add PIN protection</span>
              </label>
              {useAccessCode && (
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 4-6 digit PIN"
                  className="mt-2 w-full border rounded-lg px-3 py-2"
                  maxLength={6}
                />
              )}
            </div>

            {/* Provider Email (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Email (optional)
              </label>
              <input
                type="email"
                value={providerEmail}
                onChange={(e) => setProviderEmail(e.target.value)}
                placeholder="provider@clinic.com"
                className="w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send them a notification when you create the link
              </p>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateLink}
              disabled={useAccessCode && accessCode.length < 4}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-[#6B9080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Link className="w-5 h-5" />
              Create Share Link
            </button>
          </div>
        )}

        {/* Active Links Tab */}
        {activeTab === 'links' && (
          <div className="space-y-3 sm:space-y-4">
            {existingLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active share links</p>
                <button
                  onClick={() => setActiveTab('share')}
                  className="mt-2 text-[#6B9080] hover:underline"
                >
                  Create your first link
                </button>
              </div>
            ) : (
              existingLinks.map((link) => {
                const validation = validateShareLink(link);
                return (
                  <div
                    key={link.id}
                    className="border rounded-xl p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{link.accessLevel}</span>
                          {link.accessCode && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3 inline mr-1" />
                              PIN
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {link.viewCount} of {link.maxViews} views used
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(getShareUrl(link.id))}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-[#F0EDE8] rounded-lg transition-colors"
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRevokeLink(link)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Revoke link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 sm:gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires in {formatExpiry(link.expiresAt)}
                      </span>
                      {link.providerEmail && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {link.providerEmail}
                        </span>
                      )}
                    </div>
                    {link.lastAccessedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last accessed: {new Date(link.lastAccessedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setExportFormat('fhir')}
                  className={`p-4 border rounded-xl text-left transition-colors ${
                    exportFormat === 'fhir'
                      ? 'border-[#6B9080] bg-[#6B9080]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileJson className="w-6 h-6 text-[#6B9080] mb-2" />
                  <p className="font-medium">FHIR R4 Bundle</p>
                  <p className="text-sm text-gray-500">Healthcare interoperability standard</p>
                </button>
                <button
                  onClick={() => setExportFormat('summary')}
                  className={`p-4 border rounded-xl text-left transition-colors ${
                    exportFormat === 'summary'
                      ? 'border-[#6B9080] bg-[#6B9080]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-6 h-6 text-[#6B9080] mb-2" />
                  <p className="font-medium">Provider Summary</p>
                  <p className="text-sm text-gray-500">Human-readable quick start guide</p>
                </button>
              </div>
            </div>

            {/* Data to Include (reuse from share) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Data
              </label>
              <div className="space-y-2">
                {[
                  { key: 'patient', label: 'Patient Resource' },
                  { key: 'carePlan', label: 'CarePlan Resource' },
                  { key: 'goals', label: 'Goal Resources' },
                  { key: 'observations', label: 'Observation Resources' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeOptions[key as keyof typeof includeOptions]}
                      onChange={(e) =>
                        setIncludeOptions((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="rounded text-[#6B9080]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleExport}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-[#6B9080] transition-colors flex items-center justify-center gap-2"
            >
              <FileJson className="w-5 h-5" />
              Generate Export
            </button>

            {/* Preview */}
            {exportPreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-700">Export Preview</h4>
                  <button
                    onClick={downloadExport}
                    className="flex items-center gap-1 text-sm text-[#6B9080] hover:text-[#6B9080]"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <pre className="bg-[#FAF7F2] border rounded-lg p-4 text-xs overflow-auto max-h-64 font-mono">
                  {exportPreview.slice(0, 2000)}
                  {exportPreview.length > 2000 && '\n\n... (truncated for preview)'}
                </pre>
              </div>
            )}

            {/* FHIR Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                About FHIR Exports
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                FHIR (Fast Healthcare Interoperability Resources) is the standard for exchanging
                healthcare data. These exports can be imported into EHR systems and other
                FHIR-compatible applications.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 sm:px-6 py-3 sm:py-4 bg-[#FAF7F2]">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-4 h-4" />
          <span>
            All shared data is encrypted and access is logged. You can revoke access at any time.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProviderDataSharing;
