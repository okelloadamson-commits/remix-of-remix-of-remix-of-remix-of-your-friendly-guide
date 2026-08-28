import { MainLayout } from "@/components/layout/MainLayout";

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By accessing and using Luo Ancient Movies, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information when creating an account.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Subscription & Payments</h2>
            <p>Subscriptions are non-refundable once activated. Payments are processed through PesaPal via M-Pesa and Airtel Money. Subscription duration varies by plan selected.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Content Usage</h2>
            <p>All content on Luo Ancient Movies is for personal, non-commercial use only. You may not distribute, modify, or publicly display our content without permission.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Prohibited Conduct</h2>
            <p>You may not attempt to circumvent subscription requirements, share your account with others, or use automated tools to access our content.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms without prior notice.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:w64301879@gmail.com" className="text-primary hover:underline">w64301879@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
