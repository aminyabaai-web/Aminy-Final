// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

"use client";

/**
 * Responsive Sheet Component
 * Uses vaul Drawer on mobile (with swipe-to-dismiss) and Radix Dialog on desktop
 * Provides a premium mobile UX like Calm/Headspace apps
 */

import * as React from "react";
import { useMediaQuery } from "../../hooks/use-media-query";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerTrigger,
} from "./drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetTrigger,
} from "./sheet";
import { cn } from "./utils";

interface ResponsiveSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ResponsiveSheetContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

interface ResponsiveSheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveSheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveSheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveSheetDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveSheetTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

interface ResponsiveSheetCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

const ResponsiveSheetContext = React.createContext<{
  isMobile: boolean;
}>({ isMobile: false });

/**
 * Root component - chooses between Drawer and Sheet based on screen size
 */
export function ResponsiveSheet({
  children,
  open,
  onOpenChange,
}: ResponsiveSheetProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <ResponsiveSheetContext.Provider value={{ isMobile: true }}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      </ResponsiveSheetContext.Provider>
    );
  }

  return (
    <ResponsiveSheetContext.Provider value={{ isMobile: false }}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        {children}
      </Sheet>
    </ResponsiveSheetContext.Provider>
  );
}

/**
 * Content component - swipe-dismissable on mobile
 */
export function ResponsiveSheetContent({
  children,
  className,
  side = "right",
}: ResponsiveSheetContentProps) {
  const { isMobile } = React.useContext(ResponsiveSheetContext);

  if (isMobile) {
    // On mobile, always use bottom drawer for swipe-to-dismiss
    return (
      <DrawerContent className={cn("max-h-[85vh]", className)}>
        {children}
      </DrawerContent>
    );
  }

  return (
    <SheetContent side={side} className={className}>
      {children}
    </SheetContent>
  );
}

/**
 * Header component
 */
export function ResponsiveSheetHeader({
  children,
  className,
}: ResponsiveSheetHeaderProps) {
  const { isMobile } = React.useContext(ResponsiveSheetContext);

  if (isMobile) {
    return <DrawerHeader className={className}>{children}</DrawerHeader>;
  }

  return <SheetHeader className={className}>{children}</SheetHeader>;
}

/**
 * Footer component
 */
export function ResponsiveSheetFooter({
  children,
  className,
}: ResponsiveSheetFooterProps) {
  const { isMobile } = React.useContext(ResponsiveSheetContext);

  if (isMobile) {
    return <DrawerFooter className={className}>{children}</DrawerFooter>;
  }

  return <SheetFooter className={className}>{children}</SheetFooter>;
}

/**
 * Title component
 */
export function ResponsiveSheetTitle({
  children,
  className,
}: ResponsiveSheetTitleProps) {
  const { isMobile } = React.useContext(ResponsiveSheetContext);

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <SheetTitle className={className}>{children}</SheetTitle>;
}

/**
 * Description component
 */
export function ResponsiveSheetDescription({
  children,
  className,
}: ResponsiveSheetDescriptionProps) {
  const { isMobile } = React.useContext(ResponsiveSheetContext);

  if (isMobile) {
    return (
      <DrawerDescription className={className}>{children}</DrawerDescription>
    );
  }

  return <SheetDescription className={className}>{children}</SheetDescription>;
}

/**
 * Trigger component
 */
export function ResponsiveSheetTrigger({
  children,
  asChild,
  className,
}: ResponsiveSheetTriggerProps) {
  const { isMobile } = React.useContext(ResponsiveSheetContext);

  if (isMobile) {
    return (
      <DrawerTrigger asChild={asChild} className={className}>
        {children}
      </DrawerTrigger>
    );
  }

  return (
    <SheetTrigger asChild={asChild} className={className}>
      {children}
    </SheetTrigger>
  );
}

/**
 * Close component
 */
export function ResponsiveSheetClose({
  children,
  asChild,
  className,
}: ResponsiveSheetCloseProps) {
  const { isMobile } = React.useContext(ResponsiveSheetContext);

  if (isMobile) {
    return (
      <DrawerClose asChild={asChild} className={className}>
        {children}
      </DrawerClose>
    );
  }

  return (
    <SheetClose asChild={asChild} className={className}>
      {children}
    </SheetClose>
  );
}
