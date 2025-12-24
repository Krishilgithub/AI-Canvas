"use client";

import { useState, useEffect } from "react";
import { fetcher, poster, remover } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Mail, Shield } from "lucide-react";

export function TeamManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
      // Mock for now or real fetch if endpoint exists
      fetcher('/team')
        .then(data => setMembers(Array.isArray(data) ? data : []))
        .catch(() => {
            // Fallback mock if endpoint not ready
            setMembers([
                { id: '1', email: 'you@example.com', role: 'owner', status: 'active' }
            ]);
        })
        .finally(() => setLoading(false));
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    
    try {
        await poster('/team/invite', { email: inviteEmail, role: inviteRole });
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteModalOpen(false);
        setInviteEmail("");
        loadMembers(); 
    } catch (e: any) {
        toast.error("Failed to invite member");
    }
  };

  const handleRemove = async (id: string) => {
      if (!confirm("Remove this member?")) return;
      try {
          await remover(`/team/${id}`);
          toast.success("Member removed");
          loadMembers();
      } catch (e) {
          toast.error("Failed to remove member");
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
              <h3 className="text-lg font-medium">Team Members</h3>
              <p className="text-sm text-muted-foreground">Manage who has access to your workspace.</p>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Invite Member
          </Button>
       </div>

       <div className="border rounded-lg overflow-hidden">
           <Table>
               <TableHeader>
                   <TableRow>
                       <TableHead>User</TableHead>
                       <TableHead>Role</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
               </TableHeader>
               <TableBody>
                   {members.map(member => (
                       <TableRow key={member.id}>
                           <TableCell>
                               <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                       {member.email.charAt(0).toUpperCase()}
                                   </div>
                                   <div>
                                       <div className="font-medium">{member.email}</div>
                                       {member.role === 'owner' && <span className="text-xs text-muted-foreground">You</span>}
                                   </div>
                               </div>
                           </TableCell>
                           <TableCell>
                               <div className="flex items-center gap-2">
                                   <Shield className="h-3 w-3 text-muted-foreground" />
                                   <span className="capitalize text-sm">{member.role}</span>
                               </div>
                           </TableCell>
                           <TableCell>
                               <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                   member.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                               }`}>
                                   {member.status}
                               </span>
                           </TableCell>
                           <TableCell className="text-right">
                               {member.role !== 'owner' && (
                                   <Button variant="ghost" size="sm" onClick={() => handleRemove(member.id)} className="text-destructive hover:bg-destructive/10">
                                       <Trash2 className="h-4 w-4" />
                                   </Button>
                               )}
                           </TableCell>
                       </TableRow>
                   ))}
               </TableBody>
           </Table>
       </div>

       <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
           <DialogContent>
               <DialogHeader>
                   <DialogTitle>Invite Team Member</DialogTitle>
               </DialogHeader>
               <div className="space-y-4 py-4">
                   <div className="space-y-2">
                       <label className="text-sm font-medium">Email Address</label>
                       <Input 
                           placeholder="colleague@company.com" 
                           value={inviteEmail}
                           onChange={(e) => setInviteEmail(e.target.value)}
                       />
                   </div>
                   <div className="space-y-2">
                       <label className="text-sm font-medium">Role</label>
                       <Select value={inviteRole} onValueChange={setInviteRole}>
                           <SelectTrigger>
                               <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                               <SelectItem value="admin">Admin</SelectItem>
                               <SelectItem value="editor">Editor</SelectItem>
                               <SelectItem value="viewer">Viewer</SelectItem>
                           </SelectContent>
                       </Select>
                   </div>
               </div>
               <DialogFooter>
                   <Button variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
                   <Button onClick={handleInvite}>Send Invitation</Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>
    </div>
  );
}
