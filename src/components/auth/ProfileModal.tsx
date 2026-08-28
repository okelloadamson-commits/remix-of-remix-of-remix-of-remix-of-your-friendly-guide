import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Crown, Key, Loader2, Eye, EyeOff, Check, Shield } from "lucide-react";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  
  // Password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getPlanInfo = () => {
    if (!user.plan) {
      return { name: "Free Plan", status: "active", expires: null, daysLeft: 0 };
    }
    
    const now = new Date();
    const expires = new Date(user.plan.expiresAt);
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      name: user.plan.name,
      status: daysLeft > 0 ? "active" : "expired",
      expires: expires.toLocaleDateString(),
      daysLeft: Math.max(0, daysLeft),
    };
  };

  const planInfo = getPlanInfo();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    // Mock password change
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    
    toast({ title: "Password updated!", description: "Your password has been changed successfully." });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-4 border-background shadow-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                {user.plan && <Crown className="w-4 h-4 text-yellow-500" />}
                <span className={`text-sm font-medium ${planInfo.status === "active" ? "text-green-500" : "text-red-500"}`}>
                  {planInfo.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="p-4">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="profile" className="text-xs sm:text-sm">
              <User className="w-4 h-4 mr-1.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="subscription" className="text-xs sm:text-sm">
              <Crown className="w-4 h-4 mr-1.5" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="password" className="text-xs sm:text-sm">
              <Key className="w-4 h-4 mr-1.5" />
              Password
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Full Name</Label>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email Address</Label>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Member Since</Label>
                <p className="font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/admin");
                }}
                className="w-full mt-4"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            )}
            <Button variant="outline" onClick={logout} className={`w-full ${isAdmin ? "mt-2" : "mt-4"}`}>
              Sign Out
            </Button>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-4 mt-0">
            <div className={`p-4 rounded-lg border ${planInfo.status === "active" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{planInfo.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${planInfo.status === "active" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                  {planInfo.status === "active" ? "Active" : "Expired"}
                </span>
              </div>
              {planInfo.expires && planInfo.name !== "Free Plan" && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Expires: {planInfo.expires}</p>
                  {planInfo.daysLeft > 0 && planInfo.name !== "Lifetime" && (
                    <p>{planInfo.daysLeft} days remaining</p>
                  )}
                  {planInfo.name === "Lifetime" && (
                    <p className="text-green-500 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Never expires
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Plan Benefits</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unlimited streaming
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  HD quality video
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Download for offline
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  No ads
                </li>
              </ul>
            </div>

            <Button 
              className="w-full gradient-primary" 
              onClick={() => {
                onOpenChange(false);
                setSubscriptionOpen(true);
              }}
            >
              {(!user.plan || planInfo.status === "expired") ? "Upgrade Plan" : "Manage Subscription"}
            </Button>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="mt-0">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <SubscriptionModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />
    </Dialog>
  );
}
