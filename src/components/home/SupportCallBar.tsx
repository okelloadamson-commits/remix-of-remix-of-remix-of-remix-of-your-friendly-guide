import { useState } from "react";
import { Phone, UserCheck, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import { GreetingAdvertModal } from "@/components/greetings/GreetingAdvertModal";

const SUPPORT_NUMBER = "0789096965";

/**
 * Mobile-only bar under the hero slide. Shows the support phone number,
 * a shortcut to the Agent page, and the greeting Advert button — all
 * stretched to fill the row.
 */
export function SupportCallBar() {
  const [advertOpen, setAdvertOpen] = useState(false);

  return (
    <div className="lg:hidden px-2 py-2">
      <div className="mx-auto grid w-full max-w-md grid-cols-[minmax(0,1.35fr)_minmax(0,0.82fr)_minmax(0,0.9fr)] items-stretch gap-1.5">
        <a
          href={`tel:${SUPPORT_NUMBER}`}
          className="flex min-w-0 items-center justify-center gap-1 w-full px-1 py-2 rounded-lg border border-pink-500/40 bg-pink-500/10 active:opacity-70 transition-opacity"
          aria-label={`Contact support at ${SUPPORT_NUMBER}`}
        >
          <Phone className="w-3.5 h-3.5 text-pink-500 fill-pink-500/30 animate-pulse shrink-0" />
          <span className="min-w-0 text-[11px] font-bold text-pink-500 whitespace-nowrap sm:text-xs">
            {SUPPORT_NUMBER}
          </span>
        </a>

        <Link
          to="/agent"
          className="agent-gold-shimmer min-w-0 w-full justify-center gap-1 px-1 py-2 rounded-lg text-xs"
          aria-label="Become an agent"
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Agent</span>
        </Link>

        <button
          type="button"
          onClick={() => setAdvertOpen(true)}
          className="flex min-w-0 items-center justify-center gap-1 w-full px-1 py-2 rounded-lg font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 active:scale-[0.97] transition-transform"
          aria-label="Send a greeting advert"
        >
          <Megaphone className="w-3.5 h-3.5 shrink-0" />
          <span>Advert</span>
        </button>
      </div>

      <GreetingAdvertModal open={advertOpen} onOpenChange={setAdvertOpen} />
    </div>
  );
}
