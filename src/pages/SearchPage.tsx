import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Film, Tv, Megaphone } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { MainLayout } from "@/components/layout/MainLayout";
import { MovieCard } from "@/components/movies/MovieCard";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { searchContent, Movie, Series, Advert } from "@/lib/firebase-db";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "movies" | "series" | "adverts">("all");

  useEffect(() => {
    async function performSearch() {
      if (!query.trim()) {
        setMovies([]);
        setSeries([]);
        setAdverts([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchContent(query);
        setMovies(results.movies);
        setSeries(results.series);
        setAdverts(results.adverts);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [query]);

  const totalResults = movies.length + series.length + adverts.length;

  const tabs = [
    { id: "all", label: "All", count: totalResults },
    { id: "movies", label: "Movies", icon: Film, count: movies.length },
    { id: "series", label: "TV Series", icon: Tv, count: series.length },
    { id: "adverts", label: "Adverts", icon: Megaphone, count: adverts.length },
  ];

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {query ? (
              <>Search results for "<span className="text-primary">{query}</span>"</>
            ) : (
              "Search"
            )}
          </h1>
          {query && !loading && (
            <p className="text-muted-foreground">
              Found {totalResults} result{totalResults !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent hover:bg-accent/80 text-foreground"
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              <span className="bg-background/20 px-2 py-0.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && <PageLoader label="SEARCH" />}

        {/* No Query */}
        {!query && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Start searching</h2>
            <p className="text-muted-foreground">
              Enter a search term to find movies, TV series, and adverts
            </p>
          </div>
        )}

        {/* No Results */}
        {query && !loading && totalResults === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No results found</h2>
            <p className="text-muted-foreground">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && totalResults > 0 && (
          <div className="space-y-8">
            {/* Movies */}
            {(activeTab === "all" || activeTab === "movies") && movies.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Film className="w-5 h-5 text-primary" />
                  Movies ({movies.length})
                </h2>
                <MovieGrid items={movies} contentType="movie" />
              </div>
            )}

            {/* Series */}
            {(activeTab === "all" || activeTab === "series") && series.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-primary" />
                  TV Series ({series.length})
                </h2>
                <MovieGrid items={series} contentType="series" />
              </div>
            )}

            {/* Adverts */}
            {(activeTab === "all" || activeTab === "adverts") && adverts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  Adverts ({adverts.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {adverts.map((advert) => (
                    <a
                      key={advert.id}
                      href={advert.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                    >
                      <div className="aspect-video relative">
                        <img
                          src={advert.imageUrl}
                          alt={advert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm line-clamp-1">{advert.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {advert.description}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
