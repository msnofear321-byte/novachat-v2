import { useEffect } from 'react';

export function useViewportHeight() {
  useEffect(() => {
    function setVH() {
      const vh = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
    }

    setVH();

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', setVH);
      visualViewport.addEventListener('scroll', setVH);
    }
    window.addEventListener('resize', setVH);

    return () => {
      visualViewport?.removeEventListener('resize', setVH);
      visualViewport?.removeEventListener('scroll', setVH);
      window.removeEventListener('resize', setVH);
    };
  }, []);
}
