
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { DesignInputs } from "./design/DesignInputs";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen glass-panel transition-all duration-300 overflow-y-auto",
        isCollapsed ? "w-16" : "w-80"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-primary">Designer AI</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hover:bg-white/5"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {!isCollapsed && (
        <div className="p-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">⚙️ 設計輸入 (Design Input)</h3>
              <DesignInputs />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
