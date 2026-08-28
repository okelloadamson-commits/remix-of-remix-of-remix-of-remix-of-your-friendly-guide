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
import { getComedies, type Comedy } from "@/lib/firebase-db";
import { createComedy, updateComedy, deleteComedy } from "@/lib/admin-db";

export default function AdminComedies() {
  const [items, setItems] = useState<Comedy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Comedy | null>(null);
  const { toast } = useToast();

  const empty = {
    title: "",
    description: "",
    posterUrl: "",
    videoUrl: "",
    trailerUrl: "",
    rating: 0,
    duration: 0,
    releaseYear: new Date().getFullYear(),
    vjName: "",
    isFeatured: false,
    isTrending: false,
  };
  const [formData, setFormData] = useState(empty);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    setItems(await getComedies());
    setIsLoading(false);
  };

  const reset = () => {
    setFormData(empty);
    setEditing(null);
  };

  const handleEdit = (c: Comedy) => {
    setEditing(c);
    setFormData({
      title: c.title,
      description: c.description,
      posterUrl: c.posterUrl,
      videoUrl: c.videoUrl,
      trailerUrl: c.trailerUrl || "",
      rating: c.rating,
      duration: c.duration,
      releaseYear: c.releaseYear,
      vjName: c.vjName || "",
      isFeatured: !!c.isFeatured,
      isTrending: !!c.isTrending,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = { ...formData };
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
      if (editing?.id) {
        await updateComedy(editing.id, data);
        toast({ title: "Luo Champion updated" });
      } else {
        await createComedy({ ...data, createdAt: Date.now(), views: 0 });
        toast({ title: "Luo Champion created" });
      }
      setDialogOpen(false);
      reset();
      load();
    } catch (err: any) {
      toast({ title: "Error saving Luo Champion", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Luo Champion?")) return;
    await deleteComedy(id);
    toast({ title: "Luo Champion deleted" });
    load();
  };

  const filtered = items.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Luo Champion</h1>
          <p className="text-muted-foreground">Manage Luo Champion uploads</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Luo Champion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Luo Champion" : "Add New Luo Champion"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Poster URL</Label>
                  <Input type="url" value={formData.posterUrl} onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input type="url" value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trailer URL (optional)</Label>
                  <Input type="url" value={formData.trailerUrl} onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>VJ Name (optional)</Label>
                  <Input value={formData.vjName} onChange={(e) => setFormData({ ...formData, vjName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <Input type="number" min="0" max="10" step="0.1" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input type="number" value={formData.releaseYear} onChange={(e) => setFormData({ ...formData, releaseYear: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.isFeatured} onCheckedChange={(v) => setFormData({ ...formData, isFeatured: v })} />
                  <Label>Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.isTrending} onCheckedChange={(v) => setFormData({ ...formData, isTrending: v })} />
                  <Label>Trending</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                <Button type="submit">{editing ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search Luo Champion..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poster</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>VJ</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">No Luo Champion uploaded yet</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><img src={c.posterUrl} alt={c.title} className="w-12 h-16 object-cover rounded" /></TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.rating}</TableCell>
                    <TableCell>{c.releaseYear}</TableCell>
                    <TableCell>{c.vjName || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id!)}><Trash2 className="w-4 h-4" /></Button>
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
