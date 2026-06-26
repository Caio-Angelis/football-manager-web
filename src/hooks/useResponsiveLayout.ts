export function useIsNarrow(breakpoint = 1024): boolean {
  const pageWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  return pageWidth < breakpoint;
}
