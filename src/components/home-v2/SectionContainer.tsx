import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div" | "header" | "footer";
}

export function SectionContainer({
  children,
  className,
  id,
  as: Tag = "section",
}: SectionContainerProps) {
  return (
    <Tag
      id={id}
      className={cn("py-12 md:py-20", className)}
    >
      <div className="container max-w-6xl mx-auto px-4">
        {children}
      </div>
    </Tag>
  );
}
