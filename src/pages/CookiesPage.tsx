import { MainLayout } from "@/components/layout/MainLayout";

export default function CookiesPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">What Are Cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit our website. They help us provide a better experience by remembering your preferences.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">How We Use Cookies</h2>
            <p>We use cookies for authentication (keeping you logged in), remembering your theme preference, and analyzing site usage to improve our services.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Managing Cookies</h2>
            <p>You can control cookies through your browser settings. Disabling cookies may affect some features of our platform.</p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
