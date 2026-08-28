import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSeries, type Series, type Episode } from "@/lib/firebase-db";
import { createEpisode, updateEpisode, deleteEpisode, getAllEpisodes } from "@/lib/admin-db";

export default function AdminEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeriesId, setFilterSeriesId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    seriesId: "",
    seasonNumber: "1",
    episodeNumber: 1,
    title: "",
    description: "",
    thumbnailUrl: "",
    videoUrl: "",
    duration: 0,
    isAgent: false,
    isTrending: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [seriesData, episodesData] = await Promise.all([getSeries(), getAllEpisodes()]);
    setSeries(seriesData);
    setEpisodes(episodesData);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      seriesId: "",
      seasonNumber: "1",
      episodeNumber: 1,
      title: "",
      description: "",
      thumbnailUrl: "",
      videoUrl: "",
      duration: 0,
      isAgent: false,
      isTrending: false,
    });
    setEditingEpisode(null);
  };

  const handleEdit = (episode: Episode) => {
    setEditingEpisode(episode);
    setFormData({
      seriesId: episode.seriesId,
      seasonNumber: episode.seasonLabel ? episode.seasonLabel.replace(/S/g, "").replace(/,/g, ",") : String(episode.seasonNumber),
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      description: episode.description,
      thumbnailUrl: episode.thumbnailUrl,
      videoUrl: episode.videoUrl,
      duration: episode.duration,
      isAgent: episode.isAgent || false,
      isTrending: episode.isTrending || false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const seasons = formData.seasonNumber.split(",").map(s => s.trim()).filter(Boolean);
      const firstSeason = parseInt(seasons[0]) || 1;
      const seasonLabel = seasons.length > 1 ? seasons.map(s => `S${s}`).join(",") : `S${seasons[0] || "1"}`;
      const { seasonNumber: _sn, ...rest } = formData;
      const submitData = { ...rest, seasonNumber: firstSeason, seasonLabel };
      if (editingEpisode?.id) {
        await updateEpisode(editingEpisode.id, submitData);
        toast({ title: "Episode updated successfully!" });
      } else {
        await createEpisode({ ...submitData, createdAt: Date.now() });
        toast({ title: "Episode created successfully!" });
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({ title: "Error saving episode", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this episode?")) {
      try {
        await deleteEpisode(id);
        toast({ title: "Episode deleted successfully!" });
        loadData();
      } catch (error) {
        toast({ title: "Error deleting episode", variant: "destructive" });
      }
    }
  };

  const getSeriesTitle = (seriesId: string) => {
    const s = series.find((item) => item.id === seriesId);
    return s?.title || "Unknown Series";
  };

  const filteredEpisodes = episodes.filter((episode) => {
    const matchesSearch =
      episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSeriesTitle(episode.seriesId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeries = filterSeriesId === "all" || episode.seriesId === filterSeriesId;
    return matchesSearch && matchesSeries;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Episodes</h1>
          <p className="text-muted-foreground">Manage episodes for your TV series</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Episode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEpisode ? "Edit Episode" : "Add New Episode"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seriesId">Select Series</Label>
                <Select
                  value={formData.seriesId}
                  onValueChange={(value) => setFormData({ ...formData, seriesId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a series" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map((item) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seasonNumber">Season (e.g. 1 or 1,2,3)</Label>
                  <Input
                    id="seasonNumber"
                    type="text"
                    placeholder="e.g. 1 or 1,2,3"
                    value={formData.seasonNumber}
                    onChange={(e) => setFormData({ ...formData, seasonNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="episodeNumber">Episode Number</Label>
                  <Input
                    id="episodeNumber"
                    type="number"
                    min="1"
                    value={formData.episodeNumber}
                    onChange={(e) => setFormData({ ...formData, episodeNumber: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Episode Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                  <Input
                    id="thumbnailUrl"
                    type="url"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
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

              <div className="flex items-center space-x-4 py-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAgent"
                    checked={formData.isAgent}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAgent: checked === true })}
                  />
                  <Label htmlFor="isAgent" className="text-sm font-medium cursor-pointer">
                    Mark as Agent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isTrending"
                    checked={formData.isTrending}
                    onCheckedChange={(checked) => setFormData({ ...formData, isTrending: checked === true })}
                  />
                  <Label htmlFor="isTrending" className="text-sm font-medium cursor-pointer">
                    Mark as Trending
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEpisode ? "Update Episode" : "Create Episode"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search episodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterSeriesId} onValueChange={setFilterSeriesId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {series.map((item) => (
              <SelectItem key={item.id} value={item.id!}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thumbnail</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Episode</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredEpisodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">No episodes found</TableCell>
                </TableRow>
              ) : (
                filteredEpisodes.map((episode) => (
                  <TableRow key={episode.id}>
                    <TableCell>
                      <img src={episode.thumbnailUrl} alt={episode.title} className="w-16 h-10 object-cover rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{getSeriesTitle(episode.seriesId)}</TableCell>
                    <TableCell>{episode.seasonLabel || `S${episode.seasonNumber}`}</TableCell>
                    <TableCell>E{episode.episodeNumber}</TableCell>
                    <TableCell>{episode.title}</TableCell>
                    <TableCell>{episode.duration} min</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(episode)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(episode.id!)}>
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
