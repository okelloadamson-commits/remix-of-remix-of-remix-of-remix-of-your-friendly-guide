import { useEffect, useState } from "react";
import {
  getRecentActivities,
  clearAllActivities,
  UserActivity,
} from "@/lib/activity-tracker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Search,
  Activity,
  MousePointer,
  Eye,
  Play,
  Download,
  LogIn,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const actionIcons: Record<string, React.ReactNode> = {
  click: <MousePointer className="w-4 h-4" />,
  view: <Eye className="w-4 h-4" />,
  play: <Play className="w-4 h-4" />,
  download: <Download className="w-4 h-4" />,
  login: <LogIn className="w-4 h-4" />,
  signup: <UserPlus className="w-4 h-4" />,
};

function getActionIcon(action: string) {
  const key = Object.keys(actionIcons).find((k) => action.toLowerCase().includes(k));
  return key ? actionIcons[key] : <Activity className="w-4 h-4" />;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function AdminActivities() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const acts = await getRecentActivities(500);
    setActivities(acts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = activities.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.userName.toLowerCase().includes(q) ||
      a.userEmail.toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q) ||
      a.details.toLowerCase().includes(q) ||
      a.page.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Activities</h2>
          <p className="text-sm text-muted-foreground">Real-time log of all user interactions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-[#0d1e36] border-border/50"
            />
          </div>
          <Button

            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm("Clear ALL user activities? This cannot be undone.")) return;
              await clearAllActivities();
              setActivities([]);
              toast.success("All activities cleared");
            }}
            disabled={loading || activities.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {activities.length} activities
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && !loading && (
          <Card className="bg-[#0d1e36] border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              No activities recorded yet.
            </CardContent>
          </Card>
        )}
        {filtered.map((a) => (
          <Card
            key={a.id}
            className="bg-[#0d1e36] border-border/50 hover:border-primary/30 transition-colors"
          >
            <CardContent className="p-4 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                {getActionIcon(a.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{a.userName}</span>
                  <span className="text-xs text-muted-foreground">{a.userEmail}</span>
                </div>
                <p className="text-sm text-foreground mt-0.5">
                  <span className="text-primary font-medium">{a.action}</span>
                  {" — "}
                  {a.details}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>Page: {a.page}</span>
                  <span>•</span>
                  <span>{formatTime(a.timestamp)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
