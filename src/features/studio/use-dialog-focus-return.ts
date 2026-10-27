import { useCallback, useRef } from "react";

export function useDialogFocusReturn() {
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const openWithFocusReturn = useCallback((open: () => void) => {
    const activeElement = globalThis.document.activeElement;
    focusReturnRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;
    open();
  }, []);

  const restoreFocus = useCallback(() => {
    const target = focusReturnRef.current;
    queueMicrotask(() => {
      if (target?.isConnected) target.focus({ preventScroll: true });
    });
    return target;
  }, []);

  return { focusReturnRef, openWithFocusReturn, restoreFocus };
}
