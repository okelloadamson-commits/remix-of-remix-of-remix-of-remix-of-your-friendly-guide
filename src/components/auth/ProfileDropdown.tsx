import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { User, Crown, LogOut, Shield } from "lucide-react";
import { ProfileModal } from "./ProfileModal";
import { useIsMobile } from "@/hooks/use-mobile";

export function ProfileDropdown() {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getPlanDisplay = () => {
    if (!user.plan) return "Free Plan";
    
    const now = new Date();
    const expires = new Date(user.plan.expiresAt);
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (user.plan.name === "Lifetime") return "Lifetime";
    if (daysLeft <= 0) return "Expired";
    if (daysLeft === 1) return `${user.plan.name} (1 day left)`;
    return `${user.plan.name} (${daysLeft} days)`;
  };


  // Mobile: Direct click to open profile modal
  if (isMobile) {
    return (
      <>
        <button 
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Open profile"
        >
          <Avatar className="w-8 h-8 border-2 border-primary/50">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
        <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      </>
    );
  }

  // Desktop: Dropdown menu
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="w-8 h-8 border-2 border-primary/50">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium leading-none">{user.name.split(" ")[0]}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {user.plan && <Crown className="w-3 h-3 text-yellow-500" />}
                {getPlanDisplay()}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            My Profile
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
