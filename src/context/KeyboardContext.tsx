import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface KeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

const KeyboardContext = createContext<KeyboardState>({
  isKeyboardOpen: false,
  keyboardHeight: 0,
});

const KEYBOARD_THRESHOLD = 160;

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KeyboardState>({ isKeyboardOpen: false, keyboardHeight: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const vv = window.visualViewport;
    const isTouch =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

    let ticking = false;
    let baseline = Math.max(window.innerHeight || 0, vv?.height || 0, 1);
    let lastWidth = window.innerWidth || 0;

    function apply(height: number, kbHeight: number, kbOffset: number) {
      const root = document.documentElement;
      root.style.setProperty('--app-height', `${height}px`);
      root.style.setProperty('--vh', `${height * 0.01}px`);
      root.style.setProperty('--dvh', `${height}px`);
      root.style.setProperty('--kb-height', `${kbHeight}px`);
      root.style.setProperty('--kb-offset', `${kbOffset}px`);
      root.setAttribute('data-keyboard', kbHeight > 0 ? 'open' : 'closed');

      const next: KeyboardState = { isKeyboardOpen: kbHeight > 0, keyboardHeight: kbHeight };
      if (
        next.isKeyboardOpen !== stateRef.current.isKeyboardOpen ||
        next.keyboardHeight !== stateRef.current.keyboardHeight
      ) {
        setState(next);
      }
    }

    function update() {
      const innerH = window.innerHeight || vv?.height || 1;
      const vvH = vv?.height ?? innerH;
      const innerW = window.innerWidth || 0;

      const widthChanged = innerW !== lastWidth;
      lastWidth = innerW;

      let kbHeight = 0;
      let kbOffset = 0;

      if (vv) {
        if (widthChanged) {
          baseline = Math.max(innerH, vvH);
        }
        if (innerH > baseline || vvH > baseline) {
          baseline = Math.max(innerH, vvH);
        }

        const fillsLayout = Math.abs(vvH - innerH) <= 2;
        if (fillsLayout) {
          const drop = baseline - innerH;
          if (drop < KEYBOARD_THRESHOLD) {
            baseline = Math.max(innerH, vvH);
          }
        }

        const diff = baseline - vvH;
        if (isTouch && diff > KEYBOARD_THRESHOLD) {
          kbHeight = diff;
          if (!fillsLayout) {
            kbOffset = diff;
          }
        }
      }

      apply(vvH, kbHeight, kbOffset);
    }

    function onEvent() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    }

    update();

    if (vv) {
      vv.addEventListener('resize', onEvent);
      vv.addEventListener('scroll', onEvent);
    }
    window.addEventListener('resize', onEvent);
    window.addEventListener('orientationchange', onEvent);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', onEvent);
        vv.removeEventListener('scroll', onEvent);
      }
      window.removeEventListener('resize', onEvent);
      window.removeEventListener('orientationchange', onEvent);
    };
  }, []);

  return <KeyboardContext.Provider value={state}>{children}</KeyboardContext.Provider>;
}

export function useKeyboard() {
  return useContext(KeyboardContext);
}
