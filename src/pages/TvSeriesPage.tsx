import { MainLayout } from "@/components/layout/MainLayout";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { getSeries, type Series } from "@/lib/firebase-db";
import { useState, useEffect } from "react";
import { PageLoader } from "@/components/PageLoader";

export default function TvSeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSeries() {
      try {
        const fetchedSeries = await getSeries();
        setSeries(fetchedSeries);
      } catch (error) {
        console.error("Error fetching series:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSeries();
  }, []);

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <h1 className="text-2xl font-bold mb-6">TV Series</h1>
        
        {loading ? (
          <PageLoader label="TV SERIES" />
        ) : series.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No TV series available yet. Check back soon!</p>
        ) : (
          <MovieGrid items={series} contentType="series" />
        )}
      </div>
    </MainLayout>
  );
}
