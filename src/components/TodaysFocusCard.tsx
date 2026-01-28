import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface FocusTask {
  id: string;
  title: string;
  description: string;
  timeEstimate: string;
  skillType: 'speech' | 'social' | 'sensory' | 'routines';
  priority: number;
  whyItHelps?: string;
  completed?: boolean;
}

interface TodaysFocusCardProps {
  primaryTask: FocusTask;
  additionalTasks?: FocusTask[];
  onTaskClick: (taskId: string) => void;
  onTaskComplete?: (taskId: string) => void;
}

const skillTypeColors = {
  speech: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  social: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  sensory: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  routines: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
};

const skillTypeLabels = {
  speech: 'Speech',
  social: 'Social',
  sensory: 'Sensory',
  routines: 'Routines'
};

export function TodaysFocusCard({ 
  primaryTask, 
  additionalTasks = [], 
  onTaskClick,
  onTaskComplete 
}: TodaysFocusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderTask = (task: FocusTask, isPrimary = false) => {
    const colors = skillTypeColors[task.skillType];
    
    return (
      <div
        key={task.id}
        className={`${isPrimary ? '' : 'p-3 border-t border-slate-100'}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 mt-1`}>
            <Target className={`w-5 h-5 ${colors.text}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className={`${isPrimary ? 'text-lg' : 'text-sm'} font-semibold mb-1`}>
                  {task.title}
                </h3>
                <p className={`${isPrimary ? 'text-sm' : 'text-xs'} text-muted-foreground mb-2`}>
                  {task.description}
                </p>
              </div>
              
              {task.completed && (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant="secondary" className={`${colors.bg} ${colors.text} text-xs`}>
                {skillTypeLabels[task.skillType]}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{task.timeEstimate}</span>
              </div>
            </div>

            {task.whyItHelps && (
              <div className="p-2 bg-accent/5 rounded-lg border border-accent/10 mb-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Why it helps: </span>
                    {task.whyItHelps}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => onTaskClick(task.id)}
                className="flex-1 bg-accent hover:bg-accent/90 h-10"
              >
                Start now
              </Button>
              
              {!task.completed && onTaskComplete && (
                <Button
                  onClick={() => onTaskComplete(task.id)}
                  variant="outline"
                  className="h-10 px-4"
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border-2 border-accent/20">
      <div className="bg-gradient-to-r from-accent/5 to-accent/10 px-4 py-3 border-b border-accent/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-slate-900">Today's Calm Plan</h2>
          </div>
          
          {additionalTasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-3 gap-1 text-accent hover:bg-accent/10"
            >
              <span className="text-xs font-medium">
                {isExpanded ? 'Show less' : `+${additionalTasks.length} more`}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {renderTask(primaryTask, true)}
      </div>

      {isExpanded && additionalTasks.length > 0 && (
        <div className="border-t border-slate-100">
          {additionalTasks.map(task => renderTask(task, false))}
        </div>
      )}
    </Card>
  );
}
