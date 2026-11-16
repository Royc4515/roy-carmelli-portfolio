import { Suspense, useEffect } from 'react';
import { bio } from '../data/bio';
import type { OptionRoute } from './route';
import { OPTIONS, OPTION_COMPONENTS } from './registry';
import Chooser from './Chooser';
import './shared/base.css';

/** The options are review material: keep them out of search results (canonical stays "/"). */
function useNoIndex() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const before = meta?.content;
    if (meta) meta.content = 'noindex, nofollow';
    return () => {
      if (meta && before !== undefined) meta.content = before;
    };
  }, []);
}

export default function OptionsRoot({ route }: { route: OptionRoute }) {
  useNoIndex();
  const key = route.kind === 'option' ? route.key : 'chooser';

  useEffect(() => {
    const root = document.documentElement;
    // `data-option` switches the page ground from the pixel theme to the option's own tokens
    // (shared/base.css); every option stylesheet is scoped under it.
    root.dataset.option = key;
    const before = document.title;
    const label = route.kind === 'option' ? `Option ${route.key.toUpperCase()}: ${OPTIONS.find(o => o.key === route.key)?.name}` : 'Portfolio options';
    document.title = `${label} - ${bio.name}`;
    return () => {
      delete root.dataset.option;
      document.title = before;
    };
  }, [key, route]);

  if (route.kind === 'chooser') return <Chooser />;
  const Option = OPTION_COMPONENTS[route.key];
  return (
    <Suspense fallback={null}>
      <Option />
    </Suspense>
  );
}
