import { MovieCard } from "@/components/movies/MovieCard";
import type { Movie, Series, ContentItem } from "@/lib/firebase-db";

interface MovieGridProps {
  items: (Movie | Series | ContentItem)[];
  contentType?: "movie" | "series";
  columns?: string;
}

export function MovieGrid({ items, contentType, columns }: MovieGridProps) {
  const gridCols = columns || "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7";

  return (
    <div className={`grid ${gridCols} gap-2 lg:gap-3`}>
      {items.map((item, index) => {
        const type = contentType || (item as ContentItem).type || "movie";
        return (
          <div key={item.id} className="relative pb-2">
            <MovieCard movie={item} contentType={type} />
            {/* Vertical rainbow line on the right */}
            <div
              className="absolute top-2 bottom-4 -right-[5px] lg:-right-[7px] w-[2px] rounded-full z-10"
              style={{ backgroundImage: 'linear-gradient(180deg, transparent, #ff0000, #ff8000, #ffff00, #00ff00, #00bfff, #8000ff, #ff00ff, transparent)' }}
            />
            {/* Horizontal rainbow line on the bottom */}
            <div
              className="absolute -bottom-[1px] lg:-bottom-[2px] left-2 right-2 h-[2px] rounded-full z-10"
              style={{ backgroundImage: 'linear-gradient(90deg, transparent, #ff0000, #ff8000, #ffff00, #00ff00, #00bfff, #8000ff, #ff00ff, transparent)' }}
            />
          </div>
        );
      })}
    </div>
  );
}
