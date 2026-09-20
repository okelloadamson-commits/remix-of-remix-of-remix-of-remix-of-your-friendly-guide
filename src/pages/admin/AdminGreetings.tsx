import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, RefreshCw, Trash2, MapPin, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGreetingAdverts, deleteGreetingAdvert, type GreetingAdvert } from "@/lib/greetings-db";

export default function AdminGreetings() {
  const [items, setItems] = useState<GreetingAdvert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setItems(await getGreetingAdverts());
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to load greetings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deleteGreetingAdvert(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Greeting deleted" });
    } catch (error) {
      console.error(error);
      toast({ title: "Could not delete greeting", variant: "destructive" });
    }
  };

  const [clearing, setClearing] = useState(false);
  const handleClearAll = async () => {
    if (items.length === 0) return;
    if (!window.confirm(`Delete all ${items.length} greetings? This cannot be undone.`)) return;
    setClearing(true);
    try {
      await Promise.all(items.map((g) => (g.id ? deleteGreetingAdvert(g.id) : Promise.resolve())));
      setItems([]);
      toast({ title: "All greetings cleared" });
    } catch (error) {
      console.error(error);
      toast({ title: "Could not clear all greetings", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = term
    ? items.filter((i) =>
        [i.senderName, i.location, i.phoneNumber, i.userName, i.userEmail, ...i.greetingNames]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : items;

  const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Greetings</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} paid greeting{items.length === 1 ? "" : "s"} • UGX {total.toLocaleString()} collected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="destructive" onClick={handleClearAll} disabled={clearing || loading || items.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            {clearing ? "Clearing..." : "Clear all"}
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by name, location, phone or greeted person..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-14 h-14 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No greetings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <Card key={g.id} className="bg-[#0d1e36] border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{g.senderName || g.userName}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{g.location || "—"}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{g.phoneNumber || "—"}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{g.userEmail || "—"}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-green-500">UGX {(g.amount || 0).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{g.createdAt.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">People greeted</p>
                  <div className="flex flex-wrap gap-2">
                    {g.greetingNames.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      g.greetingNames.map((n, i) => (
                        <span key={i} className="text-sm px-2 py-1 rounded-md bg-amber-500/15 text-amber-400">
                          {n}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {g.orderId} {g.confirmationCode ? `• ${g.confirmationCode}` : ""}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
