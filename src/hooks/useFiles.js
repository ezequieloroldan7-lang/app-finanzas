import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BUCKET = 'user-files';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function fromDb(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
    month: row.month,
    cardId: row.card_id,
    amount: row.amount != null ? Number(row.amount) : null,
    notes: row.notes,
  };
}

export function useFiles(userId) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`files-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFiles(prev =>
              prev.some(f => f.id === payload.new.id) ? prev : [fromDb(payload.new), ...prev],
            );
          } else if (payload.eventType === 'DELETE') {
            setFiles(prev => prev.filter(f => f.id !== payload.old.id));
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function load() {
    try {
      const { data, error } = await supabase
        .from('files').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false });
      if (error) throw error;
      setFiles(data.map(fromDb));
    } catch (err) {
      console.error('useFiles load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file, type, metadata) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo se aceptan: PDF, JPG, PNG, WEBP.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('El archivo es demasiado grande. Máximo permitido: 20 MB.');
    }
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (uploadErr) { console.error('uploadFile storage:', uploadErr); throw uploadErr; }

    const row = {
      user_id: userId,
      type,
      name: metadata.name || file.name,
      storage_path: path,
      month: metadata.month || null,
      card_id: metadata.cardId || null,
      amount: metadata.amount || null,
      notes: metadata.notes || null,
    };
    const { data, error: dbErr } = await supabase.from('files').insert(row).select().single();
    if (dbErr) { console.error('uploadFile db:', dbErr); throw dbErr; }
    const newFile = fromDb(data);
    setFiles(prev => [newFile, ...prev]);
    return newFile;
  }

  async function getDownloadUrl(storagePath) {
    const { data, error } = await supabase.storage
      .from(BUCKET).createSignedUrl(storagePath, 60 * 60);
    if (error) { console.error('getDownloadUrl:', error); return null; }
    return data.signedUrl;
  }

  async function deleteFile(id) {
    const file = files.find(f => f.id === id);
    if (!file) return;
    await supabase.storage.from(BUCKET).remove([file.storagePath]);
    const { error } = await supabase.from('files').delete().eq('id', id);
    if (error) { console.error('deleteFile:', error); return; }
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  return { files, loading, uploadFile, getDownloadUrl, deleteFile };
}
