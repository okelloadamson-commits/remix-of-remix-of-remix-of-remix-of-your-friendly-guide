import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminStats } from "@/lib/admin-db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Film,
  Tv,
  Users,
  LayoutDashboard,
  Image,
  Megaphone,
  Download,
  Settings,
  Home,
  PlayCircle,
  BarChart3,
  Settings2,
  CreditCard,
  Shield,
  Trophy,
  MessageSquare,
} from "lucide-react";
import luoAncientLogo from "@/assets/luo-ancient-logo.png";

interface Stats {
  totalMovies: number;
  totalSeries: number;
  totalEpisodes: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalAdverts: number;
  totalHeroImages: number;
  totalApps: number;
}

const actionCards = [
  { title: "Upload Movies", description: "Add new movies to the platform", href: "/admin/movies", icon: Film, color: "bg-blue-500" },
  { title: "Upload Series", description: "Add new TV series", href: "/admin/series", icon: Tv, color: "bg-pink-500" },
  { title: "Upload Episodes", description: "Add episodes to existing series", href: "/admin/episodes", icon: PlayCircle, color: "bg-green-500" },
  { title: "Upload Luo Champion", description: "Add Luo Champion videos", href: "/admin/comedies", icon: Trophy, color: "bg-pink-600" },
  { title: "Upload Apps", description: "Add mobile and desktop apps", href: "/admin/apps", icon: Download, color: "bg-purple-500" },
  { title: "Upload Adverts", description: "Manage promotional content", href: "/admin/adverts", icon: Megaphone, color: "bg-red-500" },
  { title: "Hero Images", description: "Manage homepage hero slider images", href: "/admin/hero-slides", icon: Image, color: "bg-cyan-500" },
  { title: "Transactions", description: "View payment transactions", href: "/admin/transactions", icon: CreditCard, color: "bg-yellow-500" },
  { title: "User Activities", description: "Track all user interactions", href: "/admin/activities", icon: BarChart3, color: "bg-indigo-500" },
  { title: "Registered Agents", description: "View and manage agent registrations", href: "/admin/registered-agents", icon: Shield, color: "bg-orange-600" },
  { title: "SMS Notifications", description: "Send SMS and view sent messages", href: "/admin/sms", icon: MessageSquare, color: "bg-emerald-500" },
  { title: "Manage Users", description: "User management and permissions", href: "/admin/users", icon: Users, color: "bg-orange-500" },
];

export default function AdminDashboard() {
  const { isAdminAuthenticated, logoutAdmin } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/admin");
      return;
    }
    loadStats();
  }, [isAdminAuthenticated, navigate]);

  const loadStats = async () => {
    const data = await getAdminStats();
    setStats(data);
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate("/");
  };

  const isDashboardHome = location.pathname === "/admin/dashboard";

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-[#0d1e36]">
        <div className="flex items-center justify-between px-4 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <img src={luoAncientLogo} alt="Logo" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-xl font-bold text-cyan-400">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage your MovieBox platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to Home
            </Link>
            <Link to="/admin/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Settings
            </Link>
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
                  {user.name?.charAt(0).toUpperCase() || "A"}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-8">
        {isDashboardHome ? (
          <div className="space-y-8 max-w-7xl mx-auto">
            {/* Platform Statistics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Platform Statistics</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Live
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#0d1e36] border-border/50">
                  <CardContent className="p-6">
                    <div className="text-4xl font-bold text-foreground">{stats?.totalMovies || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Movies</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1e36] border-border/50">
                  <CardContent className="p-6">
                    <div className="text-4xl font-bold text-foreground">{stats?.totalSeries || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Series</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1e36] border-border/50">
                  <CardContent className="p-6">
                    <div className="text-4xl font-bold text-foreground">{stats?.totalEpisodes || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Episodes</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#0d1e36] border-border/50">
                  <CardContent className="p-6">
                    <div className="text-4xl font-bold text-foreground">{stats?.activeSubscriptions || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Active Users</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {actionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href + card.title} to={card.href}>
                    <Card className="bg-[#0d1e36] border-border/50 hover:border-primary/50 transition-all cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-foreground">{card.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Platform Overview */}
            <Card className="bg-[#0d1e36] border-border/50">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">Platform Overview</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Content Library */}
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-4">Content Library</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Movies:</span>
                        <span className="font-medium text-foreground">{stats?.totalMovies || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Series:</span>
                        <span className="font-medium text-foreground">{stats?.totalSeries || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Episodes:</span>
                        <span className="font-medium text-foreground">{stats?.totalEpisodes || 0}</span>
                      </div>
                    </div>
                  </div>
                  {/* User Engagement */}
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-4">User Engagement</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Subscriptions:</span>
                        <span className="font-medium text-green-500">{stats?.activeSubscriptions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Users:</span>
                        <span className="font-medium text-foreground">{stats?.totalUsers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hero Slides:</span>
                        <span className="font-medium text-foreground">{stats?.totalHeroImages || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
