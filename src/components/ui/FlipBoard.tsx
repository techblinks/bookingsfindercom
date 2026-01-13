import { useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface FlipCharacterProps {
  char: string;
  delay: number;
}

const FlipCharacter = memo(({ char, delay }: FlipCharacterProps) => {
  const [isFlipping, setIsFlipping] = useState(true);
  const [displayChar, setDisplayChar] = useState(" ");
  const [flipCount, setFlipCount] = useState(0);

  useEffect(() => {
    const chars = "0123456789$,";
    let currentIndex = 0;
    const maxFlips = 6 + Math.floor(Math.random() * 4);

    const startTimeout = setTimeout(() => {
      const flipInterval = setInterval(() => {
        if (currentIndex < maxFlips) {
          setDisplayChar(chars[Math.floor(Math.random() * chars.length)]);
          setFlipCount((prev) => prev + 1);
          currentIndex++;
        } else {
          setDisplayChar(char);
          setIsFlipping(false);
          clearInterval(flipInterval);
        }
      }, 50);

      return () => clearInterval(flipInterval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [char, delay]);

  return (
    <span
      className={cn(
        "inline-block relative overflow-hidden",
        "bg-secondary/80 rounded-sm mx-[1px]",
        "min-w-[0.7em] text-center",
        isFlipping && "animate-pulse"
      )}
      style={{
        perspective: "100px",
      }}
    >
      <span
        className={cn(
          "inline-block transition-transform duration-75",
          flipCount % 2 === 1 && isFlipping && "scale-y-90"
        )}
      >
        {displayChar}
      </span>
    </span>
  );
});

FlipCharacter.displayName = "FlipCharacter";

interface FlipBoardProps {
  value: string;
  className?: string;
  isLoading?: boolean;
}

const FlipBoard = ({ value, className, isLoading }: FlipBoardProps) => {
  const [displayValue, setDisplayValue] = useState("");
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (value && value !== displayValue) {
      setDisplayValue(value);
      setKey((prev) => prev + 1);
    }
  }, [value]);

  if (isLoading) {
    return (
      <span className={cn("font-mono inline-flex", className)}>
        {["$", "-", "-", "-"].map((char, index) => (
          <span
            key={index}
            className={cn(
              "inline-block bg-secondary/80 rounded-sm mx-[1px]",
              "min-w-[0.7em] text-center animate-pulse"
            )}
          >
            {char}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={cn("font-mono inline-flex", className)} key={key}>
      {displayValue.split("").map((char, index) => (
        <FlipCharacter key={`${key}-${index}`} char={char} delay={index * 80} />
      ))}
    </span>
  );
};

export default FlipBoard;
