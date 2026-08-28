import { database, legacyDatabase } from "./firebase";
import { ref, get, update, type Database } from "firebase/database";

// Read a node from BOTH the new and legacy Firebase RTDB and return a
// merged map keyed by id. New-database entries win on id collisions.
// Legacy is kept ONLY so previously-uploaded movies/series/episodes/etc.
// continue to display while all new writes go to the new project.
async function readMerged(path: string): Promise<Record<string, any>> {
  const dbs: Database[] = [database, legacyDatabase];
  const snaps = await Promise.all(
    dbs.map((d) => get(ref(d, path)).catch(() => null)),
  );
  const merged: Record<string, any> = {};
  // Legacy first, then new overwrites — so new project always wins
  const [newSnap, legacySnap] = snaps;
  if (legacySnap && legacySnap.exists()) {
    legacySnap.forEach((child) => {
      if (child.key) merged[child.key] = child.val();
    });
  }
  if (newSnap && newSnap.exists()) {
    newSnap.forEach((child) => {
      if (child.key) merged[child.key] = child.val();
    });
  }
  return merged;
}

// Read a single child from new DB first, fall back to legacy DB.
async function readOne(path: string): Promise<any | null> {
  const newSnap = await get(ref(database, path)).catch(() => null);
  if (newSnap && newSnap.exists()) return newSnap.val();
  const legacySnap = await get(ref(legacyDatabase, path)).catch(() => null);
  if (legacySnap && legacySnap.exists()) return legacySnap.val();
  return null;
}

async function readMergedList<T>(path: string, limit?: number): Promise<T[]> {
  const merged = await readMerged(path);
  const list = Object.entries(merged).map(([id, v]) => ({ id, ...(v as any) }) as T);
  list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  return limit ? list.slice(0, limit) : list;
}

// Movie types
export interface Movie {
  id?: string;
  title: string;
  description: string;
  posterUrl: string;
  videoUrl: string;
  trailerUrl?: string;
  rating: number;
  duration: number;
  genre: string;
  releaseYear: number;
  displayCategories: string[];
  isFeatured: boolean;
  isAgent?: boolean;
  agentMarkedAt?: number;
  isLuoChampion?: boolean;
  vjName?: string;
  createdAt: number;
  views?: number;
}

// Comedy content — separate collection from Movies with its own subscription plan
export interface Comedy {
  id?: string;
  title: string;
  description: string;
  posterUrl: string;
  videoUrl: string;
  trailerUrl?: string;
  rating: number;
  duration: number;
  releaseYear: number;
  vjName?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  createdAt: number;
  views?: number;
}

export interface Series {
  id?: string;
  title: string;
  description: string;
  posterUrl: string;
  trailerUrl?: string;
  rating: number;
  genre: string;
  releaseYear: number;
  seasons: number;
  displayCategories: string[];
  isFeatured: boolean;
  isLuoChampion?: boolean;
  vjName?: string;
  createdAt: number;
  views?: number;
  hasAgentEpisode?: boolean;
  seasonLabel?: string;
}

export interface Episode {
  id?: string;
  seriesId: string;
  seasonNumber: number;
  seasonLabel?: string;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  isAgent?: boolean;
  isTrending?: boolean;
  createdAt: number;
}

export interface Advert {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  createdAt: number;
}

export interface HeroImage {
  id?: string;
  title: string;
  description: string;
  subtitle?: string;
  badgeText?: string;
  imageUrl: string;
  linkUrl?: string;
  createdAt: number;
}

export interface App {
  id?: string;
  name: string;
  description: string;
  iconUrl: string;
  downloadUrl: string;
  category: string;
  version: string;
  size: string;
  rating: number;
  downloads: number;
  platform: string;
  isActive?: boolean;
  createdAt: number;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatar?: string;
  subscription?: {
    plan: string;
    expiresAt: Date;
    isActive: boolean;
  };
  createdAt?: Date;
  lastActive?: Date;
  watchTime?: number;
}

// Combined content type for mixed content lists
export type ContentItem = (Movie | Series) & { 
  type: 'movie' | 'series';
  episodeInfo?: { seasonNumber: number; episodeNumber: number; episodeTitle: string; episodeId: string; episodeThumbnailUrl?: string; seasonLabel?: string };
};

