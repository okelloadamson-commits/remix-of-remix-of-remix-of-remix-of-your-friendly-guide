import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Megaphone, CheckCircle, XCircle, AlertCircle, ArrowLeft, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  generateOrderId,
  initiatePesapalPayment,
  verifyPaymentStatus,
} from "@/lib/pesapal";
import { saveGreetingAdvert, GREETING_PRICE, GREETING_PLAN_NAME } from "@/lib/greetings-db";

interface GreetingAdvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "form" | "processing" | "checkout" | "success" | "failed" | "pending";

function normalizeUgandaPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("2560") && digits.length === 13) return digits.slice(3);
  if (digits.startsWith("256") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0") && digits.length === 10) return digits;
  if (digits.length === 9) return `0${digits}`;
  return null;
}

function failureMessage(v: {
  message?: string;
  status?: string;
  description?: string;
  errorCode?: string;
  errorMessage?: string;
  paymentStatusCode?: string;
}) {
  const details = `${v.status || ""} ${v.message || ""} ${v.description || ""} ${v.errorCode || ""} ${v.errorMessage || ""} ${v.paymentStatusCode || ""}`.toLowerCase();
  if (details.includes("insufficient") || details.includes("balance") || details.includes("funds")) {
    return "Insufficient balance in your account. Please top up your mobile money account and try again.";
  }
  if (details.includes("cancel")) return "Payment was cancelled. You can try again when you're ready.";
  return "Payment not approved on your phone. Please retry and confirm the prompt on your mobile device.";
}

