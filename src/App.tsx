import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import Index from "./pages/Index";
import WatchPage from "./pages/WatchPage";
import NotFound from "./pages/NotFound";
import MoviesPage from "./pages/MoviesPage";
import ComedyPage from "./pages/ComedyPage";
import ComedyWatchPage from "./pages/ComedyWatchPage";
import TvSeriesPage from "./pages/TvSeriesPage";
import GenresPage from "./pages/GenresPage";
import GenreCategoryPage from "./pages/GenreCategoryPage";
import AdvertsPage from "./pages/AdvertsPage";
import AppsPage from "./pages/AppsPage";
import TrendingPage from "./pages/TrendingPage";
import RecentPage from "./pages/RecentPage";
import TopRatedPage from "./pages/TopRatedPage";
import DownloadPage from "./pages/DownloadPage";
import SearchPage from "./pages/SearchPage";
import PaymentCallbackPage from "./pages/PaymentCallbackPage";
import AgentPage from "./pages/AgentPage";
import AboutPage from "./pages/AboutPage";
import CareersPage from "./pages/CareersPage";
import PressPage from "./pages/PressPage";
import BlogPage from "./pages/BlogPage";
import HelpPage from "./pages/HelpPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import CookiesPage from "./pages/CookiesPage";
import ContactPage from "./pages/ContactPage";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMovies from "./pages/admin/AdminMovies";
import AdminSeries from "./pages/admin/AdminSeries";
import AdminEpisodes from "./pages/admin/AdminEpisodes";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminHeroSlides from "./pages/admin/AdminHeroSlides";
import AdminAdverts from "./pages/admin/AdminAdverts";
import AdminApps from "./pages/admin/AdminApps";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminActivities from "./pages/admin/AdminActivities";
import AdminRegisteredAgents from "./pages/admin/AdminRegisteredAgents";
import AdminComedies from "./pages/admin/AdminComedies";
import { GlobalClickTracker } from "./components/GlobalClickTracker";
import GoogleOneTap from "./components/GoogleOneTap";
import { WelcomeSplash } from "./components/WelcomeSplash";
import { AgentMovieNotification } from "./components/AgentMovieNotification";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalClickTracker />
          <WelcomeSplash />
          <AgentMovieNotification />

          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/watch/:id" element={<WatchPage />} />
              <Route path="/watch/series/:seriesId" element={<WatchPage />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/tv-series" element={<TvSeriesPage />} />
              <Route path="/luo-champion" element={<ComedyPage />} />
              <Route path="/watch/luo-champion/:id" element={<ComedyWatchPage />} />
              <Route path="/genres" element={<GenresPage />} />
              <Route path="/genres/:genreId" element={<GenreCategoryPage />} />
              <Route path="/adverts" element={<AdvertsPage />} />
              <Route path="/apps" element={<AppsPage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/recent" element={<RecentPage />} />
              <Route path="/top-rated" element={<TopRatedPage />} />
              <Route path="/api/download" element={<DownloadPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/payment/callback" element={<PaymentCallbackPage />} />
              <Route path="/agent" element={<AgentPage />} />
              <Route path="/subscribe" element={<Index />} />
              <Route path="/login" element={<Index />} />
              <Route path="/signup" element={<Index />} />
              <Route path="/profile" element={<Index />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/press" element={<PressPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />}>
                <Route path="" element={null} />
              </Route>
              <Route path="/admin/movies" element={<AdminDashboard />}>
                <Route path="" element={<AdminMovies />} />
              </Route>
              <Route path="/admin/series" element={<AdminDashboard />}>
                <Route path="" element={<AdminSeries />} />
              </Route>
              <Route path="/admin/episodes" element={<AdminDashboard />}>
                <Route path="" element={<AdminEpisodes />} />
              </Route>
              <Route path="/admin/users" element={<AdminDashboard />}>
                <Route path="" element={<AdminUsers />} />
              </Route>
              <Route path="/admin/subscriptions" element={<AdminDashboard />}>
                <Route path="" element={<AdminSubscriptions />} />
              </Route>
              <Route path="/admin/hero-slides" element={<AdminDashboard />}>
                <Route path="" element={<AdminHeroSlides />} />
              </Route>
              <Route path="/admin/adverts" element={<AdminDashboard />}>
                <Route path="" element={<AdminAdverts />} />
              </Route>
              <Route path="/admin/apps" element={<AdminDashboard />}>
                <Route path="" element={<AdminApps />} />
              </Route>
              <Route path="/admin/settings" element={<AdminDashboard />}>
                <Route path="" element={<AdminSettings />} />
              </Route>
              <Route path="/admin/transactions" element={<AdminDashboard />}>
                <Route path="" element={<AdminTransactions />} />
              </Route>
              <Route path="/admin/activities" element={<AdminDashboard />}>
                <Route path="" element={<AdminActivities />} />
              </Route>
              <Route path="/admin/registered-agents" element={<AdminDashboard />}>
                <Route path="" element={<AdminRegisteredAgents />} />
              </Route>
              <Route path="/admin/comedies" element={<AdminDashboard />}>
                <Route path="" element={<AdminComedies />} />
              </Route>
              
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AdminProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