// Check if a movie is currently in agent mode (within 2 days of being marked)
const AGENT_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
export function isMovieInAgentMode(movie: Movie): boolean {
  if (!movie.isAgent || !movie.agentMarkedAt) return false;
  return Date.now() - movie.agentMarkedAt < AGENT_DURATION_MS;
}

// Movies
export async function getMovies(limit?: number): Promise<Movie[]> {
  return readMergedList<Movie>("movies", limit);
}

export async function getMovie(id: string): Promise<Movie | null> {
  const val = await readOne(`movies/${id}`);
  return val ? ({ id, ...val } as Movie) : null;
}

export async function getMoviesByCategory(category: string, limit?: number): Promise<Movie[]> {
  const movies = await getMovies();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Filter out agent movies from homepage categories
  const filtered = movies.filter((movie) => {
    // Exclude agent movies from all homepage categories
    if (isMovieInAgentMode(movie)) return false;
    
    if (category === "recently-added") {
      return movie.createdAt > oneWeekAgo;
    }
    return movie.displayCategories?.includes(category);
  });

  return limit ? filtered.slice(0, limit) : filtered;
}

export async function getRelatedMovies(movieId: string, genre: string, limit = 6): Promise<Movie[]> {
  const movies = await getMovies();
  const related = movies.filter((movie) => movie.id !== movieId && movie.genre.toLowerCase() === genre.toLowerCase());
  related.sort((a, b) => b.rating - a.rating);
  return related.slice(0, limit);
}

// Series
export async function getSeries(limit?: number): Promise<Series[]> {
  const [series, episodesMap] = await Promise.all([
    readMergedList<Series>("series"),
    readMerged("episodes"),
  ]);

  const agentSeriesIds = new Set<string>();
  for (const ep of Object.values(episodesMap)) {
    if ((ep as any).isAgent && (ep as any).seriesId) {
      agentSeriesIds.add((ep as any).seriesId);
    }
  }

  for (const s of series) {
    s.hasAgentEpisode = agentSeriesIds.has(s.id!);
  }

  return limit ? series.slice(0, limit) : series;
}

export async function getSeriesById(id: string): Promise<Series | null> {
  const val = await readOne(`series/${id}`);
  return val ? ({ id, ...val } as Series) : null;
}

export async function getSeriesByCategory(category: string, limit?: number): Promise<Series[]> {
  const series = await getSeries();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filtered = series.filter((item) => {
    if (item.hasAgentEpisode) return false;

    if (category === "recently-added") {
      return item.createdAt > oneWeekAgo;
    }
    return item.displayCategories?.includes(category);
  });

  return limit ? filtered.slice(0, limit) : filtered;
}

export async function getRelatedSeries(seriesId: string, genre: string, limit = 6): Promise<Series[]> {
  const series = await getSeries();
  const related = series.filter((item) => item.id !== seriesId && item.genre.toLowerCase() === genre.toLowerCase());
  related.sort((a, b) => b.rating - a.rating);
  return related.slice(0, limit);
}

// Episodes
export async function getEpisodesBySeriesId(seriesId: string): Promise<Episode[]> {
  const merged = await readMerged("episodes");
  const episodes: Episode[] = Object.entries(merged)
    .map(([id, v]) => ({ id, ...(v as any) }) as Episode)
    .filter((ep) => ep.seriesId === seriesId);
  return episodes.sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) {
      return a.seasonNumber - b.seasonNumber;
    }
    return a.episodeNumber - b.episodeNumber;
  });
}

export async function getEpisodeById(episodeId: string): Promise<Episode | null> {
  const val = await readOne(`episodes/${episodeId}`);
  return val ? ({ id: episodeId, ...val } as Episode) : null;
}

// Adverts
export async function getAdverts(limit?: number): Promise<Advert[]> {
  return readMergedList<Advert>("adverts", limit);
}

// Hero Images
export async function getHeroImages(limit?: number): Promise<HeroImage[]> {
  return readMergedList<HeroImage>("heroImages", limit);
}

// Apps
export async function getApps(limit?: number): Promise<App[]> {
  return readMergedList<App>("apps", limit);
}

