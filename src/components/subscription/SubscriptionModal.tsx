import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Crown, Star, Zap, ArrowLeft, Loader2, LogIn, Shield, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { generateOrderId, storePaymentData, planDurations, initiatePesapalPayment, verifyPaymentStatus, clearPendingPaymentData } from "@/lib/pesapal";
import { activateSubscription } from "@/lib/subscription-service";
import { saveTransaction } from "@/lib/admin-db";
import { AuthModal } from "@/components/auth/AuthModal";
import { trackActivity, saveRegisteredAgent } from "@/lib/activity-tracker";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentOnly?: boolean;
}

const plans = [
  { duration: "2 Days", price: 5000, priceDisplay: "5,000", icon: Zap, dailyDownloads: 50 },
  { duration: "1 Week", price: 10000, priceDisplay: "10,000", icon: Zap, dailyDownloads: 50 },
  { duration: "2 Weeks", price: 17000, priceDisplay: "17,000", icon: Star, dailyDownloads: 50 },
  { duration: "1 Month", price: 30000, priceDisplay: "30,000", icon: Star, popular: true, dailyDownloads: 50 },
  { duration: "3 Months", price: 70000, priceDisplay: "70,000", icon: Crown, dailyDownloads: 50 },
  { duration: "1 Year", price: 200000, priceDisplay: "200,000", icon: Crown, dailyDownloads: 50 },
];

const agentPlan = { duration: "Agent Plan", price: 10000, priceDisplay: "10,000", icon: Shield };

const features = [
  "Unlimited movie streaming",
  "HD quality videos",
  "Download for offline viewing",
  "No ads interruption",
  "Access to all TV series",
  "Early access to new releases",
];

type PaymentStep = "plans" | "agentDetails" | "phone" | "processing" | "checkout" | "success" | "failed" | "pending";

