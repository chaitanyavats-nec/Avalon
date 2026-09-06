import { useEffect, useRef } from 'react';

// Fires `callback` when `active` transitions from false to true — used for
// "your turn" style notification sounds so they play once, not on every re-render.
export function usePlaySoundOnTrue(active: boolean, callback: () => void) {
  const wasActive = useRef(false);

  useEffect(() => {
    if (active && !wasActive.current) {
      callback();
    }
    wasActive.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
