import { MainLayout } from "@/components/layout/MainLayout";

export default function CareersPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Careers</h1>
        <p className="text-muted-foreground mb-4">
          Join the Luo Ancient Movies team and help us revolutionize entertainment in Africa. We're always looking for passionate, creative individuals who share our vision.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-4">Why Work With Us?</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2">
          <li>Be part of a fast-growing entertainment platform</li>
          <li>Work with a passionate and diverse team</li>
          <li>Opportunity to shape the future of African streaming</li>
          <li>Flexible and remote-friendly work environment</li>
        </ul>
        <h2 className="text-xl font-semibold mt-8 mb-4">Current Openings</h2>
        <p className="text-muted-foreground">
          We don't have any open positions at the moment. Please check back later or send your CV to <a href="mailto:w64301879@gmail.com" className="text-primary hover:underline">w64301879@gmail.com</a>.
        </p>
      </div>
    </MainLayout>
  );
}
