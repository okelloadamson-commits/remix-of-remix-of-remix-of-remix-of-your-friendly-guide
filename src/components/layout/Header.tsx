import { Link, useNavigate } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, FormEvent } from "react";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { ProfileDropdown } from "@/components/auth/ProfileDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import luoAncientLogo from "@/assets/luo-ancient-logo.png";

export function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  
  const { user } = useAuth();

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b border-border backdrop-blur-custom">
        <div className="flex items-center justify-between gap-2 lg:gap-4 px-3 lg:px-6 py-3">
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden flex-shrink-0">
            <img 
              src={luoAncientLogo} 
              alt="Luo Ancient Movies" 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <h1 className="text-sm font-bold leading-tight">Luo Ancient</h1>
          </Link>

          {/* Desktop Logo */}
          <Link to="/" className="hidden lg:flex items-center gap-2">
            <img 
              src={luoAncientLogo} 
              alt="Luo Ancient Movies" 
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <h1 className="text-xl font-bold">Luo Ancient</h1>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl transition-all rounded-lg">
            <div className="relative">
              <Search className="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search movies, TV shows, adverts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 lg:pl-10 pr-8 lg:pr-10 bg-input border-transparent text-foreground placeholder:text-muted-foreground h-9 lg:h-10 text-sm"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              {/* Mobile Download Button */}
              <Link to="/apps" className="lg:hidden">
                <Button variant="ghost" size="sm" className="p-2">
                  <Download className="w-5 h-5 text-green-600" />
                </Button>
              </Link>

              <ThemeToggle />

              {/* Subscribe Button - Always visible */}
              <Button
                size="sm" 
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-sm font-medium hidden sm:inline-flex"
                onClick={() => {
                  if (!user) {
                    openAuth("login");
                  } else {
                    setSubscriptionOpen(true);
                  }
                }}
              >
                Subscribe
              </Button>

              {user ? (
                <ProfileDropdown />
              ) : (
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-medium"
                  onClick={() => openAuth("login")}
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <SubscriptionModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </>
  );
}
