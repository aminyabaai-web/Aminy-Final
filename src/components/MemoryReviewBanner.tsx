// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Brain, Check, X, Edit3, Info } from 'lucide-react';
import { Badge } from './ui/badge';

interface MemoryReviewBannerProps {
  memoryItem: {
    key: string;
    value: string | object;
    scope: 'child' | 'parent' | 'family';
    confidence: number;
    why_saved: string;
  };
  onApprove: () => void;
  onReject: () => void;
  onEdit: (newValue: string) => void;
}

export const MemoryReviewBanner: React.FC<MemoryReviewBannerProps> = ({
  memoryItem,
  onApprove,
  onReject,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(
    typeof memoryItem.value === 'string' ? memoryItem.value : JSON.stringify(memoryItem.value)
  );
  const [showDetails, setShowDetails] = useState(false);

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'child': return 'bg-blue-100 text-blue-700 border-[#C8DDE8]';
      case 'parent': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'family': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-[#F0EDE8] text-[#3A4A57] border-[#E8E4DF]';
    }
  };

  const handleEdit = () => {
    onEdit(editedValue);
    setIsEditing(false);
  };

  return (
    <div className="bg-accent/5 border border-accent/30 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">Save this as a memory?</p>
            <Badge variant="outline" className={`text-xs ${getScopeColor(memoryItem.scope)}`}>
              {memoryItem.scope}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Aminy will remember this for personalized guidance
          </p>
        </div>
      </div>

      {/* Memory Content */}
      <div className="bg-white border border-[#E8E4DF] rounded-lg p-3 mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {memoryItem.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </p>
        {isEditing ? (
          <Input
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="text-sm"
            autoFocus
          />
        ) : (
          <p className="text-sm font-medium">
            {typeof memoryItem.value === 'string' 
              ? memoryItem.value 
              : JSON.stringify(memoryItem.value)
            }
          </p>
        )}
      </div>

      {/* Details (collapsible) */}
      {showDetails && (
        <div className="bg-white border border-[#E8E4DF] rounded-lg p-3 mb-3 text-xs">
          <p className="text-muted-foreground mb-1">Why this is being saved:</p>
          <p>{memoryItem.why_saved || 'Helps personalize Aminy\'s guidance'}</p>
          <p className="text-muted-foreground mt-2 mb-1">Confidence:</p>
          <p>{(memoryItem.confidence * 100).toFixed(0)}%</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {isEditing ? (
          <>
            <Button
              size="sm"
              onClick={handleEdit}
              className="gap-1 h-8 text-xs"
            >
              <Check className="w-3 h-3" />
              Save Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditedValue(
                  typeof memoryItem.value === 'string' ? memoryItem.value : JSON.stringify(memoryItem.value)
                );
              }}
              className="gap-1 h-8 text-xs"
            >
              <X className="w-3 h-3" />
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              onClick={onApprove}
              className="gap-1 h-8 text-xs bg-accent hover:bg-accent/90"
            >
              <Check className="w-3 h-3" />
              Yes, Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-1 h-8 text-xs"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              className="gap-1 h-8 text-xs"
            >
              <X className="w-3 h-3" />
              No, Don't Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              className="gap-1 h-8 text-xs ml-auto"
            >
              <Info className="w-3 h-3" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
