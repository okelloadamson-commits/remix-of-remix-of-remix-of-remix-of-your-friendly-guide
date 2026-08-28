import { MainLayout } from "@/components/layout/MainLayout";

export default function BlogPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Blog</h1>
        <p className="text-muted-foreground mb-8">
          Stay up to date with the latest news, movie releases, and behind-the-scenes stories from Luo Ancient Movies.
        </p>
        <div className="border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-lg">Coming Soon</p>
          <p className="text-sm text-muted-foreground mt-2">We're working on exciting content for our blog. Check back soon!</p>
        </div>
      </div>
    </MainLayout>
  );
}
