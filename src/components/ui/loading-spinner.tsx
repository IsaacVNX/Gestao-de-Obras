import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner = ({ size = 24, className }: LoadingSpinnerProps) => {
  return (
    <Loader
      className={cn("animate-spin text-primary", className)}
      style={{ width: size, height: size }}
    />
  );
};
