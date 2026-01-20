import React from 'react';
import { RecordsVaultComplete } from './RecordsVaultComplete';
import type { VaultRecord } from '../types/vault';

interface RecordsVaultEnhancedProps {
  onClose: () => void;
  vaultRecords: VaultRecord[];
  publishEvent: (eventName: string, payload: any) => void;
  connectorData: any;
  setConnectorData: (data: any) => void;
  userTier?: 'starter' | 'core' | 'pro';
}

export const RecordsVaultEnhanced: React.FC<RecordsVaultEnhancedProps> = ({ 
  userTier = 'core',
  ...props 
}) => {
  return <RecordsVaultComplete {...props} userTier={userTier} />;
};