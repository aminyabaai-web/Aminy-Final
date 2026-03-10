/**
 * ResponsiveGrid
 *
 * Wrapper component that renders children in a responsive grid layout.
 * - 1 column on phones (< 768px)
 * - 2 columns on tablets (768-1024px)
 * - 3 columns on desktops (> 1024px)
 *
 * Uses the useResponsiveLayout hook for breakpoint detection.
 * Import tablet.css in your entry point for tablet-specific styles.
 */

import type { ReactNode, CSSProperties } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResponsiveGridProps {
  /** Grid children */
  children: ReactNode;
  /** Custom gap in pixels (default 16) */
  gap?: number;
  /** Override column count (ignores device detection if set) */
  columns?: 1 | 2 | 3;
  /** Additional className for the grid container */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Padding around the grid in pixels (default 16) */
  padding?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResponsiveGrid({
  children,
  gap = 16,
  columns: overrideColumns,
  className = '',
  style,
  padding = 16,
}: ResponsiveGridProps) {
  const { columns: autoColumns, deviceType } = useResponsiveLayout();
  const cols = overrideColumns ?? autoColumns;

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: `${gap}px`,
    padding: `${padding}px`,
    width: '100%',
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div
      className={`responsive-grid responsive-grid--${deviceType} ${className}`.trim()}
      style={gridStyle}
      data-columns={cols}
      data-device={deviceType}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid Item (optional helper for items that should span multiple columns)
// ---------------------------------------------------------------------------

export interface ResponsiveGridItemProps {
  children: ReactNode;
  /** Number of columns to span (default 1) */
  span?: number;
  /** Additional className */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
}

export function ResponsiveGridItem({
  children,
  span = 1,
  className = '',
  style,
}: ResponsiveGridItemProps) {
  const itemStyle: CSSProperties = {
    gridColumn: span > 1 ? `span ${span}` : undefined,
    ...style,
  };

  return (
    <div className={`responsive-grid-item ${className}`.trim()} style={itemStyle}>
      {children}
    </div>
  );
}

export default ResponsiveGrid;
