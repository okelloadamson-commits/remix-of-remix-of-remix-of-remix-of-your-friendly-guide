import { useEffect, useState } from "react";
import { getTransactions, deleteTransaction, Transaction } from "@/lib/admin-db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, XCircle, Clock, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      toast({ title: "Transaction deleted successfully!" });
      setSelectedTx(null);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      loadTransactions();
    } catch (error) {
      toast({ title: "Error deleting transaction", variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((tx) => tx.id!)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} transaction(s)?`)) return;
    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteTransaction(id)));
      toast({ title: `${selectedIds.size} transaction(s) deleted!` });
      setSelectedIds(new Set());
      loadTransactions();
    } catch (error) {
      toast({ title: "Error deleting transactions", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (transactions.length === 0) return;
    if (!confirm(`Are you sure you want to delete ALL ${transactions.length} transactions? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await Promise.all(transactions.map((tx) => deleteTransaction(tx.id!)));
      toast({ title: "All transactions cleared!" });
      setSelectedIds(new Set());
      loadTransactions();
    } catch (error) {
      toast({ title: "Error clearing transactions", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "success") return <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-4 h-4" /> Success</span>;
    if (status === "failed") return <span className="flex items-center gap-1 text-red-500"><XCircle className="w-4 h-4" /> Failed</span>;
    return <span className="flex items-center gap-1 text-yellow-500"><Clock className="w-4 h-4" /> Pending</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">Payment Transactions</h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          {transactions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll} disabled={deleting} className="text-destructive border-destructive/50 hover:bg-destructive/10">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Clear All
            </Button>
          )}
          <span className="text-sm text-muted-foreground">{transactions.length} total</span>
        </div>
      </div>

      {transactions.length === 0 ? (
        <Card className="bg-[#0d1e36] border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            No transactions yet
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="py-3 px-4">
                  <Checkbox
                    checked={selectedIds.size === transactions.length && transactions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="py-3 px-4 text-muted-foreground font-medium">Status</th>
                <th className="py-3 px-4 text-muted-foreground font-medium">Name</th>
                <th className="py-3 px-4 text-muted-foreground font-medium">Email</th>
                <th className="py-3 px-4 text-muted-foreground font-medium">Plan</th>
                <th className="py-3 px-4 text-muted-foreground font-medium">Amount</th>
                <th className="py-3 px-4 text-muted-foreground font-medium">Date</th>
                <th className="py-3 px-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className={`border-b border-border/30 hover:bg-white/5 ${selectedIds.has(tx.id!) ? "bg-primary/5" : ""}`}>
                  <td className="py-3 px-4">
                    <Checkbox
                      checked={selectedIds.has(tx.id!)}
                      onCheckedChange={() => toggleSelect(tx.id!)}
                    />
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={tx.status} /></td>
                  <td className="py-3 px-4 font-medium">{tx.userName}</td>
                  <td className="py-3 px-4 text-muted-foreground">{tx.userEmail}</td>
                  <td className="py-3 px-4">{tx.planName}</td>
                  <td className="py-3 px-4 font-medium">UGX {tx.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {tx.createdAt.toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedTx(tx)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(tx.id!)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => { if (!open) setSelectedTx(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={selectedTx.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedTx.userName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedTx.userEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedTx.phoneNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-medium text-xs font-mono break-all">{selectedTx.userId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium">{selectedTx.planName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">UGX {selectedTx.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-medium text-xs font-mono break-all">{selectedTx.orderId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tracking ID</p>
                  <p className="font-medium text-xs font-mono break-all">{selectedTx.orderTrackingId || "N/A"}</p>
                </div>
                {selectedTx.confirmationCode && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Confirmation Code</p>
                    <p className="font-medium">{selectedTx.confirmationCode}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{selectedTx.createdAt.toLocaleDateString()} {selectedTx.createdAt.toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedTx.id!)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Transaction
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
