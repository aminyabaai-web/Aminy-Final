import React, { useState } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Check, Plus, ChevronDown } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  age: number;
}

interface ChildSwitcherProps {
  children: Child[];
  activeChildId: string;
  onSwitch: (childId: string) => void;
  onAddChild: () => void;
}

export function ChildSwitcher({ children, activeChildId, onSwitch, onAddChild }: ChildSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeChild = children.find(c => c.id === activeChildId);

  // Empty state when no children exist
  if (children.length === 0) {
    return (
      <div className="p-6 text-center border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-sm text-muted-foreground mb-4">
          Add a child to get a plan tailored to them.
        </p>
        <Button onClick={onAddChild}>
          <Plus className="w-4 h-4 mr-2" />
          Add Child
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Label above switcher */}
      <label className="text-sm font-semibold text-gray-900 mb-2 block">
        Your children
      </label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Avatar className="w-8 h-8">
          <AvatarFallback>{activeChild?.name[0]}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{activeChild?.name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                onSwitch(child.id);
                setIsOpen(false);
              }}
              className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback>{child.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium">{child.name}</div>
                <div className="text-sm text-muted-foreground">Age {child.age}</div>
              </div>
              {child.id === activeChildId && (
                <Check className="w-5 h-5 text-accent" />
              )}
            </button>
          ))}
          
          <div className="border-t p-2">
            <button 
              onClick={() => {
                onAddChild();
                setIsOpen(false);
              }}
              className="w-full p-2 flex items-center gap-2 text-accent hover:bg-accent/10 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Add another child</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
