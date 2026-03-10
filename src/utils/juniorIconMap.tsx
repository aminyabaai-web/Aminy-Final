/**
 * Maps string icon names (from junior-content-service / extended activities)
 * to Lucide React icon components for the Junior page UI.
 */
import React from 'react';
import {
  Volume2,
  Zap,
  Radio,
  Languages,
  Users2,
  Shield,
  Activity,
  Brain,
  Layers,
  BookOpen,
  MessageSquare,
  Compass,
  Lightbulb,
  Heart,
  Combine,
  Mountain,
  Type,
  HelpCircle,
  Gamepad2,
  Mic,
  MessageCircle,
  Eye,
  Scale,
  Hand,
  Headphones,
  Move,
  Wind,
  ListOrdered,
  Timer,
  Puzzle,
  Star,
  Sparkles,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'volume-2': Volume2,
  'zap': Zap,
  'radio': Radio,
  'languages': Languages,
  'users': Users2,
  'shield': Shield,
  'activity': Activity,
  'brain': Brain,
  'layers': Layers,
  'book-open': BookOpen,
  'message-square': MessageSquare,
  'compass': Compass,
  'lightbulb': Lightbulb,
  'heart': Heart,
  'combine': Combine,
  'mountain': Mountain,
  'text': Type,
  'help-circle': HelpCircle,
  'gamepad-2': Gamepad2,
  'mic': Mic,
  'message-circle': MessageCircle,
  'eye': Eye,
  'scale': Scale,
  'hand': Hand,
  'headphones': Headphones,
  'move': Move,
  'wind': Wind,
  'list-ordered': ListOrdered,
  'timer': Timer,
  'puzzle': Puzzle,
  'star': Star,
  'sparkles': Sparkles,
};

/**
 * Convert a string icon name to a rendered JSX Lucide icon element.
 * Falls back to Sparkles if the icon name is unknown.
 */
export function getJuniorIcon(iconName: string, className = 'w-5 h-5'): React.ReactNode {
  const IconComponent = ICON_MAP[iconName] || Sparkles;
  return <IconComponent className={className} />;
}

/**
 * Skill-type to Tailwind color class mapping for extended activities
 * that don't carry their own color field.
 */
export function getSkillTypeColor(skillType: string): string {
  switch (skillType) {
    case 'speech':
      return 'bg-blue-100 text-blue-600';
    case 'social':
      return 'bg-purple-100 text-purple-600';
    case 'sensory':
      return 'bg-indigo-100 text-indigo-600';
    case 'executive':
      return 'bg-orange-100 text-orange-600';
    case 'aac':
      return 'bg-pink-100 text-pink-600';
    case 'routines':
      return 'bg-amber-100 text-amber-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
