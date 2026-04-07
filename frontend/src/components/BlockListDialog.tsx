import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { Ban, UserX, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnblockConfirmDialog } from "./UnblockConfirmDialog";

interface BlockedUser {
  id: string;
  name: string;
  image: string;
}

interface BlockListDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlockListDialog({ isOpen, onClose }: BlockListDialogProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<BlockedUser | null>(null);

  const fetchBlockedUsers = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      
      const res = await fetch(`${baseUrl}/api/safety/blocked-list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await res.json();
      if (data.success) {
        setBlockedUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch blocked users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      setUnblockingId(userId);
      const token = await getToken();
      const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      
      const res = await fetch(`${baseUrl}/api/safety/unblock`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blockedId: userId }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Unblocked",
          description: "User has been removed from your block list.",
        });
        setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unblock user. Please try again.",
      });
    } finally {
      setUnblockingId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] rounded-3xl border-none bg-card p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
              <Ban className="w-6 h-6" />
            </div>
            Block List
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading list...</p>
            </div>
          ) : blockedUsers.length > 0 ? (
            <div className="space-y-4 mt-4">
              {blockedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={user.image} alt={user.name} className="object-cover" />
                      <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-sm">{user.name}</h4>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-9 text-xs font-bold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                    onClick={() => setConfirmTarget(user)}
                    disabled={unblockingId === user.id}
                  >
                    {unblockingId === user.id ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <UserX className="w-3 h-3 mr-1" />
                    )}
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <UserX className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-bold text-foreground">Empty</h3>
              <p className="text-sm text-muted-foreground mt-1 px-8">
                You haven't blocked any users yet.
              </p>
            </div>
          )}
        </div>
      </DialogContent>

      {confirmTarget && (
        <UnblockConfirmDialog
          isOpen={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          targetUser={{ id: confirmTarget.id, name: confirmTarget.name }}
          onConfirm={() => handleUnblock(confirmTarget.id)}
        />
      )}
    </Dialog>
  );
}
