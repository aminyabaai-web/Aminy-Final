/**
 * SortableGoalList — Drag-and-drop reordering for care plan goals
 *
 * Uses @dnd-kit for accessible, mobile-friendly drag-and-drop.
 * Goals are grouped by status (active / paused / completed) and
 * can be reordered within each group via drag handles.
 *
 * ----------------------------------------------------------------
 * NOTE: This component requires the following packages to be installed:
 *
 *   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 *
 * These are NOT currently in package.json.
 * ----------------------------------------------------------------
 */

import React, { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, TrendingUp, Pause, Award } from 'lucide-react';
import type { CarePlanGoal } from '../../lib/care-plan';

// ============================================================================
// Types
// ============================================================================

interface SortableGoalListProps {
  goals: CarePlanGoal[];
  /** Called with the full ordered list of goal IDs after a drag completes */
  onReorder: (goalIds: string[]) => void;
  /** Render function for each goal card — receives the goal and a drag handle element */
  renderGoalCard: (goal: CarePlanGoal, dragHandle: React.ReactNode) => React.ReactNode;
}

interface GoalGroup {
  key: CarePlanGoal['status'];
  label: string;
  icon: React.ReactNode;
  goals: CarePlanGoal[];
  /** CSS classes for the section header */
  headerClass: string;
}

// ============================================================================
// Drag Handle
// ============================================================================

interface DragHandleProps {
  listeners: Record<string, Function> | undefined;
  attributes: DraggableAttributes;
}

function DragHandle({ listeners, attributes }: DragHandleProps) {
  return (
    <button
      className="touch-none p-1.5 -ml-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-5 h-5" />
    </button>
  );
}

// ============================================================================
// SortableGoalItem — wraps a single goal with useSortable
// ============================================================================

interface SortableGoalItemProps {
  goal: CarePlanGoal;
  renderGoalCard: SortableGoalListProps['renderGoalCard'];
}

function SortableGoalItem({ goal, renderGoalCard }: SortableGoalItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : 'auto',
  };

  const dragHandle = <DragHandle listeners={listeners} attributes={attributes} />;

  return (
    <div ref={setNodeRef} style={style}>
      {renderGoalCard(goal, dragHandle)}
    </div>
  );
}

// ============================================================================
// SortableGoalList — main component
// ============================================================================

export function SortableGoalList({ goals, onReorder, renderGoalCard }: SortableGoalListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mobile-friendly sensors: pointer (mouse) + touch with distance activation
  // The 8px distance constraint prevents accidental drags on tap / scroll
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group goals by status, preserving the order they arrive in (which
  // should already be sorted by orderIndex from the API layer).
  const groups: GoalGroup[] = useMemo(() => {
    const active = goals.filter(g => g.status === 'active');
    const paused = goals.filter(g => g.status === 'paused');
    const completed = goals.filter(g => g.status === 'completed');

    const result: GoalGroup[] = [];

    if (active.length > 0) {
      result.push({
        key: 'active',
        label: 'Active Goals',
        icon: <TrendingUp className="w-4 h-4" />,
        goals: active,
        headerClass: 'text-gray-500',
      });
    }

    if (paused.length > 0) {
      result.push({
        key: 'paused',
        label: `Paused (${paused.length})`,
        icon: <Pause className="w-4 h-4" />,
        goals: paused,
        headerClass: 'text-gray-400',
      });
    }

    if (completed.length > 0) {
      result.push({
        key: 'completed',
        label: `Completed (${completed.length})`,
        icon: <Award className="w-4 h-4" />,
        goals: completed,
        headerClass: 'text-gray-400',
      });
    }

    return result;
  }, [goals]);

  // Build a flat list of all goal IDs for the DndContext — needed so that
  // @dnd-kit can map ids across the full list, even though we render groups.
  const allGoalIds = useMemo(
    () => groups.flatMap(g => g.goals.map(goal => goal.id)),
    [groups]
  );

  // Find which group a goal belongs to
  const findGroupForGoal = (goalId: string): GoalGroup | undefined => {
    return groups.find(group => group.goals.some(g => g.id === goalId));
  };

  // --------------------------------------------------------------------------
  // Drag handlers
  // --------------------------------------------------------------------------

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeGroup = findGroupForGoal(active.id as string);
    const overGroup = findGroupForGoal(over.id as string);

    // Only allow reordering within the same status group
    if (!activeGroup || !overGroup || activeGroup.key !== overGroup.key) return;

    // Compute the new order within this group
    const groupGoals = [...activeGroup.goals];
    const oldIndex = groupGoals.findIndex(g => g.id === active.id);
    const newIndex = groupGoals.findIndex(g => g.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Array move
    const [moved] = groupGoals.splice(oldIndex, 1);
    groupGoals.splice(newIndex, 0, moved);

    // Rebuild the full ordered list: replace the group that changed,
    // keeping other groups in their original order.
    const newOrderedIds: string[] = [];
    for (const group of groups) {
      if (group.key === activeGroup.key) {
        newOrderedIds.push(...groupGoals.map(g => g.id));
      } else {
        newOrderedIds.push(...group.goals.map(g => g.id));
      }
    }

    onReorder(newOrderedIds);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // The actively dragged goal (for the DragOverlay)
  const activeGoal = activeId ? goals.find(g => g.id === activeId) : null;

  if (goals.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {groups.map(group => (
          <section key={group.key}>
            <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${group.headerClass}`}>
              {group.icon}
              {group.label}
            </h3>
            <SortableContext
              items={group.goals.map(g => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {group.goals.map(goal => (
                  <SortableGoalItem
                    key={goal.id}
                    goal={goal}
                    renderGoalCard={renderGoalCard}
                  />
                ))}
              </div>
            </SortableContext>
          </section>
        ))}
      </div>

      {/* DragOverlay: renders a non-interactive preview of the card being dragged */}
      <DragOverlay>
        {activeGoal ? (
          <div className="opacity-90 shadow-xl rounded-2xl ring-2 ring-[#0891b2]/40">
            {renderGoalCard(
              activeGoal,
              <div className="p-1.5 -ml-1 text-[#0891b2]">
                <GripVertical className="w-5 h-5" />
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default SortableGoalList;
