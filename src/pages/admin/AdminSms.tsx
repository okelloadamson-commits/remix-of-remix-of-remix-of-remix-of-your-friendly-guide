import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import {
  DEFAULT_SENDER_ID,
  deleteSmsLog,
  getSmsLogs,
  getSmsRecipients,
  sendSms,
  type SmsLog,
  type SmsRecipient,
} from "@/lib/sms-service";

export default function AdminSms() {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<SmsRecipient[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(
    "Hi {name}, new content just landed on Luo Ancient Movies. Watch now: ",
  );
  const [senderId, setSenderId] = useState(DEFAULT_SENDER_ID);
  const [search, setSearch] = useState("");
  const [subsOnly, setSubsOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, l] = await Promise.all([getSmsRecipients(), getSmsLogs()]);
    setRecipients(r);
    setLogs(l);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipients.filter((r) => {
      if (subsOnly && !r.subscribed) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    });
  }, [recipients, search, subsOnly]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.userId));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((r) => next.delete(r.userId));
      else filtered.forEach((r) => next.add(r.userId));
      return next;
    });
  };

  const handleSend = async () => {
    const chosen = recipients.filter((r) => selected.has(r.userId));
    if (chosen.length === 0) {
      toast({ title: "Select at least one user", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Message is empty", variant: "destructive" });
      return;
    }
    setSending(true);
    const result = await sendSms(chosen, message, { senderId, type: "manual" });
    setSending(false);
    toast({
      title: result.sent > 0 ? `SMS sent to ${result.sent} user(s)` : "SMS failed",
      description: result.providerMessage,
      variant: result.sent > 0 ? "default" : "destructive",
    });
    setSelected(new Set());
    setLogs(await getSmsLogs());
  };

  const handleDeleteLog = async (id?: string) => {
    if (!id) return;
    await deleteSmsLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SMS Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Subscribers are texted automatically when a new movie or episode is added.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <Card className="bg-[#0d1e36] border-border/50">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Send SMS manually</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Sender ID</label>
                <Input value={senderId} onChange={(e) => setSenderId(e.target.value)} maxLength={11} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Search users</label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name, email or phone" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Message (use {"{name}"} to insert the user&apos;s name, and paste the watch link)
              </label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{message.length} characters</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={subsOnly} onCheckedChange={(v) => setSubsOnly(Boolean(v))} />
                Subscribed users only
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                Select all shown
              </label>
            </div>
            <Button onClick={handleSend} disabled={sending} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send to {selected.size} selected
            </Button>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card className="bg-[#0d1e36] border-border/50">
          <CardContent className="p-6">
            <h2 className="font-semibold text-foreground mb-4">
              Users with phone numbers ({filtered.length})
            </h2>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border/40">
              {filtered.map((r) => (
                <label key={r.userId} className="flex items-center gap-3 py-3 cursor-pointer">
                  <Checkbox checked={selected.has(r.userId)} onCheckedChange={() => toggle(r.userId)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{r.name}</span>
                      {r.subscribed ? (
                        <Badge className="bg-green-600 text-white">{r.plan || "Active"}</Badge>
                      ) : (
                        <Badge variant="secondary">No sub</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.phone} · {r.email || "no email"}
                    </div>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground py-6">No users match this filter.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sent history */}
      <Card className="bg-[#0d1e36] border-border/50">
        <CardContent className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Sent messages ({logs.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Message</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border/30">
                    <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                      {l.createdAt.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-foreground">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{l.phone}</td>
                    <td className="py-2 pr-4 capitalize">{l.type}</td>
                    <td className="py-2 pr-4 max-w-md truncate">{l.message}</td>
                    <td className="py-2 pr-4">
                      <Badge className={l.status === "sent" ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteLog(l.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-muted-foreground">
                      No SMS sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
