import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * AI Status Indicator (Developer Mode Only)
 * Shows whether backend AI is configured and working
 */
export function AIStatusIndicator() {
  const [isAIActive, setIsAIActive] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check backend server AI status
    const checkAIStatus = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8a022548/health`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        
        if (response.ok) {
          // Server is up, assume AI is configured (ANTHROPIC_API_KEY is in the secrets list)
          setIsAIActive(true);
        } else {
          setIsAIActive(false);
        }
      } catch (error) {
        console.error('AI status check error:', error);
        setIsAIActive(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAIStatus();
  }, []);

  if (isChecking) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-600 border-slate-200">
        <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (!isAIActive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200 cursor-help"
            >
              <AlertCircle className="w-2.5 h-2.5 mr-1" />
              Fallback
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px] text-xs">
            <p>Backend server unreachable or ANTHROPIC_API_KEY not configured. Using template responses.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200 cursor-help"
          >
            <Sparkles className="w-2.5 h-2.5 mr-1" />
            AI
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-xs">
          <p>Powered by GPT-4o-mini for natural, intelligent conversation.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
