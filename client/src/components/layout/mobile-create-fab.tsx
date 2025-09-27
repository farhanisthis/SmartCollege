import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileCreateFabProps {
  onCreateUpdate?: () => void;
}

export default function MobileCreateFab({
  onCreateUpdate,
}: MobileCreateFabProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isCR = user?.role === "cr";

  // Only show on mobile for CR users
  if (!isMobile || !isCR) {
    return null;
  }

  return (
    <div className="lg:hidden fixed bottom-20 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 pointer-events-auto"
            onClick={onCreateUpdate}
            data-testid="mobile-create-fab"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
