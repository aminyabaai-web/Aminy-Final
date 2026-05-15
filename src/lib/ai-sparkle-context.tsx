// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

import React, { createContext, useContext } from 'react';

const AISparkleContext = createContext<(prompt: string) => void>(() => {});
export const useOpenAI = () => useContext(AISparkleContext);
export function AISparkleProvider({ onOpen, children }: { onOpen: (prompt: string) => void; children: React.ReactNode }) {
  return <AISparkleContext.Provider value={onOpen}>{children}</AISparkleContext.Provider>;
}
