import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RevenueOverview = {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
  };
  byPlan: Array<{ plan: string; revenue: number; transactions: number }>;
  statusBreakdown: Array<{ status: string; count: number; amount: number }>;
};

type RevenueTransaction = {
  _id: string;
  orderId: string;
  amount: number;
  plan: "gold" | "platinum";
  status: "pending" | "success" | "failed";
  transactionId: string;
  createdAt: string;
  userId?: {
    _id: string;
    username?: string;
    email?: string;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);

export default function RevenueDashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [orderId, setOrderId] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    if (status !== "all") params.set("status", status);
    if (plan !== "all") params.set("plan", plan);
    if (orderId.trim()) params.set("orderId", orderId.trim());
    return params.toString();
  }, [page, status, plan, orderId]);

  const fetchOverview = async () => {
    const token = await getToken();
    const res = await fetch("/api/revenue/overview", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      toast.error("Bạn không có quyền truy cập quản lý doanh thu");
      navigate("/");
      return null;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Không tải được tổng quan doanh thu");
    }

    return res.json();
  };

  const fetchTransactions = async () => {
    const token = await getToken();
    const res = await fetch(`/api/revenue/transactions?${queryString}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      toast.error("Bạn không có quyền truy cập quản lý doanh thu");
      navigate("/");
      return null;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Không tải được danh sách giao dịch");
    }

    return res.json();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, transactionRes] = await Promise.all([fetchOverview(), fetchTransactions()]);

      if (overviewRes) {
        setOverview(overviewRes);
      }

      if (transactionRes) {
        setTransactions(transactionRes.transactions || []);
        setTotalPages(transactionRes.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      toast.error(error?.message || "Không thể tải dữ liệu doanh thu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryString]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar isAuthenticated={true} />
      <div className="max-w-7xl mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-slate-900">Revenue Management</h1>
          <Badge className="bg-emerald-600 text-white px-3 py-1">Manager Access</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Tổng doanh thu</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-black text-emerald-600">
              {formatCurrency(overview?.summary.totalRevenue || 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Giao dịch thành công</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-black text-slate-900">
              {overview?.summary.totalTransactions || 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Giá trị trung bình</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-black text-amber-600">
              {formatCurrency(overview?.summary.averageOrderValue || 0)}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo gói</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(overview?.byPlan || []).map((item) => (
                <div key={item.plan} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="font-semibold capitalize">{item.plan}</p>
                    <p className="text-sm text-slate-500">{item.transactions} giao dịch</p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
              {(overview?.byPlan || []).length === 0 && <p className="text-slate-500">Chưa có dữ liệu</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trạng thái giao dịch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(overview?.statusBreakdown || []).map((item) => (
                <div key={item.status} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="font-semibold capitalize">{item.status}</p>
                    <p className="text-sm text-slate-500">{item.count} giao dịch</p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.amount)}</p>
                </div>
              ))}
              {(overview?.statusBreakdown || []).length === 0 && <p className="text-slate-500">Chưa có dữ liệu</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách giao dịch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Lọc trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={plan} onValueChange={(value) => { setPage(1); setPlan(value); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Lọc gói" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả gói</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={orderId}
                onChange={(e) => {
                  setPage(1);
                  setOrderId(e.target.value);
                }}
                placeholder="Tìm theo orderId"
              />

              <Button onClick={() => loadData()} disabled={loading}>Làm mới</Button>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell className="font-mono text-xs">{tx.orderId}</TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.userId?.username || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{tx.userId?.email || "No email"}</p>
                      </TableCell>
                      <TableCell className="capitalize">{tx.plan}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === "success" ? "default" : tx.status === "failed" ? "destructive" : "secondary"}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell>{new Date(tx.createdAt).toLocaleString("vi-VN")}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        Không có giao dịch phù hợp.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1 || loading}>
                Trước
              </Button>
              <span className="text-sm text-slate-600">Trang {page} / {totalPages}</span>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages || loading}>
                Sau
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