export function SubscriptionModal({ open, onOpenChange, agentOnly }: SubscriptionModalProps) {
  const [step, setStep] = useState<PaymentStep>("plans");
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mobile" | "card">("mobile");
  const [agentName, setAgentName] = useState("");
  const [agentBusiness, setAgentBusiness] = useState("");
  const [agentLocation, setAgentLocation] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const resetState = () => {
    stopPolling();
    setStep("plans");
    setSelectedPlan(null);
    setPhoneNumber("");
    setPaymentMethod("mobile");
    setAgentName("");
    setAgentBusiness("");
    setAgentLocation("");
    setPaymentUrl(null);
    setOrderTrackingId(null);
    setOrderId(null);
    setStatusMessage("");
    setConfirmationCode(null);
  };

  const normalizeUgandaPhoneForPesapal = (value: string): string | null => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return null;

    if (digits.startsWith("2560") && digits.length === 13) {
      return digits.slice(3);
    }
    if (digits.startsWith("256") && digits.length === 12) {
      return `0${digits.slice(3)}`;
    }
    if (digits.startsWith("0") && digits.length === 10) {
      return digits;
    }
    if (digits.length === 9) {
      return `0${digits}`;
    }

    return null;
  };

  const resolvePaymentFailureMessage = (verification: {
    message?: string;
    status?: string;
    description?: string;
    errorCode?: string;
    errorMessage?: string;
    paymentStatusCode?: string;
  }) => {
    const details = `${verification.status || ""} ${verification.message || ""} ${verification.description || ""} ${verification.errorCode || ""} ${verification.errorMessage || ""} ${verification.paymentStatusCode || ""}`.toLowerCase();

    console.log("Payment failure details for diagnosis:", details);

    if (details.includes("insufficient") || details.includes("balance") || details.includes("not enough") || details.includes("low balance") || details.includes("funds") || details.includes("insufficient_funds")) {
      return "Insufficient balance in your account. Please top up your mobile money account and try again.";
    }
    if (details.includes("cancel")) {
      return "Payment was cancelled. You can try again when you're ready.";
    }
    // Default: user didn't approve on phone
    return "Payment not approved on your phone. Please retry and confirm the prompt on your mobile device.";
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handlePlanSelect = (plan: { duration: string; price: number; priceDisplay: string; icon: typeof Zap }) => {
    setSelectedPlan(plan as typeof plans[0]);
    setStep(agentOnly ? "agentDetails" : "phone");
  };

  // Start polling for payment status
  const startPolling = useCallback((trackingId: string, currentOrderId: string, plan: typeof plans[0]) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        setStep("pending");
        setStatusMessage("Payment verification timed out. Please check again later or contact support.");
        return;
      }

      try {
        const verification = await verifyPaymentStatus(trackingId);

        const paymentCompleted =
          verification.success &&
          verification.statusCode === 1 &&
          verification.status.toUpperCase() === "COMPLETED" &&
          verification.merchantReference === currentOrderId &&
          verification.amount === plan.price &&
          Boolean(verification.confirmationCode);

        if (paymentCompleted) {
          // COMPLETED
          stopPolling();
          
          if (user) {
            const planDays = planDurations[plan.duration] || 30;
            let success = false;
            try {
              success = await activateSubscription(user.id, plan.duration, currentOrderId, trackingId);
            } catch (e) {
              console.error("Failed to activate subscription:", e);
            }

            
            try {
              await saveTransaction({
                userId: user.id,
                userName: user.name || "Unknown",
                userEmail: user.email || "",
                phoneNumber,
                planName: plan.duration,
                amount: plan.price,
                orderId: currentOrderId,
                orderTrackingId: trackingId,
                status: success ? "success" : "failed",
                confirmationCode: verification.confirmationCode,
                createdAt: new Date(),
              });
            } catch (e) {
              console.error("Failed to save transaction:", e);
            }

            // Save agent registration ONLY for fully successful payments
            if (success && plan.duration === "Agent Plan") {
              try {
                await saveRegisteredAgent({
                  userId: user.id,
                  userName: user.name || "Unknown",
                  userEmail: user.email || "",
                  agentName,
                  agentBusiness,
                  agentLocation,
                  phoneNumber,
                  planName: plan.duration,
                  amount: plan.price,
                  orderId: currentOrderId,
                  orderTrackingId: trackingId,
                  status: "success",

                  confirmationCode: verification.confirmationCode,
                  details: `Name: ${agentName || "—"} | Business: ${agentBusiness || "—"} | Location: ${agentLocation || "—"} | Phone: ${phoneNumber}`,
                });
              } catch (e) {
                console.error("Failed to save agent registration:", e);
              }
            }


            if (success) {
              clearPendingPaymentData();
              setConfirmationCode(verification.confirmationCode || null);
              setStatusMessage(`Your ${plan.duration} subscription is now active!`);
              setStep("success");
            } else {
              setStatusMessage("Payment received but failed to activate. Contact support with order: " + currentOrderId);
              setStep("failed");
            }

          }
        } else if (verification.statusCode === 2) {
          // FAILED
          stopPolling();
          const failureMsg = resolvePaymentFailureMessage(verification);
          if (user) {
            try {
              await saveTransaction({
                userId: user.id, userName: user.name || "Unknown", userEmail: user.email || "",
                phoneNumber, planName: plan.duration, amount: plan.price,
                orderId: currentOrderId, orderTrackingId: trackingId,
                status: "failed", failedReason: failureMsg, createdAt: new Date(),
              });
            } catch (e) { console.error("Save tx error:", e); }
          }
          clearPendingPaymentData();
          setStatusMessage(failureMsg);
          setStep("failed");
        } else if (verification.statusCode === 3) {
          // REVERSED
          stopPolling();
          clearPendingPaymentData();
          setStatusMessage("Payment was reversed. Contact support if this is an error.");
          setStep("failed");
        }
        // statusCode 0 (INVALID) = still processing, keep polling
      } catch (error) {
        console.error("Polling error:", error);
        // Don't stop polling on network errors, retry
      }
    }, 5000);
  }, [user, phoneNumber, stopPolling, agentOnly, agentName, agentBusiness, agentLocation]);

  const handlePayment = async () => {
    const normalizedPhone = normalizeUgandaPhoneForPesapal(phoneNumber);

    if (!normalizedPhone) {
      toast({ title: "Invalid phone number", description: "Please enter a valid Uganda phone number", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Login required", description: "Please login to subscribe", variant: "destructive" });
      return;
    }

    setStep("processing");

    try {
      const newOrderId = generateOrderId();
      const planDays = planDurations[selectedPlan!.duration] || 30;

      // Use the edge function IPN endpoint as the callback URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const ipnUrl = `${supabaseUrl}/functions/v1/pesapal?action=ipn`;
      // The callback URL for redirect within iframe — use current origin
      const callbackUrl = `${window.location.origin}/payment/callback`;

      const nameParts = user.name?.split(" ") || ["Customer"];
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { redirectUrl, orderTrackingId: trackingId } = await initiatePesapalPayment({
        orderId: newOrderId,
        amount: selectedPlan!.price,
        description: `Luo Ancient - ${selectedPlan!.duration} Subscription`,
        callbackUrl,
        ipnUrl,
        email: user.email,
        phoneNumber: normalizedPhone,
        firstName,
        lastName,
      });

      storePaymentData({
        orderId: newOrderId,
        orderTrackingId: trackingId,
        userId: user.id,
        planName: selectedPlan!.duration,
        planDays,
        amount: selectedPlan!.price,
        phoneNumber: normalizedPhone,
        ...(agentOnly ? { agentName, agentBusiness, agentLocation } : {}),
      });

      // Agent details are saved only after the payment is confirmed successful.





      setPaymentUrl(redirectUrl);
      setOrderTrackingId(trackingId);
      setOrderId(newOrderId);
      setStep("checkout");

      // Start polling for payment status
      startPolling(trackingId, newOrderId, selectedPlan!);
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setStep("phone");
    }
  };

  // Not logged in
  if (!user) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Login Required</DialogTitle>
              <DialogDescription className="text-center">Please login or create an account to subscribe</DialogDescription>
            </DialogHeader>
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
                <LogIn className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground">You need to be logged in to purchase a subscription plan.</p>
              <Button onClick={() => { onOpenChange(false); setAuthOpen(true); }} className="w-full gradient-primary" size="lg">
                Login / Sign Up
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode="login" />
      </>
    );
  }

  const isAgent = agentOnly;
  const accentClass = isAgent ? "text-orange-500" : "text-primary";
  const bgAccentClass = isAgent ? "bg-orange-500" : "gradient-primary";
  const ringClass = isAgent ? "ring-orange-500" : "ring-yellow-500";
  const failedTitle = statusMessage.toLowerCase().includes("insufficient balance")
    ? "Insufficient Balance"
    : statusMessage.toLowerCase().includes("not approved")
      ? "Payment Not Approved"
      : statusMessage.toLowerCase().includes("cancel")
        ? "Payment Cancelled"
        : "Payment Unsuccessful";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${step === "checkout" ? "max-w-2xl h-[90vh] p-0 overflow-hidden flex flex-col" : "max-w-2xl max-h-[90vh] overflow-y-auto"} md:ring-2 md:${ringClass} rounded-xl max-md:w-[calc(100vw-0.5rem)] max-md:max-w-[calc(100vw-0.5rem)] max-md:border-[3px] max-md:border-transparent max-md:[background:linear-gradient(var(--background),var(--background))_padding-box,conic-gradient(from_0deg,#ff0000,#ff7f00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff,#ff0000)_border-box]`}>
        {/* PLAN SELECTION */}
        {step === "plans" && !isAgent && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Choose Your Plan</DialogTitle>
              <DialogDescription className="text-center">Get unlimited access to all movies and TV series</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 py-4 border-b border-border">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary flex-shrink-0" /><span>{f}</span></div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
              {plans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <button key={plan.duration} onClick={() => handlePlanSelect(plan)} className="relative flex flex-col items-center p-4 rounded-xl border border-border hover:border-primary/50 transition-all hover:scale-105 max-md:border-[2px] max-md:border-transparent max-md:[background:linear-gradient(var(--background),var(--background))_padding-box,conic-gradient(from_0deg,#ff0000,#ff7f00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff,#ff0000)_border-box]">
                    {plan.popular && <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[7px] font-bold px-1.5 py-px rounded-full leading-tight">POPULAR</span>}
                    <Icon className="w-6 h-6 mb-2 text-primary" />
                    <span className="text-xs text-muted-foreground">{plan.duration}</span>
                    <span className="text-lg font-bold mt-1">UGX {plan.priceDisplay}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-center text-muted-foreground">Powered by Pesapal • MTN MoMo & Airtel Money accepted</p>
          </>
        )}

        {/* AGENT PLAN SELECTION */}
        {step === "plans" && isAgent && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Agent Plan Required</DialogTitle>
              <DialogDescription className="text-center">Subscribe to unlock ALL movies on the website including exclusive Agent movies for 3 days</DialogDescription>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-center">
               <p className="text-3xl font-bold">UGX {agentPlan.priceDisplay}</p>
                <p className="text-sm text-muted-foreground mt-1">3 Days Access to ALL Movies + Agent Movies</p>
              </div>
              <ul className="text-sm space-y-2 text-left w-full max-w-xs">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> Access ALL movies on the website</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> Access exclusive Agent movies</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> HD quality streaming</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> Download for offline viewing</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-500" /> No ads interruption</li>
              </ul>
              <Button onClick={() => handlePlanSelect(agentPlan)} className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg">
                Subscribe to Agent Plan
              </Button>
            </div>
          </>
        )}

        {/* AGENT DETAILS (optional) */}
        {step === "agentDetails" && selectedPlan && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep("plans")}><ArrowLeft className="w-5 h-5" /></Button>
                <DialogTitle className="text-xl">Agent Registration</DialogTitle>
              </div>
              <DialogDescription>All fields are optional. You can skip and continue to payment.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Your Name</label>
                <Input type="text" placeholder="e.g. John Doe" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Name of Business</label>
                <Input type="text" placeholder="e.g. Doe Movies Shop" value={agentBusiness} onChange={(e) => setAgentBusiness(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Your Location</label>
                <Input type="text" placeholder="e.g. Kampala, Wandegeya" value={agentLocation} onChange={(e) => setAgentLocation(e.target.value)} className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">Details are saved only after a successful payment.</p>
              <Button onClick={() => setStep("phone")} className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg">
                Continue to Payment
              </Button>
            </div>
          </>
        )}

        {/* PHONE NUMBER */}
        {step === "phone" && selectedPlan && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep(isAgent ? "agentDetails" : "plans")}><ArrowLeft className="w-5 h-5" /></Button>
                <DialogTitle className="text-xl">Enter Phone Number</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Enter your mobile money phone number</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="bg-accent rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">{isAgent ? "Agent Plan" : `${selectedPlan.duration} Plan`}</p>
                <p className={`text-2xl font-bold ${accentClass}`}>UGX {selectedPlan.priceDisplay}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number (Mobile Money)</label>
                <Input type="tel" placeholder="e.g. 0771234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="text-lg mt-1" autoFocus />
                <p className="text-xs text-muted-foreground mt-1">Enter your MTN MoMo or Airtel Money number</p>
              </div>
              <Button onClick={handlePayment} className={`w-full ${isAgent ? "bg-orange-500 hover:bg-orange-600 text-white" : "gradient-primary"}`} size="lg">
                Pay UGX {selectedPlan.priceDisplay}
              </Button>
            </div>
          </>
        )}

        {/* PROCESSING */}
        {step === "processing" && (
          <div className="py-12 text-center space-y-4">
            <DialogHeader className="sr-only"><DialogTitle>Processing</DialogTitle><DialogDescription>Please wait</DialogDescription></DialogHeader>
            <Loader2 className={`w-16 h-16 mx-auto animate-spin ${accentClass}`} />
            <h3 className="text-xl font-bold">Preparing Payment</h3>
            <p className="text-muted-foreground">Please wait while we prepare your payment...</p>
          </div>
        )}

        {/* EMBEDDED PESAPAL CHECKOUT */}
        {step === "checkout" && paymentUrl && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>Complete your payment</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <iframe
                src={paymentUrl}
                className="h-full w-full border-0"
                title="Pesapal Checkout"
                allow="payment"
              />
            </div>
            <div className="shrink-0 flex items-center justify-center gap-2 border-t bg-background px-4 py-3 text-sm text-foreground shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="font-medium">Waiting for payment confirmation...</span>
            </div>
          </>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <DialogHeader className="sr-only"><DialogTitle>Success</DialogTitle><DialogDescription>Payment successful</DialogDescription></DialogHeader>
            <div className="w-20 h-20 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-green-500">Payment Successful!</h3>
            <p className="text-muted-foreground">{statusMessage}</p>
            {confirmationCode && (
              <p className="text-sm text-muted-foreground">Confirmation: <span className="font-mono">{confirmationCode}</span></p>
            )}
            <Button onClick={() => handleClose(false)} className="w-full">Start Watching</Button>
          </div>
        )}

        {/* FAILED */}
        {step === "failed" && (
          <div className="py-8 text-center space-y-4">
            <DialogHeader className="sr-only"><DialogTitle>Payment Issue</DialogTitle><DialogDescription>There was an issue with your payment</DialogDescription></DialogHeader>
            <div className="w-20 h-20 rounded-full bg-destructive/20 mx-auto flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-destructive">{failedTitle}</h3>
            <p className="text-muted-foreground">{statusMessage}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={resetState} className="w-full">Try Again</Button>
              <Button variant="outline" onClick={() => handleClose(false)} className="w-full">Close</Button>
            </div>
          </div>
        )}

        {/* PENDING */}
        {step === "pending" && (
          <div className="py-8 text-center space-y-4">
            <DialogHeader className="sr-only"><DialogTitle>Pending</DialogTitle><DialogDescription>Payment pending</DialogDescription></DialogHeader>
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 mx-auto flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-bold text-yellow-500">Payment Processing</h3>
            <p className="text-muted-foreground">{statusMessage}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { if (orderTrackingId && orderId && selectedPlan) { setStep("checkout"); startPolling(orderTrackingId, orderId, selectedPlan); }}} className="w-full">Check Again</Button>
              <Button variant="outline" onClick={() => handleClose(false)} className="w-full">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
