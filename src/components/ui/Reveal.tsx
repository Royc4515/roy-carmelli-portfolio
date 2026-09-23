import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { materialize } from '../../theme/motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const motionTags = {
  div: motion.div,
  li: motion.li,
  article: motion.article,
  section: motion.section,
} as const;

export type RevealTag = keyof typeof motionTags;

/** Portion of the element that must be on screen before it reveals. */
export const REVEAL_AMOUNT = 0.2;

// Handlers whose signatures differ between React DOM and Framer Motion.
type Conflicting =
  | 'children'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd';

export interface RevealProps extends Omit<HTMLAttributes<HTMLElement>, Conflicting> {
  /** Element to render. Default `div`. */
  as?: RevealTag;
  /** Position in a group, for the 60ms stagger (items 4+ share the last delay). */
  index?: number;
  children: ReactNode;
}

/**
 * Scroll reveal (SPEC §2.5 "materialize"): opacity in three hard steps and y
 * 8 → 0, once, when 20% of the element is in view. Use it on headers and
 * cards only, never on a wrapper much taller than the viewport (20% of it
 * could never be on screen at once).
 *
 * Under reduced motion it renders a plain element: no `initial` state, so the
 * content is visible from the first paint.
 */
export function Reveal({ as = 'div', index = 0, children, ...rest }: RevealProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return createElement(as, rest, children);
  }

  const MotionTag = motionTags[as] as typeof motion.div;
  return (
    <MotionTag
      {...rest}
      variants={materialize}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: REVEAL_AMOUNT }}
    >
      {children}
    </MotionTag>
  );
}
