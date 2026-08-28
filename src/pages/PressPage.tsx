import { MainLayout } from "@/components/layout/MainLayout";

export default function PressPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Press</h1>
        <p className="text-muted-foreground mb-4">
          For press inquiries, media kits, and partnership opportunities, please reach out to our communications team.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-4">Media Contact</h2>
        <p className="text-muted-foreground">
          Email: <a href="mailto:w64301879@gmail.com" className="text-primary hover:underline">w64301879@gmail.com</a>
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-4">Brand Assets</h2>
        <p className="text-muted-foreground">
          If you need our logo or brand materials for publications, please contact us via email and we'll provide the necessary assets.
        </p>
      </div>
    </MainLayout>
  );
}
