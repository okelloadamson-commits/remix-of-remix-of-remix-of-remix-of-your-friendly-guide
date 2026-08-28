import { MainLayout } from "@/components/layout/MainLayout";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { getRecentlyAdded, type ContentItem } from "@/lib/firebase-db";
import { useState, useEffect } from "react";
import { PageLoader } from "@/components/PageLoader";

export default function RecentPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const fetchedContent = await getRecentlyAdded();
        setContent(fetchedContent);
      } catch (error) {
        console.error("Error fetching recent content:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecent();
  }, []);

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <h1 className="text-2xl font-bold mb-6">Recently Added</h1>
        
        {loading ? (
          <PageLoader label="RECENT" />
        ) : content.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No recent content available. Check back soon!</p>
        ) : (
          <MovieGrid items={content} />
        )}
      </div>
    </MainLayout>
  );
}
