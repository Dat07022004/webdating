import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban, AlertCircle } from "lucide-react";

interface BlockUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; name: string };
  onConfirm: () => void;
}

export function BlockUserDialog({ isOpen, onClose, targetUser, onConfirm }: BlockUserDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl border-none bg-card p-6 shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Ban className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Block {targetUser.name}?
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <div className="rounded-2xl bg-muted/50 p-4 border border-border/50">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              When you block this user:
            </p>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
              <li>They will be removed from your <strong>Matches</strong> immediately.</li>
              <li>You won't be able to send or receive <strong>messages</strong> from each other.</li>
              <li>Neither of you will see each other's profile in <strong>Discover</strong>.</li>
              <li>This action only affects your account; they can still interact with other users.</li>
            </ul>
          </div>
          
          <p className="text-[11px] text-center text-muted-foreground italic">
            You can manage your blocked list anytime in your Profile settings.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="h-11 w-full rounded-xl font-bold shadow-lg shadow-destructive/20 active:scale-95 transition-transform"
          >
            Confirm Block
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-11 w-full rounded-xl font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}