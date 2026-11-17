import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { OptionKey } from './route';

export interface OptionMeta {
  key: OptionKey;
  name: string;
  /** One line for the chooser page. */
  summary: string;
  /** The techniques worth looking for while reviewing it. */
  techniques: string;
}

export const OPTIONS: readonly OptionMeta[] = [
  {
    key: 'a',
    name: 'Editorial',
    summary: 'Type-led and quiet: a serif headline, wide margins, one accent colour, almost no chrome.',
    techniques: 'View Transitions, scroll-driven reveals, variable fonts, OKLCH colour',
  },
  {
    key: 'b',
    name: 'Console',
    summary: 'A polished developer tool: bento grid, soft depth, precise micro-interactions, a command palette.',
    techniques: 'Command palette (Ctrl/Cmd+K), shared-element layout motion, container queries',
  },
  {
    key: 'c',
    name: 'Signal',
    summary: 'One WebGL moment, a field of firing neurons that reacts to the pointer, then calm, fast content.',
    techniques: 'WebGL2 fragment shader (no library), scroll-driven animation, static fallback',
  },
  {
    key: 'd',
    name: 'Two modes',
    summary: 'A clean professional shell that keeps Pixel Roy: Roy Runner and the chat are an optional play mode.',
    techniques: 'Reuses the real game and chat, lazy-loaded on demand; View Transitions',
  },
  {
    key: 'e',
    name: 'Particles',
    summary: 'Showpiece: tens of thousands of GPU particles form the name, then re-form into each project as you scroll.',
    techniques: 'Raw WebGL2 point cloud morphing in the vertex shader, scroll-scrubbed, pointer and tap reactive',
  },
  {
    key: 'f',
    name: 'Voxel Roy',
    summary: 'Showpiece: pixel Roy rebuilt in 3D, one cube per pixel, in a forest diorama you can tilt.',
    techniques: 'Raw WebGL2 instanced cubes from the real sprite, lighting, explode and reassemble on scroll',
  },
];

/** One chunk per option, fetched only when its URL is opened. */
export const OPTION_COMPONENTS: Record<OptionKey, LazyExoticComponent<ComponentType>> = {
  a: lazy(() => import('./a/OptionA')),
  b: lazy(() => import('./b/OptionB')),
  c: lazy(() => import('./c/OptionC')),
  d: lazy(() => import('./d/OptionD')),
  e: lazy(() => import('./e/OptionE')),
  f: lazy(() => import('./f/OptionF')),
};
