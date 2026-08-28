import { MainLayout } from "@/components/layout/MainLayout";
import { getApps, type App } from "@/lib/firebase-db";
import { Download, Smartphone, Star } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { useState, useEffect } from "react";

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApps() {
      try {
        const fetchedApps = await getApps();
        // Filter only active apps
        const activeApps = fetchedApps.filter(app => app.isActive !== false);
        setApps(activeApps);
      } catch (error) {
        console.error("Error fetching apps:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchApps();
  }, []);

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <h1 className="text-2xl font-bold mb-6">Apps</h1>
        
        {loading ? (
          <PageLoader label="APPS" />
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Smartphone className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Download Our App</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Get the Luo Ancient Movies app for the best viewing experience on your mobile device.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#" 
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download for Android
              </a>
              <a 
                href="#" 
                className="flex items-center gap-2 bg-accent text-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent/80 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download for iOS
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="p-4 flex items-start gap-4">
                  <img
                    src={app.iconUrl}
                    alt={app.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{app.name}</h3>
                    <p className="text-xs text-muted-foreground">{app.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs">{app.rating}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{app.size}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {app.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      v{app.version} • {app.platform}
                    </span>
                    <a
                      href={app.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
