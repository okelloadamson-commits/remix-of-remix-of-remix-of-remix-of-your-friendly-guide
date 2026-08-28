import { MovieGrid } from "@/components/movies/MovieGrid";
import { getContentByCategory, type ContentItem } from "@/lib/firebase-db";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { SlingshotTitle } from "@/components/home/SlingshotTitle";

const GENRES = [
  "Indian", "Action", "Sci-Fi", "Nigerian", "Horror", "Animation",
  "Comedy", "Romance", "Cartoon", "War", "Kung Fu", "Musical", "Fantasy",
  "Christian", "Magic", "Ghana", "Historical", "Drama", "Luo Champion"
];

interface ContentSectionProps {
  title: string;
  category?: string;
  showGenres?: boolean;
}

export function ContentSection({ title, category = "trending", showGenres = false }: ContentSectionProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const fetchedContent = await getContentByCategory(category);
        setContent(fetchedContent);
      } catch (error) {
        console.error(`Error fetching ${category} content:`, error);
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [category]);

  const renderHeader = () => (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <h2 className="text-xl lg:text-2xl font-bold">
        {showGenres ? <SlingshotTitle text={title} /> : title}
      </h2>
      {showGenres && (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 text-xl lg:text-2xl font-bold text-foreground hover:text-primary transition-colors">
            <LayoutGrid className="w-5 h-5 lg:w-6 lg:h-6" />
            <span>Genres</span>
            <ChevronDown className="w-5 h-5 lg:w-6 lg:h-6" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto rounded-2xl border-[#3a1f10]/60 p-2 bg-[linear-gradient(135deg,#1a0f08_0%,#3a1f10_50%,#0a0604_100%)] backdrop-blur-md shadow-xl">
            {GENRES.map((genre) => (
              <DropdownMenuItem key={genre} asChild className="rounded-xl my-0.5 font-bold text-white focus:bg-white/10 focus:text-white">
                <Link to={genre === "Luo Champion" ? "/luo-champion" : `/genres/${genre.toLowerCase()}`} className="font-bold text-white hover:text-white">{genre}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  if (loading) {
    return (
      <section>
        {renderHeader()}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7 gap-2 lg:gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (content.length === 0) {
    return showGenres ? (
      <section>{renderHeader()}</section>
    ) : null;
  }

  return (
    <section>
      {renderHeader()}
      <MovieGrid items={content} />
    </section>
  );
}
