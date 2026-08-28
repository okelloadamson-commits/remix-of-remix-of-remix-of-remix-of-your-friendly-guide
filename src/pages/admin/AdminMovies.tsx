import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getMovies, type Movie } from "@/lib/firebase-db";
import { createMovie, updateMovie, deleteMovie } from "@/lib/admin-db";

const CATEGORIES = ["trending", "popular"];
const GENRES = ["Indian", "Action", "Sci-Fi", "Nigerian", "Horror", "Animation", "Comedy", "Romance", "Cartoon", "War", "Kung Fu", "Musical", "Fantasy", "Christian", "Magic", "Ghana", "Historical", "Drama"];

export default function AdminMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    posterUrl: "",
    videoUrl: "",
    trailerUrl: "",
    rating: 0,
    duration: 0,
    genre: "",
    releaseYear: new Date().getFullYear(),
    displayCategories: [] as string[],
    isFeatured: false,
    isAgent: false,
    isLuoChampion: false,
    vjName: "",
  });

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    setIsLoading(true);
    const data = await getMovies();
    setMovies(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      posterUrl: "",
      videoUrl: "",
      trailerUrl: "",
      rating: 0,
      duration: 0,
      genre: "",
      releaseYear: new Date().getFullYear(),
      displayCategories: [],
      isFeatured: false,
      isAgent: false,
      isLuoChampion: false,
      vjName: "",
    });
    setEditingMovie(null);
  };

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      description: movie.description,
      posterUrl: movie.posterUrl,
      videoUrl: movie.videoUrl,
      trailerUrl: movie.trailerUrl || "",
      rating: movie.rating,
      duration: movie.duration,
      genre: movie.genre,
      releaseYear: movie.releaseYear,
      displayCategories: movie.displayCategories || [],
      isFeatured: movie.isFeatured,
      isAgent: movie.isAgent || false,
      isLuoChampion: movie.isLuoChampion || false,
      vjName: movie.vjName || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave: any = {
        ...formData,
        ...(formData.isAgent
          ? { agentMarkedAt: editingMovie?.isAgent ? (editingMovie as any).agentMarkedAt || Date.now() : Date.now() }
          : { isAgent: false }),
      };
      // Firebase Realtime DB rejects undefined values — strip them
      Object.keys(dataToSave).forEach((k) => {
        if (dataToSave[k] === undefined) delete dataToSave[k];
      });
      if (editingMovie?.id) {
        await updateMovie(editingMovie.id, dataToSave);
        toast({ title: "Movie updated successfully!" });
      } else {
        const newId = await createMovie({ ...dataToSave, createdAt: Date.now(), views: 0 });
        toast({ title: "Movie created successfully!" });
      }
      setDialogOpen(false);
      resetForm();
      loadMovies();
    } catch (error: any) {
      console.error("Error saving movie:", error);
      toast({ title: "Error saving movie", description: error?.message || String(error), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this movie?")) {
      try {
        await deleteMovie(id);
        toast({ title: "Movie deleted successfully!" });
        loadMovies();
      } catch (error) {
        toast({ title: "Error deleting movie", variant: "destructive" });
      }
    }
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      displayCategories: prev.displayCategories.includes(category)
        ? prev.displayCategories.filter((c) => c !== category)
        : [...prev.displayCategories, category],
    }));
  };

  const filteredMovies = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Movies</h1>
          <p className="text-muted-foreground">Manage your movies library</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMovie ? "Edit Movie" : "Add New Movie"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => {
                      const isSelected = formData.genre.split(', ').includes(g);
                      return (
                        <Button
                          key={g}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            let current = formData.genre ? formData.genre.split(', ') : [];
                            if (isSelected) {
                              current = current.filter(c => c !== g);
                            } else {
                              current.push(g);
                            }
                            setFormData({ ...formData, genre: current.join(', ') });
                          }}
                        >
                          {g}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="posterUrl">Poster URL</Label>
                  <Input
                    id="posterUrl"
                    type="url"
                    value={formData.posterUrl}
                    onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trailerUrl">Trailer URL (optional)</Label>
                  <Input
                    id="trailerUrl"
                    type="url"
                    value={formData.trailerUrl}
                    onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vjName">VJ Name (optional)</Label>
                  <Input
                    id="vjName"
                    value={formData.vjName}
                    onChange={(e) => setFormData({ ...formData, vjName: e.target.value })}
                    placeholder="e.g. VJ Adamson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (0-10)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="releaseYear">Release Year</Label>
                  <Input
                    id="releaseYear"
                    type="number"
                    value={formData.releaseYear}
                    onChange={(e) => setFormData({ ...formData, releaseYear: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={formData.displayCategories.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                  />
                  <Label htmlFor="isFeatured">Featured Movie</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isAgent"
                    checked={formData.isAgent}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAgent: !!checked })}
                  />
                  <Label htmlFor="isAgent" className="text-orange-500 font-semibold">Agent Movie</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isLuoChampion"
                    checked={formData.isLuoChampion}
                    onCheckedChange={(checked) => setFormData({ ...formData, isLuoChampion: !!checked })}
                  />
                  <Label htmlFor="isLuoChampion" className="text-pink-500 font-semibold">Luo Champion</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMovie ? "Update Movie" : "Create Movie"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Movies Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poster</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredMovies.length === 0 ? (
                <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                    No movies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovies.map((movie) => (
                  <TableRow key={movie.id}>
                    <TableCell>
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{movie.title}</TableCell>
                    <TableCell>{movie.genre}</TableCell>
                    <TableCell>{movie.rating}</TableCell>
                    <TableCell>{movie.releaseYear}</TableCell>
                    <TableCell>
                      {movie.isFeatured ? (
                        <span className="text-green-500">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {movie.isAgent ? (
                        <span className="text-orange-500 font-semibold">Agent</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(movie)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(movie.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
