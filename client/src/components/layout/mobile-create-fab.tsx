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
    <Button
      size="lg"
      className="lg:hidden fixed bottom-20 right-4 z-40 bg-primary text-primary-foreground rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      onClick={onCreateUpdate}
      data-testid="mobile-create-fab"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
