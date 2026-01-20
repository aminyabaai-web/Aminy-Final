import React, { useState, useEffect, useCallback } from 'react';
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
  Paperclip,
  Shield,
  X,
  Filter,
  MoreVertical,
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
  Archive,
  SortAsc,
  SortDesc,
  Globe,
  Lock,
  Clock,
  Users
} from 'lucide-react';
import type { VaultRecord } from '../types/vault';

// Enhanced types for the complete vault implementation
interface CompleteVaultRecord extends VaultRecord {
  type: 'IEP' | 'Evaluation' | 'Report' | 'Prescription/Order' | 'Care Plan' | 'Uploaded (Parent)' | 'Coach Note (PDF)' | 'Session Artifact' | 'School Letter' | 'Other';
  source: 'Parent Upload' | 'Junior' | 'Coach' | 'School' | 'Clinic' | 'Other';
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

interface RecordsVaultCompleteProps {
  onClose: () => void;
  vaultRecords: VaultRecord[];
  publishEvent: (eventName: string, payload: any) => void;
  connectorData: any;
  setConnectorData: (data: any) => void;
  userTier: 'starter' | 'core' | 'pro';
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
  'Junior',
  'Coach', 
  'School',
  'Clinic',
  'Other'
] as const;

const DATE_PRESETS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Year to date', value: 365 },
  { label: 'Custom', value: 0 }
];

