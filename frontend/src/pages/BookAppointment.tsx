import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, CircleDollarSign, CalendarIcon, Clock, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Location {
  name: string;
  address: string;
  estimatedCost: { amount: number, currency: string };
}

export default function BookAppointment() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{locations: Location[], times: string[]}>({ locations: [], times: [] });
  
  // Form state
  const [receiverId, setReceiverId] = useState(""); // Trong thực tế sẽ lấy từ context hoặc params
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Fetch suggestions
    const fetchSuggestions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/appointments/suggestions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
          setSuggestions(result.data);
        }
      } catch (error) {
        console.error("Failed to load suggestions");
      }
    };
    fetchSuggestions();
  }, []);

  const handleSelectSuggestion = (loc: Location) => {
    setLocationName(loc.name);
    setLocationAddress(loc.address);
    setCost(loc.estimatedCost.amount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Ghép date và time thành một Date object hợp lệ
      const appointmentDate = new Date(`${date}T${time}:00`);
      
      const payload = {
        receiverId: receiverId || "60d0fe4f5311236168a109ca", // Placeholder fallback
        date: appointmentDate.toISOString(),
        location: {
          name: locationName,
          address: locationAddress
        },
        estimatedCost: {
          amount: Number(cost),
          currency: "VND"
        },
        notes
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Thành công",
          description: "Lịch hẹn đã được tạo",
        });
        window.location.href = '/appointments';
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo lịch hẹn",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6">Tạo Lịch Hẹn Mới</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chi tiết</CardTitle>
              <CardDescription>Điền thông tin cho cuộc hẹn của bạn</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ID Người nhận (Tạm thời nhập ID user test)</Label>
                  <Input value={receiverId} onChange={e => setReceiverId(e.target.value)} required placeholder="vd: 60d0fe4..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ngày hẹn</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Giờ hẹn</Label>
                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tên địa điểm</Label>
                  <Input value={locationName} onChange={e => setLocationName(e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <Label>Địa chỉ</Label>
                  <Input value={locationAddress} onChange={e => setLocationAddress(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Chi phí dự kiến (VNĐ)</Label>
                  <Input type="number" value={cost} onChange={e => setCost(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: Gặp nhau lúc 19h nhé" />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Đang xử lý..." : "Tạo lịch hẹn"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div>
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Gợi ý từ hệ thống</CardTitle>
              <CardDescription>Các địa điểm hẹn hò lý tưởng cho bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions.locations.map((loc, index) => (
                <div 
                  key={index} 
                  className="p-3 border rounded-lg bg-background hover:border-primary cursor-pointer transition-colors"
                  onClick={() => handleSelectSuggestion(loc)}
                >
                  <div className="font-medium text-primary">{loc.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {loc.address}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <CircleDollarSign className="w-3 h-3" /> {loc.estimatedCost.amount.toLocaleString()} VNĐ
                  </div>
                </div>
              ))}
              
              {suggestions.locations.length === 0 && (
                <div className="text-sm text-muted-foreground">Đang tải gợi ý...</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}