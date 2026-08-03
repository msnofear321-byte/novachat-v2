import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus, HiOutlineMagnifyingGlass,
  HiOutlineStar, HiOutlineTrash,
  HiOutlineMapPin, HiOutlinePhoto, HiOutlineCheckCircle,
  HiOutlineXMark, HiOutlineMicrophone, HiOutlineMusicalNote,
  HiOutlinePlay, HiOutlinePause, HiOutlineStop,
  HiOutlineDocumentText, HiOutlineListBullet,
} from 'react-icons/hi2';
import { HiStar } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { subscribeNotes, createNote, updateNote, deleteNote } from '@/services/notes';
import { uploadToCloudinary } from '@/services/cloudinary';
import { useRecorder } from '@/hooks/useRecorder';
import type { Note } from '@/types';

const NOTE_COLORS = [
  '', '#3b82f680', '#8b5cf680', '#ec489980', '#f59e0b80', '#10b98180', '#06b6d480',
];

const NOTE_TYPES = [
  { value: 'text' as const, label: 'Text', icon: HiOutlineDocumentText },
  { value: 'checklist' as const, label: 'Checklist', icon: HiOutlineListBullet },
  { value: 'image' as const, label: 'Image', icon: HiOutlinePhoto },
  { value: 'voice' as const, label: 'Voice', icon: HiOutlineMicrophone },
  { value: 'audio' as const, label: 'Audio', icon: HiOutlineMusicalNote },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<Note['type']>('text');
  const [editChecklist, setEditChecklist] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [editColor, setEditColor] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'favorites' | 'pinned'>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useRecorder();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    const unsub = subscribeNotes((data) => {
      setNotes(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredNotes = notes.filter((n) => {
    const term = search.toLowerCase();
    if (term && !n.title.toLowerCase().includes(term) && !n.content.toLowerCase().includes(term)) return false;
    if (filter === 'favorites') return n.favorite;
    if (filter === 'pinned') return n.pinned;
    return true;
  });

  function openNewNote() {
    setEditing(null);
    setEditTitle('');
    setEditContent('');
    setEditType('text');
    setEditChecklist([]);
    setEditColor('');
    setEditMediaUrl('');
    setEditImages([]);
    setShowEditor(true);
    setAudioPlaying(false);
  }

  function openEditNote(note: Note) {
    setEditing(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditType(note.type);
    setEditChecklist(note.checklist || []);
    setEditColor(note.color || '');
    setEditMediaUrl(note.mediaUrl || '');
    setEditImages(note.images || []);
    setShowEditor(true);
    setAudioPlaying(false);
  }

  async function uploadFile(file: File): Promise<string> {
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadToCloudinary(file, (p) => setUploadProgress(p));
      return result.secure_url;
    } finally {
      setUploading(false);
    }
  }

  async function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = await uploadFile(file);
      setEditImages((prev) => [...prev, url]);
      if (!editMediaUrl) setEditMediaUrl(url);
    };
    input.click();
  }

  async function handleAudioFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mp3,audio/mpeg,audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = await uploadFile(file);
      setEditMediaUrl(url);
    };
    input.click();
  }

  async function handleSave() {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
        title: editTitle.trim(),
        content: editType === 'voice' ? `Voice note (${formatTime(duration)})` : editContent,
        type: editType,
        mediaUrl: editMediaUrl || '',
        checklist: editChecklist,
        pinned: editing?.pinned || false,
        favorite: editing?.favorite || false,
        images: editImages,
        color: editColor,
      };
      if (editing) {
        await updateNote(editing.id, data);
      } else {
        await createNote(data);
      }
      setShowEditor(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    await deleteNote(noteId);
  }

  async function handleTogglePin(note: Note) {
    await updateNote(note.id, { pinned: !note.pinned });
  }

  async function handleToggleFavorite(note: Note) {
    await updateNote(note.id, { favorite: !note.favorite });
  }

  function handlePlayPause() {
    if (!audioRef.current || !editMediaUrl) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {});
    }
  }

  function addChecklistItem() {
    setEditChecklist((prev) => [...prev, { id: crypto.randomUUID(), text: '', done: false }]);
  }

  function updateChecklistItem(id: string, text: string) {
    setEditChecklist((prev) => prev.map((item) => item.id === id ? { ...item, text } : item));
  }

  function toggleChecklistItem(id: string) {
    setEditChecklist((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  function removeChecklistItem(id: string) {
    setEditChecklist((prev) => prev.filter((item) => item.id !== id));
  }

  const noteTypeIcon = (type: Note['type']) => {
    const t = NOTE_TYPES.find((nt) => nt.value === type);
    if (!t) return null;
    const Icon = t.icon;
    return <Icon className="w-3.5 h-3.5" />;
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-[20px] font-bold text-[var(--text-primary)] flex-1">Notes</h1>
          <motion.button whileTap={{ scale: 0.9 }} onClick={openNewNote}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white">
            <HiOutlinePlus className="w-5 h-5" />
          </motion.button>
        </div>
        <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[14px] px-3 py-2">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..." className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none" />
          {search && <button onClick={() => setSearch('')}><HiOutlineXMark className="w-4 h-4 text-[var(--text-muted)]" /></button>}
        </div>
        <div className="flex gap-2 mt-3">
          {(['all', 'pinned', 'favorites'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all ${
                filter === f ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)]'
              }`}>
              {f === 'all' ? 'All' : f === 'pinned' ? '\u{1F4CC} Pinned' : '\u{2B50} Favorites'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-[22px] bg-[var(--hover-bg)] flex items-center justify-center mb-4">
              <span className="text-[2rem]">{search ? '\u{1F50D}' : '\u{1F4DD}'}</span>
            </div>
            <p className="text-[var(--text-secondary)] text-[14px]">
              {search ? 'No notes match your search' : 'No notes yet'}
            </p>
            <p className="text-[var(--text-muted)] text-[13px] mt-1">
              {search ? 'Try a different keyword' : 'Tap + to create your first note'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredNotes.map((note) => (
              <motion.div key={note.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="premium-card p-4 cursor-pointer group relative overflow-hidden"
                style={note.color ? { borderColor: note.color } : {}}
                onClick={() => openEditNote(note)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {noteTypeIcon(note.type)}
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{note.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {note.pinned && <HiOutlineMapPin className="w-3.5 h-3.5 text-[var(--accent-primary)] rotate-45" />}
                    {note.favorite && <HiStar className="w-3.5 h-3.5 text-[var(--accent-star)]" />}
                  </div>
                </div>

                {note.type === 'text' && note.content && (
                  <p className="text-[12px] text-[var(--text-secondary)] line-clamp-3 leading-relaxed">{note.content}</p>
                )}

                {note.type === 'checklist' && note.checklist && note.checklist.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {note.checklist.slice(0, 3).map((item: { id: string; text: string; done: boolean }) => (
                      <div key={item.id} className="flex items-center gap-1.5">
                        <div className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${item.done ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-primary)]'}`}>
                          {item.done && <HiOutlineCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-[11px] ${item.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{item.text}</span>
                      </div>
                    ))}
                    {note.checklist.length > 3 && <span className="text-[10px] text-[var(--text-muted)]">+{note.checklist.length - 3} more</span>}
                  </div>
                )}

                {note.type === 'voice' && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[var(--bg-input)] rounded-[10px]">
                    <HiOutlineMicrophone className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="text-[12px] text-[var(--text-secondary)]">{note.content || 'Voice note'}</span>
                  </div>
                )}

                {note.type === 'audio' && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[var(--bg-input)] rounded-[10px]">
                    <HiOutlineMusicalNote className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="text-[12px] text-[var(--text-secondary)] truncate flex-1">{note.content || 'Audio note'}</span>
                  </div>
                )}

                {(note.images && note.images.length > 0) || (note.type === 'image' && note.mediaUrl) ? (
                  <div className="mt-2 flex gap-1">
                    {note.images && note.images.slice(0, 3).map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="w-10 h-10 rounded-[8px] object-cover" />
                    ))}
                    {note.type === 'image' && note.mediaUrl && (!note.images || note.images.length === 0) && (
                      <img src={note.mediaUrl} alt="" className="w-10 h-10 rounded-[8px] object-cover" />
                    )}
                    {note.images && note.images.length > 3 && (
                      <div className="w-10 h-10 rounded-[8px] bg-[var(--bg-input)] flex items-center justify-center text-[10px] text-[var(--text-muted)]">+{note.images.length - 3}</div>
                    )}
                  </div>
                ) : null}

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-primary)]/50">
                  <span className="text-[10px] text-[var(--text-muted)]">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}
                      className={`w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-[var(--hover-bg)] ${note.pinned ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                      <HiOutlineMapPin className="w-3.5 h-3.5 rotate-45" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(note); }}
                      className={`w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-[var(--hover-bg)] ${note.favorite ? 'text-[var(--accent-star)]' : 'text-[var(--text-muted)]'}`}>
                      {note.favorite ? <HiStar className="w-3.5 h-3.5" /> : <HiOutlineStar className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]">
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEditor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowEditor(false)} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-4 md:inset-x-auto md:inset-y-4 md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-50 flex flex-col bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-[24px] shadow-[var(--shadow-xl)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
                <div className="flex gap-1.5">
                  {NOTE_COLORS.map((c) => (
                    <button key={c || 'none'} onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${editColor === c ? 'border-[var(--accent-primary)] scale-110' : 'border-transparent'}`}
                      style={{ background: c || 'var(--bg-input)' }} />
                  ))}
                </div>
                <div className="flex-1" />
                <button onClick={() => setShowEditor(false)}
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              </div>

              {!editing && (
                <div className="flex gap-1.5 px-4 pt-3 pb-1 overflow-x-auto custom-scrollbar">
                  {NOTE_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button key={t.value} onClick={() => { setEditType(t.value); setEditMediaUrl(''); setEditImages([]); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium whitespace-nowrap transition-all ${
                          editType === t.value ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)]'
                        }`}>
                        <Icon className="w-4 h-4" /> {t.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Note title..." autoFocus
                  className="w-full text-[20px] font-bold bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none" />

                {editType === 'text' && (
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Start writing..." rows={6}
                    className="w-full bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none leading-relaxed" />
                )}

                {editType === 'checklist' && (
                  <>
                    {editChecklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <button onClick={() => toggleChecklistItem(item.id)}
                          className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 ${item.done ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-primary)]'}`}>
                          {item.done && <HiOutlineCheckCircle className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <input type="text" value={item.text} onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                          placeholder="Checklist item..." className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none" />
                        <button onClick={() => removeChecklistItem(item.id)} className="text-[var(--text-muted)] hover:text-[var(--danger)]">
                          <HiOutlineXMark className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addChecklistItem}
                      className="flex items-center gap-2 text-[13px] text-[var(--accent-primary)] hover:underline">
                      <HiOutlinePlus className="w-4 h-4" /> Add checklist item
                    </button>
                  </>
                )}

                {editType === 'voice' && (
                  <div className="space-y-3">
                    {!isRecording && !editMediaUrl ? (
                      <button onClick={async () => { await startRecording(); }}
                        className="w-full flex flex-col items-center gap-3 py-10 bg-[var(--bg-input)] border border-dashed border-[var(--border-primary)] rounded-[16px] hover:border-[var(--accent-primary)]/30 active:scale-[0.98] transition-all">
                        <HiOutlineMicrophone className="w-10 h-10 text-[var(--accent-primary)]" />
                        <span className="text-[14px] font-medium text-[var(--text-secondary)]">Tap to Record</span>
                      </button>
                    ) : isRecording ? (
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div className="flex items-center gap-2">
                          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-3 h-3 rounded-full bg-[var(--danger)]" />
                          <span className="text-[16px] font-mono font-bold text-[var(--text-primary)]">{formatTime(duration)}</span>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={async () => {
                            const blob = await stopRecording();
                            if (blob) {
                              const url = await uploadFile(blob as File);
                              setEditMediaUrl(url);
                            }
                          }}
                            className="px-6 py-2.5 bg-[var(--accent-primary)] text-white rounded-[12px] text-[13px] font-medium flex items-center gap-2">
                            <HiOutlineStop className="w-4 h-4" /> Stop & Save
                          </button>
                          <button onClick={cancelRecording}
                            className="px-6 py-2.5 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[12px] text-[13px] font-medium text-[var(--text-muted)]">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-input)] rounded-[12px]">
                        <HiOutlineMicrophone className="w-5 h-5 text-[var(--accent-primary)]" />
                        <span className="flex-1 text-[13px] text-[var(--text-secondary)]">Voice note recorded</span>
                        <button onClick={() => { setEditMediaUrl(''); }}
                          className="text-[var(--text-muted)] hover:text-[var(--danger)]">
                          <HiOutlineXMark className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {uploading && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }} className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] rounded-full" />
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] text-right">{uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                )}

                {editType === 'image' && (
                  <div className="space-y-3">
                    <button onClick={handleImageUpload}
                      className="w-full flex flex-col items-center gap-3 py-10 bg-[var(--bg-input)] border border-dashed border-[var(--border-primary)] rounded-[16px] hover:border-[var(--accent-primary)]/30 active:scale-[0.98] transition-all">
                      <HiOutlinePhoto className="w-10 h-10 text-[var(--accent-primary)]" />
                      <span className="text-[14px] font-medium text-[var(--text-secondary)]">Upload Image</span>
                    </button>
                    {uploading && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }} className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] rounded-full" />
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] text-right">{uploadProgress}%</p>
                      </div>
                    )}
                    {editImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editImages.map((img, i) => (
                          <div key={i} className="relative group">
                            <img src={img} alt="" className="w-20 h-20 rounded-[10px] object-cover" />
                            <button onClick={() => setEditImages((prev) => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <HiOutlineXMark className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editType === 'audio' && (
                  <div className="space-y-3">
                    {!editMediaUrl ? (
                      <button onClick={handleAudioFileUpload}
                        className="w-full flex flex-col items-center gap-3 py-10 bg-[var(--bg-input)] border border-dashed border-[var(--border-primary)] rounded-[16px] hover:border-[var(--accent-primary)]/30 active:scale-[0.98] transition-all">
                        <HiOutlineMusicalNote className="w-10 h-10 text-[var(--accent-primary)]" />
                        <span className="text-[14px] font-medium text-[var(--text-secondary)]">Upload MP3 / Audio</span>
                        <span className="text-[11px] text-[var(--text-muted)]">MP3, WAV, OGG, M4A</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-input)] rounded-[12px]">
                        <button onClick={handlePlayPause}
                          className="w-9 h-9 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center hover:opacity-90 transition-all shrink-0">
                          {audioPlaying ? <HiOutlinePause className="w-4 h-4" /> : <HiOutlinePlay className="w-4 h-4 ml-0.5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">Audio file</p>
                        </div>
                        <button onClick={() => { setEditMediaUrl(''); setAudioPlaying(false); }}
                          className="text-[var(--text-muted)] hover:text-[var(--danger)]">
                          <HiOutlineXMark className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {uploading && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }} className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] rounded-full" />
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] text-right">{uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-[var(--border-primary)] flex items-center gap-2">
                {(editType === 'image' || editType === 'text') && editType !== 'image' && (
                  <button onClick={handleImageUpload}
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
                    <HiOutlinePhoto className="w-4 h-4" /> Image
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={() => setShowEditor(false)}
                  className="px-4 py-2 rounded-[12px] text-[13px] font-medium border border-[var(--border-primary)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]">
                  Cancel
                </button>
                <button onClick={handleSave}
                  disabled={!editTitle.trim() || saving || (editType === 'voice' && isRecording) || (editType === 'image' && editImages.length === 0 && !editMediaUrl) || (editType === 'audio' && !editMediaUrl) || uploading}
                  className="px-5 py-2 rounded-[12px] text-[13px] font-medium text-white bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] disabled:opacity-50">
                  {saving || uploading ? 'Saving...' : editing ? 'Update' : 'Save'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <audio ref={audioRef} onEnded={() => setAudioPlaying(false)} />
    </div>
  );
}
