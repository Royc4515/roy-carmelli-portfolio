import { useEffect } from 'react';

/**
 * Called by whatever an option URL renders first. The static boot card in index.html stays up
 * while the option's chunk downloads; this takes it down once the option is on screen, and
 * leaves a performance mark that scripts/options/capture.mjs reads as "option ready".
 */
export function useOptionReady(): void {
  useEffect(() => {
    document.getElementById('boot')?.remove();
    try {
      performance.mark('option-ready');
    } catch {
      /* the mark is only a measurement aid */
    }
  }, []);
}
