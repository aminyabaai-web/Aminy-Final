// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderApplicationReview.tsx
 *
 * Admin panel for reviewing provider applications.
 * Shows pending applications, AI verification results, and allows approve/reject.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  User,
  Mail,
  Phone,
  Award,
  MapPin,
  Calendar,
  Briefcase,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  Filter,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import {
  reviewProviderApplication,
  type ProviderApplication,
  type AIVerificationResult,
} from '../../lib/auth-roles';

interface ProviderApplicationReviewProps {
  adminId: string;
}

type FilterStatus = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';

export function ProviderApplicationReview({ adminId }: ProviderApplicationReviewProps) {
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      let query = supabase
        .from('provider_applications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ProviderApplicationReview] Error loading:', error);
        setLoadError('Unable to load applications. Please check your database connection.');
        setApplications([]);
      } else {
        setApplications(data as ProviderApplication[] || []);
      }
    } catch (error) {
      console.error('[ProviderApplicationReview] Error:', error);
      setLoadError('Network error. Please try again.');
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (appId: string) => {
    setProcessingId(appId);
    try {
      const success = await reviewProviderApplication(appId, true, adminId);
      if (success) {
        setApplications(prev =>
          prev.map(app =>
            app.id === appId ? { ...app, status: 'approved' as const } : app
          )
        );
      }
    } catch (error) {
      console.error('[ProviderApplicationReview] Approve error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string) => {
    setProcessingId(appId);
    try {
      const success = await reviewProviderApplication(appId, false, adminId, rejectionReason);
      if (success) {
        setApplications(prev =>
          prev.map(app =>
            app.id === appId ? { ...app, status: 'rejected' as const, rejection_reason: rejectionReason } : app
          )
        );
      }
    } catch (error) {
      console.error('[ProviderApplicationReview] Reject error:', error);
    } finally {
      setProcessingId(null);
      setShowRejectionModal(null);
      setRejectionReason('');
    }
  };

  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.full_name.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query) ||
      app.license_number.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-700"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-neutral-100 text-neutral-700">{status}</Badge>;
    }
  };

  const getProviderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bcba: 'BCBA',
      bcaba: 'BCaBA',
      rbt: 'RBT',
      psychologist: 'Psychologist',
      therapist: 'Therapist',
      slp: 'SLP',
      ot: 'OT',
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#132F43] dark:text-white">
            Provider Applications
          </h2>
          <p className="text-[#5A6B7A] dark:text-slate-400 mt-1">
            Review and approve provider applications to join the marketplace
          </p>
        </div>
        <Button variant="outline" onClick={loadApplications}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{stats.pending}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('under_review')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{stats.underReview}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Under Review</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('approved')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{stats.approved}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Approved</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('rejected')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#132F43] dark:text-white">{stats.rejected}</p>
              <p className="text-sm text-[#5A6B7A] dark:text-slate-400">Rejected</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or license..."
            className="pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterStatus)}
          className="h-10 px-3 rounded-md border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          <option value="all">All Applications</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#6B9080]" />
          <p className="text-[#5A6B7A]">Loading applications...</p>
        </Card>
      ) : loadError ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-[#132F43] dark:text-white font-medium mb-2">Unable to Load Applications</p>
          <p className="text-[#5A6B7A] dark:text-slate-400 mb-4">{loadError}</p>
          <Button variant="outline" onClick={loadApplications}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
          <h3 className="font-medium text-[#132F43] dark:text-white mb-2">
            No applications found
          </h3>
          <p className="text-[#5A6B7A] dark:text-slate-400">
            {filter === 'all' ? 'No provider applications yet.' : `No ${filter.replace('_', ' ')} applications.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <Card key={app.id} className="overflow-hidden">
              {/* Application Header */}
              <div
                className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6B9080] to-[#7BA7BC] flex items-center justify-center text-white font-semibold">
                      {app.full_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-[#132F43] dark:text-white">
                          {app.full_name}
                        </h4>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-[#5A6B7A] dark:text-slate-400">
                        {getProviderTypeLabel(app.provider_type)} • {app.license_state} • Applied {formatDate(app.submitted_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* AI Verification Badge */}
                    {app.ai_verification_result && (
                      <div className={`px-3 py-1 rounded-full flex items-center gap-1 ${
                        app.ai_verification_result.license_valid
                          ? 'bg-green-100 text-green-700'
                          : app.ai_verification_result.confidence_score >= 0.6
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        <span className="text-sm font-medium">
                          {Math.round(app.ai_verification_result.confidence_score * 100)}% confidence
                        </span>
                      </div>
                    )}
                    {expandedApp === app.id ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedApp === app.id && (
                <div className="border-t border-neutral-200 dark:border-slate-700 p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact Info */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-[#132F43] dark:text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-[#6B9080]" />
                        Contact Information
                      </h5>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2 text-neutral-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          {app.email}
                        </p>
                        <p className="flex items-center gap-2 text-neutral-600 dark:text-slate-400">
                          <Phone className="w-4 h-4" />
                          {app.phone}
                        </p>
                      </div>
                    </div>

                    {/* Credentials */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-[#132F43] dark:text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#6B9080]" />
                        Credentials
                      </h5>
                      <div className="space-y-2 text-sm">
                        <p className="text-neutral-600 dark:text-slate-400">
                          <span className="font-medium">License:</span> {app.license_number} ({app.license_state})
                        </p>
                        <p className="text-neutral-600 dark:text-slate-400">
                          <span className="font-medium">Expires:</span> {app.license_expiry}
                        </p>
                        {app.npi_number && (
                          <p className="text-neutral-600 dark:text-slate-400">
                            <span className="font-medium">NPI:</span> {app.npi_number}
                          </p>
                        )}
                        <p className="text-neutral-600 dark:text-slate-400">
                          <span className="font-medium">Experience:</span> {app.years_experience} years
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div>
                    <h5 className="font-medium text-[#132F43] dark:text-white mb-2">Specialties</h5>
                    <div className="flex flex-wrap gap-2">
                      {app.specialties.map(s => (
                        <Badge key={s} className="bg-[#6B9080]/10 text-[#6B9080]">{s}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Bio */}
                  {app.bio && (
                    <div>
                      <h5 className="font-medium text-[#132F43] dark:text-white mb-2">Bio</h5>
                      <p className="text-sm text-neutral-600 dark:text-slate-400">{app.bio}</p>
                    </div>
                  )}

                  {/* AI Verification Details */}
                  {app.ai_verification_result && (
                    <div className={`p-4 rounded-lg ${
                      app.ai_verification_result.license_valid
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    }`}>
                      <h5 className="font-medium text-[#132F43] dark:text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        AI Verification Results
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[#5A6B7A] dark:text-slate-400">License Status</p>
                          <p className={`font-medium ${
                            app.ai_verification_result.license_status === 'active'
                              ? 'text-green-600'
                              : app.ai_verification_result.license_status === 'expired'
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }`}>
                            {app.ai_verification_result.license_status.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#5A6B7A] dark:text-slate-400">Name Match</p>
                          <p className={`font-medium ${
                            app.ai_verification_result.name_match ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {app.ai_verification_result.name_match ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#5A6B7A] dark:text-slate-400">Confidence</p>
                          <p className="font-medium text-[#132F43] dark:text-white">
                            {Math.round(app.ai_verification_result.confidence_score * 100)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[#5A6B7A] dark:text-slate-400">Verified At</p>
                          <p className="font-medium text-[#132F43] dark:text-white">
                            {formatDate(app.ai_verification_result.verified_at)}
                          </p>
                        </div>
                      </div>
                      {app.ai_verification_result.flags.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Flags:</p>
                          <ul className="space-y-1">
                            {app.ai_verification_result.flags.map((flag, i) => (
                              <li key={i} className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rejection reason if rejected */}
                  {app.status === 'rejected' && app.rejection_reason && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <h5 className="font-medium text-red-800 dark:text-red-300 mb-1">Rejection Reason</h5>
                      <p className="text-sm text-red-700 dark:text-red-400">{app.rejection_reason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {(app.status === 'pending' || app.status === 'under_review') && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectionModal(app.id)}
                        disabled={processingId === app.id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleApprove(app.id)}
                        disabled={processingId === app.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === app.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[#132F43] dark:text-white mb-4">
                Reject Application
              </h3>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
                Please provide a reason for rejection. This will be shared with the applicant.
              </p>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., License expired, unable to verify credentials, incomplete information..."
                rows={4}
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectionModal(null);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReject(showRejectionModal)}
                  disabled={!rejectionReason.trim() || processingId === showRejectionModal}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {processingId === showRejectionModal ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject Application
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ProviderApplicationReview;
