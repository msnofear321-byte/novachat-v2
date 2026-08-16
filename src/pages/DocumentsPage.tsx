import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlineCamera,
  HiOutlinePhoto,
  HiOutlineDocumentArrowUp,
  HiOutlineChevronRight,
  HiOutlineXMark,
  HiOutlineArrowDownTray,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineFolder,
  HiOutlineLockClosed,
} from 'react-icons/hi2';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  getDocumentDownloadUrl,
  deleteDocumentFile,
} from '@/services/documents';
import type { UserDocument, DocumentCategory } from '@/types';

const DOCUMENT_CATEGORIES: { id: DocumentCategory; label: string; emoji: string }[] = [
  { id: 'aadhaar', label: 'Aadhaar', emoji: '🪪' },
  { id: 'pan', label: 'PAN Card', emoji: '💳' },
  { id: 'college-id', label: 'College ID', emoji: '🎓' },
  { id: 'school-id', label: 'School ID', emoji: '🏫' },
  { id: 'driving-licence', label: 'Driving Licence', emoji: '🚗' },
  { id: 'passport', label: 'Passport', emoji: '🛂' },
  { id: 'certificates', label: 'Certificates', emoji: '📜' },
  { id: 'other', label: 'Other Documents', emoji: '📁' },
];

function categoryMeta(id: string): { label: string; emoji: string } {
  return DOCUMENT_CATEGORIES.find((c) => c.id === id) ?? { label: 'Other Documents', emoji: '📁' };
}

