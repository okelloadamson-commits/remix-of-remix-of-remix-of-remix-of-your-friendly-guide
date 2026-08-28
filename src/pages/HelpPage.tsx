import { MainLayout } from "@/components/layout/MainLayout";

export default function HelpPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Help Center</h1>
        <p className="text-muted-foreground mb-8">
          Find answers to common questions about using Luo Ancient Movies.
        </p>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">How do I subscribe?</h2>
            <p className="text-muted-foreground">Click the "Subscribe" button in the header, choose your preferred plan, and complete the payment via M-Pesa or Airtel Money.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">How do I download movies?</h2>
            <p className="text-muted-foreground">You need an active subscription to download. Go to any movie page and click the download button.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">What is the Agent Plan?</h2>
            <p className="text-muted-foreground">The Agent Plan (UGX 10,000) gives you 3-day access to exclusive Agent-marked movies that aren't available on regular plans.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">My payment was deducted but subscription isn't active?</h2>
            <p className="text-muted-foreground">Please contact us at <a href="mailto:w64301879@gmail.com" className="text-primary hover:underline">w64301879@gmail.com</a> with your phone number and transaction details.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">How do I reset my password?</h2>
            <p className="text-muted-foreground">Click "Login", then click "Forgot password?" to receive a reset link via email.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
