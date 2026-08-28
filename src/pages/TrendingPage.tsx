import { MainLayout } from "@/components/layout/MainLayout";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { getTrendingContent, type ContentItem } from "@/lib/firebase-db";
import { useState, useEffect } from "react";
import { PageLoader } from "@/components/PageLoader";

export default function TrendingPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const fetchedContent = await getTrendingContent();
        setContent(fetchedContent);
      } catch (error) {
        console.error("Error fetching trending content:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrending();
  }, []);

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <h1 className="text-2xl font-bold mb-6">🔥 Trending Now</h1>
        
        {loading ? (
          <PageLoader label="TRENDING" />
        ) : content.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No trending content available. Check back soon!</p>
        ) : (
          <MovieGrid items={content} />
        )}
      </div>
    </MainLayout>
  );
}
