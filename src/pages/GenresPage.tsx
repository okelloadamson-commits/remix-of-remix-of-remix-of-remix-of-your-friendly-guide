import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

const GENRES = [
  "Indian", "Action", "Sci-Fi", "Nollywood", "Nigerian", "Horror", "Animation",
  "Comedy", "Romance", "Cartoon", "War", "Kung Fu", "Musical", "Fantasy",
  "Christian", "Magic", "Ghana", "Historical", "Drama", "Luo Champion"
];

export default function GenresPage() {
  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <h1 className="text-2xl font-bold mb-6">Explore Genres</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {GENRES.map((genre) => (
            <Link key={genre} to={genre === "Luo Champion" ? "/luo-champion" : `/genres/${genre.toLowerCase()}`}>
              <Card className="hover:bg-primary/5 transition-colors border-primary/20 hover:border-primary/50 cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{genre}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}