import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@clerk/clerk-react";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

  useEffect(() => {
     fetchUsers();
  }, []);

  const fetchUsers = async () => {
     try {
       const token = await getToken();
       const res = await fetch(`${apiBaseUrl}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
       });
       if (res.status === 403 || res.status === 401) {
          toast.error("Unauthorized: only Admin can access");
          navigate("/");
          return;
       }
       if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
       }
     } catch (e) {
       console.error(e);
     } finally {
       setLoading(false);
     }
  };

  const banUser = async (userId: string) => {
     try {
       const token = await getToken();
       const res = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/ban`, {
         method: "POST",
         headers: { 
           Authorization: `Bearer ${token}`,
           "Content-Type": "application/json"
         },
         body: JSON.stringify({ reason: "Banned by Admin from Dashboard" })
       });
       if (res.ok) {
         toast.success("User has been banned");
         fetchUsers();
       } else {
         const data = await res.json();
         toast.error(data.message || "Failed to ban user");
       }
     } catch(e) { console.error(e); }
  };

  const deleteUser = async (userId: string) => {
     if (!confirm("Are you sure you want to completely delete this user? This cannot be undone.")) return;
     try {
       const token = await getToken();
       const res = await fetch(`${apiBaseUrl}/api/admin/users/${userId}`, {
         method: "DELETE",
         headers: { Authorization: `Bearer ${token}` }
       });
       if (res.ok) {
         toast.success("User deleted completely from DB and Clerk");
         fetchUsers();
       } else {
         const data = await res.json();
         toast.error(data.message || "Failed to delete user");
       }
     } catch(e) { console.error(e); }
  };

  const changeRole = async (userId: string, newRole: string) => {
     try {
       const token = await getToken();
       const res = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/role`, {
         method: "PUT",
         headers: { 
           Authorization: `Bearer ${token}`,
           "Content-Type": "application/json"
         },
         body: JSON.stringify({ role: newRole })
       });
       if (res.ok) {
         toast.success(`Role changed to ${newRole}`);
         fetchUsers();
       } else {
         const data = await res.json();
         toast.error(data.message || "Failed to change role");
       }
     } catch(e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar isAuthenticated={true} />
      <div className="max-w-6xl mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-6">
            <h1 className="font-sans text-3xl font-black">Admin Dashboard</h1>
            <Badge className="bg-violet-600 px-3 py-1 text-sm">Owner Access</Badge>
        </div>
        
        {loading ? (
            <div className="flex justify-center p-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        ) : (
          <div className="bg-white rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden p-1">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="py-4 pl-6">Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium py-4 pl-6">{u.username || "Unnamed User"}</TableCell>
                    <TableCell className="text-slate-500">{u.email}</TableCell>
                    <TableCell>
                      <Select 
                        defaultValue={u.role || "user"} 
                        onValueChange={(val) => changeRole(u._id, val)}
                        disabled={u.role === 'admin'} // Cannot change another admin's role from here
                      >
                        <SelectTrigger className="w-[120px] h-8 bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.isBanned 
                        ? <Badge variant="destructive" className="shadow-sm">Banned</Badge> 
                        : <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-0 shadow-none">Active</Badge>}
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-2">
                       <Button variant="outline" size="sm" onClick={() => banUser(u._id)} disabled={u.isBanned || u.role === 'admin'} className="rounded-full shadow-sm hover:text-orange-600 hover:bg-orange-50 hover:border-orange-200 transition-colors">Ban</Button>
                       <Button variant="destructive" size="sm" onClick={() => deleteUser(u._id)} disabled={u.role === 'admin'} className="rounded-full shadow-sm shadow-red-200">Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                            No users found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
