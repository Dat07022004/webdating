import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MapPin, Clock, CircleDollarSign, CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Location {
  name: string;
  address: string;
}

interface Cost {
  amount: number;
  currency: string;
}

interface UserSummary {
  _id: string;
  name?: string;
  avatar?: string;
}

interface Appointment {
  _id: string;
  senderId: UserSummary;
  receiverId: UserSummary;
  date: string;
  location: Location;
  estimatedCost: Cost;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  notes?: string;
}

export default function Appointments() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Giả sử lấy token từ localStorage
  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setAppointments(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lấy danh sách lịch hẹn",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Thành công",
          description: `Đã cập nhật trạng thái thành ${newStatus}`,
        });
        fetchAppointments();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể thay đổi trạng thái",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-500">Chờ xác nhận</Badge>;
      case 'accepted': return <Badge className="bg-green-500">Đã chấp nhận</Badge>;
      case 'declined': return <Badge variant="destructive">Đã từ chối</Badge>;
      case 'cancelled': return <Badge variant="secondary">Đã hủy</Badge>;
      case 'completed': return <Badge className="bg-blue-500">Hoàn thành</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý lịch hẹn</h1>
          <p className="text-muted-foreground">Theo dõi và quản lý các cuộc hẹn của bạn</p>
        </div>
        <Button onClick={() => window.location.href = '/book-appointment'}>
          Tạo lịch hẹn mới
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="pending">Chờ xác nhận</TabsTrigger>
          <TabsTrigger value="upcoming">Sắp diễn ra</TabsTrigger>
          <TabsTrigger value="past">Đã qua</TabsTrigger>
        </TabsList>
        
        {loading ? (
          <div className="text-center py-10">Đang tải...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            Bạn chưa có lịch hẹn nào.
          </div>
        ) : (
          <TabsContent value="all" className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment._id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {appointment.location.name}
                        {getStatusBadge(appointment.status)}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {appointment.location.address}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(appointment.date), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(appointment.date), "HH:mm")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{appointment.estimatedCost.amount.toLocaleString()} {appointment.estimatedCost.currency}</span>
                    </div>
                    {appointment.notes && (
                      <div className="col-span-2 text-muted-foreground mt-2">
                        Ghi chú: {appointment.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-0">
                  {appointment.status === 'pending' && (
                    <>
                      <Button variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleUpdateStatus(appointment._id, 'declined')}>
                        <XCircle className="h-4 w-4 mr-1" /> Từ chối
                      </Button>
                      <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleUpdateStatus(appointment._id, 'accepted')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Chấp nhận
                      </Button>
                    </>
                  )}
                  {appointment.status === 'accepted' && (
                    <Button variant="outline" onClick={() => handleUpdateStatus(appointment._id, 'cancelled')}>
                      Hủy lịch
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}