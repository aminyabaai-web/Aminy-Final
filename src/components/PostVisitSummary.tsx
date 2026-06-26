// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState } from 'react';
import { CheckCircle, Circle, Sparkles, ThumbsUp, Clock, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

interface ActionItem {
  task: string;
  completed: boolean;
}

interface PostVisitSummaryProps {
  sessionId?: string;
  providerName: string;
  providerCredentials?: string;
  sessionDate: Date;
  sessionType: string;
  keyTakeaways: string[];
  actionItems: ActionItem[];
  planChanges?: string[];
  userId?: string;
  onApproved?: () => void;
  onNavigate?: (screen: string) => void;
  alreadyApproved?: boolean;
}

export function PostVisitSummary({
  sessionId,
  providerName,
  providerCredentials,
  sessionDate,
  sessionType,
  keyTakeaways = [],
  actionItems = [],
  planChanges = [],
  userId,
  onApproved,
  alreadyApproved = false,
}: PostVisitSummaryProps) {
  const [approved, setApproved] = useState(alreadyApproved);
  const [isApproving, setIsApproving] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<number>>(
    new Set(actionItems.map((item, i) => (item.completed ? i : -1)).filter(i => i >= 0))
  );

  const handleApprove = async () => {
    if (approved || isApproving) return;
    setIsApproving(true);
    try {
      if (sessionId && userId) {
        await supabase.from('session_notes').update({
          parent_approved: true,
          parent_approved_at: new Date().toISOString(),
          shared_with_parent: true,
        }).eq('session_id', sessionId);
      }
      setApproved(true);
      toast.success('Plan updated! Your AI insights and goals now reflect this session.');
      onApproved?.();
    } catch {
      toast.error('Could not save approval — try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const toggleItem = (index: number) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const completedCount = completedItems.size;
  const totalItems = actionItems.length;

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#132F43]">Visit Summary</h3>
          <p className="text-sm text-[#5A6B7A] mt-0.5">
            {sessionType} with {providerName}{providerCredentials ? `, ${providerCredentials}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-100 text-violet-700">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Generated
          </Badge>
          {approved && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Approved
            </Badge>
          )}
        </div>
      </div>

      {/* Session Details */}
      <div className="mb-4 p-3 bg-[#F6FBFB] rounded-lg">
        <p className="text-sm text-[#5A6B7A]">
          <Clock className="w-3 h-3 inline mr-1" />
          {sessionDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
          {sessionDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>

      {/* Key Takeaways */}
      {keyTakeaways.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-[#132F43] mb-2">Key Takeaways</h4>
          <ul className="space-y-2">
            {keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#6B9080] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#3A4A57]">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Plan changes — shown only when there are suggested updates */}
      {planChanges.length > 0 && (
        <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
          <h4 className="text-sm font-semibold text-violet-900 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Suggested Plan Updates
          </h4>
          <ul className="space-y-1.5">
            {planChanges.map((change, index) => (
              <li key={index} className="text-sm text-violet-800 flex items-start gap-2">
                <span className="text-violet-400 mt-0.5">•</span>
                {change}
              </li>
            ))}
          </ul>
          <p className="text-sm text-violet-600 mt-2">
            Approve below to apply these updates to your AI's understanding of your child's plan.
          </p>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[#132F43]">Action Items</h4>
            <span className="text-sm text-[#5A6B7A]">{completedCount}/{totalItems} done</span>
          </div>
          <div className="space-y-2">
            {actionItems.map((item, index) => (
              <button
                key={index}
                onClick={() => toggleItem(index)}
                className="w-full flex items-center gap-2.5 p-2.5 bg-[#F6FBFB] rounded-lg hover:bg-[#EDF4F7] transition-colors text-left"
              >
                {completedItems.has(index)
                  ? <CheckCircle className="w-4 h-4 text-[#6B9080] shrink-0" />
                  : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                }
                <span className={`text-sm ${completedItems.has(index) ? 'line-through text-slate-400' : 'text-[#132F43]'}`}>
                  {item.task}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Approve CTA */}
      {!approved ? (
        <Button
          onClick={handleApprove}
          disabled={isApproving}
          className="w-full bg-[#6B9080] hover:bg-[#216982] text-white"
        >
          {isApproving ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</span>
          ) : (
            <span className="flex items-center gap-2"><ThumbsUp className="w-4 h-4" />Approve & apply to plan</span>
          )}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Plan updated based on this session</span>
        </div>
      )}
    </Card>
  );
}