// Comedies
export async function getComedies(limit?: number): Promise<Comedy[]> {
  return readMergedList<Comedy>("comedies", limit);
}

export async function getComedyById(id: string): Promise<Comedy | null> {
  const val = await readOne(`comedies/${id}`);
  return val ? ({ id, ...val } as Comedy) : null;
}

export async function getRelatedComedies(comedyId: string, limit = 6): Promise<Comedy[]> {
  const comedies = await getComedies();
  return comedies.filter((c) => c.id !== comedyId).slice(0, limit);
}



// Featured content
export async function getFeaturedContent(limit?: number): Promise<ContentItem[]> {
  const [movies, series] = await Promise.all([getMovies(), getSeries()]);
  
  const featuredMovies = movies.filter((movie) => movie.isFeatured).map(m => ({ ...m, type: 'movie' as const }));
  const featuredSeries = series.filter((item) => item.isFeatured).map(s => ({ ...s, type: 'series' as const }));
  
  const allFeatured = [...featuredMovies, ...featuredSeries].sort((a, b) => b.createdAt - a.createdAt);
  
  return limit ? allFeatured.slice(0, limit) : allFeatured;
}

// Recently added content
export async function getRecentlyAdded(limit?: number): Promise<ContentItem[]> {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [movies, series] = await Promise.all([getMovies(), getSeries()]);
  
  const recentMovies = movies.filter((m) => m.createdAt >= oneWeekAgo).map(m => ({ ...m, type: 'movie' as const }));
  const recentSeries = series.filter((s) => s.createdAt >= oneWeekAgo).map(s => ({ ...s, type: 'series' as const }));
  
  const recentContent = [...recentMovies, ...recentSeries];
  recentContent.sort((a, b) => b.createdAt - a.createdAt);
  
  return limit ? recentContent.slice(0, limit) : recentContent;
}

// Popular content (by views and rating)
export async function getPopularContent(limit = 20): Promise<ContentItem[]> {
  const [movies, series] = await Promise.all([getMovies(), getSeries()]);
  
  const allContent: ContentItem[] = [
    ...movies.map(m => ({ ...m, type: 'movie' as const })),
    ...series.map(s => ({ ...s, type: 'series' as const }))
  ];
  
  allContent.sort((a, b) => {
    const viewsA = a.views || 0;
    const viewsB = b.views || 0;
    if (viewsB !== viewsA) {
      return viewsB - viewsA;
    }
    return b.rating - a.rating;
  });
  
  return limit ? allContent.slice(0, limit) : allContent;
}

// Get content by category (mixed movies and series)
export async function getContentByCategory(category: string, limit?: number): Promise<ContentItem[]> {
  const [movies, seriesList] = await Promise.all([
    getMoviesByCategory(category, limit),
    getSeriesByCategory(category, limit)
  ]);
  
  let content: ContentItem[] = [
    ...movies.map(m => ({ ...m, type: 'movie' as const })),
    ...seriesList.map(s => ({ ...s, type: 'series' as const }))
  ];
  
  // For all categories, include individual episodes as separate cards with S/E badges
  const allEpisodes = await getAllEpisodesFromDb();
  const allSeriesData = await getSeries();
  const seriesMap = new Map(allSeriesData.map(s => [s.id!, s]));
  
  // Filter episodes relevant to this category
  const relevantEpisodes = allEpisodes.filter(ep => {
    if (ep.isAgent) return false; // exclude agent episodes from normal categories
    if (category === "trending") return ep.isTrending;
    if (category === "recently-added") {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return ep.createdAt > oneWeekAgo;
    }
    return false;
  });
  
  // Add each episode as a card using its parent series poster
  for (const ep of relevantEpisodes) {
    const parentSeries = seriesMap.get(ep.seriesId);
    if (!parentSeries) continue;
    
    // Create a content item based on the parent series but with episode info
    const episodeCard: ContentItem = {
      ...parentSeries,
      type: 'series' as const,
      createdAt: ep.createdAt, // use episode creation time for sorting
      episodeInfo: {
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        episodeTitle: ep.title,
        episodeId: ep.id!,
        episodeThumbnailUrl: ep.thumbnailUrl,
        seasonLabel: ep.seasonLabel,
      },
    };
    content.push(episodeCard);
  }
  
  // Remove duplicate series entries that are already represented by episodes
  if (relevantEpisodes.length > 0) {
    const seriesWithEpisodes = new Set(relevantEpisodes.map(ep => ep.seriesId));
    content = content.filter(c => {
      // Keep if it's not a series, or if it has episodeInfo, or if it doesn't have episode cards
      if (c.type !== 'series') return true;
      if (c.episodeInfo) return true;
      return !seriesWithEpisodes.has(c.id!);
    });
  }
  
  // Include Luo Champion uploads marked as trending
  if (category === "trending") {
    const comedies = await getComedies();
    for (const c of comedies) {
      if (c.isTrending) content.push(comedyToContentItem(c));
    }
  }

  // Sort: newest first
  content.sort((a, b) => b.createdAt - a.createdAt);
  
  return limit ? content.slice(0, limit) : content;
}

