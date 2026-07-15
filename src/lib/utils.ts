/* cn() — the class-name joiner that shadcn/lucide-animated components import from
 * "@/lib/utils". Upstream it is twMerge(clsx(inputs)), but this app has no Tailwind:
 * there are no utility classes to de-duplicate, so twMerge would be a no-op and clsx
 * a dependency for a filter+join. If Tailwind ever lands here, swap the body for the
 * real thing rather than teaching callers to work around this one. */

export type ClassValue = string | number | null | undefined | false;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}
