import React, { useState, useEffect } from 'react';
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
  Users,
  ChevronDown
} from 'lucide-react';
import type { VaultRecord } from '../types/vault';
import { useStorage } from '../lib/useStorage';

// Enhanced types for the vault implementation
interface EnhancedVaultRecord extends VaultRecord {
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

interface RecordsVaultProps {
  onClose?: () => void;
  onBack?: () => void;
  vaultRecords?: VaultRecord[];
  publishEvent: (eventName: string, payload: any) => void;
  connectorData: any;
  setConnectorData: (data: any) => void;
  userTier?: 'starter' | 'core' | 'pro';
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

// Mock data for demonstration
const getMockRecords = (): EnhancedVaultRecord[] => [
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
];

// Record Row Component
interface RecordRowProps {
  record: EnhancedVaultRecord;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onShare: () => void;
  onAction: (action: string) => void;
  userTier: string;
}

const RecordRow: React.FC<RecordRowProps> = ({ 
  record, 
  selected, 
  onSelect, 
  onView, 
  onShare, 
  onAction,
  userTier 
}) => {
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('image')) return <FileIcon className="w-4 h-4 text-blue-500" />;
    return <FileIcon className="w-4 h-4 text-gray-500" />;
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
                <span>Source: {record.source}</span>
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
              <Button variant="ghost" size="sm" onClick={() => {
                toast.success('More actions: Rename, Move to..., Link to Goal/Session, Download, Delete');
              }}>
                <MoreVertical className="w-4 h-4" />
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

  const generateShareLink = () => {
    const mockLink = `https://aminy.app/shared/${record.id}?key=abc123`;
    setShareLink(mockLink);
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
  vaultRecords = [],
  publishEvent,
  connectorData,
  setConnectorData,
  userTier = 'core'
}) => {
  // Use storage hook for unified storage information
  const { usedBytes, quotaBytes, planTier, capabilities } = useStorage();
  
  // Convert to enhanced vault records and add mock data if empty
  const records: EnhancedVaultRecord[] = vaultRecords.length > 0 
    ? vaultRecords.map(record => ({
        ...record,
        type: (record as any).type || 'Other',
        source: (record as any).source || 'Parent Upload',
        visibility: (record as any).visibility || 'Private',
        relatedTo: (record as any).relatedTo || [],
        files: (record as any).files || [],
        status: (record as any).status || 'Active',
        ocrStatus: (record as any).ocrStatus || 'None'
      })) as EnhancedVaultRecord[]
    : getMockRecords();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z' | 'z-a'>('newest');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('All');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [shareModalRecord, setShareModalRecord] = useState<EnhancedVaultRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<EnhancedVaultRecord | null>(null);

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
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 sm:p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="mr-2"
                >
                  <X className="w-4 h-4" />
                </Button>
                <h1 className="text-lg sm:text-xl font-semibold">Records Vault</h1>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search titles, tags, or text inside docs…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-80"
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
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drop files here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports PDF, images, and documents up to 200MB
                      </p>
                      <Button variant="outline" className="mt-2">
                        <Camera className="w-4 h-4 mr-2" />
                        Scan with camera
                      </Button>
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
                      <Button onClick={() => {
                        toast.success('Record added • Auto-tagged and searchable');
                        setShowAddRecord(false);
                      }}>
                        Add Record
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
      <div className="px-6 py-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
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
      <div className="px-6 py-3 border-b">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Sort:</Label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="a-z">A–Z</SelectItem>
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
                    <Button variant="outline" size="sm" onClick={() => {
                      toast.success(`Secure links created for ${selectedRecords.length} records • Expires in 30 days • Watermark on`);
                      setSelectedRecords([]);
                    }}>
                      <Share className="w-4 h-4 mr-1" />
                      Share…
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      toast.success(`${selectedRecords.length} records archived`);
                      setSelectedRecords([]);
                    }}>
                      <Archive className="w-4 h-4 mr-1" />
                      Archive
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (confirm(`Permanently delete ${selectedRecords.length} records? This cannot be undone.`)) {
                        toast.success(`${selectedRecords.length} records deleted`);
                        setSelectedRecords([]);
                      }
                    }}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
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
                  onAction={(action) => toast.success(`Action: ${action} on ${record.title}`)}
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
                      <Button size="sm" variant="outline">
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