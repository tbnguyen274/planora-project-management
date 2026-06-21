"use client"

import { useEffect, useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { toast } from "sonner"
import { Check, X, Bell } from "lucide-react"
import { supabase } from "../../lib/supabase-client"
import { 
  fetchPendingProjectInvitations, 
  acceptProjectInvitation, 
  rejectProjectInvitation,
} from "@backend/services/invitationService"
import type { ProjectInvitation } from "@backend/types"

export function InvitationsList() {
  const [invites, setInvites] = useState<ProjectInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email
        });
      }
    });
  }, []);

  // Fetch invitations
  const loadInvitations = async () => {
    if (!currentUser) return;
    const invitations = await fetchPendingProjectInvitations(supabase as any, currentUser.id);
    setInvites(invitations);
  };

  useEffect(() => {
    loadInvitations();
  }, [currentUser]);

  // Setup realtime subscription
  useEffect(() => {
    if (!currentUser) return;

    console.log('📡 Setting up invitations subscription');
    
    const channel = supabase
      .channel(`invitations_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'join_requests',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log('🔔 New invitation received:', payload);
          toast.info('Bạn có lời mời tham gia dự án mới!');
          loadInvitations();
        }
      )
      .subscribe((status) => {
        console.log('📡 Invitations subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Handle Accept
  const handleAccept = async (invitationId: string) => {
    if (!currentUser) return;
    
    setLoading(true);
    const result = await acceptProjectInvitation(supabase as any, {
      invitationId,
      currentUserId: currentUser.id,
      currentUserName: currentUser.name,
    });
    
    if (result.success) {
      await loadInvitations();
      setTimeout(() => window.location.reload(), 1000);
    }
    setLoading(false);
  };

  // Handle Reject
  const handleReject = async (invitationId: string) => {
    if (!currentUser) return;
    
    setLoading(true);
    const result = await rejectProjectInvitation(supabase as any, {
      invitationId,
      currentUserId: currentUser.id,
      currentUserName: currentUser.name,
    });
    
    if (result.success) {
      await loadInvitations();
    }
    setLoading(false);
  };

  if (invites.length === 0) return null;

  return (
    <div className="mb-6 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-lg text-gray-800">Lời mời tham gia dự án</h3>
      </div>
      
      <div className="grid gap-3">
        {invites.map((invite) => (
          <Card key={invite.id} className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  Bạn được mời tham gia: <span className="font-bold text-blue-700">{invite.projectName}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Từ: {invite.inviterName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Nhận ngày: {new Date(invite.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleReject(invite.id)}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-1" /> Từ chối
                </Button>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleAccept(invite.id)}
                  disabled={loading}
                >
                  <Check className="w-4 h-4 mr-1" /> Chấp nhận
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}