export const RecordsVaultComplete: React.FC<RecordsVaultCompleteProps> = ({
  onClose,
  vaultRecords,
  publishEvent,
  connectorData,
  setConnectorData,
  userTier
}) => {
  // Convert to complete vault records and add mock data if empty
  const records: CompleteVaultRecord[] = vaultRecords.length > 0 
    ? vaultRecords.map(record => ({
        ...record,
        type: (record as any).type || 'Other',
        source: (record as any).source || 'Parent Upload',
        visibility: (record as any).visibility || 'Private',
        relatedTo: (record as any).relatedTo || [],
        files: (record as any).files || [],
        status: (record as any).status || 'Active',
        ocrStatus: (record as any).ocrStatus || 'None'
      })) as CompleteVaultRecord[]
    : [
        // Mock data to demonstrate features
        {
          id: 'mock-1',
          childId: 'child-1',
          title: 'IEP Annual Review 2024',
          type: 'IEP',
          source: 'School',
          date: '2024-03-15',
          docDate: '2024-03-15',
          visibility: 'Private',
          relatedTo: [
            { id: 'goal-1', type: 'Goal', title: 'Express needs verbally' },
            { id: 'goal-2', type: 'Goal', title: 'Follow two-step instructions' }
          ],
          notes: 'Annual review went well. Updated goals for next year.',
          files: [{
            id: 'file-1',
            name: 'IEP_Annual_Review_2024.pdf',
            url: '/mock-file.pdf',
            type: 'application/pdf',
            size: 2048576,
            uploadedAt: '2024-03-15T10:00:00Z'
          }],
          shareSettings: {
            hasShareLink: true,
            shareId: 'share-123',
            expiresAt: '2024-06-15',
            hasWatermark: true,
            hasPasscode: true,
            audienceLabel: 'Teacher',
            viewLog: [{
              viewedBy: 'Mrs. Smith',
              viewedAt: '2024-03-16T09:00:00Z'
            }]
          },
          status: 'Active',
          ocrStatus: 'Complete',
          hasSignatures: true,
          hasImages: false,
          hasAudio: false,
          extractedFields: {
            studentName: 'Emma',
            docDate: '2024-03-15',
            district: 'Washington Elementary District',
            services: ['Speech Therapy', 'Occupational Therapy']
          },
          category: ['School', 'IEP'],
          tags: ['annual review', 'speech', 'OT'],
          usableByAssistant: true,
          attachToExport: true,
          createdAt: '2024-03-15T10:00:00Z',
          sourceType: 'upload',
          fileType: 'application/pdf',
          vaultText: 'IEP Annual Review meeting notes and updated goals for speech therapy and occupational therapy services.'
        },
        {
          id: 'mock-2',
          childId: 'child-1',
          title: 'Behavioral Assessment Report',
          type: 'Evaluation',
          source: 'Clinic',
          date: '2024-02-28',
          docDate: '2024-02-28',
          visibility: 'Shared',
          relatedTo: [
            { id: 'strategy-1', type: 'Strategy', title: 'Visual schedule' }
          ],
          notes: 'Comprehensive evaluation with detailed recommendations.',
          files: [{
            id: 'file-2',
            name: 'Behavioral_Assessment_Feb2024.pdf',
            url: '/mock-assessment.pdf',
            type: 'application/pdf',
            size: 3145728,
            uploadedAt: '2024-02-28T14:00:00Z'
          }],
          shareSettings: {
            hasShareLink: true,
            shareId: 'share-456',
            expiresAt: '2024-05-28',
            hasWatermark: true,
            hasPasscode: false,
            audienceLabel: 'Provider',
            viewLog: []
          },
          status: 'Active',
          ocrStatus: 'Complete',
          hasSignatures: true,
          hasImages: true,
          hasAudio: false,
          extractedFields: {
            studentName: 'Emma',
            docDate: '2024-02-28',
            district: 'Assessment Center',
            services: ['ABA Therapy', 'Social Skills Training']
          },
          category: ['Medical', 'Assessment'],
          tags: ['autism', 'behavioral', 'recommendations'],
          usableByAssistant: true,
          attachToExport: false,
          createdAt: '2024-02-28T14:00:00Z',
          sourceType: 'upload',
          fileType: 'application/pdf',
          vaultText: 'Comprehensive behavioral assessment indicating specific intervention strategies and therapeutic recommendations.'
        },
        {
          id: 'mock-3',
          childId: 'child-1',
          title: 'Progress Photos - Visual Schedule',
          type: 'Session Artifact',
          source: 'Parent Upload',
          date: '2024-03-20',
          visibility: 'Private',
          relatedTo: [
            { id: 'routine-1', type: 'Routine', title: 'Morning routine' }
          ],
          notes: 'Photos showing Emma successfully using the visual schedule.',
          files: [{
            id: 'file-3',
            name: 'visual_schedule_progress.jpg',
            url: '/mock-photos.jpg',
            type: 'image/jpeg',
            size: 1048576,
            uploadedAt: '2024-03-20T08:00:00Z'
          }],
          status: 'Active',
          ocrStatus: 'None',
          hasSignatures: false,
          hasImages: true,
          hasAudio: false,
          category: ['Progress', 'Photos'],
          tags: ['visual schedule', 'routine', 'success'],
          usableByAssistant: false,
          attachToExport: true,
          createdAt: '2024-03-20T08:00:00Z',
          sourceType: 'upload',
          fileType: 'image/jpeg',
          vaultText: ''
        }
      ] as CompleteVaultRecord[];

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showDetailView, setShowDetailView] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z' | 'z-a'>('newest');

  // Filter state
  const [filters, setFilters] = useState({
    types: [] as string[],
    sources: [] as string[],
    dateRange: { start: '', end: '', preset: 0 },
    visibility: [] as string[],
    linkedTo: [] as string[],
    status: [] as string[],
    hasOCR: false,
    hasSignatures: false,
    hasImages: false,
    hasAudio: false,
    sharedAudience: [] as string[]
  });

  // New record state
  const [newRecord, setNewRecord] = useState({
    title: '',
    type: 'Other' as const,
    source: 'Parent Upload' as const,
    docDate: '',
    visibility: 'Private' as const,
    relatedTo: [] as Array<{id: string; type: 'Goal' | 'Routine' | 'Strategy'; title: string}>,
    notes: '',
    files: [] as File[],
    aiExtraction: true
  });

  // Storage usage calculation
  const getStorageInfo = () => {
    const totalSize = records.reduce((sum, record) => 
      sum + (record.files?.reduce((fileSum, file) => fileSum + file.size, 0) || 0), 0
    );
    const sizeInGB = totalSize / (1024 * 1024 * 1024);
    
    const limits = {
      starter: { storage: 1, features: 'basic search, no sharing links' },
      core: { storage: 5, features: 'full-text search, sharing links' },
      pro: { storage: 20, features: 'AI search, auto-summaries, report drop-in' }
    };
    
    const limit = limits[userTier];
    return {
      used: sizeInGB,
      total: limit.storage,
      features: limit.features,
      percentage: Math.min((sizeInGB / limit.storage) * 100, 100)
    };
  };

  // Mock goals/routines/strategies for linking
  const mockRelations = [
    { id: 'goal-1', type: 'Goal' as const, title: 'Express needs verbally' },
    { id: 'goal-2', type: 'Goal' as const, title: 'Follow two-step instructions' },
    { id: 'routine-1', type: 'Routine' as const, title: 'Morning routine' },
    { id: 'strategy-1', type: 'Strategy' as const, title: 'Visual schedule' }
  ];

  // OCR and AI processing simulation
  const processFiles = async (files: File[]) => {
    const processedFiles = [];
    
    for (const file of files) {
      if (file.size > 200 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 200MB.`);
        continue;
      }

      // Simulate OCR processing
      const hasOCR = ['pdf', 'jpg', 'jpeg', 'png'].some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );

      if (hasOCR) {
        toast.loading(`Indexing ${file.name}...`, { duration: 2000 });
        
        // Auto-detect document type
        let detectedType = 'Other';
        const fileName = file.name.toLowerCase();
        if (fileName.includes('iep')) detectedType = 'IEP';
        else if (fileName.includes('eval')) detectedType = 'Evaluation';
        else if (fileName.includes('report')) detectedType = 'Report';
        else if (fileName.includes('prescription')) detectedType = 'Prescription/Order';

        if (detectedType !== 'Other') {
          setNewRecord(prev => ({ ...prev, type: detectedType as any }));
          toast.success(`Auto-tagged and searchable`, {
            description: `Detected: ${detectedType}, ${new Date().toLocaleDateString()}`,
            action: {
              label: 'Review tags',
              onClick: () => {}
            }
          });
        }
      }

      processedFiles.push({
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
    }

    return processedFiles;
  };

  // File upload handler
  const handleFileUpload = async (files: File[]) => {
    const processedFiles = await processFiles(files);
    setNewRecord(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));

    // Suggest related items if AI extraction is enabled
    if (newRecord.aiExtraction && processedFiles.length > 0) {
      // Mock AI suggestion
      const suggestedLinks = mockRelations.slice(0, 2);
      toast.success('Suggest links to goals?', {
        description: suggestedLinks.map(link => link.title).join(', '),
        action: {
          label: 'Add links',
          onClick: () => {
            setNewRecord(prev => ({
              ...prev,
              relatedTo: [...prev.relatedTo, ...suggestedLinks]
            }));
            toast.success('Links updated');
          }
        }
      });
    }
  };

  // Submit new record
  const handleSubmit = async () => {
    if (!newRecord.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const processedFiles = await processFiles(newRecord.files);

    const record: CompleteVaultRecord = {
      id: `vault-${Date.now()}`,
      childId: 'child-1',
      title: newRecord.title,
      type: newRecord.type,
      source: newRecord.source,
      date: newRecord.docDate || new Date().toISOString().split('T')[0],
      docDate: newRecord.docDate,
      visibility: newRecord.visibility,
      relatedTo: newRecord.relatedTo,
      notes: newRecord.notes,
      files: processedFiles,
      status: 'Active',
      ocrStatus: processedFiles.some(f => ['pdf', 'jpg', 'jpeg', 'png'].some(ext => 
        f.name.toLowerCase().endsWith(ext)
      )) ? 'Processing' : 'None',
      category: [],
      tags: [],
      usableByAssistant: newRecord.aiExtraction,
      attachToExport: false,
      createdAt: new Date().toISOString(),
      sourceType: 'upload',
      fileType: processedFiles[0]?.type
    };

    // Add to connector data
    setConnectorData((prev: any) => {
      const newVaultRecords = new Map(prev.vaultRecords);
      newVaultRecords.set(record.id, record);
      return { ...prev, vaultRecords: newVaultRecords };
    });

    publishEvent('vault:record_added', { record });
    
    toast.success('Record added · Auto-tagged and searchable');
    
    // Reset form
    setNewRecord({
      title: '',
      type: 'Other',
      source: 'Parent Upload',
      docDate: '',
      visibility: 'Private',
      relatedTo: [],
      notes: '',
      files: [],
      aiExtraction: true
    });
    
    setShowAddRecord(false);
  };

  // Filter records
  const filteredRecords = records.filter(record => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesTitle = record.title.toLowerCase().includes(searchLower);
      const matchesType = record.type.toLowerCase().includes(searchLower);
      const matchesContent = record.vaultText?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesType && !matchesContent) return false;
    }

    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(record.type)) return false;

    // Source filter  
    if (filters.sources.length > 0 && !filters.sources.includes(record.source)) return false;

    // Date filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const recordDate = new Date(record.date);
      if (filters.dateRange.start && recordDate < new Date(filters.dateRange.start)) return false;
      if (filters.dateRange.end && recordDate > new Date(filters.dateRange.end)) return false;
    }

    // Visibility filter
    if (filters.visibility.length > 0 && !filters.visibility.includes(record.visibility)) return false;

    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(record.status)) return false;

    // Linked to filter
    if (filters.linkedTo.length > 0) {
      const hasLinkedItem = record.relatedTo.some(rel => filters.linkedTo.includes(rel.id));
      if (!hasLinkedItem) return false;
    }

    // Feature filters
    if (filters.hasOCR && record.ocrStatus === 'None') return false;
    if (filters.hasSignatures && !record.hasSignatures) return false;
    if (filters.hasImages && !record.hasImages) return false;
    if (filters.hasAudio && !record.hasAudio) return false;

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

  const storageInfo = getStorageInfo();
  const activeFiltersCount = Object.values(filters).filter(f => 
    Array.isArray(f) ? f.length > 0 : f === true || (typeof f === 'object' && (f.start || f.end))
  ).length;

  // Bulk actions
  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'share':
        toast.success(`Secure links created for ${selectedRecords.length} records • Expires in 30 days • Watermark on`);
        break;
      case 'archive':
        toast.success(`${selectedRecords.length} records archived`);
        break;
      case 'delete':
        if (confirm(`Permanently delete ${selectedRecords.length} records? This cannot be undone.`)) {
          selectedRecords.forEach(id => {
            setConnectorData((prev: any) => {
              const newVaultRecords = new Map(prev.vaultRecords);
              newVaultRecords.delete(id);
              return { ...prev, vaultRecords: newVaultRecords };
            });
          });
          toast.success(`${selectedRecords.length} records deleted`);
          setSelectedRecords([]);
        }
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 aminy-card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl font-semibold text-primary">Records Vault</h1>
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  PHI Encrypted
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Important docs in one place—organized and searchable.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search records…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-80"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-muted" : ""}
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Sheet open={showAddRecord} onOpenChange={setShowAddRecord}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <AddRecordForm
                  record={newRecord}
                  onRecordChange={setNewRecord}
                  onFileUpload={handleFileUpload}
                  onSubmit={handleSubmit}
                  onCancel={() => setShowAddRecord(false)}
                  mockRelations={mockRelations}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Info Strip */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-2">
            <div className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              ⚠️ Aminy provides educational guidance using ABA-informed strategies. It is not medical advice or a prescription for therapy. For emergencies, call local emergency services.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Plan: {storageInfo.used.toFixed(1)} GB of {storageInfo.total} GB used · {storageInfo.features}
            </Badge>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <FiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            userTier={userTier}
            mockRelations={mockRelations}
            recordsCount={filteredRecords.length}
            onClearFilters={() => {
              setFilters({
                types: [],
                sources: [],
                dateRange: { start: '', end: '', preset: 0 },
                visibility: [],
                linkedTo: [],
                status: [],
                hasOCR: false,
                hasSignatures: false,
                hasImages: false,
                hasAudio: false,
                sharedAudience: []
              });
              setSearchQuery('');
            }}
          />
        )}

        {/* Sort and Bulk Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Sort:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
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
          </div>

          {selectedRecords.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedRecords.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('share')}>
                <Share className="w-4 h-4 mr-1" />
                Share…
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                <Archive className="w-4 h-4 mr-1" />
                Archive
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Records Table/List */}
      {sortedRecords.length > 0 ? (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2">
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
          </div>

          <div className="grid gap-3">
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
                onView={() => setShowDetailView(record.id)}
                onShare={() => setShowShareModal(record.id)}
                onAction={(action) => {
                  switch (action) {
                    case 'add-to-plan':
                      publishEvent('vault:link_to_plan', { recordId: record.id });
                      toast.success(`${record.title} added to Plan`);
                      break;
                    case 'add-to-report':
                      publishEvent('vault:link_to_report', { recordId: record.id });
                      toast.success(`${record.title} added to Report`);
                      break;
                    case 'duplicate':
                      // Implement duplication
                      toast.success('Record duplicated');
                      break;
                    case 'archive':
                      // Implement archiving
                      toast.success('Record archived');
                      break;
                    case 'delete':
                      if (confirm('Permanently delete this record? This cannot be undone.')) {
                        setConnectorData((prev: any) => {
                          const newVaultRecords = new Map(prev.vaultRecords);
                          newVaultRecords.delete(record.id);
                          return { ...prev, vaultRecords: newVaultRecords };
                        });
                        toast.success('Record deleted');
                      }
                      break;
                  }
                }}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState 
          hasFilters={activeFiltersCount > 0 || searchQuery.length > 0}
          onAddRecord={() => setShowAddRecord(true)}
          onClearFilters={() => {
            setFilters({
              types: [],
              sources: [],
              dateRange: { start: '', end: '', preset: 0 },
              visibility: [],
              linkedTo: [],
              status: [],
              hasOCR: false,
              hasSignatures: false,
              hasImages: false,
              hasAudio: false,
              sharedAudience: []
            });
            setSearchQuery('');
          }}
        />
      )}

      {/* Detail View */}
      {showDetailView && (
        <RecordDetailView
          record={sortedRecords.find(r => r.id === showDetailView)!}
          onClose={() => setShowDetailView(null)}
          onShare={() => {
            setShowDetailView(null);
            setShowShareModal(showDetailView);
          }}
          mockRelations={mockRelations}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          record={sortedRecords.find(r => r.id === showShareModal)!}
          onClose={() => setShowShareModal(null)}
          userTier={userTier}
        />
      )}

      {/* Storage Footer */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            <div className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">
              ⚠️ Aminy provides educational guidance using ABA-informed strategies. It is not medical advice or a prescription for therapy.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Progress value={storageInfo.percentage} className="w-20 h-2" />
              <span className="text-xs text-muted-foreground">
                {storageInfo.used.toFixed(1)} GB / {storageInfo.total} GB
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {storageInfo.features}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Filters Panel Component
const FiltersPanel: React.FC<{
  filters: any;
  onFiltersChange: (filters: any) => void;
  userTier: string;
  mockRelations: any[];
  recordsCount: number;
  onClearFilters: () => void;
}> = ({ filters, onFiltersChange, userTier, mockRelations, recordsCount, onClearFilters }) => (
  <div className="border-t pt-4 space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Type Filter */}
      <div>
        <Label className="text-sm font-medium">Type</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {RECORD_TYPES.map(type => (
            <Badge
              key={type}
              variant={filters.types.includes(type) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => {
                const newTypes = filters.types.includes(type)
                  ? filters.types.filter((t: string) => t !== type)
                  : [...filters.types, type];
                onFiltersChange({...filters, types: newTypes});
              }}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Source Filter */}
      <div>
        <Label className="text-sm font-medium">Source</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {SOURCE_TYPES.map(source => (
            <Badge
              key={source}
              variant={filters.sources.includes(source) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => {
                const newSources = filters.sources.includes(source)
                  ? filters.sources.filter((s: string) => s !== source)
                  : [...filters.sources, source];
                onFiltersChange({...filters, sources: newSources});
              }}
            >
              {source}
            </Badge>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <Label className="text-sm font-medium">Date Range</Label>
        <div className="space-y-2 mt-1">
          <div className="flex flex-wrap gap-1">
            {DATE_PRESETS.map(preset => (
              <Badge
                key={preset.value}
                variant={filters.dateRange.preset === preset.value ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => {
                  if (preset.value === 0) {
                    onFiltersChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, preset: 0 }
                    });
                  } else {
                    const start = new Date();
                    start.setDate(start.getDate() - preset.value);
                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        start: start.toISOString().split('T')[0],
                        end: new Date().toISOString().split('T')[0],
                        preset: preset.value
                      }
                    });
                  }
                }}
              >
                {preset.label}
              </Badge>
            ))}
          </div>
          {filters.dateRange.preset === 0 && (
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: {...filters.dateRange, start: e.target.value}
                })}
                className="h-8 text-sm"
              />
              <Input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: {...filters.dateRange, end: e.target.value}
                })}
                className="h-8 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Clear Filters */}
      <div className="flex items-end">
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>

    {/* Results Count */}
    <div className="text-sm text-muted-foreground">
      {recordsCount} result{recordsCount !== 1 ? 's' : ''} found
    </div>
  </div>
);

// Add Record Form Component
const AddRecordForm: React.FC<{
  record: any;
  onRecordChange: (record: any) => void;
  onFileUpload: (files: File[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  mockRelations: any[];
}> = ({ record, onRecordChange, onFileUpload, onSubmit, onCancel, mockRelations }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<'method' | 'details'>('method');

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      onFileUpload(fileArray);
      setStep('details');
    }
  };

  if (step === 'method') {
    return (
      <div className="space-y-6 pt-6">
        <div className="grid gap-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = '.pdf,.jpg,.jpeg,.png,.docx,.mp4';
              input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
              input.click();
            }}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium mb-2">Upload files</h3>
            <p className="text-sm text-muted-foreground mb-4">
              PDF, JPG/PNG, DOCX, MP4 • 200MB per file • Drag & drop or click
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto p-6 flex flex-col gap-2"
              onClick={() => {
                // Simulate camera capture
                toast.info('Camera feature would open here');
                setStep('details');
              }}
            >
              <Camera className="w-8 h-8 text-accent" />
              <span className="font-medium">Scan photo</span>
              <span className="text-xs text-muted-foreground">Uses camera</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto p-6 flex flex-col gap-2"
              onClick={() => {
                onRecordChange({...record, type: 'Coach Note (PDF)'});
                setStep('details');
              }}
            >
              <FileText className="w-8 h-8 text-accent" />
              <span className="font-medium">Add note</span>
              <span className="text-xs text-muted-foreground">Rich text</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={record.title}
            onChange={(e) => onRecordChange({...record, title: e.target.value})}
            placeholder="Enter record title"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="type">Type *</Label>
          <Select value={record.type} onValueChange={(value) => onRecordChange({...record, type: value})}>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="source">Source</Label>
          <Select value={record.source} onValueChange={(value) => onRecordChange({...record, source: value})}>
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
          <Label htmlFor="docDate">Doc date (optional)</Label>
          <Input
            id="docDate"
            type="date"
            value={record.docDate}
            onChange={(e) => onRecordChange({...record, docDate: e.target.value})}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="visibility">Visibility</Label>
        <Select value={record.visibility} onValueChange={(value) => onRecordChange({...record, visibility: value})}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Private">Private</SelectItem>
            <SelectItem value="Shared">Shared</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Related to (optional)</Label>
        <div className="space-y-2 mt-2">
          {mockRelations.map((relation) => (
            <label key={relation.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={record.relatedTo.some((r: any) => r.id === relation.id)}
                onCheckedChange={(checked) => {
                  const newRelatedTo = checked
                    ? [...record.relatedTo, relation]
                    : record.relatedTo.filter((r: any) => r.id !== relation.id);
                  onRecordChange({...record, relatedTo: newRelatedTo});
                }}
              />
              <span className="text-sm">{relation.title}</span>
              <Badge variant="outline" className="text-xs">
                {relation.type}
              </Badge>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes..."
          value={record.notes || ''}
          onChange={(e) => onRecordChange({...record, notes: e.target.value})}
          className="mt-1"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={record.aiExtraction}
          onCheckedChange={(checked) => onRecordChange({...record, aiExtraction: checked})}
        />
        <Label className="text-sm">
          Use AI to auto-tag and extract searchable text
        </Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={onSubmit} 
          className="flex-1"
          disabled={!record.title.trim()}
        >
          Add Record
        </Button>
      </div>
    </div>
  );
};

// Record Row Component
const RecordRow: React.FC<{
  record: CompleteVaultRecord;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onShare: () => void;
  onAction: (action: string) => void;
  searchQuery: string;
}> = ({ record, selected, onSelect, onView, onShare, onAction, searchQuery }) => {
  const [showActions, setShowActions] = useState(false);

  const getFileIcon = (type: string) => {
    if (type === 'IEP') return FileText;
    if (type === 'Evaluation') return Target;
    if (type === 'Report') return FileIcon;
    return FileText;
  };

  const Icon = getFileIcon(record.type);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index} className="bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <Card className="p-4 hover:shadow-md transition-all cursor-pointer" onClick={onView}>
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-medium text-sm leading-tight">
              {highlightText(record.title, searchQuery)}
            </h3>
            <div className="flex items-center gap-1">
              {record.usableByAssistant && (
                <Shield className="w-3 h-3 text-accent" title="AI enabled" />
              )}
              {record.shareSettings?.hasShareLink && (
                <Link className="w-3 h-3 text-green-500" title="Shared" />
              )}
              {record.ocrStatus === 'Processing' && (
                <Clock className="w-3 h-3 text-orange-500" title="Indexing..." />
              )}
              {record.ocrStatus === 'Complete' && (
                <CheckCircle2 className="w-3 h-3 text-green-500" title="Searchable" />
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">{record.type}</Badge>
            <Badge variant="outline" className="text-xs">{record.source}</Badge>
            <Badge variant={record.visibility === 'Private' ? 'outline' : 'default'} className="text-xs">
              {record.visibility === 'Private' ? <Lock className="w-2 h-2 mr-1" /> : <Globe className="w-2 h-2 mr-1" />}
              {record.visibility}
            </Badge>
            {record.relatedTo.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Target className="w-2 h-2 mr-1" />
                {record.relatedTo.length}
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{new Date(record.date).toLocaleDateString()}</span>
            <span>•</span>
            <span>{record.source}</span>
            {record.files.length > 1 && (
              <>
                <span>•</span>
                <span>{record.files.length} files</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(); }}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onShare(); }}>
            <Share className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowActions(!showActions); 
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {showActions && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onAction('add-to-plan'); }}>
            <Target className="w-3 h-3 mr-1" />
            Link to…
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onAction('add-to-report'); }}>
            <FileText className="w-3 h-3 mr-1" />
            Add note
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onAction('duplicate'); }}>
            <Copy className="w-3 h-3 mr-1" />
            Duplicate
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onAction('archive'); }}>
            <Archive className="w-3 h-3 mr-1" />
            Archive
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onAction('delete'); }}>
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
};

// Empty State Component
const EmptyState: React.FC<{
  hasFilters: boolean;
  onAddRecord: () => void;
  onClearFilters: () => void;
}> = ({ hasFilters, onAddRecord, onClearFilters }) => (
  <Card className="p-12 text-center aminy-card">
    <div className="text-4xl mb-4">📄</div>
    {hasFilters ? (
      <>
        <h3 className="text-lg font-semibold mb-2">No records match your filters</h3>
        <p className="text-muted-foreground mb-6 leading-relaxed max-w-sm mx-auto">
          Try adjusting your search or filter criteria to find what you're looking for.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
          <Button onClick={onAddRecord}>
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </>
    ) : (
      <>
        <h3 className="text-lg font-semibold mb-2">No records yet</h3>
        <p className="text-muted-foreground mb-6 leading-relaxed max-w-sm mx-auto">
          Add IEPs, evaluations, or letters—Aminy will auto-tag and make them searchable.
        </p>
        <Button onClick={onAddRecord}>
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Record
        </Button>
      </>
    )}
  </Card>
);

// Record Detail View Component
const RecordDetailView: React.FC<{
  record: CompleteVaultRecord;
  onClose: () => void;
  onShare: () => void;
  mockRelations: any[];
}> = ({ record, onClose, onShare, mockRelations }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      <div className="flex h-full">
        {/* Metadata Panel */}
        <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Record Details</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onShare}>
                <Share className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-primary mb-3">Title</h3>
              <div className="text-sm font-medium">{record.title}</div>
            </div>

            <div>
              <h3 className="font-medium text-primary mb-3">Type & Source</h3>
              <div className="flex gap-2">
                <Badge variant="secondary">{record.type}</Badge>
                <Badge variant="outline">{record.source}</Badge>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-primary mb-3">Dates</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document:</span>
                  <span>{record.docDate ? new Date(record.docDate).toLocaleDateString() : 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added:</span>
                  <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-primary mb-3">Privacy</h3>
              <Badge variant={record.visibility === 'Private' ? 'outline' : 'default'}>
                {record.visibility === 'Private' ? <Lock className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                {record.visibility}
              </Badge>
            </div>

            {record.relatedTo.length > 0 && (
              <div>
                <h3 className="font-medium text-primary mb-3">Related To</h3>
                <div className="space-y-2">
                  {record.relatedTo.map((relation) => (
                    <div key={relation.id} className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{relation.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {relation.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {record.notes && (
              <div>
                <h3 className="font-medium text-primary mb-3">Notes</h3>
                <div className="text-sm text-muted-foreground">
                  {record.notes}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium text-primary mb-3">Files</h3>
              <div className="space-y-2">
                {record.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                    <FileIcon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="font-medium mb-4">Content Preview</h3>
          <div className="bg-gray-100 rounded-lg p-4 min-h-[200px]">
            {record.vaultText ? (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {record.vaultText}
              </p>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-gray-400">No text content available</p>
              </div>
            )}
          </div>

          {record.extractedFields && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Extracted Information</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(record.extractedFields).map(([key, value]) => (
                  <div key={key} className="p-3 bg-gray-50 rounded">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm font-medium">
                      {Array.isArray(value) ? value.join(', ') : value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Share Modal Component
const ShareModal: React.FC<{
  record: CompleteVaultRecord;
  onClose: () => void;
  userTier: string;
}> = ({ record, onClose, userTier }) => {
  const [shareSettings, setShareSettings] = useState({
    audience: 'Teacher',
    access: 'view-only',
    expiresIn: '30',
    hasWatermark: true,
    hasPasscode: true,
    passcode: ''
  });

  const handleCreateLink = () => {
    const shareUrl = `https://aminy.app/share/${record.id}`;
    navigator.clipboard.writeText(shareUrl);
    
    toast.success('Shared link created', {
      description: `Expires in ${shareSettings.expiresIn} days • ${shareSettings.hasWatermark ? 'Watermark on' : 'Watermark off'}`,
      action: {
        label: 'Email link',
        onClick: () => {
          window.location.href = `mailto:?subject=Shared Record: ${record.title}&body=View this record: ${shareUrl}`;
        }
      }
    });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Secure Link</DialogTitle>
          <DialogDescription>
            Share "{record.title}" with controlled access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Audience</Label>
            <Select value={shareSettings.audience} onValueChange={(value) => 
              setShareSettings({...shareSettings, audience: value})
            }>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Teacher">Teacher</SelectItem>
                <SelectItem value="Provider">Provider</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userTier === 'pro' && (
            <div>
              <Label>Access</Label>
              <Select value={shareSettings.access} onValueChange={(value) => 
                setShareSettings({...shareSettings, access: value})
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view-only">View-only</SelectItem>
                  <SelectItem value="download">Download allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Link expires in</Label>
            <Select value={shareSettings.expiresIn} onValueChange={(value) => 
              setShareSettings({...shareSettings, expiresIn: value})
            }>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={shareSettings.hasWatermark}
              onCheckedChange={(checked) => 
                setShareSettings({...shareSettings, hasWatermark: checked})
              }
            />
            <Label className="text-sm">Add "Shared via Aminy" watermark</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={shareSettings.hasPasscode}
              onCheckedChange={(checked) => 
                setShareSettings({...shareSettings, hasPasscode: checked})
              }
            />
            <Label className="text-sm">Require passcode</Label>
          </div>

          {shareSettings.hasPasscode && (
            <Input
              placeholder="Enter passcode"
              value={shareSettings.passcode}
              onChange={(e) => setShareSettings({...shareSettings, passcode: e.target.value})}
            />
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreateLink} className="flex-1">
            <Link className="w-4 h-4 mr-2" />
            Create Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};