// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * RecordsVault upload-ease tests
 *
 * Guards the "attach like ChatGPT" vault upload UX:
 * 1. Mobile camera capture input (accept="image/*" capture="environment")
 *    + multi-file picker input, behind two obvious 44px+ buttons.
 * 2. Storage quota meter derives from tier-utils entitlements
 *    (100MB free / 5GB core / 25GB pro / unlimited family) — never hardcoded.
 * 3. process-document is invoked after a successful upload (vault → AI chain).
 * 4. A failed upload keeps the file in the queue with a working Retry.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks (before component import) ─────────────────────────────────────────

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'parent@test.com' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'jwt-token' } } }),
    },
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) })),
  },
}));

const mockUploadVaultFile = vi.fn();
const mockProcessVaultDocument = vi.fn();
const mockMarkProcessed = vi.fn().mockResolvedValue(undefined);
const mockListVaultDocuments = vi.fn().mockResolvedValue({ documents: [] });

vi.mock('../../lib/vault-storage', () => ({
  uploadVaultFile: (...args: unknown[]) => mockUploadVaultFile(...args),
  listVaultDocuments: (...args: unknown[]) => mockListVaultDocuments(...args),
  deleteVaultDocument: vi.fn().mockResolvedValue({ success: true }),
  getVaultDocumentUrl: vi.fn().mockResolvedValue({ url: 'https://signed.example' }),
  processVaultDocument: (...args: unknown[]) => mockProcessVaultDocument(...args),
  markVaultDocumentProcessed: (...args: unknown[]) => mockMarkProcessed(...args),
}));

const mockStoreMemory = vi.fn().mockResolvedValue(undefined);
vi.mock('../../ai/contextLayer', () => ({
  storeMemory: (...args: unknown[]) => mockStoreMemory(...args),
}));

vi.mock('../../lib/badge-service', () => ({
  checkAndAwardBadges: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/security/hipaa-audit', () => ({
  logPHIView: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../hooks/useAuditedAction', () => ({
  useAuditedAction: () => ({ logAction: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('../../components/AISparkleButton', () => ({
  AISparkleButton: () => null,
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { RecordsVault } from '../../components/RecordsVault';
import { getStorageLimitBytes } from '../../lib/tier-utils';

const openAddRecordSheet = async () => {
  fireEvent.click(screen.getByRole('button', { name: /add record/i }));
  await screen.findByTestId('vault-dropzone');
};

const pickFile = (name = 'iep.pdf', type = 'application/pdf') => {
  const file = new File(['%PDF-1.4 test'], name, { type });
  const input = screen.getByTestId('vault-file-input') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return file;
};

describe('RecordsVault — upload ease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListVaultDocuments.mockResolvedValue({ documents: [] });
    mockUploadVaultFile.mockResolvedValue({ success: true, fileId: 'doc-1', filePath: 'user-1/general/x.pdf' });
    mockProcessVaultDocument.mockResolvedValue({ success: true, chunks: 4 });
  });

  it('shows a mobile camera-capture input and a multi-file picker behind two obvious buttons', async () => {
    render(<RecordsVault userTier="core" />);
    await openAddRecordSheet();

    const camera = screen.getByTestId('vault-camera-input');
    expect(camera).toHaveAttribute('type', 'file');
    expect(camera).toHaveAttribute('accept', 'image/*');
    expect(camera).toHaveAttribute('capture', 'environment');

    const picker = screen.getByTestId('vault-file-input');
    expect(picker).toHaveAttribute('multiple');
    expect(picker.getAttribute('accept')).toContain('.pdf');

    // Two clear actions with warm copy
    expect(screen.getByTestId('vault-take-photo')).toHaveTextContent(/take a photo/i);
    expect(screen.getByTestId('vault-choose-file')).toHaveTextContent(/choose files/i);
    expect(screen.getByText(/snap the iep, we'll do the rest/i)).toBeInTheDocument();

    // 44px+ tap targets (h-12 = 48px)
    expect(screen.getByTestId('vault-take-photo').className).toContain('h-12');
    expect(screen.getByTestId('vault-choose-file').className).toContain('h-12');
  });

  it('derives the quota meter from tier-utils (free = 100MB, honest MB formatting)', async () => {
    render(<RecordsVault userTier="free" />);
    const meter = await screen.findByTestId('vault-quota-meter');

    const freeLimit = getStorageLimitBytes('free');
    expect(freeLimit).toBe(100 * 1024 * 1024); // guard: tier-utils is the source
    expect(meter).toHaveTextContent(/of 100 MB used/i);
  });

  it('shows unlimited storage for the Family plan (quota null in tier-utils)', async () => {
    expect(getStorageLimitBytes('proplus')).toBeNull();
    render(<RecordsVault userTier="proplus" />);
    const meter = await screen.findByTestId('vault-quota-meter');
    expect(meter).toHaveTextContent(/unlimited storage/i);
  });

  it('invokes process-document after a successful upload and surfaces the AI-read state', async () => {
    render(<RecordsVault userTier="core" />);
    await openAddRecordSheet();
    pickFile();

    await waitFor(() => expect(mockUploadVaultFile).toHaveBeenCalledTimes(1));
    // Tier is passed through so the per-tier quota is enforced server of truth
    expect(mockUploadVaultFile.mock.calls[0][2]).toMatchObject({ tier: 'core' });

    await waitFor(() => expect(mockProcessVaultDocument).toHaveBeenCalledWith('doc-1'));
    expect(mockMarkProcessed).toHaveBeenCalledWith('doc-1');

    // Parent sees what happens next
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Saved. Aminy is reading it now — ask about it anytime in chat.'
    );
    await screen.findByText(/aminy read it — ask about it anytime in chat/i);

    // Vault → AI chain: a memory fact is stored so chat knows the doc exists
    expect(mockStoreMemory).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ category: 'insight', content: expect.stringContaining('iep.pdf') })
    );
  });

  it('keeps the document saved when AI processing fails (graceful degradation)', async () => {
    mockProcessVaultDocument.mockResolvedValue({ success: false, error: 'Unsupported file type' });
    render(<RecordsVault userTier="core" />);
    await openAddRecordSheet();
    pickFile('photo.jpg', 'image/jpeg');

    await waitFor(() => expect(mockProcessVaultDocument).toHaveBeenCalled());
    await screen.findByText(/saved to your vault\. ask aminy about it anytime/i);
    expect(screen.queryByTestId('vault-upload-error')).not.toBeInTheDocument();
  });

  it('keeps a failed file in the queue with a Retry that re-uploads it', async () => {
    mockUploadVaultFile.mockResolvedValueOnce({ success: false, error: 'Network hiccup' });
    render(<RecordsVault userTier="core" />);
    await openAddRecordSheet();
    pickFile();

    // Failure state: file stays visible with the error + retry affordance
    await screen.findByTestId('vault-upload-error');
    expect(screen.getByTestId('vault-upload-error')).toHaveTextContent(/network hiccup/i);
    expect(screen.getByText('iep.pdf')).toBeInTheDocument();

    // Retry succeeds (mock back to default success)
    fireEvent.click(screen.getByTestId('vault-retry-upload'));
    await waitFor(() => expect(mockUploadVaultFile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockProcessVaultDocument).toHaveBeenCalledWith('doc-1'));
    await screen.findByText(/aminy read it — ask about it anytime in chat/i);
  });
});