// Map a Comedy (Luo Champion) record into a ContentItem so it can render in
// shared grids. The isComedyItem marker routes clicks to the Luo Champion player.
export function comedyToContentItem(c: Comedy): ContentItem {
  return {
    ...(c as any),
    genre: "Luo Champion",
    displayCategories: [],
    isFeatured: !!c.isFeatured,
    type: "movie" as const,
    isComedyItem: true,
  } as ContentItem;
}

// Helper to get all episodes from database (merged from new + legacy)
async function getAllEpisodesFromDb(): Promise<Episode[]> {
  const merged = await readMerged("episodes");
  return Object.entries(merged).map(([id, v]) => ({ id, ...(v as any) }) as Episode);
}

// Trending content (high rating + recent)
export async function getTrendingContent(limit = 20): Promise<ContentItem[]> {
  const [movies, series, comedies] = await Promise.all([getMovies(), getSeries(), getComedies()]);

  const allContent: ContentItem[] = [
    ...movies.map(m => ({ ...m, type: 'movie' as const })),
    ...series.map(s => ({ ...s, type: 'series' as const })),
    ...comedies.filter(c => c.isTrending).map(c => comedyToContentItem(c)),
  ];

  // Sort by rating first, then by recency
  allContent.sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return b.createdAt - a.createdAt;
  });

  return limit ? allContent.slice(0, limit) : allContent;
}

// Increment view count — try the new DB first, fall back to legacy
export async function incrementContentViews(contentId: string, contentType: "movie" | "series"): Promise<void> {
  try {
    const path = `${contentType === "movie" ? "movies" : "series"}/${contentId}`;
    for (const d of [database, legacyDatabase]) {
      const r = ref(d, path);
      const snap = await get(r);
      if (snap.exists()) {
        const currentViews = snap.val().views || 0;
        await update(r, { views: currentViews + 1 }).catch(() => undefined);
        return;
      }
    }
  } catch (error) {
    console.error("Error incrementing views:", error);
  }
}


// Search content
export async function searchContent(searchQuery: string) {
  try {
    const queryLower = searchQuery.toLowerCase().trim();
    if (!queryLower) return { movies: [], series: [], adverts: [] };

    const [movies, series, adverts] = await Promise.all([getMovies(), getSeries(), getAdverts()]);

    const matchedMovies = movies.filter(
      (movie) =>
        movie.title.toLowerCase().includes(queryLower) ||
        movie.description.toLowerCase().includes(queryLower) ||
        movie.genre.toLowerCase().includes(queryLower)
    );

    const matchedSeries = series.filter(
      (item) =>
        item.title.toLowerCase().includes(queryLower) ||
        item.description.toLowerCase().includes(queryLower) ||
        item.genre.toLowerCase().includes(queryLower)
    );

    const matchedAdverts = adverts.filter(
      (advert) => 
        advert.title.toLowerCase().includes(queryLower) || 
        advert.description.toLowerCase().includes(queryLower)
    );

    return {
      movies: matchedMovies,
      series: matchedSeries,
      adverts: matchedAdverts,
    };
  } catch (error) {
    console.error("Error searching content:", error);
    return { movies: [], series: [], adverts: [] };
  }
}