function formatDate(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<'all' | DocumentCategory>('all');

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileType, setPendingFileType] = useState<'image' | 'pdf'>('image');
  const [addCategory, setAddCategory] = useState<DocumentCategory>('other');
  const [addName, setAddName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [addError, setAddError] = useState('');

  const [viewer, setViewer] = useState<UserDocument | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const [renameDoc, setRenameDoc] = useState<UserDocument | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<UserDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const urlCacheRef = useRef<Map<string, string>>(new Map());
  const pendingPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    const unsub = subscribeDocuments(
      (data) => {
        setDocuments(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load documents:', err);
        setLoadError('Couldn\u2019t load your documents.');
        setLoading(false);
      },
    );
    return unsub;
  }, [user, reloadKey]);

  useEffect(() => {
    const cache = urlCacheRef.current;
    const pending = pendingPreviewUrlRef.current;
    return () => {
      cache.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      if (pending?.startsWith('blob:')) URL.revokeObjectURL(pending);
    };
  }, []);

  const visibleDocuments = filter === 'all'
    ? documents
    : documents.filter((d) => d.category === filter);

  const loadViewerUrl = useCallback((storagePath: string) => {
    let cancelled = false;
    setViewerLoading(true);
    setViewerError(null);
    const cached = urlCacheRef.current.get(storagePath);
    if (cached) setViewerUrl(cached);
    getDocumentDownloadUrl(storagePath)
      .then((url) => {
        if (cancelled) return;
        const prev = urlCacheRef.current.get(storagePath);
        urlCacheRef.current.set(storagePath, url);
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        setViewerUrl(url);
      })
      .catch((e) => {
        console.error('Failed to load document preview:', e);
        if (!cancelled && !urlCacheRef.current.has(storagePath)) {
          setViewerError('Couldn\u2019t load this document.');
        }
      })
      .finally(() => { if (!cancelled) setViewerLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!viewer) return;
    const cancel = loadViewerUrl(viewer.storagePath);
    return cancel;
  }, [viewer, loadViewerUrl]);

  const closeAdd = useCallback(() => {
    if (pendingPreviewUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
    }
    pendingPreviewUrlRef.current = null;
    setPendingFile(null);
    setPendingFileType('image');
    setUploadProgress(0);
    setAddError('');
    setAddOpen(false);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAddSheetOpen(false);
        if (addOpen) closeAdd();
        setRenameDoc(null);
        setConfirmDelete(null);
        setViewer(null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [addOpen, closeAdd]);

  function openAdd() {
    setAddOpen(false);
    setAddError('');
    setAddSheetOpen(true);
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>, expected: 'image' | 'pdf') {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if ((expected === 'image' && !isImage) || (expected === 'pdf' && !isPdf) || (!isImage && !isPdf)) {
      setAddError('Only images and PDF files are supported.');
      setAddOpen(false);
      return;
    }
    if (pendingPreviewUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(pendingPreviewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    pendingPreviewUrlRef.current = previewUrl;
    const base = file.name.replace(/\.[^/.]+$/, '');
    setPendingFile(file);
    setPendingFileType(isImage ? 'image' : 'pdf');
    setAddCategory('other');
    setAddName(base.trim() ? base : 'Document');
    setUploadProgress(0);
    setAddError('');
    setAddSheetOpen(false);
    setAddOpen(true);
  }

  async function handleSave() {
    if (!pendingFile || !user) return;
    const name = addName.trim();
    if (!name) {
      setAddError('Please enter a document name.');
      return;
    }
    setSaving(true);
    setUploadProgress(0);
    setAddError('');
    const docId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const newDoc: UserDocument = {
      id: docId,
      ownerId: user.uid,
      category: addCategory,
      name,
      fileType: pendingFileType,
      mimeType: pendingFile.type || 'application/octet-stream',
      fileName: pendingFile.name,
      fileSize: pendingFile.size,
      storagePath: `documents/${user.uid}/${docId}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await uploadDocumentFile(pendingFile, docId, setUploadProgress);
      try {
        await createDocument(newDoc);
      } catch (e) {
        await deleteDocumentFile(newDoc.storagePath).catch(() => {});
        throw e;
      }
      if (pendingPreviewUrlRef.current?.startsWith('blob:')) {
        urlCacheRef.current.set(newDoc.storagePath, pendingPreviewUrlRef.current);
        pendingPreviewUrlRef.current = null;
      }
      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
      closeAdd();
      setViewer(newDoc);
    } catch (e) {
      console.error('Failed to add document:', e);
      setAddError('Couldn\u2019t upload the document. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRename() {
    if (!renameDoc) return;
    const name = renameValue.trim();
    if (!name) return;
    setRenaming(true);
    try {
      await updateDocument(renameDoc.id, { name });
      if (viewer && viewer.id === renameDoc.id) setViewer({ ...viewer, name });
      setRenameDoc(null);
    } catch (e) {
      console.error('Rename failed:', e);
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteDocument(confirmDelete.id, confirmDelete.storagePath);
      if (viewer && viewer.id === confirmDelete.id) setViewer(null);
      setConfirmDelete(null);
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownload(doc: UserDocument) {
    try {
      const url = await getDocumentDownloadUrl(doc.storagePath);
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = doc.fileName || `${doc.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      console.error('Download failed:', e);
    }
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Documents</h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
              <HiOutlineLockClosed className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
              Personal &amp; private — only you can see these
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={openAdd}
            aria-label="Add document"
            className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white shadow-[var(--accent-shadow)] hover:shadow-[var(--accent-shadow-lg)] transition-shadow"
          >
            <HiOutlinePlus className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
              filter === 'all'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            All
          </button>
          {DOCUMENT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                filter === c.id
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Add card */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={openAdd}
          className="w-full mb-4 flex items-center justify-center gap-2.5 rounded-[18px] border-2 border-dashed border-[var(--border-primary)] px-4 py-4 text-[var(--text-secondary)] hover:border-[var(--border-accent)] hover:text-[var(--accent-primary)] transition-all"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span className="text-[14px] font-semibold">Add Document</span>
        </motion.button>

        {/* Error toast */}
        <AnimatePresence>
          {addError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 bg-[var(--danger-bg)] border border-[var(--danger)]/40 rounded-[14px] px-4 py-3"
            >
              <p className="text-[var(--danger)] text-[13px] text-center">{addError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Documents list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-[2.5px] border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-[13px] text-[var(--danger)]">{loadError}</p>
            <button onClick={() => setReloadKey((k) => k + 1)}
              className="mt-3 px-4 py-2.5 rounded-[12px] bg-[var(--accent-primary)] text-white text-[13px] font-medium">
              Try Again
            </button>
          </div>
        ) : visibleDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center mb-4">
              <HiOutlineFolder className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[15px] font-semibold text-[var(--text-primary)]">
              {documents.length === 0 ? 'No documents yet' : 'Nothing in this category'}
            </p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1 max-w-[280px]">
              {documents.length === 0
                ? 'Add your Aadhaar, PAN, IDs, certificates and more. They stay private to you.'
                : 'Documents you add here will show up under this category.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleDocuments.map((doc, i) => {
              const meta = categoryMeta(doc.category);
              return (
                <motion.button
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setViewer(doc)}
                  className="premium-card premium-card-hover w-full flex items-center gap-3.5 p-4 text-left"
                >
                  <div className="w-12 h-12 rounded-[14px] bg-[var(--bg-input)] border border-[var(--border-primary)] flex items-center justify-center text-[22px] flex-shrink-0">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-semibold text-[var(--text-primary)] truncate">{doc.name}</p>
                    <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">
                      {meta.label} · {formatDate(doc.updatedAt)}
                      {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ''}
                    </p>
                  </div>
                  <HiOutlineChevronRight className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Hidden file inputs */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handleFileChosen(e, 'image')} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFileChosen(e, 'image')} />
        <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => handleFileChosen(e, 'pdf')} />
      </div>

      {/* Add source sheet */}
      <AnimatePresence>
        {addSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={() => setAddSheetOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[81] glass-premium rounded-t-[22px] border-t border-[var(--border-primary)] pb-[calc(env(safe-area-inset-bottom)+12px)]"
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--border-primary)]" />
              </div>
              <div className="px-5 pt-3 pb-2">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Add Document</h3>
                <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Choose how you want to add it</p>
              </div>
              <div className="px-3 pb-3 space-y-1">
                <SheetOption icon={HiOutlineCamera} title="Take Photo" subtitle="Capture using your camera"
                  onClick={() => cameraRef.current?.click()} />
                <SheetOption icon={HiOutlinePhoto} title="Choose from Gallery" subtitle="Pick an image from your device"
                  onClick={() => galleryRef.current?.click()} />
                <SheetOption icon={HiOutlineDocumentArrowUp} title="Upload PDF" subtitle="Add a PDF file"
                  onClick={() => pdfRef.current?.click()} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add document modal */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={closeAdd} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-[400px] mx-auto max-h-[85dvh] overflow-y-auto custom-scrollbar glass-premium rounded-[20px] p-5 z-[81]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Add Document</h3>
                <button onClick={closeAdd} aria-label="Close"
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all">
                  <HiOutlineXMark className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Document Name</label>
                <input
                  value={addName}
                  onChange={(e) => { setAddName(e.target.value); if (addError) setAddError(''); }}
                  placeholder="e.g. Aadhaar Card"
                  className="input-premium w-full px-4 py-3"
                />
              </div>

              <div className="mb-5">
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2 ml-1">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAddCategory(c.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-[13px] font-medium text-left transition-all ${
                        addCategory === c.id
                          ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30'
                          : 'bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <span className="text-[18px]">{c.emoji}</span>
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {addError && (
                <p className="text-[var(--danger)] text-[12px] mb-3 ml-1">{addError}</p>
              )}

              {saving && (
                <div className="w-full h-1 rounded-full bg-[var(--bg-input)] mb-3 overflow-hidden">
                  <div className="h-full bg-[var(--accent-primary)] transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 rounded-[14px] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-gradient-end)] text-white font-semibold text-[15px] shadow-[var(--accent-shadow-lg)] transition-all duration-300 hover:shadow-[var(--accent-glow-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2 text-[14px]">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Saving\u2026'}
                  </span>
                ) : (
                  'Save Document'
                )}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Viewer */}
      <AnimatePresence>
        {viewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-[var(--bg-primary)] flex flex-col"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-primary)] flex-shrink-0">
              <button onClick={() => setViewer(null)} aria-label="Close viewer"
                className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all">
                <HiOutlineXMark className="w-6 h-6" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[var(--text-primary)] truncate">{viewer.name}</p>
                <p className="text-[12px] text-[var(--text-muted)] truncate">
                  {categoryMeta(viewer.category).label} · {formatDate(viewer.createdAt)}
                  {viewer.fileSize ? ` · ${formatFileSize(viewer.fileSize)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ViewerAction icon={HiOutlineEye} label="View" onClick={() => viewerUrl && window.open(viewerUrl, '_blank', 'noopener')} disabled={!viewerUrl} />
                <ViewerAction icon={HiOutlineArrowDownTray} label="Download" onClick={() => handleDownload(viewer)} />
                <ViewerAction icon={HiOutlinePencilSquare} label="Rename" onClick={() => { setRenameValue(viewer.name); setRenameDoc(viewer); }} />
                <ViewerAction icon={HiOutlineTrash} label="Delete" danger onClick={() => setConfirmDelete(viewer)} />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-[var(--bg-chat)] flex items-center justify-center p-4">
              {viewerUrl ? (
                viewer.fileType === 'image' ? (
                  <img src={viewerUrl} alt={viewer.name} className="max-w-full max-h-full object-contain rounded-[12px]" />
                ) : (
                  <iframe src={viewerUrl} title={viewer.name} className="w-full h-full min-h-[300px] border-0 rounded-[12px] bg-white" />
                )
              ) : viewerLoading ? (
                <div className="w-7 h-7 border-[2.5px] border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
              ) : viewerError ? (
                  <div className="text-center">
                    <p className="text-[13px] text-[var(--text-muted)]">{viewerError}</p>
                    <button
                      onClick={() => loadViewerUrl(viewer.storagePath)}
                      className="mt-3 px-4 py-2.5 rounded-[12px] bg-[var(--accent-primary)] text-white text-[13px] font-medium"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-[13px] text-[var(--text-muted)]">Preview unavailable</p>
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename modal */}
      <AnimatePresence>
        {renameDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm" onClick={() => setRenameDoc(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-[340px] mx-auto glass-premium rounded-[20px] p-5 z-[96]"
            >
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-4">Rename Document</h3>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameDoc(null); }}
                autoFocus
                className="input-premium w-full px-4 py-3 mb-5"
              />
              <div className="flex gap-2">
                <button onClick={() => setRenameDoc(null)}
                  className="flex-1 py-3 text-[13px] font-medium rounded-[12px] bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all">
                  Cancel
                </button>
                <button onClick={handleRename} disabled={renaming || !renameValue.trim()}
                  className="flex-1 py-3 text-[13px] font-medium rounded-[12px] bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all disabled:opacity-50">
                  {renaming ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-[340px] mx-auto glass-premium rounded-[20px] p-5 z-[96]"
            >
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Delete Document?</h3>
              <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">
                &quot;{confirmDelete.name}&quot; and its file will be permanently removed. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 text-[13px] font-medium rounded-[12px] bg-[var(--bg-input)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-all">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-3 text-[13px] font-medium rounded-[12px] bg-[var(--danger)] text-white hover:opacity-90 transition-all disabled:opacity-50">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SheetOption({ icon: Icon, title, subtitle, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 px-3 py-3.5 rounded-[14px] text-left hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg-strong)] transition-all">
      <div className="w-11 h-11 rounded-[12px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-[12px] text-[var(--text-muted)]">{subtitle}</p>
      </div>
    </button>
  );
}

function ViewerAction({ icon: Icon, label, onClick, danger = false, disabled = false }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`min-w-[44px] h-11 px-2.5 rounded-[12px] flex items-center justify-center gap-1.5 text-[12px] font-medium transition-all disabled:opacity-40 ${
        danger ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--hover-bg)]'
      }`}>
      <Icon className={`w-[18px] h-[18px] ${danger ? 'text-[var(--danger)]' : ''}`} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
