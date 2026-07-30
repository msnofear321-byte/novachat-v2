import { useEffect } from 'react';

export function useViewportHeight() {
  useEffect(() => {
    let ticking = false;

    function setVH() {
      const vh = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
      document.documentElement.style.setProperty('--dvh', `${vh}px`);
    }

    const onResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setVH();
          ticking = false;
        });
        ticking = true;
      }
    };

    setVH();

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', onResize);
      visualViewport.addEventListener('scroll', onResize);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      visualViewport?.removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('scroll', onResize);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
}
