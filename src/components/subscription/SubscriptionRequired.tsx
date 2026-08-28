import { useState } from "react";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionModal } from "./SubscriptionModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionRequiredProps {
  message?: string;
}

export function SubscriptionRequired({ message = "Subscribe to watch and download content" }: SubscriptionRequiredProps) {
  const { user } = useAuth();
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const handleSubscribe = () => {
    if (!user) {
      setAuthOpen(true);
    } else {
      setSubscriptionOpen(true);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-card rounded-xl border border-border">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Subscription Required</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {message}
        </p>
        <Button onClick={handleSubscribe} className="gradient-primary gap-2">
          <Crown className="w-4 h-4" />
          {user ? "Subscribe Now" : "Login to Subscribe"}
        </Button>
      </div>

      <SubscriptionModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode="login" />
    </>
  );
}
