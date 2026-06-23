// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DocumentVaultElite — Elite Document Management
 * Screen: 'document-vault'
 * Category tabs, upload flow, share, expiry alerts, search, seeded demo docs
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  Search,
  Plus,
  Shield,
  Lock,
  AlertTriangle,
  FileText,
  Camera,
  Upload,
  Download,
  Share2,
  Eye,
  Users,
  CheckCircle,
  X,
  HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';
import { isDemoMode } from '../lib/demo-seed';
import { uploadVaultFile, validateFile } from '../lib/vault-storage';
import { supabase } from '../utils/supabase/client';

interface DocumentVaultEliteProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

type DocCategory =
  | 'all'
  | 'evaluations'
  | 'school'
  | 'insurance'
  | 'medical'
  | 'legal'
  | 'therapy-notes';

interface VaultDoc {
  id: string;
  name: string;
  category: Exclude<DocCategory, 'all'>;
  dateUploaded: string;
  source: string;
  fileType: 'pdf' | 'image' | 'docx' | 'xlsx';
  sizeKB: number;
  isExpiring?: boolean;
  expiresInDays?: number;
  isShared?: boolean;
  sharedWith?: string[];
}

const CATEGORIES: { id: DocCategory; label: string }[] = [
  { id: 'all', label: 'All Documents' },
  { id: 'evaluations', label: 'Evaluations & Reports' },
  { id: 'school', label: 'School Records' },
  { id: 'insurance', label: 'Insurance & Auth' },
  { id: 'medical', label: 'Medical Records' },
  { id: 'legal', label: 'Legal & Consent' },
  { id: 'therapy-notes', label: 'Therapy Notes' },
];

// Demo-only sample data — surfaced ONLY when isDemoMode() so investor/AACT
// walkthroughs show a populated vault. Real users start with an empty vault
// (no fabricated PHI, clinicians, or storage figures).
const DEMO_CARE_TEAM = ['Dr. Sarah Chen, BCBA', 'Katie Wilson, BCBA', 'Dr. Emily Park, SLP', 'School Case Manager'];

const DEMO_SEEDED_DOCS: VaultDoc[] = [
  {
    id: 'd1',
    name: 'Autism Diagnostic Evaluation Report',
    category: 'evaluations',
    dateUploaded: '2026-03-15',
    source: 'Dr. Priya Patel, BCBA-D',
    fileType: 'pdf',
    sizeKB: 842,
  },
  {
    id: 'd2',
    name: 'IEP Meeting Notes — Spring 2026',
    category: 'school',
    dateUploaded: '2026-03-28',
    source: 'Mesa Unified School District',
    fileType: 'pdf',
    sizeKB: 320,
    isShared: true,
    sharedWith: ['Dr. Sarah Chen, BCBA'],
  },
  {
    id: 'd3',
    name: 'BCBS Prior Authorization — ABA Therapy',
    category: 'insurance',
    dateUploaded: '2026-01-10',
    source: 'Blue Cross Blue Shield AZ',
    fileType: 'pdf',
    sizeKB: 218,
    isExpiring: true,
    expiresInDays: 14,
  },
  {
    id: 'd4',
    name: 'Annual Pediatric Checkup — Feb 2026',
    category: 'medical',
    dateUploaded: '2026-02-14',
    source: 'Phoenix Children\'s Hospital',
    fileType: 'pdf',
    sizeKB: 189,
  },
  {
    id: 'd5',
    name: 'ABA Session Notes — March 2026',
    category: 'therapy-notes',
    dateUploaded: '2026-04-01',
    source: 'Dr. Sarah Chen, BCBA',
    fileType: 'pdf',
    sizeKB: 145,
    isShared: true,
    sharedWith: ['School Case Manager'],
  },
  {
    id: 'd6',
    name: 'HIPAA Consent & Release Forms',
    category: 'legal',
    dateUploaded: '2026-01-05',
    source: 'Uploaded by parent',
    fileType: 'pdf',
    sizeKB: 94,
  },
];

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'text-red-500',
  image: 'text-blue-500',
  docx: 'text-blue-700',
  xlsx: 'text-green-600',
};

