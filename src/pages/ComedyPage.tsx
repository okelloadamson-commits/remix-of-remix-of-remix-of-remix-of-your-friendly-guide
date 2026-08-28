import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageLoader } from "@/components/PageLoader";
import {
  getComedies,
  getMovies,
  getSeries,
  comedyToContentItem,
  type ContentItem,
} from "@/lib/firebase-db";
import { MovieGrid } from "@/components/movies/MovieGrid";

export default function ComedyPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    Promise.all([getComedies(), getMovies(), getSeries()])
      .then(([comedies, movies, series]) => {
        const all: ContentItem[] = [
          ...comedies.map((c) => comedyToContentItem(c)),
          ...movies.filter((m) => m.isLuoChampion).map((m) => ({ ...m, type: "movie" as const })),
          ...series.filter((s) => s.isLuoChampion).map((s) => ({ ...s, type: "series" as const })),
        ];
        all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setItems(all);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Luo Champion</h1>
            <p className="text-sm text-muted-foreground">Included in your main subscription.</p>
          </div>
        </div>

        {loading ? (
          <PageLoader label="Luo Champion" />
        ) : loadFailed ? null : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            No Luo Champion uploaded yet. Check back soon!
          </p>
        ) : (
          <MovieGrid items={items} />
        )}
      </div>
    </MainLayout>
  );
}
