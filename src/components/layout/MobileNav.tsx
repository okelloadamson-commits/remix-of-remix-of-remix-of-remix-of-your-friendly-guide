import { Link, useLocation } from "react-router-dom";
import { Home, Film, Tv, Music, Megaphone, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const gradientMap: Record<string, string> = {
  "/": "from-cyan-400 to-blue-500",
  "/movies": "from-purple-400 to-pink-500",
  "/tv-series": "from-orange-400 to-red-500",
  "/luo-champion": "from-pink-400 to-fuchsia-500",
  "https://luomusic.luoancientmovies.com/": "from-emerald-400 to-green-500",
  "/adverts": "from-amber-400 to-yellow-500",
  "/admin": "from-rose-400 to-red-500",
};

export function MobileNav() {
  const location = useLocation();

  const mobileNavItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Movies", href: "/movies", icon: Film },
    { title: "Luo Champion", href: "/luo-champion", icon: Trophy, longLabel: true },
    { title: "TV", href: "/tv-series", icon: Tv },
    { title: "Music", href: "https://luomusic.luoancientmovies.com/", icon: Music, external: true },
    { title: "Guide", href: "/adverts", icon: Megaphone },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-around px-1 py-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const gradient = gradientMap[item.href] || "from-primary to-primary";

            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-colors relative"
              >
                <div className={cn(
                  "p-[2px] rounded-full bg-gradient-to-br transition-all duration-300",
                  isActive ? gradient : "from-muted/40 to-muted/20",
                  isActive && "shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                )}>
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                    isActive ? "bg-background" : "bg-muted/30"
                  )}>
                    <Icon className={cn("w-[18px] h-[18px] transition-colors", isActive ? "text-foreground" : "text-muted-foreground")} />
                  </div>
                </div>
                <span className={cn(
                  "font-medium leading-none transition-colors whitespace-nowrap",
                  item.longLabel ? "text-[8px]" : "text-[10px]",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.title}
                </span>
              </a>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-colors relative"
              >
                <div className={cn(
                  "p-[2px] rounded-full bg-gradient-to-br transition-all duration-300",
                  isActive ? gradient : "from-muted/40 to-muted/20",
                  isActive && "shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                )}>
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                    isActive ? "bg-background" : "bg-muted/30"
                  )}>
                    <Icon className={cn("w-[18px] h-[18px] transition-colors", isActive ? "text-foreground" : "text-muted-foreground")} />
                  </div>
                </div>
                <span className={cn(
                  "font-medium leading-none transition-colors whitespace-nowrap",
                  item.longLabel ? "text-[8px]" : "text-[10px]",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
