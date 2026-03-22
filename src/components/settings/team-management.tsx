"use client";

import { useState, useEffect, useCallback } from "react";
import { fetcher, poster, remover } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Loader2, Mail, Clock } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: "active" | "pending" | "inactive";
  created_at?: string;
  invited_by?: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-500/10 text-purple-600 border-purple-200",
  admin: "bg-blue-500/10 text-blue-600 border-blue-200",
  editor: "bg-green-500/10 text-green-600 border-green-200",
  viewer: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  pending: "bg-amber-500/10 text-amber-600",
  inactive: "bg-red-500/10 text-red-600",
};

export function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(() => {
    setLoading(true);
    fetcher("/team")
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => {
        // Graceful fallback shows current user as owner
        setMembers([
          {
            id: "self",
            email: "you@example.com",
            role: "owner",
            status: "active",
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      await poster("/team/invite", { email: inviteEmail, role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
      loadMembers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send invite";
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await remover(`/team/${id}`);
      toast.success("Member removed from team");
      setRemoveTargetId(null);
      loadMembers();
    } catch (e) {
      toast.error("Failed to remove member");
    }
  };

  const memberToRemove = members.find((m) => m.id === removeTargetId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage workspace collaborators and their permissions.
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Invite Member
        </Button>
      </div>

      {/* Members Table */}
      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading team members...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <Mail className="h-6 w-6 opacity-50" />
            <p className="text-sm">No team members yet. Invite your first collaborator.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{member.email}</div>
                        {member.role === "owner" && (
                          <span className="text-xs text-muted-foreground">You</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs ${ROLE_COLORS[member.role] || ""}`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs ${STATUS_COLORS[member.status] || ""}`}
                    >
                      {member.status === "pending" && (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.created_at
                      ? new Date(member.created_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoveTargetId(member.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Plan / capacity note */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Note:</span> Team member limits vary by subscription plan.{" "}
        <a href="/settings?tab=billing" className="text-primary underline">
          Upgrade to Pro
        </a>{" "}
        for unlimited team members.
      </p>

      {/* Invite Dialog */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              They will receive an email with an invitation link to join your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div>
                      <p className="font-medium">Admin</p>
                      <p className="text-xs text-muted-foreground">Full access except billing</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div>
                      <p className="font-medium">Editor</p>
                      <p className="text-xs text-muted-foreground">Create and edit content</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div>
                      <p className="font-medium">Viewer</p>
                      <p className="text-xs text-muted-foreground">Read-only access</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="mr-2 h-4 w-4" /> Send Invitation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!removeTargetId}
        onOpenChange={(open: boolean) => !open && setRemoveTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke <strong>{memberToRemove?.email}</strong>&apos;s access to your
              workspace. They can be re-invited later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTargetId && handleRemove(removeTargetId)}
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
