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
    // Derive a safe extension; fall back to MIME map if filename lacks one.
    const dotIdx = file.name.lastIndexOf('.');
    let ext = dotIdx > -1 ? file.name.slice(dotIdx + 1).toLowerCase() : '';
    if (!ext || ext.length > 5) {
      ext = file.type === 'application/pdf' ? 'pdf'
        : file.type === 'image/png' ? 'png'
        : file.type === 'image/webp' ? 'webp'
        : 'jpg';
    }
    const path = `${userId}/${Date.now()}.${ext}`;

    // Wrap the call: supabase-js usually returns { error }, but network-level
    // failures (CORS, offline, blocked) are thrown as raw TypeError("Failed to fetch").
    let uploadErr = null;
    try {
      const res = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      uploadErr = res.error;
    } catch (e) {
      uploadErr = e;
    }
    if (uploadErr) {
      console.error('uploadFile storage:', uploadErr);
      const msg = uploadErr.message || String(uploadErr);
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        throw new Error(
          'No se pudo conectar con Supabase Storage. Suele pasar cuando: ' +
          '1) el bucket "user-files" no existe; ' +
          '2) el bucket no tiene CORS habilitado para este dominio; ' +
          '3) tu red bloquea el upload. Revisá Storage en tu proyecto de Supabase.'
        );
      }
      if (/bucket not found/i.test(msg)) {
        throw new Error('Bucket "user-files" no existe en Supabase Storage. Creálo y agregale políticas RLS.');
      }
      if (/duplicate|already exists/i.test(msg)) {
        throw new Error('Ya existe un archivo con ese nombre. Probá de nuevo.');
      }
      if (/permission|policy|violates|unauthorized|401|403/i.test(msg)) {
        throw new Error('Sin permisos en Storage. Verificá las políticas RLS del bucket "user-files".');
      }
      if (/payload too large|413/i.test(msg)) {
        throw new Error('El archivo supera el límite del bucket. Reducí el tamaño o subí el límite en Supabase.');
      }
      throw new Error('No se pudo subir el archivo: ' + msg);
    }

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
    let dbErr = null;
    let data = null;
    try {
      const res = await supabase.from('files').insert(row).select().single();
      dbErr = res.error;
      data = res.data;
    } catch (e) {
      dbErr = e;
    }
    if (dbErr) {
      console.error('uploadFile db:', dbErr);
      // Cleanup storage object so we don't leave orphans behind
      try { await supabase.storage.from(BUCKET).remove([path]); } catch {}
      const msg = dbErr.message || String(dbErr);
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        throw new Error('Se subió el archivo pero falló el guardado en la base. Revisá tu conexión e intentá de nuevo.');
      }
      if (/relation .* does not exist|files.*does not exist/i.test(msg)) {
        throw new Error('La tabla "files" no existe en Supabase. Ejecutá las migraciones SQL.');
      }
      if (/permission|policy|violates row-level/i.test(msg)) {
        throw new Error('Sin permisos para guardar el archivo. Revisá las políticas RLS de la tabla "files".');
      }
      throw new Error('No se pudo registrar el archivo: ' + msg);
    }
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
