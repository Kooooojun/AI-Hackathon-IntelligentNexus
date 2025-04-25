
import { MainContent } from "@/components/MainContent";
import { Sidebar } from "@/components/Sidebar";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <MainContent />
    </div>
  );
};

export default Index;
