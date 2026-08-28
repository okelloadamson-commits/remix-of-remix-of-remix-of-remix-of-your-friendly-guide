import { MainLayout } from "@/components/layout/MainLayout";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ContentSection } from "@/components/home/ContentSection";
import { SupportCallBar } from "@/components/home/SupportCallBar";

const Index = () => {
  return (
    <MainLayout>
      <HeroBanner />
      <SupportCallBar />
      <div className="px-4 lg:px-6 space-y-4 sm:space-y-8 pb-24 lg:pb-8 mt-2 sm:mt-4 lg:-mt-2">
        
        <ContentSection title="🔥Trending in Cinema🎞️" category="trending" showGenres />
        <ContentSection title="Popular Movies" category="popular" />
        <ContentSection title="Top TV Series" category="top-series" />
        <ContentSection title="Recently Added" category="recently-added" />
        <ContentSection title="Action Movies" category="action" />
        <ContentSection title="Comedy Shows" category="comedy" />
      </div>
    </MainLayout>
  );
};

export default Index;
