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
  onSubmit: (data: { reason: string; details: string; shouldBlock: boolean }) => void;
}

export function ReportUserDialog({ isOpen, onClose, targetUser, onSubmit }: ReportUserDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [shouldBlock, setShouldBlock] = useState(false);

  const handleConfirm = () => {
    if (!reason) return;
    onSubmit({ reason, details, shouldBlock });
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
            Báo cáo {targetUser.name}
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lý do vi phạm</label>
            <Select onValueChange={setReason}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Chọn lý do..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Scam">Lừa đảo / Bán hàng</SelectItem>
                <SelectItem value="Harassment">Quấy rối / Đe dọa</SelectItem>
                <SelectItem value="Fake Profile">Ảnh giả mạo</SelectItem>
                <SelectItem value="Other">Lý do khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mô tả thêm</label>
            <Textarea
              placeholder="Thông tin chi tiết..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[80px] rounded-xl"
            />
          </div>

          <div className="flex items-center space-x-3 rounded-2xl bg-muted/40 p-4 border border-border/30">
            <input
              type="checkbox"
              id="block-check"
              checked={shouldBlock}
              onChange={(e) => setShouldBlock(e.target.checked)}
              className="h-5 w-5 accent-primary cursor-pointer"
            />
            <label htmlFor="block-check" className="text-sm font-bold cursor-pointer">Chặn người dùng này</label>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button variant="destructive" disabled={!reason} onClick={handleConfirm} className="w-full rounded-xl font-bold">
            Gửi báo cáo
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full rounded-xl">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}