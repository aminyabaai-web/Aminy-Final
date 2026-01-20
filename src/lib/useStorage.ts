// Single source of truth for storage usage across the vault
import { useMemo, useState, useEffect } from 'react';

export interface StorageInfo {
  usedBytes: number;
  quotaBytes: number;
  planTier: 'starter' | 'core' | 'pro';
  capabilities: {
    search?: {
      fullText: boolean;
    };
    sharing?: {
      links: boolean;
    };
    ai?: {
      summary: boolean;
      search: boolean;
    };
    reports?: {
      dropIn: boolean;
    };
  };
}

export function useStorage(records?: Array<{ files?: Array<{ size: number }> }>): StorageInfo {
  const [userTier, setUserTier] = useState<'starter' | 'core' | 'pro'>('core');
  
  // Get tier from global tier manager
  useEffect(() => {
    const getCurrentTier = () => {
      if (typeof window !== 'undefined' && window.aminyTier?.get) {
        return window.aminyTier.get() as 'starter' | 'core' | 'pro';
      }
      return 'core';
    };
    
    setUserTier(getCurrentTier());
    
    // Subscribe to tier changes
    if (typeof window !== 'undefined' && window.aminyTier?.subscribe) {
      const unsubscribe = window.aminyTier.subscribe((newTier: string) => {
        setUserTier(newTier as 'starter' | 'core' | 'pro');
      });
      return unsubscribe;
    }
  }, []);

  return useMemo(() => {
    // Calculate total used bytes - mock some usage for demo
    const usedBytes = records ? 
      records.reduce((sum, record) => 
        sum + (record.files?.reduce((fileSum, file) => fileSum + file.size, 0) || 0), 0
      ) : 1200000000; // 1.2 GB mock usage

    // Define tier limits and capabilities
    const tierConfig = {
      starter: { 
        quotaGB: 1, 
        capabilities: {
          search: { fullText: false },
          sharing: { links: false },
          ai: { summary: false, search: false },
          reports: { dropIn: false }
        }
      },
      core: { 
        quotaGB: 5,
        capabilities: {
          search: { fullText: true },
          sharing: { links: true },
          ai: { summary: false, search: false },
          reports: { dropIn: false }
        }
      },
      pro: { 
        quotaGB: 20,
        capabilities: {
          search: { fullText: true },
          sharing: { links: true },
          ai: { summary: true, search: true },
          reports: { dropIn: true }
        }
      }
    };

    const config = tierConfig[userTier];
    const quotaBytes = config.quotaGB * 1024 * 1024 * 1024;

    return {
      usedBytes,
      quotaBytes,
      planTier: userTier,
      capabilities: config.capabilities
    };
  }, [userTier, records]);
}