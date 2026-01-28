import { cn } from "./utils";

/**
 * Premium Skeleton Component
 * Uses a subtle shimmer animation for a Calm/Headspace-quality loading experience
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md premium-skeleton",
        className
      )}
      {...props}
    />
  );
}

/**
 * Text Skeleton - for inline text placeholders
 */
function SkeletonText({
  lines = 1,
  className,
  lastLineWidth = "75%",
  ...props
}: React.ComponentProps<"div"> & {
  lines?: number;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded premium-skeleton"
          style={{
            width: i === lines - 1 && lines > 1 ? lastLineWidth : "100%"
          }}
        />
      ))}
    </div>
  );
}

/**
 * Avatar Skeleton - circular placeholder for avatars
 */
function SkeletonAvatar({
  size = "md",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "rounded-full premium-skeleton",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

/**
 * Card Skeleton - for loading card content
 */
function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3 sm:space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard };
