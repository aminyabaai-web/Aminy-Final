// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DocumentVaultElite — Elite Document Management
 * Screen: 'document-vault'
 * Category tabs, upload flow, share, expiry alerts, search, seeded demo docs
 */

import React, { useState, useMemo } from 'react';
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

const CARE_TEAM = ['Dr. Sarah Chen, BCBA', 'Katie Wilson, BCBA', 'Dr. Emily Park, SLP', 'School Case Manager'];

const SEEDED_DOCS: VaultDoc[] = [
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

const STORAGE_USED_GB = 2.3;

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
  const [docs, setDocs] = useState<VaultDoc[]>(SEEDED_DOCS);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<Exclude<DocCategory, 'all'>>('evaluations');
  const [uploadName, setUploadName] = useState('');
  const [shareModal, setShareModal] = useState<VaultDoc | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
      const matchesSearch = !searchQuery || doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.source.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [docs, activeCategory, searchQuery]);

  const expiringDocs = docs.filter((d) => d.isExpiring);

  const handleUpload = () => {
    if (!uploadName.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    const newDoc: VaultDoc = {
      id: `d${Date.now()}`,
      name: uploadName,
      category: uploadCategory,
      dateUploaded: new Date().toISOString().split('T')[0],
      source: 'Uploaded by parent',
      fileType: 'pdf',
      sizeKB: Math.floor(Math.random() * 500) + 100,
    };
    setDocs((prev) => [newDoc, ...prev]);
    setUploadName('');
    setShowUpload(false);
    toast.success('Document uploaded successfully!');
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
    <div className="min-h-screen bg-slate-50" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <div>
              <h1 className="text-base font-semibold text-slate-900">Document Vault</h1>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Lock className="w-3 h-3" />
                <span>Encrypted · HIPAA-compliant</span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowUpload(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 pb-16 space-y-4">

        {/* Storage indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{STORAGE_USED_GB} GB of unlimited storage used</span>
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
                <p key={d.id} className="text-xs text-amber-700 mt-0.5">
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
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <Camera className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>Scan your insurance card</strong> and we'll read it and pre-fill your coverage info automatically.
          </p>
          <button
            className="ml-auto text-xs text-blue-600 font-semibold shrink-0"
            onClick={() => toast.info('Camera scanner coming soon')}
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
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
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
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
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
                <Card className="p-3 bg-white border-slate-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    {/* File type icon */}
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-100">
                      <FileText className={`w-5 h-5 ${FILE_TYPE_COLORS[doc.fileType]}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 leading-snug truncate">{doc.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{doc.source}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">{formatDate(doc.dateUploaded)}</span>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-400">{formatSize(doc.sizeKB)}</span>
                            <span className="text-xs font-medium text-slate-500 uppercase">{doc.fileType}</span>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {doc.isExpiring && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0 border-0">
                              Expiring
                            </Badge>
                          )}
                          {doc.isShared && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0 border-0 flex items-center gap-0.5">
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
                          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>
                        <button
                          onClick={() => setShareModal(doc)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          <Share2 className="w-3 h-3" />
                          Share
                        </button>
                        <button
                          onClick={() => toast.success('Download started!')}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>

                      {/* Shared with */}
                      {doc.isShared && doc.sharedWith && doc.sharedWith.length > 0 && (
                        <p className="text-xs text-blue-500 mt-1.5 flex items-center gap-1">
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
                <h3 className="font-semibold text-slate-900">Upload Document</h3>
                <button onClick={() => setShowUpload(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Document name</label>
                  <input
                    type="text"
                    placeholder="e.g. Behavioral Assessment Report"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as Exclude<DocCategory, 'all'>)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
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
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-all"
                  onClick={() => toast.info('File picker coming soon')}
                >
                  <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Tap to select file</p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF, images, Word documents</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleUpload}>
                  Upload
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
                <h3 className="font-semibold text-slate-900">Share with provider</h3>
                <button onClick={() => setShareModal(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">{shareModal.name}</p>

              <div className="space-y-2 mb-4">
                {CARE_TEAM.map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedProvider === provider
                        ? 'border-teal-400 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-teal-700">{provider.charAt(0)}</span>
                    </div>
                    <span className="text-sm text-slate-800">{provider}</span>
                    {selectedProvider === provider && (
                      <CheckCircle className="w-4 h-4 text-teal-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShareModal(null)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleShare}>
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
