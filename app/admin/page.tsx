'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, LogIn, LogOut, FileText, Image, Save, ArrowLeft, Trash2, Eye, Upload, ExternalLink, Check } from 'lucide-react';

type Section = {
  slug: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  updated_at?: string;
};

type ImageItem = {
  url: string;
  public_id: string;
  filename: string;
  created_at: string;
};

export default function AdminPage() {
  // Auth
  const [token, setToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sections
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Images
  const [images, setImages] = useState<ImageItem[]>([]);
  const [showImageManager, setShowImageManager] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sections
  const loadSections = async () => {
    try {
      const res = await fetch('/api/sections');
      if (res.ok) {
        const data = await res.json();
        setSections(data);
      }
    } catch (e) {
      console.error('Failed to load sections:', e);
    } finally {
      setLoadingSections(false);
    }
  };

  // Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(false);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
        setPassword('');
      } else {
        setLoginError(true);
      }
    } catch {
      setLoginError(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Check saved token on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      // Verify token is still valid
      fetch('/api/auth', { headers: { 'Authorization': `Bearer ${saved}` } })
        .then(res => {
          if (res.ok) setToken(saved);
          else localStorage.removeItem('admin_token');
          setCheckingAuth(false);
        })
        .catch(() => {
          localStorage.removeItem('admin_token');
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, []);

  // Load sections when authenticated
  useEffect(() => {
    if (token) {
      loadSections();
      loadImages();
    }
  }, [token]);

  // Load images
  const loadImages = async () => {
    setLoadingImages(true);
    try {
      const res = await fetch('/api/upload', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) return handleAutoLogout();
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (e) {
      console.error('Failed to load images:', e);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleAutoLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
    setEditingSection(null);
  };

  // Start editing
  const handleStartEdit = (section: Section) => {
    setEditingSection(section);
    setEditTitle(section.title);
    setEditContent(section.content);
    setSaveSuccess(false);
  };

  // Save section
  const handleSave = async () => {
    if (!editingSection) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/sections', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: editingSection.slug,
          title: editTitle,
          content: editContent,
        }),
      });
      if (res.status === 401) return handleAutoLogout();
      if (res.ok) {
        setSaveSuccess(true);
        setEditingSection(prev => prev ? { ...prev, title: editTitle, content: editContent } : null);
        setSections(prev => prev.map(s => s.slug === editingSection.slug ? { ...s, title: editTitle, content: editContent } : s));
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload image
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 401) return handleAutoLogout();
      const data = await res.json();
      if (res.ok) {
        await loadImages();
        alert('✅ Gambar berhasil diupload! Klik gambar untuk copy URL.');
      } else {
        alert('❌ Upload gagal: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('❌ Upload gagal: ' + (e.message || 'Network error'));
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Copy image URL
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(url);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Category color mapping
  const categoryColors: Record<string, string> = {
    'informasi-dasar': '#3b82f6',
    'operasional': '#d4af37',
    'hukum': '#ef4444',
    'referensi': '#8b5cf6',
    'lainnya': '#6b7280',
  };

  // If checking auth, show loading
  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050608' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Memeriksa sesi...</p>
      </div>
    );
  }

  // If not logged in, show login
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050608', padding: '1rem' }}>
        <div style={{ background: 'rgba(13,16,23,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#d4af37' }}>
              <Shield size={28} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 0.25rem', letterSpacing: '0.5px' }}>Admin Panel</h1>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>E-Book SOP Sheriff</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Password Admin</label>
              <input
                type="password" value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
                placeholder="Masukkan password..."
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: loginError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
              {loginError && <p style={{ fontSize: '0.72rem', color: '#ef4444', margin: '0.35rem 0 0' }}>Password salah</p>}
            </div>

            <button type="submit" disabled={isLoggingIn || !password}
              style={{ padding: '0.7rem', background: isLoggingIn ? 'rgba(212,175,55,0.5)' : '#d4af37', border: 'none', borderRadius: '8px', color: '#050608', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'opacity 0.2s', marginTop: '0.5rem' }}>
              <LogIn size={16} />
              {isLoggingIn ? 'Memeriksa...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If editing a section
  if (editingSection) {
    return (
      <div style={{ minHeight: '100vh', background: '#050608', padding: '1rem', color: '#fff' }}>
        {/* Header */}
        <div style={{ maxWidth: '960px', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setEditingSection(null)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', padding: '0.4rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
              <ArrowLeft size={14} /> Kembali
            </button>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1rem', fontWeight: 700, margin: 0, color: '#d4af37' }}>Edit: {editTitle}</h2>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', margin: '0.1rem 0 0' }}>slug: {editingSection.slug}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <a href="/" target="_blank" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', padding: '0.4rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', textDecoration: 'none' }}>
              <Eye size={14} /> Lihat
            </a>
            <button onClick={() => { setShowImageManager(true); loadImages(); }}
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', color: '#8b5cf6', padding: '0.4rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
              <Image size={14} /> Gambar
            </button>
            <button onClick={handleSave} disabled={isSaving}
              style={{ background: saveSuccess ? 'rgba(34,197,94,0.2)' : '#d4af37', border: 'none', borderRadius: '8px', color: saveSuccess ? '#22c55e' : '#050608', padding: '0.4rem 0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.78rem' }}>
              <Save size={14} />
              {isSaving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan'}
            </button>
          </div>
        </div>

        {/* Title input */}
        <div style={{ maxWidth: '960px', margin: '0 auto 0.75rem' }}>
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            placeholder="Judul section..."
          />
        </div>

        {/* Editor */}
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setEditContent(e.currentTarget.innerHTML)}
            style={{ minHeight: '60vh', padding: '1.25rem', background: 'rgba(13,16,23,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#c8d0dc', fontSize: '0.88rem', lineHeight: '1.7', outline: 'none', fontFamily: 'Inter, sans-serif', overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: editContent }}
          />
        </div>

        {/* Image Manager Modal */}
        {showImageManager && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowImageManager(false); }}>
            <div style={{ background: '#0d1017', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: 0 }}>Pengelola Gambar</h3>
                <button onClick={() => setShowImageManager(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>

              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', color: '#d4af37', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 600 }}>
                    <Upload size={14} /> {uploading ? 'Mengupload...' : 'Upload Gambar'}
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>Klik untuk copy URL gambar</span>
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {loadingImages ? (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>Memuat gambar...</p>
                ) : images.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>Belum ada gambar</p>
                ) : images.map((img) => (
                  <div key={img.public_id} onClick={() => handleCopyUrl(img.url)} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: copiedId === img.url ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.06)', transition: 'border 0.2s', position: 'relative', aspectRatio: '16/9', background: 'rgba(0,0,0,0.3)' }}>
                    <img src={img.url} alt={img.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {copiedId === img.url && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={24} color="#22c55e" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div style={{ minHeight: '100vh', background: '#050608', color: '#fff' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Shield size={20} color="#d4af37" />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.5px' }}>Admin Panel</span>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>SOP Editor</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a href="/" target="_blank" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
            <Eye size={14} /> Lihat Website
          </a>
          <button onClick={handleAutoLogout} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#ef4444', padding: '0.35rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 600 }}>
            <LogOut size={13} /> Keluar
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.25rem', color: '#fff' }}>Daftar Section SOP</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Klik section untuk mengedit konten</p>
        </div>

        {loadingSections ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Memuat data...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sections.map((section) => (
              <button key={section.slug} onClick={() => handleStartEdit(section)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', background: 'rgba(13,16,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.2s, border-color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(13,16,23,0.9)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(13,16,23,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${categoryColors[section.category] || '#6b7280'}15`, border: `1px solid ${categoryColors[section.category] || '#6b7280'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color={categoryColors[section.category] || '#6b7280'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', fontFamily: 'Outfit, sans-serif', marginBottom: '0.1rem' }}>{section.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>{section.slug}</span>
                    <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.45rem', borderRadius: '3px', background: `${categoryColors[section.category] || '#6b7280'}20`, color: categoryColors[section.category] || '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{section.category}</span>
                  </div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', flexShrink: 0 }}>
                  <ExternalLink size={14} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
