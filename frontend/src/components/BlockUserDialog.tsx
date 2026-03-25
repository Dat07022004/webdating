import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}

export const BlockUserDialog = ({ open, onOpenChange, userName }: BlockUserDialogProps) => {
  const { toast } = useToast();

  const handleBlock = () => {
    toast({ title: `${userName} blocked`, description: "They won't be able to see your profile or contact you." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-destructive" />
            Block {userName}?
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">Blocking {userName} will:</span>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Remove them from your matches</li>
              <li>Prevent them from messaging you</li>
              <li>Hide your profile from them</li>
              <li>Cancel any pending dates</li>
            </ul>
            <span className="block text-xs">This action can be undone from your settings.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleBlock}>Block User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
