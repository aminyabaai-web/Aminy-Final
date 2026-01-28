import React, { useState, useEffect } from 'react';
import { Brain, Eye, FileText, Target, Activity, MessageSquare, Sparkles, ChevronDown } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { buildAIContext, type AminyAIContext } from '../lib/aminy-ai-brain';

/**
 * AI Context Viewer
 * 
 * Shows parents EXACTLY what the AI knows about their child.
 * This builds trust and demonstrates the intelligence of the system.
 * 
 * Use in Settings or as an explainer modal.
 */
export function AIContextViewer() {
  const [context, setContext] = useState<AminyAIContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      const ctx = await buildAIContext();
      setContext(ctx);
    } catch (error) {
      console.error('Failed to load AI context:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (loading) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="w-5 h-5 animate-pulse" />
          <span>Loading AI context...</span>
        </div>
      </Card>
    );
  }

  if (!context) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <p className="text-muted-foreground">No AI context available</p>
      </Card>
    );
  }

  const sections = [
    {
      id: 'child',
      title: 'Child Profile',
      icon: <Eye className="w-4 h-4" />,
      count: Object.keys(context.child).length,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <p className="font-medium">{context.child.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Age:</span>
              <p className="font-medium">{context.child.age} years</p>
            </div>
          </div>
          
          {context.child.concerns.length > 0 && (
            <div>
              <span className="text-muted-foreground text-sm">Current Concerns:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {context.child.concerns.map((concern, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {concern}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {context.child.strengths.length > 0 && (
            <div>
              <span className="text-muted-foreground text-sm">Strengths:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {context.child.strengths.map((strength, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {context.child.communicationLevel && (
            <div>
              <span className="text-muted-foreground text-sm">Communication:</span>
              <p className="text-sm">{context.child.communicationLevel}</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'goals',
      title: 'Current Goals',
      icon: <Target className="w-4 h-4" />,
      count: context.child.currentGoals.length,
      content: (
        <div className="space-y-2">
          {context.child.currentGoals.length > 0 ? (
            context.child.currentGoals.map((goal, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">
                    {goal.area}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{goal.progress}% complete</span>
                </div>
                <p>{goal.description}</p>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-accent h-1.5 rounded-full transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No goals set yet</p>
          )}
        </div>
      )
    },
    {
      id: 'vault',
      title: 'Vault Documents',
      icon: <FileText className="w-4 h-4" />,
      count: Object.values(context.vault).flat().length,
      content: (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-muted-foreground">Evaluations:</span>
              <Badge>{context.vault.evaluations.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-muted-foreground">IEPs:</span>
              <Badge>{context.vault.iepDocuments.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-muted-foreground">Progress Reports:</span>
              <Badge>{context.vault.progressReports.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-muted-foreground">BCBA Notes:</span>
              <Badge>{context.vault.bcbaNotes.length}</Badge>
            </div>
          </div>
          {Object.values(context.vault).flat().length === 0 && (
            <p className="text-muted-foreground">No documents uploaded yet</p>
          )}
        </div>
      )
    },
    {
      id: 'daily',
      title: "Today's Plan",
      icon: <Activity className="w-4 h-4" />,
      count: context.dailyPlan.todaysFocus.length,
      content: (
        <div className="space-y-2">
          {context.dailyPlan.todaysFocus.length > 0 ? (
            <>
              <div className="text-sm">
                <span className="text-muted-foreground">Planned activities:</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  {context.dailyPlan.todaysFocus.map((activity, idx) => (
                    <li key={idx}>{activity.title}</li>
                  ))}
                </ul>
              </div>
              {context.dailyPlan.completedToday.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Completed today:</span>
                  <ul className="mt-1 space-y-1 list-disc list-inside text-green-700">
                    {context.dailyPlan.completedToday.map((activity, idx) => (
                      <li key={idx}>{activity.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No activities planned for today</p>
          )}
        </div>
      )
    },
    {
      id: 'memory',
      title: 'Conversation Memory',
      icon: <MessageSquare className="w-4 h-4" />,
      count: context.memory.conversations.length,
      content: (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="text-muted-foreground">Past conversations:</span>
            <Badge>{context.memory.conversations.length}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="text-muted-foreground">Successful strategies:</span>
            <Badge>{context.memory.successfulStrategies.length}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="text-muted-foreground">Common questions:</span>
            <Badge>{context.memory.commonQuestions.length}</Badge>
          </div>
          {context.memory.parentConcerns.length > 0 && (
            <div>
              <span className="text-muted-foreground">Recent concerns:</span>
              <ul className="mt-1 space-y-1 text-xs">
                {context.memory.parentConcerns.slice(0, 3).map((concern, idx) => (
                  <li key={idx} className="p-2 bg-amber-50 rounded text-amber-900 truncate">
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'junior',
      title: 'Junior Mode Activity',
      icon: <Sparkles className="w-4 h-4" />,
      count: context.juniorMode.gamesPlayed.length,
      content: (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-muted-foreground">Sessions:</span>
              <Badge>{context.juniorMode.gamesPlayed.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="text-muted-foreground">Skills practiced:</span>
              <Badge>{context.juniorMode.skillsPracticed.length}</Badge>
            </div>
          </div>
          {context.juniorMode.skillsPracticed.length > 0 && (
            <div>
              <span className="text-muted-foreground">Skills worked on:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {context.juniorMode.skillsPracticed.slice(0, 6).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-r from-accent/5 to-accent/10 border-accent/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">What Aminy's AI Knows</h3>
            <p className="text-sm text-muted-foreground">
              This is the complete context the AI uses to give you personalized advice about {context.child.name}.
            </p>
          </div>
        </div>
      </Card>

      {/* Context Sections */}
      <div className="space-y-2">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={expandedSections.has(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full p-4 h-auto justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                      {section.icon}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{section.title}</span>
                        {section.count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {section.count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      expandedSections.has(section.id) ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t">
                  {section.content}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Footer */}
      <Card className="p-3 bg-accent/5 border-accent/20">
        <div className="flex items-start gap-2 text-xs">
          <Eye className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-accent mb-1">Privacy & Security</p>
            <p className="text-muted-foreground">
              All AI context is encrypted and stored securely. The AI uses this information 
              ONLY to give you better, more personalized advice. Your data is never shared 
              with third parties.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
