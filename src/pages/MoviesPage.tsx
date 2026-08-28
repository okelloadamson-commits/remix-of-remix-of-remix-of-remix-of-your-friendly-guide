import { MainLayout } from "@/components/layout/MainLayout";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { getMovies, type Movie, isMovieInAgentMode } from "@/lib/firebase-db";
import { useState, useEffect } from "react";
import { PageLoader } from "@/components/PageLoader";
import { Link } from "react-router-dom";

const GENRES = [
  "Indian", "Action", "Sci-Fi", "Nigerian", "Horror", "Animation",
  "Comedy", "Romance", "Cartoon", "War", "Kung Fu", "Musical", "Fantasy",
  "Christian", "Magic", "Ghana", "Historical", "Drama"
];

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMovies() {
      try {
        const fetchedMovies = await getMovies();
        setMovies(fetchedMovies.filter(m => !isMovieInAgentMode(m)));
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, []);

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-3">Movies</h1>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((genre) => (
              <Link
                key={genre}
                to={`/genres/${genre.toLowerCase()}`}
                className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-transparent hover:bg-primary/10 text-white font-bold border border-primary/30 transition-colors whitespace-nowrap"
              >
                {genre}
              </Link>
            ))}
          </div>
        </div>
        
        {loading ? (
          <PageLoader label="MOVIES" />
        ) : movies.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No movies available yet. Check back soon!</p>
        ) : (
          <MovieGrid items={movies} contentType="movie" />
        )}
      </div>
    </MainLayout>
  );
}
