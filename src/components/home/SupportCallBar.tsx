import { Phone, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

const SUPPORT_NUMBER = "0789096965";

/**
 * Mobile-only bar under the hero slide. Shows the support phone number
 * and a shortcut to the Agent page side by side.
 */
export function SupportCallBar() {
  return (
    <div className="lg:hidden flex items-center justify-center gap-6 py-2 px-4">
      <a
        href={`tel:${SUPPORT_NUMBER}`}
        className="flex items-center justify-center gap-2 py-2 active:opacity-70 transition-opacity"
        aria-label={`Contact support at ${SUPPORT_NUMBER}`}
      >
        <Phone className="w-5 h-5 text-pink-500 fill-pink-500/30 animate-pulse shrink-0" />
        <span className="text-base font-bold text-pink-500 underline underline-offset-2">
          {SUPPORT_NUMBER}
        </span>
      </a>

      <Link
        to="/agent"
        className="agent-gold-shimmer"
        aria-label="Become an agent"
      >
        <UserCheck className="w-4 h-4 shrink-0" />
        <span>Agent</span>
      </Link>
    </div>
  );
}

