import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import { cn } from '@/lib/utils';

/* animate-ui's "layers" icon (https://animate-ui.com/r/icons-layers.json). The top sheet
 * drops and the bottom sheet rises, closing the stack onto its middle rule.
 *
 * As with SearchIcon, the keyframes are animate-ui's verbatim but its ~21kB runtime
 * (icons/icon.tsx + use-is-in-view + animate/slot) is deliberately not ported — that graph
 * only exists to provide the declarative triggers (animateOnHover/Tap/View, loop, delay),
 * and the rail already has its own trigger: the 48px row, so the animation also fires over
 * the label. See SearchIcon for the full reasoning. This matches its siblings: pass a ref,
 * drive it with startAnimation/stopAnimation.
 *
 * These are upstream's "default-loop", NOT the "default" that <Layers animateOnHover /> uses.
 * "default" (y: 5 / y: -5, 0.3s) is a hover STATE: the stack closes and stays closed until
 * "normal" reopens it. On a real hover that is correct and it works — but the mobile dock has
 * no hover. There the rail's tap calls startAnimation() and nothing ever calls stopAnimation(),
 * so the stack measured y=+5 still 2.5s after a tap: shut for the rest of the session. It
 * cannot be fixed in the rail either — a timed stopAnimation() on tap would cut search's 0.8s
 * wiggle short, and on desktop it would reopen the stack while the cursor is still on the row.
 * "default-loop" is upstream's own self-returning form of the same motion, so it reads the same
 * on hover and is correct on tap. Its siblings fan and cog hold too (at 270deg and 180deg), but
 * those glyphs are rotationally symmetric, so their stuck state is invisible. This one isn't.
 * For a desktop-only rail, "default" is: y: 5 / y: -5 with duration 0.3.
 *
 * Upstream gives the middle path empty variants ({}) so getVariants() can substitute the
 * static "path" animations into it. Those are not ported, so it animates nothing and is a
 * plain <path> here. */

export interface LayersIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LayersIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TRANSITION = { duration: 0.6, ease: 'easeInOut' } as const;

const TOP_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, 5, 0], transition: TRANSITION },
};

const BOTTOM_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, -5, 0], transition: TRANSITION },
};

const LayersIcon = forwardRef<LayersIconHandle, LayersIconProps>(
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
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
            initial="normal"
            variants={TOP_VARIANTS}
          />
          <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
          <motion.path
            animate={controls}
            d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
            initial="normal"
            variants={BOTTOM_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

LayersIcon.displayName = 'LayersIcon';

export { LayersIcon };
