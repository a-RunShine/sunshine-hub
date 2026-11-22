import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn 约定的类名合并：条件类走 clsx，Tailwind 冲突类走 tailwind-merge。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