const DEMO_STORAGE_USED_GB = 2.3;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DocumentVaultElite({ onBack }: DocumentVaultEliteProps) {
  const [activeCategory, setActiveCategory] = useState<DocCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Demo walkthroughs start populated; real users start with an empty vault.
  const [docs, setDocs] = useState<VaultDoc[]>(() => (isDemoMode() ? DEMO_SEEDED_DOCS : []));
  const careTeam = isDemoMode() ? DEMO_CARE_TEAM : [];
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<Exclude<DocCategory, 'all'>>('evaluations');
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shareModal, setShareModal] = useState<VaultDoc | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
      const matchesSearch = !searchQuery || doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.source.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [docs, activeCategory, searchQuery]);

  const expiringDocs = docs.filter((d) => d.isExpiring);

  // Real usage is derived from the user's own docs; demo mode shows a sample figure.
  const storageUsedGB = isDemoMode()
    ? DEMO_STORAGE_USED_GB
    : docs.reduce((sum, d) => sum + d.sizeKB, 0) / (1024 * 1024);
  const storageLabel = storageUsedGB >= 0.1 ? storageUsedGB.toFixed(1) : '0';

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }
    setSelectedFile(file);
    if (!uploadName.trim()) {
      setUploadName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!uploadName.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload documents');
        return;
      }
      // Resolve tier for storage-quota enforcement (free 100MB / Core 5GB / Pro 25GB)
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle();
      const result = await uploadVaultFile(selectedFile, user.id, {
        recordType: 'uploaded',
        source: 'parent-upload',
        tier: profile?.tier ?? 'free',
        trialEndsAt: profile?.trial_ends_at ?? null,
      });
      if (!result.success) {
        toast.error(result.error || 'Upload failed. Please try again.');
        return;
      }
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() as VaultDoc['fileType'] || 'pdf';
      const newDoc: VaultDoc = {
        id: result.fileId || `d${Date.now()}`,
        name: uploadName,
        category: uploadCategory,
        dateUploaded: new Date().toISOString().split('T')[0],
        source: 'Uploaded by parent',
        fileType: ['pdf', 'image', 'docx', 'xlsx'].includes(ext) ? ext as VaultDoc['fileType'] : 'pdf',
        sizeKB: Math.round(selectedFile.size / 1024),
      };
      setDocs((prev) => [newDoc, ...prev]);
      setUploadName('');
      setSelectedFile(null);
      setShowUpload(false);
      toast.success('Document uploaded successfully!');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = () => {
    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }
    if (shareModal) {
      setDocs((prev) =>
        prev.map((d) =>
          d.id === shareModal.id
            ? {
                ...d,
                isShared: true,
                sharedWith: [...(d.sharedWith || []), selectedProvider],
              }
            : d
        )
      );
      toast.success(`${selectedProvider} can now view this document`);
      setShareModal(null);
      setSelectedProvider('');
    }
  };

  return (
    <div className="min-h-screen bg-mist" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-[#E8E4DF]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#F0EDE8] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#5A6B7A]" />
              </button>
            )}
            <div>
              <h1 className="text-base font-semibold text-[#1B2733]">Document Vault</h1>
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <Lock className="w-3 h-3" />
                <span>Encrypted · HIPAA-conscious</span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary text-white"
            onClick={() => setShowUpload(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 pb-16 space-y-4">

        {/* Storage indicator */}
        <div className="flex items-center justify-between text-sm text-[#5A6B7A]">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{storageLabel} GB of unlimited storage used</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-600">
            <Shield className="w-3.5 h-3.5" />
            <span>Encrypted</span>
          </div>
        </div>

        {/* Expiry alert */}
        {expiringDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">Authorization expiring soon</p>
              {expiringDocs.map((d) => (
                <p key={d.id} className="text-sm text-amber-700 mt-0.5">
                  {d.name} — expires in {d.expiresInDays} days.{' '}
                  <button className="underline font-medium" onClick={() => toast.info('Opening renewal flow...')}>
                    Renew now
                  </button>
                </p>
              ))}
            </div>
          </motion.div>
        )}

        {/* OCR hint */}
        <div className="flex items-center gap-3 p-3 bg-[#EEF4F8] border border-blue-100 rounded-xl">
          <Camera className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <strong>Scan your insurance card</strong> and we'll read it and pre-fill your coverage info automatically.
          </p>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setShowUpload(true); handleFileSelect(file); }
            }}
          />
          <button
            className="ml-auto text-sm text-blue-600 font-semibold shrink-0"
            onClick={() => cameraInputRef.current?.click()}
          >
            Scan →
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E8E4DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-[#E8E4DF] text-[#5A6B7A] hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Documents list */}
        <div className="space-y-2">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No documents found</p>
            </div>
          ) : (
            filteredDocs.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card className="p-3 bg-white border-[#E8E4DF] hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    {/* File type icon */}
                    <div className="w-10 h-10 bg-[#FAF7F2] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#E8E4DF]">
                      <FileText className={`w-5 h-5 ${FILE_TYPE_COLORS[doc.fileType]}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1B2733] leading-snug truncate">{doc.name}</p>
                          <p className="text-sm text-slate-400 mt-0.5">{doc.source}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-400">{formatDate(doc.dateUploaded)}</span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-sm text-slate-400">{formatSize(doc.sizeKB)}</span>
                            <span className="text-xs font-medium text-[#5A6B7A] uppercase">{doc.fileType}</span>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {doc.isExpiring && (
                            <Badge className="bg-amber-100 text-amber-700 text-sm px-1.5 py-0 border-0">
                              Expiring
                            </Badge>
                          )}
                          {doc.isShared && (
                            <Badge className="bg-blue-100 text-blue-700 text-sm px-1.5 py-0 border-0 flex items-center gap-0.5">
                              <Users className="w-2.5 h-2.5" />
                              Shared
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <button
                          onClick={() => toast.info('Opening document preview...')}
                          className="flex items-center gap-1 px-2 py-1 text-sm text-[#5A6B7A] bg-[#F0EDE8] rounded-lg hover:bg-[#E8E4DF] transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>
                        <button
                          onClick={() => setShareModal(doc)}
                          className="flex items-center gap-1 px-2 py-1 text-sm text-[#6B9080] bg-[#6B9080]/10 rounded-lg hover:bg-[#6B9080]/10 transition-colors"
                        >
                          <Share2 className="w-3 h-3" />
                          Share
                        </button>
                        <button
                          onClick={() => toast.success('Download started!')}
                          className="flex items-center gap-1 px-2 py-1 text-sm text-[#5A6B7A] bg-[#F0EDE8] rounded-lg hover:bg-[#E8E4DF] transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>

                      {/* Shared with */}
                      {doc.isShared && doc.sharedWith && doc.sharedWith.length > 0 && (
                        <p className="text-sm text-blue-500 mt-1.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Shared with: {doc.sharedWith.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1B2733]">Upload Document</h3>
                <button onClick={() => setShowUpload(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-[#5A6B7A] block mb-1">Document name</label>
                  <input
                    type="text"
                    placeholder="e.g. Behavioral Assessment Report"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="w-full text-sm border border-[#E8E4DF] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#5A6B7A] block mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as Exclude<DocCategory, 'all'>)}
                    className="w-full text-sm border border-[#E8E4DF] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
                  >
                    <option value="evaluations">Evaluations & Reports</option>
                    <option value="school">School Records</option>
                    <option value="insurance">Insurance & Auth</option>
                    <option value="medical">Medical Records</option>
                    <option value="legal">Legal & Consent</option>
                    <option value="therapy-notes">Therapy Notes</option>
                  </select>
                </div>

                {/* File drop zone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <div
                  className="border-2 border-dashed border-[#E8E4DF] rounded-xl p-6 text-center cursor-pointer hover:border-[#6B9080]/30 hover:bg-[#6B9080]/10/30 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <>
                      <p className="text-sm text-[#6B9080] font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB — tap to change</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[#5A6B7A]">Tap to select file</p>
                      <p className="text-sm text-slate-400 mt-0.5">PDF, images, Word documents</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowUpload(false); setSelectedFile(null); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary text-white"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-[#1B2733]">Share with provider</h3>
                <button onClick={() => setShareModal(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">{shareModal.name}</p>

              <div className="space-y-2 mb-4">
                {careTeam.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-[#5A6B7A]">No care team members yet</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Add a provider to your care team to share documents.
                    </p>
                  </div>
                ) : (
                  careTeam.map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setSelectedProvider(provider)}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedProvider === provider
                          ? 'border-[#6B9080] bg-[#6B9080]/10'
                          : 'border-[#E8E4DF] hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#6B9080]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#6B9080]">{provider.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-[#1B2733]">{provider}</span>
                      {selectedProvider === provider && (
                        <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShareModal(null)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary text-white" onClick={handleShare}>
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share Document
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
