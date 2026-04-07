import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert } from "lucide-react";

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; name: string };
  onSubmit: (data: { reason: string; description: string }) => void;
}

export function ReportUserDialog({ isOpen, onClose, targetUser, onSubmit }: ReportUserDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleConfirm = () => {
    if (!reason) return;
    onSubmit({ reason, description });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl border-none bg-card p-6 shadow-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Report {targetUser.name}
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Violation Reason</label>
            <Select onValueChange={setReason}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Scam">Scam / Sales</SelectItem>
                <SelectItem value="Harassment">Harassment / Threats</SelectItem>
                <SelectItem value="Fake Profile">Fake Profile / Photos</SelectItem>
                <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Description (Optional)</label>
            <Textarea
              placeholder="Provide more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button variant="destructive" disabled={!reason} onClick={handleConfirm} className="w-full rounded-xl font-bold">
            Submit Report
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
