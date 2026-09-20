import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSeries, type Series } from "@/lib/firebase-db";
import { createSeries, updateSeries, deleteSeries } from "@/lib/admin-db";

const CATEGORIES = ["trending", "popular"];
const GENRES = ["Indian", "Action", "Sci-Fi", "Nigerian", "Horror", "Animation", "Comedy", "Romance", "Cartoon", "War", "Kung Fu", "Musical", "Fantasy", "Christian", "Magic", "Ghana", "Historical", "Drama"];

export default function AdminSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    posterUrl: "",
    trailerUrl: "",
    rating: 0,
    genre: "",
    releaseYear: new Date().getFullYear(),
    seasons: "1",
    displayCategories: [] as string[],
    isFeatured: false,
    isLuoChampion: false,
    vjName: "",
  });

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    setIsLoading(true);
    const data = await getSeries();
    setSeries(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      posterUrl: "",
      trailerUrl: "",
      rating: 0,
      genre: "",
      releaseYear: new Date().getFullYear(),
      seasons: "1",
      displayCategories: [],
      isFeatured: false,
      isLuoChampion: false,
      vjName: "",
    });
    setEditingSeries(null);
  };

  const handleEdit = (item: Series) => {
    setEditingSeries(item);
    setFormData({
      title: item.title,
      description: item.description,
      posterUrl: item.posterUrl,
      trailerUrl: item.trailerUrl || "",
      rating: item.rating,
      genre: item.genre,
      releaseYear: item.releaseYear,
      seasons: item.seasonLabel || String(item.seasons),
      displayCategories: item.displayCategories || [],
      isFeatured: item.isFeatured,
      isLuoChampion: item.isLuoChampion || false,
      vjName: item.vjName || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const seasonLabel = formData.seasons.includes(",")
        ? formData.seasons.split(",").map(s => `S${s.trim()}`).join(",")
        : `S${formData.seasons.trim()}`;
      const seasonsNum = parseInt(formData.seasons.split(",")[0].trim()) || 1;
      const saveData = { ...formData, seasons: seasonsNum, seasonLabel };

      if (editingSeries?.id) {
        await updateSeries(editingSeries.id, saveData);
        toast({ title: "Series updated successfully!" });
      } else {
        await createSeries({ ...saveData, createdAt: Date.now(), views: 0 });
        toast({ title: "Series created successfully!" });
      }
      setDialogOpen(false);
      resetForm();
      loadSeries();
    } catch (error) {
      toast({ title: "Error saving series", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this series?")) {
      try {
        await deleteSeries(id);
        toast({ title: "Series deleted successfully!" });
        loadSeries();
      } catch (error) {
        toast({ title: "Error deleting series", variant: "destructive" });
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

  const filteredSeries = series.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">TV Series</h1>
          <p className="text-muted-foreground">Manage your TV series library</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Series
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSeries ? "Edit Series" : "Add New Series"}</DialogTitle>
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
                  <Label htmlFor="trailerUrl">Trailer URL (optional)</Label>
                  <Input
                    id="trailerUrl"
                    type="url"
                    value={formData.trailerUrl}
                    onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="seasons">Seasons (e.g. 1,2,3)</Label>
                  <Input
                    id="seasons"
                    type="text"
                    placeholder="1,2,3"
                    value={formData.seasons}
                    onChange={(e) => setFormData({ ...formData, seasons: e.target.value })}
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

              <div className="space-y-2">
                <Label htmlFor="vjName">VJ Name (optional)</Label>
                <Input
                  id="vjName"
                  value={formData.vjName}
                  onChange={(e) => setFormData({ ...formData, vjName: e.target.value })}
                  placeholder="e.g. VJ Adamson"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                  />
                  <Label htmlFor="isFeatured">Featured Series</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSeries ? "Update Series" : "Create Series"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search series..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poster</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Seasons</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredSeries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">No series found</TableCell>
                </TableRow>
              ) : (
                filteredSeries.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <img src={item.posterUrl} alt={item.title} className="w-12 h-16 object-cover rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.genre}</TableCell>
                    <TableCell>{item.rating}</TableCell>
                    <TableCell>{item.seasonLabel || `S${item.seasons}`}</TableCell>
                    <TableCell>
                      {item.isFeatured ? <span className="text-green-500">Yes</span> : <span className="text-muted-foreground">No</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id!)}>
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
