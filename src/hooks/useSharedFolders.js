import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uid } from '../lib/formatters';

function folderFromDb(row) {
  return { id: row.id, name: row.name, createdBy: row.created_by, createdAt: row.created_at };
}

function memberFromDb(row) {
  return { folderId: row.folder_id, userId: row.user_id, email: row.email, displayName: row.display_name, role: row.role };
}

function inviteFromDb(row) {
  return { id: row.id, folderId: row.folder_id, invitedEmail: row.invited_email, invitedBy: row.invited_by };
}

function formatDisplayName(email) {
  return email.split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || email.split('@')[0];
}

async function safeQuery(queryFn) {
  try {
    const { data } = await queryFn();
    return data || [];
  } catch {
    return [];
  }
}

export function useSharedFolders(userId, userEmail, onPartnerJoined) {
  const [folders, setFolders] = useState([]);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [pendingReceivedInvites, setPendingReceivedInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tablesReady, setTablesReady] = useState(true);
  const channelRef = useRef(null);
  const knownMemberIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userId || !userEmail) { setLoading(false); return; }
    load();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, userEmail]);

  async function load() {
    setLoading(true);
    try {
      const { error: tableCheckErr } = await supabase.from('shared_folders').select('id').limit(1);
      if (tableCheckErr) {
        const msg = (tableCheckErr.message || '').toLowerCase();
        const isMissing = msg.includes('does not exist') || msg.includes('relation') || tableCheckErr.code === '42P01';
        setTablesReady(!isMissing);
        return;
      }
      setTablesReady(true);

      // Load invites received by this user (sent to their email)
      const receivedInvites = await safeQuery(() =>
        supabase.from('shared_folder_invites').select('*').eq('invited_email', userEmail),
      );

      // Check which of those folders the user has already joined
      const invitedFolderIds = receivedInvites.map(i => i.folder_id);
      let acceptedFolderIds = new Set();
      if (invitedFolderIds.length > 0) {
        const memberChecks = await safeQuery(() =>
          supabase.from('shared_folder_members')
            .select('folder_id')
            .eq('user_id', userId)
            .in('folder_id', invitedFolderIds),
        );
        memberChecks.forEach(r => acceptedFolderIds.add(r.folder_id));
      }

      // Pending invites = invited but not yet a member — UI prompts the user to accept
      const pending = receivedInvites.filter(i => !acceptedFolderIds.has(i.folder_id));
      setPendingReceivedInvites(pending.map(inviteFromDb));

      // Folders created by this user
      const createdFolders = await safeQuery(() =>
        supabase.from('shared_folders').select('*').eq('created_by', userId),
      );
      const allFolders = createdFolders.map(folderFromDb);

      // Member-based folders (may fail due to RLS)
      const memberRows = await safeQuery(() =>
        supabase.from('shared_folder_members').select('folder_id').eq('user_id', userId),
      );
      if (memberRows.length > 0) {
        const folderIds = memberRows.map(r => r.folder_id).filter(id => !allFolders.find(f => f.id === id));
        if (folderIds.length > 0) {
          const extra = await safeQuery(() =>
            supabase.from('shared_folders').select('*').in('id', folderIds),
          );
          allFolders.push(...extra.map(folderFromDb));
        }
      }

      // Invite-based folder discovery — only for already-accepted invites (member RLS fallback)
      const acceptedInvites = receivedInvites.filter(i => acceptedFolderIds.has(i.folder_id));
      for (const invite of acceptedInvites) {
        if (!allFolders.find(f => f.id === invite.folder_id)) {
          allFolders.push({ id: invite.folder_id, name: 'Gastos en pareja', createdBy: invite.invited_by });
        }
      }

      setFolders(allFolders);

      // Load members
      if (allFolders.length > 0) {
        const membersData = await safeQuery(() =>
          supabase.from('shared_folder_members').select('*').in('folder_id', allFolders.map(f => f.id)),
        );
        const mapped = membersData.map(memberFromDb);
        // Detect when a partner (non-self) member appears for the first time
        const known = knownMemberIdsRef.current;
        if (known.size > 0) {
          for (const m of mapped) {
            if (m.userId !== userId && !known.has(m.userId)) {
              onPartnerJoined?.(m);
            }
          }
        }
        mapped.forEach(m => known.add(m.userId));
        setMembers(mapped);
      }

      // Load invites sent by this user
      const sentInvites = await safeQuery(() =>
        supabase.from('shared_folder_invites').select('*').eq('invited_by', userId),
      );
      setInvites(sentInvites.map(inviteFromDb));

      // Real-time: reload when membership or invite rows change for this user's folders
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (allFolders.length > 0) {
        const folderIds = allFolders.map(f => f.id);
        const memberFilter = folderIds.length === 1
          ? `folder_id=eq.${folderIds[0]}`
          : `folder_id=in.(${folderIds.join(',')})`;
        channelRef.current = supabase
          .channel(`shared-folders-${userId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_folder_members', filter: memberFilter }, () => load())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_folder_invites', filter: `invited_by=eq.${userId}` }, () => load())
          .subscribe();
      }
    } catch (e) {
      console.error('useSharedFolders:', e);
    } finally {
      setLoading(false);
    }
  }

  async function createFolder(name) {
    const folderId = uid();
    const { error: folderErr } = await supabase.from('shared_folders').insert({ id: folderId, name, created_by: userId });
    if (folderErr) throw folderErr;
    const { error: memberErr } = await supabase.from('shared_folder_members').insert({
      folder_id: folderId, user_id: userId, email: userEmail,
      display_name: formatDisplayName(userEmail), role: 'owner',
    });
    if (memberErr) throw memberErr;
    const newFolder = { id: folderId, name, createdBy: userId };
    setFolders(prev => [...prev, newFolder]);
    setMembers(prev => [...prev, { folderId, userId, email: userEmail, role: 'owner' }]);
    return newFolder;
  }

  async function inviteMember(folderId, email) {
    const { error } = await supabase.from('shared_folder_invites').insert({
      folder_id: folderId,
      invited_email: email.toLowerCase().trim(),
      invited_by: userId,
    });
    if (error) throw error;
    const newInvite = { id: uid(), folderId, invitedEmail: email.toLowerCase().trim(), invitedBy: userId };
    setInvites(prev => {
      const exists = prev.find(i => i.folderId === folderId && i.invitedEmail === email.toLowerCase().trim());
      return exists ? prev : [...prev, newInvite];
    });
  }

  async function removePartner(email) {
    const folderId = myFolder?.id;
    if (!folderId) return;
    // Remove invite
    await supabase.from('shared_folder_invites')
      .delete().eq('folder_id', folderId).eq('invited_email', email.toLowerCase().trim());
    // Remove member row (best effort — may fail if RLS blocks it)
    const member = folderMembers.find(m => m.email === email.toLowerCase().trim());
    if (member) {
      await supabase.from('shared_folder_members')
        .delete().eq('folder_id', folderId).eq('user_id', member.userId);
    }
    setInvites(prev => prev.filter(i => !(i.folderId === folderId && i.invitedEmail === email.toLowerCase().trim())));
    setMembers(prev => prev.filter(m => !(m.folderId === folderId && m.email === email.toLowerCase().trim())));
  }

  async function renamePartner(memberUserId, newName) {
    const folderId = myFolder?.id;
    if (!folderId) return;
    await supabase.from('shared_folder_members')
      .update({ display_name: newName }).eq('folder_id', folderId).eq('user_id', memberUserId);
    setMembers(prev => prev.map(m =>
      m.folderId === folderId && m.userId === memberUserId ? { ...m, displayName: newName } : m,
    ));
  }

  async function acceptInvite(invite) {
    try {
      await supabase.from('shared_folder_members').upsert({
        folder_id: invite.folderId,
        user_id: userId,
        email: userEmail,
        display_name: formatDisplayName(userEmail),
        role: 'member',
      });
      // Delete the invite row so the inviter's realtime subscription fires
      // and they see the partner as "Activo" instead of "Pendiente".
      await supabase.from('shared_folder_invites').delete().eq('id', invite.id);
      setPendingReceivedInvites(prev => prev.filter(i => i.id !== invite.id));
      await load();
    } catch (e) {
      throw new Error('No se pudo aceptar la invitación: ' + (e?.message || 'error'));
    }
  }

  async function rejectInvite(invite) {
    try {
      await supabase.from('shared_folder_invites').delete().eq('id', invite.id);
      setPendingReceivedInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (e) {
      throw new Error('No se pudo rechazar la invitación: ' + (e?.message || 'error'));
    }
  }

  const myFolder = folders[0] || null;
  const folderMembers = myFolder ? members.filter(m => m.folderId === myFolder.id) : [];
  const folderInvites = myFolder ? invites.filter(i => i.folderId === myFolder.id) : [];

  return {
    folders, myFolder, members: folderMembers, invites: folderInvites,
    pendingReceivedInvites, loading, tablesReady,
    createFolder, inviteMember, removePartner, renamePartner,
    acceptInvite, rejectInvite, reload: load,
  };
}
