import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getPendingPaymentData, 
  clearPendingPaymentData, 
  verifyPaymentStatus,
  parseCallbackParams 
} from "@/lib/pesapal";
import { activateSubscription } from "@/lib/subscription-service";
import { saveTransaction, saveUserTransaction } from "@/lib/admin-db";
import { saveRegisteredAgent } from "@/lib/activity-tracker";


function resolvePaymentFailureMessage(verification: {
  message?: string;
  status?: string;
  description?: string;
  errorCode?: string;
  errorMessage?: string;
  paymentStatusCode?: string;
}): string {
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
}

function getFailureTitle(message: string): string {
  const details = message.toLowerCase();

  if (details.includes("insufficient balance")) return "Insufficient Balance";
  if (details.includes("not approved")) return "Payment Not Approved";
  if (details.includes("cancel")) return "Payment Cancelled";

  return "Payment Unsuccessful";
}

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [status, setStatus] = useState<"loading" | "verifying" | "success" | "failed" | "pending">("loading");
  const [message, setMessage] = useState("");
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  // Parse callback params according to Pesapal API spec
  // URL format: ?OrderTrackingId=xxx&OrderMerchantReference=xxx&OrderNotificationType=CALLBACKURL
  const callbackParams = parseCallbackParams(searchParams);

  useEffect(() => {
    // Prevent double verification - if already success, don't run again
    let hasRun = false;

    async function processPayment() {
      if (hasRun) return;
      hasRun = true;

      // Get pending payment data from localStorage
      const paymentData = getPendingPaymentData();
      
      if (!paymentData) {
        setStatus("failed");
        setMessage("Payment data not found. Please try again or contact support.");
        return;
      }

      if (!user) {
        setStatus("failed");
        setMessage("Please log in to complete your subscription activation.");
        return;
      }

      // Verify the merchant reference matches our order
      if (callbackParams.orderMerchantReference && 
          callbackParams.orderMerchantReference !== paymentData.orderId) {
        setStatus("failed");
        setMessage("Order verification failed. Please contact support.");
        return;
      }

      if (!callbackParams.orderTrackingId) {
        setStatus("failed");
        setMessage("Payment was not completed. Please try again.");
        return;
      }

      // Verify payment status with Pesapal GetTransactionStatus API
      setStatus("verifying");
      setMessage("Verifying your payment with Pesapal...");

      try {
        const verification = await verifyPaymentStatus(callbackParams.orderTrackingId);

        // Status codes: 0=INVALID, 1=COMPLETED, 2=FAILED, 3=REVERSED
        const paymentCompleted =
          verification.success &&
          verification.statusCode === 1 &&
          verification.status.toUpperCase() === "COMPLETED" &&
          verification.merchantReference === paymentData.orderId &&
          verification.amount === paymentData.amount &&
          Boolean(verification.confirmationCode);

        if (paymentCompleted) {
          // Payment COMPLETED - activate subscription in Firebase
          let success = false;
          try {
            success = await activateSubscription(
              paymentData.userId,
              paymentData.planName,
              paymentData.orderId,
              callbackParams.orderTrackingId
            );
          } catch (e) {
            console.error("Failed to activate subscription:", e);
          }


          // Save transaction record
          try {
            await saveTransaction({
              userId: paymentData.userId,
              userName: user.name || "Unknown",
              userEmail: user.email || "",
              phoneNumber: paymentData.phoneNumber,
              planName: paymentData.planName,
              amount: paymentData.amount,
              orderId: paymentData.orderId,
              orderTrackingId: callbackParams.orderTrackingId,
              status: success ? "success" : "failed",
              confirmationCode: verification.confirmationCode,
              createdAt: new Date(),
            });
          } catch (e) {
            console.error("Failed to save transaction:", e);
          }

          // Save to the User Transactions ledger — successful payments only,
          // de-duplicated by payment reference.
          if (success) {
            try {
              await saveUserTransaction({
                userId: paymentData.userId,
                userName: user.name || "Unknown",
                userEmail: user.email || "",
                phoneNumber: paymentData.phoneNumber,
                planName: paymentData.planName,
                amount: paymentData.amount,
                orderId: paymentData.orderId,
                orderTrackingId: callbackParams.orderTrackingId!,
                confirmationCode: verification.confirmationCode,
                createdAt: new Date(),
              });
            } catch (e) {
              console.error("Failed to save user transaction:", e);
            }
          }

          // Save agent registration ONLY for successful payments.
          const isAgentPurchase = paymentData.planName === "Agent Plan";

          if (success && isAgentPurchase) {
            try {
              await saveRegisteredAgent({
                userId: paymentData.userId,
                userName: user.name || "Unknown",
                userEmail: user.email || "",
                agentName: paymentData.agentName || "",
                agentBusiness: paymentData.agentBusiness || "",
                agentLocation: paymentData.agentLocation || "",
                phoneNumber: paymentData.phoneNumber,
                planName: paymentData.planName,
                amount: paymentData.amount,
                orderId: paymentData.orderId,
                orderTrackingId: callbackParams.orderTrackingId!,
                confirmationCode: verification.confirmationCode,
                status: "success",

                details: `Name: ${paymentData.agentName || "—"} | Business: ${paymentData.agentBusiness || "—"} | Location: ${paymentData.agentLocation || "—"} | Phone: ${paymentData.phoneNumber}`,
              });
            } catch (e) {
              console.error("Failed to save agent registration:", e);
            }
          }

          if (success) {
            setStatus("success");
            setConfirmationCode(verification.confirmationCode || null);
            setMessage(`Your ${paymentData.planName} subscription is now active!`);
            clearPendingPaymentData();
          } else {
            setStatus("failed");
            setMessage("Failed to activate subscription. Please contact support with your order ID: " + paymentData.orderId);
          }


        } else if (verification.statusCode === 0) {
          // INVALID - still processing or not yet complete
          setStatus("pending");
          setMessage("Your payment is being processed. Please wait a few minutes and check again.");
        } else if (verification.statusCode === 2) {
          const failureMessage = resolvePaymentFailureMessage({
            message: verification.message,
            status: verification.status,
            description: verification.description,
            errorCode: verification.errorCode,
            errorMessage: verification.errorMessage,
            paymentStatusCode: verification.paymentStatusCode,
          });
          try { await saveTransaction({ userId: paymentData.userId, userName: user.name || "Unknown", userEmail: user.email || "", phoneNumber: paymentData.phoneNumber, planName: paymentData.planName, amount: paymentData.amount, orderId: paymentData.orderId, orderTrackingId: callbackParams.orderTrackingId!, status: "failed", failedReason: failureMessage, createdAt: new Date() }); } catch (e) { console.error("Save tx error:", e); }
          setStatus("failed");
          setMessage(failureMessage);
          clearPendingPaymentData();
        } else if (verification.statusCode === 3) {
          try { await saveTransaction({ userId: paymentData.userId, userName: user.name || "Unknown", userEmail: user.email || "", phoneNumber: paymentData.phoneNumber, planName: paymentData.planName, amount: paymentData.amount, orderId: paymentData.orderId, orderTrackingId: callbackParams.orderTrackingId!, status: "failed", failedReason: "Payment was reversed", createdAt: new Date() }); } catch (e) { console.error("Save tx error:", e); }
          setStatus("failed");
          setMessage("Payment was reversed. Please contact support if you believe this is an error.");
          clearPendingPaymentData();
        } else {
          // Unknown status
          setStatus("pending");
          setMessage(`Payment status: ${verification.status}. Please wait or contact support.`);
        }
      } catch (error) {
        console.error("Error processing payment:", error);
        setStatus("pending");
        setMessage("Could not verify payment status. Please try again in a few minutes or contact support with order ID: " + paymentData.orderId);
      }
    }

    // Small delay to show loading state
    const timer = setTimeout(processPayment, 1000);
    return () => {
      clearTimeout(timer);
      hasRun = true; // prevent running on cleanup/re-mount
    };
  }, []); // Empty deps - only run ONCE on mount

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md w-full text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
              <h1 className="text-2xl font-bold">Processing Payment</h1>
              <p className="text-muted-foreground">
                Please wait while we process your payment...
              </p>
            </div>
          )}

          {status === "verifying" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
              <h1 className="text-2xl font-bold">Verifying Payment</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-green-500">Payment Successful!</h1>
              <p className="text-muted-foreground">{message}</p>
              {confirmationCode && (
                <p className="text-sm text-muted-foreground">
                  Confirmation: <span className="font-mono">{confirmationCode}</span>
                </p>
              )}
              <div className="flex flex-col gap-2 mt-6">
                <Button onClick={() => navigate("/")} className="w-full">
                  Start Watching
                </Button>
                <Button variant="outline" onClick={() => navigate("/movies")} className="w-full">
                  Browse Movies
                </Button>
              </div>
            </div>
          )}

          {status === "pending" && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 mx-auto flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold text-yellow-500">Payment Processing</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 mt-6">
                <Button onClick={() => window.location.reload()} className="w-full">
                  Check Again
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  Go Home
                </Button>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-destructive/20 mx-auto flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-destructive">{getFailureTitle(message)}</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 mt-6">
                <Button onClick={() => navigate("/")} className="w-full">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  Go Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
