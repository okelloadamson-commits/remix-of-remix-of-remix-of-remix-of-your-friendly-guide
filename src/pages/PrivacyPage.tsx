import { MainLayout } from "@/components/layout/MainLayout";

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
            <p>We collect your name, email address, and phone number when you create an account or subscribe. We also collect usage data such as viewing history and preferences.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
            <p>Your information is used to provide and improve our services, process payments, communicate with you about your account, and personalize your experience.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Third-Party Services</h2>
            <p>We use PesaPal for payment processing and Google Firebase for authentication and data storage. These services have their own privacy policies.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Your Rights</h2>
            <p>You can request access to, correction of, or deletion of your personal data by contacting us at <a href="mailto:w64301879@gmail.com" className="text-primary hover:underline">w64301879@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
