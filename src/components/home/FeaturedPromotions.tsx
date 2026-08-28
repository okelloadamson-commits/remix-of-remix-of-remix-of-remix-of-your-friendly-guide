import { getFeaturedContent, type ContentItem } from "@/lib/firebase-db";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedPromotions() {
  const [promos, setPromos] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const featured = await getFeaturedContent(4);
        setPromos(featured);
      } catch (error) {
        console.error("Error fetching featured content:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatured();
  }, []);

  if (loading) {
    return (
      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl lg:text-2xl font-bold">Featured Promotions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/1] rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (promos.length === 0) {
    return null;
  }

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl lg:text-2xl font-bold">Featured Promotions</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {promos.map((item) => {
          const watchUrl = item.type === 'series' ? `/watch/series/${item.id}` : `/watch/${item.id}`;
          return (
            <Link
              key={item.id}
              to={watchUrl}
              className="relative aspect-[2/1] rounded-lg overflow-hidden group"
            >
              <img
                src={item.posterUrl}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {item.genre} • {item.releaseYear}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
