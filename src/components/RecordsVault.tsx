// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { logPHIView } from '../lib/security/hipaa-audit';
import { AISparkleButton } from './AISparkleButton';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { 
  Plus,
  Search,
  Upload,
  Camera,
  FileText,
  FileIcon,
  Eye,
  Download,
  Trash2,
  Shield,
  X,
  Filter,
  Share,
  Link,
  Target,
  User,
  CheckCircle2,
  Copy,
  ExternalLink,
  Calendar,
  Tag,
  Edit,
  SortAsc,
  SortDesc,
  Globe,
  Lock,
  Clock,
  Users,
  ChevronDown
} from 'lucide-react';
import type { VaultRecord } from '../types/vault';
import { useStorage } from '../lib/useStorage';
import { uploadVaultFile, listVaultDocuments, deleteVaultDocument, getVaultDocumentUrl } from '../lib/vault-storage';
import type { VaultRecordType } from '../lib/vault-storage';
import { checkAndAwardBadges } from '../lib/badge-service';
import { supabase } from '../utils/supabase/client';
import { useAuditedAction } from '../hooks/useAuditedAction';

// Enhanced types for the vault implementation
interface EnhancedVaultRecord extends Omit<VaultRecord, 'type' | 'source' | 'visibility'> {
  type: 'IEP' | 'Evaluation' | 'Report' | 'Prescription/Order' | 'Care Plan' | 'Uploaded (Parent)' | 'Coach Note (PDF)' | 'Session Artifact' | 'School Letter' | 'Other';
  source: 'Parent Upload' | 'Junior' | 'Ease' | 'Coach' | 'School' | 'Clinic' | 'Other';
  docDate?: string;
  visibility: 'Private' | 'Shared';
  relatedTo: Array<{
    id: string;
    type: 'Goal' | 'Routine' | 'Strategy';
    title: string;
  }>;
  notes?: string;
  files: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>;
  shareSettings?: {
    hasShareLink: boolean;
    shareId?: string;
    expiresAt?: string;
    hasWatermark: boolean;
    hasPasscode: boolean;
    passcode?: string;
    audienceLabel?: string;
    viewLog: Array<{
      viewedBy: string;
      viewedAt: string;
      ipAddress?: string;
    }>;
  };
  status: 'Active' | 'Archived';
  ocrStatus: 'Processing' | 'Complete' | 'Failed' | 'None';
  filePath?: string;
  vaultText?: string;
  hasSignatures?: boolean;
  hasImages?: boolean;
  hasAudio?: boolean;
  extractedFields?: {
    studentName?: string;
    docDate?: string;
    district?: string;
    services?: string[];
  };
}

export interface RecordsVaultProps {
  onClose?: () => void;
  onBack?: () => void;
  vaultRecords?: VaultRecord[];
  publishEvent?: (eventName: string, payload: Record<string, unknown>) => void;
  connectorData?: Record<string, unknown>;
  setConnectorData?: (data: Record<string, unknown>) => void;
  userTier?: 'starter' | 'core' | 'pro';
  childId?: string;
  records?: VaultRecord[];
  onRecordAdded?: (record: VaultRecord) => void;
  onRecordUpdated?: (record: VaultRecord) => void;
  onRecordDeleted?: (recordId: string) => void;
}

const RECORD_TYPES = [
  'IEP',
  'Evaluation', 
  'Report',
  'Prescription/Order',
  'Care Plan',
  'Uploaded (Parent)',
  'Coach Note (PDF)',
  'Session Artifact',
  'School Letter',
  'Other'
] as const;

const SOURCE_TYPES = [
  'Parent Upload',
  'Ease',
  'Junior',
  'Coach', 
  'School',
  'Clinic',
  'Other'
] as const;

function getSourceLabel(source: EnhancedVaultRecord['source']): string {
  return source === 'Junior' ? 'Ease' : source;
}

// Record Row Component
interface RecordRowProps {
  record: EnhancedVaultRecord;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onShare: () => void;
  userTier: string;
}

