/**
 * Demo component showing how to use AIContext, useAIPlanner, and useNudgeEngine
 * This can be added to any screen to test the new AI context system
 */

import React from 'react';
import { useAIContext } from '../context/AIContext';
import { useAIPlanner } from '../hooks/useAIPlanner';
import { useNudgeEngine } from '../hooks/useNudgeEngine';
import { Card } from './ui/card';
import { Button } from './ui/button';

export const AIContextDemo: React.FC = () => {
  const {
    parentStress,
    childProfile,
    currentGoals,
    updateParentStress,
    updateChildProfile,
    addGoal,
  } = useAIContext();

  const { recommendGoals } = useAIPlanner();
  const { getNudge } = useNudgeEngine();

  const handleAddRecommendedGoal = () => {
    const recommendation = recommendGoals();
    if (recommendation) {
      addGoal({
        id: `goal-${Date.now()}`,
        title: recommendation,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const nudge = getNudge();
  const goalRecommendation = recommendGoals();

  return (
    <Card className="p-4 m-4 space-y-4">
      <h3 className="font-semibold">AI Context Demo</h3>
      
      <div className="space-y-2">
        <div>
          <label className="text-sm">Child Name:</label>
          <input
            type="text"
            value={childProfile.name}
            onChange={(e) => updateChildProfile({ name: e.target.value })}
            className="ml-2 border rounded px-2 py-1"
            placeholder="Enter child name"
          />
        </div>

        <div>
          <label className="text-sm">Child Age:</label>
          <input
            type="number"
            value={childProfile.age || ''}
            onChange={(e) => updateChildProfile({ age: parseInt(e.target.value) || 0 })}
            className="ml-2 border rounded px-2 py-1 w-20"
            placeholder="Age"
          />
        </div>

        <div>
          <label className="text-sm">Neuro Type:</label>
          <input
            type="text"
            value={childProfile.neuroType}
            onChange={(e) => updateChildProfile({ neuroType: e.target.value })}
            className="ml-2 border rounded px-2 py-1"
            placeholder="e.g., ADHD, Autism"
          />
        </div>

        <div>
          <label className="text-sm">Parent Stress Level (0-10):</label>
          <input
            type="range"
            min="0"
            max="10"
            value={parentStress}
            onChange={(e) => updateParentStress(parseInt(e.target.value))}
            className="ml-2 w-48"
          />
          <span className="ml-2 font-semibold">{parentStress}</span>
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h4 className="font-semibold text-sm">Current Goals ({currentGoals.length})</h4>
        {currentGoals.length > 0 ? (
          <ul className="list-disc list-inside text-sm">
            {currentGoals.map((goal) => (
              <li key={goal.id}>{goal.title}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No goals yet</p>
        )}
      </div>

      <div className="border-t pt-4 space-y-2">
        <h4 className="font-semibold text-sm">AI Planner</h4>
        {goalRecommendation ? (
          <div>
            <p className="text-sm">Recommendation: {goalRecommendation}</p>
            <Button onClick={handleAddRecommendedGoal} size="sm" className="mt-2">
              Add Goal
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            You have 3 or more goals. Complete some first!
          </p>
        )}
      </div>

      <div className="border-t pt-4 space-y-2">
        <h4 className="font-semibold text-sm">Nudge Engine</h4>
        {nudge ? (
          <p className="text-sm text-green-600 font-medium">{nudge}</p>
        ) : (
          <p className="text-sm text-gray-500">
            {currentGoals.length === 0
              ? 'Add a goal to get nudges'
              : 'Keep working on your goals!'}
          </p>
        )}
      </div>
    </Card>
  );
};
