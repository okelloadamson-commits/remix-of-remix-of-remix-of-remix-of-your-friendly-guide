import { useEffect, useState } from "react";
import {
  getUserTransactions,
  deleteUserTransaction,
  UserTransaction,
} from "@/lib/admin-db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Trash2, CheckCircle, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";

function formatTime(d: Date) {
  return d instanceof Date && !isNaN(d.getTime()) ? d.toLocaleString() : "—";
}

export default function AdminUserTransactions() {
  const [items, setItems] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setItems(await getUserTransactions());
    } catch (e) {
      console.error(e);
      toast.error("Failed to load user transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.userName.toLowerCase().includes(q) ||
      t.userEmail.toLowerCase().includes(q) ||
      t.phoneNumber.toLowerCase().includes(q) ||
      t.planName.toLowerCase().includes(q) ||
      t.orderId.toLowerCase().includes(q) ||
      (t.confirmationCode || "").toLowerCase().includes(q)
    );
  });

  const total = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Transactions</h2>
          <p className="text-sm text-muted-foreground">
            Successful payments only — name, phone, email and payment details
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-[#0d1e36] border-border/50"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {items.length} transactions • Total KES {total.toLocaleString()}
      </div>

      <div className="space-y-2">
        {!loading && filtered.length === 0 && (
          <Card className="bg-[#0d1e36] border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              No successful transactions recorded yet.
            </CardContent>
          </Card>
        )}

        {filtered.map((t) => (
          <Card key={t.id} className="bg-[#0d1e36] border-border/50">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> {t.userName}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {t.userEmail || "—"}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {t.phoneNumber || "—"}
                  </span>
                </div>
                <p className="text-sm mt-1">
                  <span className="text-primary font-medium">{t.planName}</span> — KES{" "}
                  {t.amount?.toLocaleString()}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>Order: {t.orderId}</span>
                  <span>•</span>
                  <span>Code: {t.confirmationCode || "—"}</span>
                  <span>•</span>
                  <span>{formatTime(t.createdAt)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm("Delete this transaction record?")) return;
                  await deleteUserTransaction(t.id!);
                  setItems((prev) => prev.filter((x) => x.id !== t.id));
                  toast.success("Transaction deleted");
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
