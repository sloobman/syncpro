import Link from "next/link";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { icon: 24, text: "text-base" },
  default: { icon: 32, text: "text-xl" },
  lg: { icon: 40, text: "text-2xl" },
} as const;

interface LogoProps {
  size?: "sm" | "default" | "lg";
  showText?: boolean;
}

export function Logo({ size = "default", showText = true }: LogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      aria-label="SyncPro — на главную"
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Back document */}
        <rect
          x="6"
          y="2"
          width="18"
          height="22"
          rx="3"
          className="fill-blue-400 dark:fill-blue-500"
          opacity="0.5"
        />
        {/* Front document */}
        <rect
          x="8"
          y="6"
          width="18"
          height="22"
          rx="3"
          className="fill-blue-500 dark:fill-blue-400"
        />
        {/* Sync arrow top-right */}
        <path
          d="M21 14a4 4 0 0 0-4-4h-2"
          className="stroke-white dark:stroke-gray-900"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M16 8l-1.5 2 1.5 2"
          className="stroke-white dark:stroke-gray-900"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Sync arrow bottom-left */}
        <path
          d="M13 20a4 4 0 0 0 4 4h2"
          className="stroke-white dark:stroke-gray-900"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M18 26l1.5-2-1.5-2"
          className="stroke-white dark:stroke-gray-900"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span
          className={cn(
            "font-bold tracking-tight text-foreground select-none",
            text,
          )}
        >
          SyncPro
        </span>
      )}
    </Link>
  );
}
