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
    <div className="lg:hidden px-3 py-2">
      <div className="grid grid-cols-3 gap-2 items-stretch">
        <a
          href={`tel:${SUPPORT_NUMBER}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-pink-500/40 bg-pink-500/10 active:opacity-70 transition-opacity"
          aria-label={`Contact support at ${SUPPORT_NUMBER}`}
        >
          <Phone className="w-4 h-4 text-pink-500 fill-pink-500/30 animate-pulse shrink-0" />
          <span className="text-[13px] font-bold text-pink-500 whitespace-nowrap">
            {SUPPORT_NUMBER}
          </span>
        </a>

        <Link
          to="/agent"
          className="agent-gold-shimmer w-full justify-center py-2.5 rounded-xl"
          aria-label="Become an agent"
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Agent</span>
        </Link>

        <button
          type="button"
          onClick={() => setAdvertOpen(true)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl font-bold text-[13px] text-white bg-gradient-to-r from-amber-500 to-orange-500 active:scale-[0.97] transition-transform"
          aria-label="Send a greeting advert"
        >
          <Megaphone className="w-4 h-4 shrink-0" />
          <span>Advert</span>
        </button>
      </div>

      <GreetingAdvertModal open={advertOpen} onOpenChange={setAdvertOpen} />
    </div>
  );
}