const RecordRow: React.FC<RecordRowProps> = ({
  record,
  selected,
  onSelect,
  onView,
  onShare,
  userTier
}) => {
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('image')) return <FileIcon className="w-4 h-4 text-[#577590]" />;
    return <FileIcon className="w-4 h-4 text-[#5A6B7A]" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={selected}
          onCheckedChange={onSelect}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getFileIcon(record.files[0]?.type || '')}
                <h3 className="font-medium text-foreground truncate">{record.title}</h3>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {record.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {record.visibility === 'Private' ? (
                      <><Lock className="w-3 h-3 mr-1" />Private</>
                    ) : (
                      <><Globe className="w-3 h-3 mr-1" />Shared</>
                    )}
                  </Badge>
                  {record.ocrStatus === 'Complete' && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                      Searchable
                    </Badge>
                  )}
                  {userTier === 'pro' && record.extractedFields && (
                    <Badge variant="outline" className="text-xs">
                      AI Summary Available
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground mb-2">
                <span>Source: {getSourceLabel(record.source)}</span>
                <span>•</span>
                <span>{new Date(record.date).toLocaleDateString()}</span>
                <span>•</span>
                <span>{formatFileSize(record.files[0]?.size || 0)}</span>
                {record.relatedTo.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Linked to {record.relatedTo.length} goal{record.relatedTo.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onView}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onShare}>
                <Share className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {record.relatedTo.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Linked to:</span>
              {record.relatedTo.slice(0, 3).map((link) => (
                <Badge key={link.id} variant="outline" className="text-xs">
                  {link.title}
                </Badge>
              ))}
              {record.relatedTo.length > 3 && (
                <span className="text-xs text-muted-foreground">+{record.relatedTo.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Share Modal Component
interface ShareModalProps {
  record: EnhancedVaultRecord;
  isOpen: boolean;
  onClose: () => void;
  userTier: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ record, isOpen, onClose, userTier }) => {
  const [shareLink, setShareLink] = useState('');
  const [expiresIn, setExpiresIn] = useState('30');
  const [hasPasscode, setHasPasscode] = useState(false);
  const [hasWatermark, setHasWatermark] = useState(true);
  const [audienceLabel, setAudienceLabel] = useState('');

  const generateShareLink = async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn, 10));

    const { data, error } = await supabase
      .from('vault_share_links')
      .insert({
        document_id: record.id,
        expires_at: expiresAt.toISOString(),
        passcode: hasPasscode ? crypto.randomUUID().slice(0, 8) : null,
      })
      .select('id')
      .single();

    if (error || !data) {
      toast.error('Could not create share link. Please try again.');
      return;
    }

    const link = `${window.location.origin}/shared/${data.id}`;
    setShareLink(link);
    toast.success('Secure share link created • Expires in ' + expiresIn + ' days');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Record</DialogTitle>
          <DialogDescription>
            Create a secure link to share "{record.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <Label>Expires in</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Add watermark</Label>
            <Switch 
              checked={hasWatermark} 
              onCheckedChange={setHasWatermark}
              aria-label="Add watermark to exported documents"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Require passcode</Label>
            <Switch 
              checked={hasPasscode} 
              onCheckedChange={setHasPasscode}
              aria-label="Require passcode for document access"
            />
          </div>
          
          <div>
            <Label>For (optional)</Label>
            <Input 
              placeholder="e.g., Teacher, Provider, Family"
              value={audienceLabel}
              onChange={(e) => setAudienceLabel(e.target.value)}
              className="mt-1"
            />
          </div>
          
          {shareLink && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <code className="text-xs truncate flex-1 mr-2">{shareLink}</code>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    toast.success('Link copied to clipboard');
                  }}
                  aria-label="Copy share link to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={generateShareLink}>
              {shareLink ? 'Update Link' : 'Create Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export const RecordsVault: React.FC<RecordsVaultProps> = ({
  onClose,
  onBack,
  vaultRecords = [],
  publishEvent,
  connectorData,
  setConnectorData,
  userTier = 'core'
}) => {
  // HIPAA audit: log vault file access view on mount
  const { logAction } = useAuditedAction('vault_file');

  // Use onClose if provided, otherwise fall back to onBack
  const handleClose = onClose || onBack;

  // ─── Real data from Supabase ───────────
  const [records, setRecords] = useState<EnhancedVaultRecord[]>([]);
  // Use storage hook for unified storage information.
  // Pass the real records so usedBytes is computed from actual files —
  // an empty vault reads "0.0 GB used" instead of a fabricated mock value.
  const { usedBytes, quotaBytes, planTier, capabilities } = useStorage(records);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRecords([]);
          setIsLoadingDocs(false);
          return;
        }

        logPHIView(user.id, 'parent', user.email || '', 'records_vault', user.id, 'records-vault').catch(() => {});
        const { documents, error } = await listVaultDocuments(user.id, { limit: 100 });
        if (error || !documents || documents.length === 0) {
          // No documents yet — show empty state
          setRecords([]);
        } else {
          // Map Supabase vault documents to EnhancedVaultRecord format
          const mapped = documents.map(doc => ({
            id: doc.id,
            title: doc.fileName,
            date: doc.uploadedAt || new Date().toISOString(),
            createdAt: doc.uploadedAt || new Date().toISOString(),
            type: doc.recordType || 'Other',
            source: doc.source || 'Parent Upload',
            visibility: doc.visibility || 'Private',
            relatedTo: [],
            vaultText: doc.metadata?.extractedText || '',
            files: [{ id: doc.id, name: doc.fileName, url: '', size: doc.fileSize || 0, type: doc.mimeType || 'application/pdf', uploadedAt: doc.uploadedAt || new Date().toISOString() }],
            status: 'Active',
            ocrStatus: 'None',
            filePath: doc.filePath,
          })) as unknown as EnhancedVaultRecord[];
          setRecords(mapped);
        }
      } catch {
        setRecords([]);
      } finally {
        setIsLoadingDocs(false);
      }
    }
    loadDocuments();
  }, [vaultRecords]);

  // ─── Real file upload handler ───────────────
  const handleFileUpload = async (file: File, title: string, recordType: string) => {
    setUploadingFile(true);
    setUploadProgress(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload documents');
        return;
      }

      const result = await uploadVaultFile(file, user.id, {
        recordType: (recordType.toLowerCase().replace(/[^a-z-]/g, '-') as VaultRecordType) || 'other',
        source: 'parent-upload',
        onProgress: (p) => setUploadProgress(p),
      });

      if (result.success) {
        toast.success('Document uploaded successfully!');
        // Empowerment badges: first upload + Records Master at 10 docs
        checkAndAwardBadges(user.id, 'vault_upload').catch(() => {});
        // Reload documents
        const { documents } = await listVaultDocuments(user.id, { limit: 100 });
        if (documents) {
          const mapped = documents.map(doc => ({
            id: doc.id,
            title: doc.fileName,
            date: doc.uploadedAt || new Date().toISOString(),
            createdAt: doc.uploadedAt || new Date().toISOString(),
            type: doc.recordType || 'Other',
            source: doc.source || 'Parent Upload',
            visibility: doc.visibility || 'Private',
            relatedTo: [],
            vaultText: doc.metadata?.extractedText || '',
            files: [{ id: doc.id, name: doc.fileName, url: '', size: doc.fileSize || 0, type: doc.mimeType || 'application/pdf', uploadedAt: doc.uploadedAt || new Date().toISOString() }],
            status: 'Active',
            ocrStatus: 'None',
            filePath: doc.filePath,
          })) as unknown as EnhancedVaultRecord[];
          setRecords(mapped);
        }
        setShowAddRecord(false);
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z' | 'z-a'>('newest');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('All');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [shareModalRecord, setShareModalRecord] = useState<EnhancedVaultRecord | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [viewRecord, setViewRecord] = useState<EnhancedVaultRecord | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // ─── Real file download handler ───────────────
  // Resolves a short-lived signed URL from the record's storage path and opens it.
  // The button is disabled when no filePath exists (nothing to resolve).
  const handleDownloadFile = async (record: EnhancedVaultRecord, fileId: string) => {
    if (!record.filePath) {
      toast.error('This document is not available to download.');
      return;
    }
    setDownloadingFileId(fileId);
    try {
      logAction('download', { recordId: record.id, fileName: record.title }).catch(() => {});
      const { url, error } = await getVaultDocumentUrl(record.filePath);
      if (error || !url) {
        toast.error('Could not prepare the download. Please try again.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not prepare the download. Please try again.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // ─── Real bulk delete handler ───────────────
  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) return;
    if (!confirm(`Permanently delete ${selectedRecords.length} record${selectedRecords.length !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    const toDelete = records.filter(r => selectedRecords.includes(r.id));
    const deletedIds = new Set<string>();
    let failureCount = 0;
    for (const record of toDelete) {
      const { success } = await deleteVaultDocument(record.id, record.filePath || '');
      if (success) {
        deletedIds.add(record.id);
      } else {
        failureCount++;
      }
    }
    // Remove only the records that were actually deleted from local state
    if (deletedIds.size > 0) {
      setRecords(prev => prev.filter(r => !deletedIds.has(r.id)));
    }
    setSelectedRecords([]);
    setIsDeleting(false);
    const successCount = deletedIds.size;
    if (failureCount === 0) {
      toast.success(`${successCount} record${successCount !== 1 ? 's' : ''} deleted`);
    } else if (successCount === 0) {
      toast.error('Could not delete records. Please try again.');
    } else {
      toast.error(`Deleted ${successCount}, but ${failureCount} could not be removed.`);
    }
  };

  // Filter and sort records
  const filteredRecords = records.filter(record => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesTitle = record.title.toLowerCase().includes(searchLower);
      const matchesType = record.type.toLowerCase().includes(searchLower);
      const matchesContent = record.vaultText?.toLowerCase().includes(searchLower) || false;
      if (!matchesTitle && !matchesType && !matchesContent) return false;
    }

    // Type filter
    if (typeFilter !== 'All' && record.type !== typeFilter) return false;

    // Visibility filter
    if (visibilityFilter !== 'All' && record.visibility !== visibilityFilter) return false;

    return true;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'a-z':
        return a.title.localeCompare(b.title);
      case 'z-a':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  // Calculate storage usage
  const usedGB = usedBytes / (1024 * 1024 * 1024);
  const totalGB = quotaBytes / (1024 * 1024 * 1024);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="mr-2"
                  aria-label="Close records vault"
                >
                  <X className="w-4 h-4" />
                </Button>
                <h1 className="text-lg sm:text-xl font-semibold">Records Vault</h1>
                <h2 className="sr-only">Records overview</h2>
                <h3 className="sr-only">Documents, uploads, and sharing controls</h3>
                <AISparkleButton prompt="What documents should every ABA family keep organized, and how should I use the records vault effectively?" label="Ask Aminy" />
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  PHI encrypted
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Secure sharing
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground ml-12">
                Important docs in one place—organized, searchable, shareable.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  aria-label="Search records vault"
                  placeholder="Search titles, tags, or text inside docs…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <Sheet open={showAddRecord} onOpenChange={setShowAddRecord}>
                <SheetTrigger asChild>
                  <Button className="aminy-plan-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Add record
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Add Record</SheetTitle>
                    <SheetDescription>
                      Upload documents, photos, or files to your secure vault.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input 
                        id="title"
                        placeholder="Enter document title..."
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select defaultValue="Other">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECORD_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="source">Source</Label>
                      <Select defaultValue="Parent Upload">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPES.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="visibility">Visibility</Label>
                      <Select defaultValue="Private">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Private">Private</SelectItem>
                          <SelectItem value="Shared">Shared</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* File Upload Area */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic,.docx,.doc"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const titleInput = document.getElementById('title') as HTMLInputElement;
                          const title = titleInput?.value || file.name;
                          handleFileUpload(file, title, 'other');
                        }
                      }}
                    />
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drop files here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports PDF, images, and documents up to 50MB
                      </p>
                      {uploadingFile && (
                        <div className="mt-3">
                          <Progress value={uploadProgress} className="w-full h-2" />
                          <p className="text-xs text-primary mt-1">Uploading... {uploadProgress}%</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Advanced Options */}
                    {userTier === 'pro' && (
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ocr">Enable OCR</Label>
                          <Switch id="ocr" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ai-summary">Generate AI summary</Label>
                          <Switch id="ai-summary" />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowAddRecord(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                      >
                        {uploadingFile ? 'Uploading...' : 'Select File & Upload'}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Storage and Capabilities */}
      <div className="px-4 sm:px-6 py-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Progress value={(usedGB / totalGB) * 100} className="w-32 h-2" />
              <span className="text-sm text-muted-foreground">
                {usedGB.toFixed(1)} GB of {totalGB} GB used
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {capabilities.search?.fullText && (
                <Badge variant="outline" className="text-xs">Full-text search, sharing links</Badge>
              )}
              {capabilities.ai?.summary && (
                <Badge variant="outline" className="text-xs">AI search, auto-summaries, report drop-in</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 py-3 border-b">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Sort:</Label>
            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as 'newest' | 'oldest' | 'a-z' | 'z-a')}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="a-z">A–Z</SelectItem>
                <SelectItem value="z-a">Z–A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm">Type:</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="IEP">IEP</SelectItem>
                <SelectItem value="Evaluation">Evaluation</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Session Artifact">Session Artifact</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm">Visibility:</Label>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Private">Private</SelectItem>
                <SelectItem value="Shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-5 md:p-6">
          {sortedRecords.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  checked={selectedRecords.length === sortedRecords.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRecords(sortedRecords.map(r => r.id));
                    } else {
                      setSelectedRecords([]);
                    }
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedRecords.length > 0 ? `${selectedRecords.length} of ` : ''}{sortedRecords.length} records
                </span>
                
                {selectedRecords.length > 0 && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" disabled={isDeleting} onClick={handleBulkDelete}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                )}
              </div>
              
              {sortedRecords.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  selected={selectedRecords.includes(record.id)}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedRecords([...selectedRecords, record.id]);
                    } else {
                      setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                    }
                  }}
                  onView={() => setViewRecord(record)}
                  onShare={() => setShareModalRecord(record)}
                  userTier={userTier}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No records found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search or filters' : 'Start by adding your first document'}
              </p>
              <Button onClick={() => setShowAddRecord(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first record
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalRecord && (
        <ShareModal
          record={shareModalRecord}
          isOpen={true}
          onClose={() => setShareModalRecord(null)}
          userTier={userTier}
        />
      )}

      {/* View Record Modal */}
      {viewRecord && (
        <Dialog open={true} onOpenChange={() => setViewRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewRecord.title}</DialogTitle>
              <DialogDescription>
                {viewRecord.type} • {viewRecord.source} • {new Date(viewRecord.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{viewRecord.type}</Badge>
                <Badge variant="outline">
                  {viewRecord.visibility === 'Private' ? (
                    <><Lock className="w-3 h-3 mr-1" />Private</>
                  ) : (
                    <><Globe className="w-3 h-3 mr-1" />Shared</>
                  )}
                </Badge>
                {viewRecord.ocrStatus === 'Complete' && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Searchable
                  </Badge>
                )}
              </div>
              
              {viewRecord.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">{viewRecord.notes}</p>
                </div>
              )}
              
              {viewRecord.relatedTo.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Linked to</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {viewRecord.relatedTo.map((link) => (
                      <Badge key={link.id} variant="outline" className="text-xs">
                        {link.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Files</Label>
                <div className="mt-1">
                  {viewRecord.files.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 border rounded">
                      <FileText className="w-4 h-4" />
                      <span className="flex-1 text-sm">{file.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadFile(viewRecord, file.id)}
                        disabled={!viewRecord.filePath || downloadingFileId === file.id}
                        aria-label={`Download ${file.name}`}
                        title={viewRecord.filePath ? `Download ${file.name}` : 'Download unavailable'}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setViewRecord(null)}>
                Close
              </Button>
              <Button onClick={() => {
                setShareModalRecord(viewRecord);
                setViewRecord(null);
              }}>
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RecordsVault;
