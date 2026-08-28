import { useEffect, useState } from "react";
import {
  getRegisteredAgents,
  deleteRegisteredAgent,
  clearAllRegisteredAgents,
  RegisteredAgent,
} from "@/lib/activity-tracker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Shield, Copy } from "lucide-react";
import { toast } from "sonner";

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function AdminRegisteredAgents() {
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const regs = await getRegisteredAgents(500);
      setAgents(regs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const regs = await getRegisteredAgents(500);
      setAgents(regs);
    })();
  }, []);

  const copyAgentDetails = (a: RegisteredAgent) => {
    const lines = [
      `${a.userName} (${a.userEmail})`,
      `Agent name: ${a.agentName || "—"}`,
      `Business: ${a.agentBusiness || "—"}`,
      `Location: ${a.agentLocation || "—"}`,
      `Phone: ${a.phoneNumber || "—"}`,
      `Plan: ${a.planName || "—"}${a.amount ? ` (UGX ${a.amount.toLocaleString()})` : ""}`,
      `Order: ${a.orderId || "—"}`,
      a.confirmationCode ? `Confirmation: ${a.confirmationCode}` : "",
      `Registered: ${formatTime(a.timestamp)}`,
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => toast.success("Agent details copied"),
      () => toast.error("Failed to copy"),
    );
  };


  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Delete this registered agent's details? This cannot be undone.")) return;
    try {
      await deleteRegisteredAgent(id);
      setAgents((prev) => prev.filter((x) => x.id !== id));
      toast.success("Registered agent deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleClearAllAgents = async () => {
    if (!confirm("Clear ALL registered agents? This cannot be undone.")) return;
    try {
      await clearAllRegisteredAgents();
      setAgents([]);
      toast.success("All registered agents cleared");
    } catch {
      toast.error("Failed to clear registered agents");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" /> Registered Agents
          </h2>
          <p className="text-sm text-muted-foreground">
            {agents.length} agent{agents.length === 1 ? "" : "s"} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAllAgents}
            disabled={loading || agents.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {agents.length === 0 ? (
        <Card className="bg-[#0d1f0d] border-orange-500/30">
          <CardContent className="p-8 text-center text-muted-foreground">
            No agent registrations yet. Details appear here after a successful Agent Plan payment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <Card key={a.id} className="bg-[#0d1e36] border-orange-500/30">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{a.userName}</span>
                    <span className="text-xs text-muted-foreground">{a.userEmail}</span>
                  </div>
                  {a.agentName || a.agentBusiness || a.agentLocation || a.phoneNumber ? (
                    <div className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2 text-sm text-foreground">
                      <div><span className="text-muted-foreground">Agent name: </span>{a.agentName || "—"}</div>
                      <div><span className="text-muted-foreground">Business: </span>{a.agentBusiness || "—"}</div>
                      <div><span className="text-muted-foreground">Location: </span>{a.agentLocation || "—"}</div>
                      <div><span className="text-muted-foreground">Phone: </span>{a.phoneNumber || "—"}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground mt-0.5 break-words">{a.details}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                    <span className="text-green-500">Payment successful</span>
                    {a.planName && <span>{a.planName}{a.amount ? ` · UGX ${a.amount.toLocaleString()}` : ""}</span>}
                    {a.orderId && <span className="font-mono">{a.orderId}</span>}
                    {a.confirmationCode && <span className="font-mono">{a.confirmationCode}</span>}
                    <span>{formatTime(a.timestamp)}</span>
                  </div>

                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => copyAgentDetails(a)}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteAgent(a.id!)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
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

