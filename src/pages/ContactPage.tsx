import { MainLayout } from "@/components/layout/MainLayout";
import { Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          Have questions, feedback, or need support? Reach out to us via email and we'll get back to you as soon as possible.
        </p>

        <div className="border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Email Us</h2>
              <a href="mailto:w64301879@gmail.com" className="text-primary hover:underline text-sm">
                w64301879@gmail.com
              </a>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            We typically respond within 24 hours. For subscription or payment issues, please include your phone number and transaction details.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