export function GreetingAdvertModal({ open, onOpenChange }: GreetingAdvertModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [senderName, setSenderName] = useState("");
  const [location, setLocation] = useState("");
  const [names, setNames] = useState<string[]>(["", "", "", "", ""]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const resetState = () => {
    stopPolling();
    setStep("form");
    setSenderName("");
    setLocation("");
    setNames(["", "", "", "", ""]);
    setPhoneNumber("");
    setPaymentUrl(null);
    setStatusMessage("");
    setConfirmationCode(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const startPolling = useCallback(
    (trackingId: string, currentOrderId: string, normalizedPhone: string, details: { senderName: string; location: string; names: string[] }) => {
      let attempts = 0;
      const maxAttempts = 120; // ~10 minutes

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

          const completed =
            verification.success &&
            verification.statusCode === 1 &&
            verification.status.toUpperCase() === "COMPLETED" &&
            verification.merchantReference === currentOrderId &&
            verification.amount === GREETING_PRICE &&
            Boolean(verification.confirmationCode);

          if (completed) {
            stopPolling();
            try {
              await saveGreetingAdvert({
                userId: user?.id || "",
                userName: user?.name || "Unknown",
                userEmail: user?.email || "",
                phoneNumber: normalizedPhone,
                senderName: details.senderName,
                location: details.location,
                greetingNames: details.names,
                amount: GREETING_PRICE,
                orderId: currentOrderId,
                orderTrackingId: trackingId,
                confirmationCode: verification.confirmationCode,
                createdAt: new Date(),
              });
            } catch (e) {
              console.error("Failed to save greeting advert:", e);
            }
            setConfirmationCode(verification.confirmationCode || null);
            setStatusMessage("Your greeting has been sent to our team and will be aired soon!");
            setStep("success");
          } else if (verification.statusCode === 2) {
            stopPolling();
            setStatusMessage(failureMessage(verification));
            setStep("failed");
          } else if (verification.statusCode === 3) {
            stopPolling();
            setStatusMessage("Payment was reversed. Contact support if this is an error.");
            setStep("failed");
          }
          // statusCode 0 = still processing, keep polling
        } catch (error) {
          console.error("Greeting polling error:", error);
        }
      }, 5000);
    },
    [stopPolling, user],
  );

  const handlePay = async () => {
    if (!senderName.trim()) {
      toast({ title: "Name required", description: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!location.trim()) {
      toast({ title: "Location required", description: "Please enter your location", variant: "destructive" });
      return;
    }
    if (names.every((n) => !n.trim())) {
      toast({ title: "Add names", description: "List at least one person to greet", variant: "destructive" });
      return;
    }
    const normalizedPhone = normalizeUgandaPhone(phoneNumber);
    if (!normalizedPhone) {
      toast({ title: "Invalid phone number", description: "Please enter a valid Uganda phone number", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Login required", description: "Please login to continue", variant: "destructive" });
      return;
    }

    setStep("processing");

    try {
      const newOrderId = generateOrderId();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const ipnUrl = `${supabaseUrl}/functions/v1/pesapal?action=ipn`;
      const callbackUrl = `${window.location.origin}/payment/callback`;

      const nameParts = user.name?.split(" ") || ["Customer"];

      const { redirectUrl, orderTrackingId: trackingId } = await initiatePesapalPayment({
        orderId: newOrderId,
        amount: GREETING_PRICE,
        description: `Luo Ancient - ${GREETING_PLAN_NAME}`,
        callbackUrl,
        ipnUrl,
        email: user.email,
        phoneNumber: normalizedPhone,
        firstName: nameParts[0] || "Customer",
        lastName: nameParts.slice(1).join(" ") || "",
      });

      setPaymentUrl(redirectUrl);
      setStep("checkout");
      startPolling(trackingId, newOrderId, normalizedPhone, {
        senderName: senderName.trim(),
        location: location.trim(),
        names: names.map((n) => n.trim()).filter(Boolean),
      });
    } catch (error) {
      console.error("Greeting payment error:", error);
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setStep("form");
    }
  };

  if (!user) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Login Required</DialogTitle>
              <DialogDescription className="text-center">Please login to send a greeting advert</DialogDescription>
            </DialogHeader>
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
                <LogIn className="w-10 h-10 text-primary" />
              </div>
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`${step === "checkout" ? "max-w-2xl h-[90vh] p-0 overflow-hidden flex flex-col" : "max-w-lg max-h-[90vh] overflow-y-auto"} rounded-xl max-md:w-[calc(100vw-0.5rem)] max-md:max-w-[calc(100vw-0.5rem)]`}
      >
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                Send a Greeting Advert
              </DialogTitle>
              <DialogDescription>
                Fill in your details and list up to five people you want to greet. Costs UGX 5,000.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <div>
                <label className="text-sm font-medium">Your Name</label>
                <Input placeholder="e.g. John Doe" value={senderName} onChange={(e) => setSenderName(e.target.value)} maxLength={80} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input placeholder="e.g. Kampala, Wandegeya" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} className="mt-1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">People to greet (up to 5)</label>
                {names.map((n, i) => (
                  <Input
                    key={i}
                    placeholder={`Person ${i + 1}`}
                    value={n}
                    maxLength={60}
                    onChange={(e) => setName(i, e.target.value)}
                  />
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number (Mobile Money)</label>
                <Input type="tel" placeholder="e.g. 0771234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">MTN MoMo or Airtel Money</p>
              </div>
              <Button onClick={handlePay} className="w-full bg-amber-500 hover:bg-amber-600 text-white" size="lg">
                Pay UGX 5,000
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Your greeting is only submitted after a successful payment.
              </p>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Processing</DialogTitle>
              <DialogDescription className="sr-only">Setting up your payment</DialogDescription>
            </DialogHeader>
            <Loader2 className="w-14 h-14 mx-auto animate-spin text-amber-500" />
            <p className="text-muted-foreground">Setting up your payment...</p>
          </div>
        )}

        {step === "checkout" && paymentUrl && (
          <>
            <DialogHeader className="p-4 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => { stopPolling(); setStep("form"); }}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <DialogTitle className="text-lg">Complete Payment</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Complete your payment with Pesapal</DialogDescription>
            </DialogHeader>
            <iframe src={paymentUrl} title="Pesapal Checkout" className="flex-1 w-full border-0" />
          </>
        )}

        {step === "success" && (
          <div className="py-10 text-center space-y-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Payment successful</DialogTitle>
              <DialogDescription className="sr-only">{statusMessage}</DialogDescription>
            </DialogHeader>
            <div className="w-20 h-20 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-green-500">Payment Successful!</h2>
            <p className="text-muted-foreground px-4">{statusMessage}</p>
            {confirmationCode && (
              <p className="text-sm text-muted-foreground">Confirmation: <span className="font-mono">{confirmationCode}</span></p>
            )}
            <Button onClick={() => handleClose(false)} className="w-full max-w-xs">Done</Button>
          </div>
        )}

        {step === "pending" && (
          <div className="py-10 text-center space-y-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Payment processing</DialogTitle>
              <DialogDescription className="sr-only">{statusMessage}</DialogDescription>
            </DialogHeader>
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 mx-auto flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-500">Payment Processing</h2>
            <p className="text-muted-foreground px-4">{statusMessage}</p>
            <Button onClick={() => handleClose(false)} variant="outline" className="w-full max-w-xs">Close</Button>
          </div>
        )}

        {step === "failed" && (
          <div className="py-10 text-center space-y-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Payment unsuccessful</DialogTitle>
              <DialogDescription className="sr-only">{statusMessage}</DialogDescription>
            </DialogHeader>
            <div className="w-20 h-20 rounded-full bg-destructive/20 mx-auto flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-destructive">Payment Unsuccessful</h2>
            <p className="text-muted-foreground px-4">{statusMessage}</p>
            <Button onClick={() => setStep("form")} className="w-full max-w-xs">Try Again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
