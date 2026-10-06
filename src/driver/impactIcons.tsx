import { ArrowUpToLine, BicepsFlexed, CircleHelp, Ellipsis, EyeOff, HandHelping, TriangleAlert, ZapOff, type LucideIcon } from 'lucide-react';
import type { ImpactId } from '../data/impacts';

export const IMPACT_ICONS: Record<ImpactId, LucideIcon> = {
  too_much_strength: BicepsFlexed,
  hard_to_reach: ArrowUpToLine,
  hard_to_see: EyeOff,
  hard_to_understand: CircleHelp,
  needed_help: HandHelping,
  felt_unsafe: TriangleAlert,
  could_not_charge: ZapOff,
  something_else: Ellipsis,
};
