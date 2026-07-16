// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

"use client";

// import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  // const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme="light"
      className="toaster group"
      // Keep toasts clear of the fixed bottom nav (~64px tabs + safe-area
      // inset) so they are never clipped by the viewport edge or overlapped
      // by the nav / chat FABs (July 2026 visual-audit fix).
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 96 }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
