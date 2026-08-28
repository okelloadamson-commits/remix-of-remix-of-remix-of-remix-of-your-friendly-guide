import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getHeroImages, type HeroImage } from "@/lib/firebase-db";
import { createHeroImage, updateHeroImage, deleteHeroImage } from "@/lib/admin-db";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminHeroSlides() {
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHero, setEditingHero] = useState<HeroImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subtitle: "",
    badgeText: "",
    imageUrl: "",
    linkUrl: "",
  });

  useEffect(() => {
    loadHeroImages();
  }, []);

  const loadHeroImages = async () => {
    setIsLoading(true);
    const data = await getHeroImages();
    setHeroImages(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", subtitle: "", badgeText: "", imageUrl: "", linkUrl: "" });
    setEditingHero(null);
  };

  const handleEdit = (hero: HeroImage) => {
    setEditingHero(hero);
    setFormData({
      title: hero.title,
      description: hero.description,
      subtitle: hero.subtitle || "",
      badgeText: hero.badgeText || "",
      imageUrl: hero.imageUrl,
      linkUrl: hero.linkUrl || "",
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `hero-slides/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, fileName);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      setFormData((prev) => ({ ...prev, imageUrl: downloadUrl }));
      toast({ title: "Image uploaded successfully!" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHero?.id) {
        await updateHeroImage(editingHero.id, formData);
        toast({ title: "Hero slide updated!" });
      } else {
        await createHeroImage({ ...formData, createdAt: Date.now() });
        toast({ title: "Hero slide created!" });
      }
      setDialogOpen(false);
      resetForm();
      loadHeroImages();
    } catch (error) {
      toast({ title: "Error saving hero slide", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this hero slide?")) {
      try {
        await deleteHeroImage(id);
        toast({ title: "Hero slide deleted!" });
        loadHeroImages();
      } catch (error) {
        toast({ title: "Error deleting hero slide", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hero Slides</h1>
          <p className="text-muted-foreground">Manage homepage hero banner slides</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Hero Slide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingHero ? "Edit Hero Slide" : "Add New Hero Slide"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Displayed below the title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badgeText">Badge Text</Label>
                <Input
                  id="badgeText"
                  value={formData.badgeText}
                  onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                  placeholder="e.g. NEW, TRENDING, EXCLUSIVE"
                />
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

              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="Paste URL or upload below"
                    required
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" />Upload Image</>
                  )}
                </Button>
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded mt-2" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkUrl">Link URL (optional)</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {editingHero ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : heroImages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">No hero slides found</TableCell>
                </TableRow>
              ) : (
                heroImages.map((hero) => (
                  <TableRow key={hero.id}>
                    <TableCell>
                      <img src={hero.imageUrl} alt={hero.title} className="w-32 h-20 object-cover rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{hero.title}</div>
                      {hero.subtitle && <div className="text-xs text-muted-foreground">{hero.subtitle}</div>}
                    </TableCell>
                    <TableCell>
                      {hero.badgeText && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">{hero.badgeText}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{hero.description}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(hero)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(hero.id!)}>
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
