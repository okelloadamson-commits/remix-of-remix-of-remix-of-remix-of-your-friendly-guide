import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MovieCard } from "@/components/movies/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Shield, Crown } from "lucide-react";
import { getMovies, getSeries, getEpisodesBySeriesId, type Movie, type Series, type ContentItem, type Episode, isMovieInAgentMode } from "@/lib/firebase-db";
import { database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { AgentWelcomePopup } from "@/components/AgentWelcomePopup";

export default function AgentPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(t);
  }, []);


  useEffect(() => {
    async function fetchAgentContent() {
      try {
        const [movies, seriesList] = await Promise.all([getMovies(), getSeries()]);
        
        // Agent movies
        const agentMovies = movies
          .filter((m) => isMovieInAgentMode(m))
          .map((m) => ({ ...m, type: 'movie' as const }));
        
        // Get all episodes and find agent ones
        const episodesRef = ref(database, "episodes");
        const episodesSnapshot = await get(episodesRef);
        const allEpisodes: Episode[] = [];
        if (episodesSnapshot.exists()) {
          episodesSnapshot.forEach((child) => {
            allEpisodes.push({ id: child.key, ...child.val() } as Episode);
          });
        }
        
        const agentEpisodes = allEpisodes.filter(ep => ep.isAgent);
        const seriesMap = new Map(seriesList.map(s => [s.id!, s]));
        
        // Create individual episode cards for each agent episode
        const agentEpisodeCards: ContentItem[] = agentEpisodes.map(ep => {
          const parentSeries = seriesMap.get(ep.seriesId);
          return {
            ...(parentSeries || {} as Series),
            id: parentSeries?.id,
            type: 'series' as const,
            createdAt: ep.createdAt,
            episodeInfo: {
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.episodeNumber,
              episodeTitle: ep.title,
              episodeId: ep.id!,
              episodeThumbnailUrl: ep.thumbnailUrl,
              seasonLabel: ep.seasonLabel,
            },
          };
        }).filter(item => item.id);
        
        const all: ContentItem[] = [...agentMovies, ...agentEpisodeCards];
        all.sort((a, b) => b.createdAt - a.createdAt);
        setContent(all);
      } catch (error) {
        console.error("Error fetching agent content:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAgentContent();
  }, []);

  return (
    <MainLayout>
      {showWelcome && <AgentWelcomePopup />}
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agent</h1>
            <p className="text-sm text-muted-foreground">Exclusive agent content</p>
          </div>
        </div>

        {/* Agent Subscribe Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowSubscription(true)}
            className="w-full sm:w-auto gradient-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all"
          >
            <Crown className="w-5 h-5" />
            Subscribe to Agent Plan
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7 gap-2 lg:gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[2/3] rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Agent content coming</h2>
            <p className="text-muted-foreground">Be among our agent of this week</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7 gap-2 lg:gap-3">
            {content.map((item) => (
              <MovieCard key={item.id} movie={item} contentType={item.type} forceAgentBorder agentPageMode />
            ))}
          </div>
        )}

        <SubscriptionModal
          open={showSubscription}
          onOpenChange={setShowSubscription}
          agentOnly
        />
      </div>
    </MainLayout>
  );
}
