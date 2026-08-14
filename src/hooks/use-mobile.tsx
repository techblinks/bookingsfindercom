import * as React from "react";

const MOBILE_BREAKPOINT = 768;
/** Tailwind's `lg`. Below it the app shows its mobile surfaces: bottom nav, collapsed footer, filter sheet. */
const DESKTOP_BREAKPOINT = 1024;

function useBelowBreakpoint(breakpoint: number) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsBelow(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsBelow(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isBelow;
}

export function useIsMobile() {
  return useBelowBreakpoint(MOBILE_BREAKPOINT);
}

/** True below Tailwind's `lg`, i.e. phones and tablets — where the desktop sidebar is hidden. */
export function useIsBelowDesktop() {
  return useBelowBreakpoint(DESKTOP_BREAKPOINT);
}
