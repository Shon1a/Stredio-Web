import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import { cn } from '@/lib/utils';

/* animate-ui's "search" icon (https://animate-ui.com/r/icons-search.json). The magnifier
 * waggles about the tip of its handle, as if being shaken by it.
 *
 * The SEARCH_VARIANTS keyframes, easing and transform-origin below are animate-ui's
 * "default" animation verbatim. Its *runtime* is deliberately not ported. Upstream ships a
 * ~21kB graph (icons/icon.tsx + use-is-in-view + animate/slot) whose job is the declarative
 * trigger system — animateOnHover/Tap/View, loop, loopDelay, delay, completeOnStop, and a
 * context so <AnimateIcon> can drive nested icons. The rail uses none of that: it needs
 * start and stop, and it already has its own trigger — the 48px row, so the animation also
 * fires over the label the rail reveals on hover. animateOnHover would bind the hover to
 * this 22px glyph instead and put that dead zone back. So this matches its four siblings
 * (FanIcon &co): pass a ref, drive it with startAnimation/stopAnimation.
 *
 * Upstream also gives the path and circle empty variants ({}). Those only carry the static
 * "path"/"path-loop" animations that getVariants() can substitute in; with the default
 * animation they animate nothing, so plain <path>/<circle> here is equivalent.
 *
 * Upstream's second animation, "find" (the glass slides left then up, scanning), is a
 * one-line swap if you ever prefer it — see the registry JSON. */

export interface SearchIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SearchIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SEARCH_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    transformOrigin: 'bottom right',
    rotate: [0, 17, -10, 5, -1, 0],
    transition: { duration: 0.8, ease: 'easeInOut' },
  },
};

const SearchIcon = forwardRef<SearchIconHandle, SearchIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start('animate');
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start('normal');
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          initial="normal"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          variants={SEARCH_VARIANTS}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m21 21-4.34-4.34" />
          <circle cx="11" cy="11" r="8" />
        </motion.svg>
      </div>
    );
  }
);

SearchIcon.displayName = 'SearchIcon';

export { SearchIcon };
