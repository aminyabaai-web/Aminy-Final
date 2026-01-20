export interface VaultRecord {
  id: string;
  childId: string;
  title: string;
  type: VaultRecordType; // New: IEP, Evaluation, Report, etc.
  category: string[];    // e.g., ['IEP/504', 'Letters & forms']
  tags: string[];        // free chips
  date: string;          // ISO
  source: VaultSource;   // New: Enhanced source tracking
  visibility: VaultVisibility; // New: Privacy controls
  fileUrl?: string;      // for uploads
  vaultText?: string;    // OCR/extracted text
  quickSummary?: string; // 3–5 bullets
  keyFields?: { [k: string]: string }; // payer, school, service minutes, goals mentioned, etc.
  usableByAssistant: boolean; // toggle
  attachToExport: boolean;    // toggle
  createdAt: string;
  sourceType: 'upload' | 'scan' | 'note' | 'auto-generated';
  fileType?: string;     // PDF, JPG, PNG, DOC, etc.
  fileSize?: number;     // in bytes
  relatedTo?: VaultRelation[]; // New: Links to goals/routines/strategies
  notes?: string;        // New: Optional notes field
  files?: VaultFile[];   // New: Multi-file support
  shareSettings?: VaultShareSettings; // New: Sharing configuration
}

export interface VaultIndex {
  recordId: string;
  title: string;
  category: string[];
  tags: string[];
  textPreview: string;
}

export interface VaultSearchResult {
  record: VaultRecord;
  matchedText?: string;
  relevanceScore: number;
}

// Vault Events
export const VAULT_EVENTS = {
  VAULT_RECORD_ADDED: 'vault.record.added',
  VAULT_RECORD_INDEXED: 'vault.record.indexed', 
  VAULT_CITATION: 'vault.citation',
  VAULT_ATTACHED_TO_EXPORT: 'vault.attached_to_export'
} as const;

// New Types
export type VaultRecordType = 
  | 'IEP' 
  | 'Evaluation' 
  | 'Report' 
  | 'Prescription/Letter' 
  | 'School' 
  | 'Insurance' 
  | 'Other';

export type VaultSource = 
  | 'Uploaded' 
  | 'Coach Note' 
  | 'Session Artifact' 
  | 'Parent Input'
  | 'Scanned Document';

export type VaultVisibility = 
  | 'Private' 
  | 'Shareable Link';

export interface VaultFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt: string;
}

export interface VaultRelation {
  id: string;
  type: 'Goal' | 'Routine' | 'Strategy';
  title: string;
}

export interface VaultShareSettings {
  hasShareLink: boolean;
  shareId?: string;
  expiresAt?: string; // 7/30/90 days
  hasWatermark: boolean;
  hasPasscode: boolean;
  audienceLabel?: string; // Teacher, Provider, Other
  viewLog?: VaultViewLog[];
}

export interface VaultViewLog {
  viewedBy: string;
  viewedAt: string;
  ipAddress?: string;
}

// Vault Categories
export const VAULT_CATEGORIES = [
  'Evaluations',
  'IEP/504', 
  'Provider notes',
  'Insurance/Benefits',
  'Medical',
  'School comms',
  'Letters & forms',
  'Receipts',
  'Other'
] as const;

export type VaultCategory = typeof VAULT_CATEGORIES[number];

// Record Types
export const VAULT_RECORD_TYPES: VaultRecordType[] = [
  'IEP',
  'Evaluation', 
  'Report',
  'Prescription/Letter',
  'School',
  'Insurance',
  'Other'
];

// Source Types  
export const VAULT_SOURCES: VaultSource[] = [
  'Uploaded',
  'Coach Note', 
  'Session Artifact',
  'Parent Input',
  'Scanned Document'
];