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
import { ArrowUpRight, BadgeDollarSign, BarChart3, Clock3, RefreshCcw, Search, Sparkles, TrendingUp } from "lucide-react";

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
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderId, setOrderId] = useState("");

  const planBreakdown = useMemo(() => {
    const items = overview?.byPlan || [];
    const maxRevenue = Math.max(...items.map((item) => item.revenue), 0) || 1;

    return items.map((item) => ({
      ...item,
      share: Math.max(8, Math.round((item.revenue / maxRevenue) * 100)),
    }));
  }, [overview]);

  const statusBreakdown = useMemo(() => {
    const items = overview?.statusBreakdown || [];
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0) || 1;

    return items.map((item) => ({
      ...item,
      share: Math.max(8, Math.round((item.amount / totalAmount) * 100)),
    }));
  }, [overview]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setOrderId(orderIdInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [orderIdInput]);

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
      toast.error("You do not have access to revenue management");
      navigate("/");
      return null;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Failed to load revenue overview");
    }

    return res.json();
  };

  const fetchTransactions = async () => {
    const token = await getToken();
    const res = await fetch(`/api/revenue/transactions?${queryString}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      toast.error("You do not have access to revenue management");
      navigate("/");
      return null;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Failed to load transaction list");
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
      toast.error(error?.message || "Unable to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryString]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,77,141,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,142,83,0.10),_transparent_22%),linear-gradient(180deg,_#faf9f7_0%,_#f8fafc_100%)]">
      <Navbar isAuthenticated={true} />
      <div className="max-w-7xl mx-auto py-8 lg:py-10 px-4 space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] px-6 py-6 lg:px-8 lg:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,77,141,0.10),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,142,83,0.12),_transparent_20%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#FF4D8D]/10 text-[#FF4D8D] border border-[#FF4D8D]/15 px-3 py-1.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Revenue dashboard
                </Badge>
                <Badge className="bg-emerald-600/10 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full">
                  Manager Access
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-slate-950">
                Revenue Management
              </h1>
              <p className="max-w-2xl text-slate-600 text-base md:text-lg leading-relaxed">
                Monitor payments, track plan performance, and scan transaction health from a clean, high-signal overview.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm min-w-[160px]">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.24em]">
                  <TrendingUp className="w-4 h-4 text-[#FF4D8D]" /> Revenue
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(overview?.summary.totalRevenue || 0)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm min-w-[160px]">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-[0.24em]">
                  <Clock3 className="w-4 h-4 text-amber-500" /> AOV
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(overview?.summary.averageOrderValue || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="overflow-hidden border-slate-200/80 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif font-medium text-lg text-slate-900 flex items-center gap-2">
                <BadgeDollarSign className="w-5 h-5 text-emerald-600" /> Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-semibold text-emerald-600 tracking-tight">
                {formatCurrency(overview?.summary.totalRevenue || 0)}
              </div>
              <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
              </div>
              <p className="text-sm text-slate-500">Gross revenue across all successful premium payments.</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif font-medium text-lg text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-700" /> Successful Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-semibold text-slate-950 tracking-tight">
                {overview?.summary.totalTransactions || 0}
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-slate-700 to-slate-500" />
              </div>
              <p className="text-sm text-slate-500">Confirmed payments that have already been settled.</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif font-medium text-lg text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-600" /> Average Order Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-semibold text-amber-600 tracking-tight">
                {formatCurrency(overview?.summary.averageOrderValue || 0)}
              </div>
              <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
              </div>
              <p className="text-sm text-slate-500">Average value per successful transaction.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-slate-200/80 shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif font-medium text-lg text-slate-900">Revenue by Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {planBreakdown.map((item) => (
                <div key={item.plan} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium capitalize text-slate-900">{item.plan}</p>
                      <p className="text-sm text-slate-500">{item.transactions} transactions</p>
                    </div>
                    <p className="font-semibold text-slate-950">{formatCurrency(item.revenue)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-white overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.plan === "gold"
                        ? "bg-gradient-to-r from-amber-400 to-orange-400"
                        : "bg-gradient-to-r from-[#FF4D8D] to-[#FF8E53]"
                        }`}
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                </div>
              ))}
              {planBreakdown.length === 0 && <p className="text-slate-500">No data available</p>}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif font-medium text-lg text-slate-900">Transaction Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusBreakdown.map((item) => (
                <div key={item.status} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium capitalize text-slate-900">{item.status}</p>
                      <p className="text-sm text-slate-500">{item.count} transactions</p>
                    </div>
                    <p className="font-semibold text-slate-950">{formatCurrency(item.amount)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-white overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.status === "success"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : item.status === "pending"
                          ? "bg-gradient-to-r from-amber-400 to-orange-400"
                          : "bg-gradient-to-r from-rose-500 to-pink-400"
                        }`}
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                </div>
              ))}
              {statusBreakdown.length === 0 && <p className="text-slate-500">No data available</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/80 shadow-card overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80">
            <CardTitle className="font-serif font-medium text-lg text-slate-900">Transaction List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={plan} onValueChange={(value) => { setPage(1); setPlan(value); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={orderIdInput}
                onChange={(e) => {
                  setOrderIdInput(e.target.value);
                }}
                placeholder="Search by order ID"
                className="bg-white"
              />

              <Button onClick={() => loadData()} disabled={loading} className="gap-2">
                <RefreshCcw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-medium text-slate-700">Order ID</TableHead>
                    <TableHead className="font-medium text-slate-700">User</TableHead>
                    <TableHead className="font-medium text-slate-700">Plan</TableHead>
                    <TableHead className="font-medium text-slate-700">Status</TableHead>
                    <TableHead className="font-medium text-slate-700">Amount</TableHead>
                    <TableHead className="font-medium text-slate-700">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell className="font-mono text-xs">{tx.orderId}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{tx.userId?.username || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{tx.userId?.email || "No email"}</p>
                      </TableCell>
                      <TableCell className="capitalize">{tx.plan}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === "success" ? "default" : tx.status === "failed" ? "destructive" : "secondary"}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell>{new Date(tx.createdAt).toLocaleString("en-US")}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        No matching transactions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1 || loading}>
                Previous
              </Button>
              <span className="text-sm text-slate-600">Page {page} / {totalPages}</span>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages || loading}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
