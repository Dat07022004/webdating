import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}

const reasons = [
  "Inappropriate messages",
  "Fake profile",
  "Harassment or threats",
  "Spam or scam",
  "Underage user",
  "Other",
];

export const ReportUserDialog = ({ open, onOpenChange, userName }: ReportUserDialogProps) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!reason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Report submitted", description: "Our team will review this report." });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setReason(""); setDescription(""); setSubmitted(false); }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-success" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-foreground">Report Submitted</h3>
            <p className="text-muted-foreground text-sm">We take reports seriously. Our team will review this within 24 hours.</p>
            <Button variant="outline" onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Report {userName}
              </DialogTitle>
              <DialogDescription>Help us keep the community safe. Select a reason for your report.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                {reasons.map(r => (
                  <div key={r} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    reason === r ? "border-primary bg-coral-light/20" : "border-border hover:border-primary/40"
                  )}>
                    <RadioGroupItem value={r} id={r} />
                    <Label htmlFor={r} className="cursor-pointer flex-1">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
              <div>
                <Label className="mb-2 block">Additional details (optional)</Label>
                <Textarea
                  placeholder="Describe what happened..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button variant="destructive" onClick={handleSubmit}>Submit Report</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
