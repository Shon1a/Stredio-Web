import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import { cn } from '@/lib/utils';

/* animate-ui's "user-round" icon (https://animate-ui.com/r/icons-user-round.json). The head
 * and shoulders bob out of step with each other and settle back.
 *
 * As with SearchIcon and LayersIcon, the keyframes are animate-ui's verbatim but its ~21kB
 * runtime (icons/icon.tsx + use-is-in-view + animate/slot) is deliberately not ported — that
 * graph only exists to provide the declarative triggers (animateOnHover/Tap/View, loop,
 * delay), and the rail already has its own: the 48px row, so the animation also fires over
 * the label. See SearchIcon for the full reasoning.
 *
 * Unlike LayersIcon, upstream's "default" is safe to use here as-is: both keyframe tracks end
 * where they started, so a tap in the hoverless mobile dock settles by itself and there is
 * nothing for the missing mouseleave to strand. This icon ships no "default-loop" variant. */

export interface UserRoundIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UserRoundIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const TRANSITION = { duration: 0.6, ease: 'easeInOut' } as const;

const BODY_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, 4, -2, 0], transition: TRANSITION },
};

const HEAD_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: { y: [0, 1, -2, 0], transition: TRANSITION },
};

const UserRoundIcon = forwardRef<UserRoundIconHandle, UserRoundIconProps>(
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
            d="M20 21a8 8 0 0 0-16 0"
            initial="normal"
            variants={BODY_VARIANTS}
          />
          <motion.circle
            animate={controls}
            cx="12"
            cy="8"
            initial="normal"
            r="5"
            variants={HEAD_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

UserRoundIcon.displayName = 'UserRoundIcon';

export { UserRoundIcon };
