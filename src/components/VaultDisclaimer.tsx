// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React from 'react';

export const VaultDisclaimer: React.FC = () => {
  return (
    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-sm text-amber-800">
        <strong>Educational guidance only.</strong> Aminy provides educational guidance using ABA-informed strategies. 
        It is not medical advice or a prescription for therapy. For emergencies, call local emergency services.
      </p>
    </div>
  );
};