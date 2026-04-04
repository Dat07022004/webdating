import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserCheck, AlertCircle } from "lucide-react";

interface UnblockConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; name: string };
  onConfirm: () => void;
}

export function UnblockConfirmDialog({ isOpen, onClose, targetUser, onConfirm }: UnblockConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl border-none bg-card p-6 shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Unblock {targetUser.name}?
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <div className="rounded-2xl bg-muted/50 p-4 border border-border/50">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-primary">
              <AlertCircle className="w-4 h-4" />
              After unblocking:
            </p>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
              <li>This user will be able to see your profile again in <strong>Discover</strong>.</li>
              <li>You can send messages to each other if you match again.</li>
              <li>Both of you can find each other's profiles.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button
            variant="default"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            Confirm Unblock
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full rounded-xl font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
