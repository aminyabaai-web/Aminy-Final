import React, { useState } from 'react';

interface Feeling {
  emoji: string;
  label: string;
}

const feelings: Feeling[] = [
  { emoji: '😊', label: 'Great' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😔', label: 'Tough' }
];

interface FeelingsChipsProps {
  onFeelingSelected: (feeling: string) => void;
}

export function FeelingsChips({ onFeelingSelected }: FeelingsChipsProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (label: string) => {
    setSelected(label);
    onFeelingSelected(label);
  };

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 contain-layout">
      <p className="text-xs text-muted-foreground mb-2">How are you feeling?</p>
      <div className="flex gap-2" style={{ minHeight: '44px' }}>
        {feelings.map((feeling) => (
          <button
            key={feeling.label}
            onClick={() => handleSelect(feeling.label)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
              border transition-all duration-200 min-h-[44px]
              ${selected === feeling.label
                ? 'bg-accent/10 border-accent/30'
                : 'bg-white border-gray-200 hover:border-accent/30'
              }
            `}
          >
            <span className="text-lg">{feeling.emoji}</span>
            <span className="text-xs font-medium">{feeling.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
