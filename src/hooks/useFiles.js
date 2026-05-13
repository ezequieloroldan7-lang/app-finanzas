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
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('No hay conexión a internet. Intentá de nuevo cuando vuelvas online.');
    }

    const dotIdx = file.name.lastIndexOf('.');
    let ext = dotIdx > -1 ? file.name.slice(dotIdx + 1).toLowerCase() : '';
    if (!ext || ext.length > 5) {
      ext = file.type === 'application/pdf' ? 'pdf'
        : file.type === 'image/png' ? 'png'
        : file.type === 'image/webp' ? 'webp'
        : 'jpg';
    }
    const path = `${userId}/${Date.now()}.${ext}`;

    // Obtener el JWT de la sesión actual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sesión expirada. Volvé a iniciar sesión.');

    // Subir via proxy del servidor (evita problemas de CORS con Supabase Storage)
    let resp;
    try {
      resp = await fetch('/api/upload-file', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'Authorization': `Bearer ${session.access_token}`,
          'X-File-Path': path,
          'X-File-Type': file.type,
          'X-Metadata': JSON.stringify({
            type,
            name: metadata.name || file.name,
            month: metadata.month || null,
            cardId: metadata.cardId || null,
            amount: metadata.amount || null,
            notes: metadata.notes || null,
          }),
        },
        body: file,
      });
    } catch (fetchErr) {
      console.error('uploadFile proxy error:', fetchErr);
      throw new Error('Error de red al subir el archivo. Verificá tu conexión e intentá de nuevo.');
    }

    if (!resp.ok) {
      let errMsg = `Error ${resp.status} al subir el archivo`;
      try {
        const errData = await resp.json();
        errMsg = errData.error || errMsg;
      } catch {}
      if (resp.status === 413) {
        errMsg = 'El archivo es demasiado grande. Intentá con un archivo más pequeño (máx. ~4 MB via servidor).';
      }
      throw new Error(errMsg);
    }

    const data = await resp.json();
    const newFile = fromDb(data);
    setFiles(prev => prev.some(f => f.id === newFile.id) ? prev : [newFile, ...prev]);
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
