import { MainLayout } from "@/components/layout/MainLayout";

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">About Luo Ancient Movies</h1>
        <p className="text-muted-foreground mb-4">
          Luo Ancient Movies is a premier streaming platform dedicated to bringing you the best movies, TV series, and exclusive content. Our mission is to entertain, educate, and inspire audiences across Africa and beyond.
        </p>
        <p className="text-muted-foreground mb-4">
          Founded with a passion for storytelling, we curate a diverse library of content ranging from action and drama to comedy and documentaries. We believe in the power of film to connect communities and preserve cultural heritage.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-4">Our Vision</h2>
        <p className="text-muted-foreground mb-4">
          To become the leading African streaming platform, showcasing local talent and stories to a global audience while making entertainment accessible and affordable for everyone.
        </p>
        <h2 className="text-xl font-semibold mt-8 mb-4">What We Offer</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2">
          <li>High-quality movies and TV series streaming</li>
          <li>Exclusive Agent content for premium subscribers</li>
          <li>Affordable subscription plans</li>
          <li>Download for offline viewing</li>
          <li>Regular content updates</li>
        </ul>
      </div>
    </MainLayout>
  );
}
