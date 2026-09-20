import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Film,
  Tv,
  Megaphone,
  Download,
  TrendingUp,
  Clock,
  Star,
  Shield,
  UserCheck,
  Music,
  Trophy,
  LayoutGrid,
} from "lucide-react";
import luoAncientLogo from "@/assets/luo-ancient-logo.png";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { GreetingAdvertModal } from "@/components/greetings/GreetingAdvertModal";
import { useAdmin } from "@/contexts/AdminContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const navItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Movies", href: "/movies", icon: Film },
  { title: "TV Series", href: "/tv-series", icon: Tv },
  { title: "Luo Champion", href: "/luo-champion", icon: Trophy },
  { title: "Music", href: "https://luomusic.luoancientmovies.com/", icon: Music, external: true },
  { title: "Agent", href: "/agent", icon: UserCheck },
  { title: "Guide", href: "/adverts", icon: Megaphone },
  { title: "Apps", href: "/apps", icon: Download },
  { title: "Trending", href: "/trending", icon: TrendingUp },
  { title: "Recently Added", href: "/recent", icon: Clock },
  { title: "Top Rated", href: "/top-rated", icon: Star },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { track } = useActivityTracker();
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [greetingOpen, setGreetingOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-sidebar-border">
          <img 
            src={luoAncientLogo} 
            alt="Luo Ancient Movies" 
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <h1 className="text-base font-bold text-sidebar-foreground leading-tight">
            Luo Ancient Movies
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              if ((item as any).external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("Navigate", `Navigated to ${item.title}`, item.href)}
                    className="nav-link nav-link-inactive"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.title}</span>
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => track("Navigate", `Navigated to ${item.title}`, item.href)}
                  className={`nav-link ${isActive ? "nav-link-active" : "nav-link-inactive"}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.title}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setGreetingOpen(true)}
              className="nav-link nav-link-inactive w-full"
            >
              <Megaphone className="w-5 h-5" />
              <span className="text-sm">Greeting</span>
            </button>
            
            {/* Admin Panel Link - only visible for admin */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className={`nav-link w-full ${
                  location.pathname.startsWith("/admin") ? "nav-link-active" : "nav-link-inactive"
                }`}
              >
                <Shield className="w-5 h-5" />
                <span className="text-sm">Admin Panel</span>
              </button>
            )}
          </div>
        </nav>

        {/* Subscribe CTA */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-orange-400 shadow-[0_12px_35px_rgba(220,38,38,0.35)] flex flex-col justify-between p-4 border border-white/10">
            {/* Soft glow accents */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-5 -left-5 w-20 h-20 bg-orange-300/25 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              <h3 className="text-white text-lg font-bold leading-tight">
                Subscribe<br />Now
              </h3>
              <p className="text-white/85 text-[11px] font-medium mt-1.5 leading-snug">
                Get unlimited access to all content
              </p>
            </div>

            <button
              onClick={() => setSubscriptionOpen(true)}
              className="relative z-10 block w-full bg-white text-red-600 hover:bg-red-50 text-sm font-bold py-2 rounded-xl text-center shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              View Plans
            </button>
          </div>
        </div>
      </aside>

      <SubscriptionModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />
      <GreetingAdvertModal open={greetingOpen} onOpenChange={setGreetingOpen} />
    </>
  );
}
