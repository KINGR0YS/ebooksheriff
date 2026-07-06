'use client';
import { useState, useEffect, useRef } from 'react';
import handbookData from '@/lib/handbook.json';
import { BookOpen, Search, Menu, X, Lock, Unlock, Edit3, Save, RotateCcw } from 'lucide-react';

interface HandbookSection {
  id: string;
  title: string;
  content: string;
}

export default function Home() {
  const [activeSectionId, setActiveSectionId] = useState('pendahuluan');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [highlightQuery, setHighlightQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Edit Mode States
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  
  // Custom Overrides from localStorage
  const [contentOverrides, setContentOverrides] = useState<{ [key: string]: string }>({});

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);

  // Load custom content overrides from localStorage on component mount
  useEffect(() => {
    const overrides: { [key: string]: string } = {};
    handbookData.forEach((section: HandbookSection) => {
      const saved = localStorage.getItem(`handbook_panel_${section.id}`);
      if (saved) {
        overrides[section.id] = saved;
      }
    });
    setContentOverrides(overrides);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Strips HTML tags to search clean text content
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ');
  };

  // Escapes regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Run search logic
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const q = query.trim();

    if (q.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowercaseQuery = q.toLowerCase();
    const results: any[] = [];

    handbookData.forEach((section: HandbookSection) => {
      const baseContent = contentOverrides[section.id] || section.content;
      const cleanText = stripHtml(baseContent);
      const index = cleanText.toLowerCase().indexOf(lowercaseQuery);

      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(cleanText.length, index + q.length + 70);
        let snippet = cleanText.slice(start, end).replace(/\s+/g, ' ').trim();
        
        if (start > 0) snippet = '...' + snippet;
        if (end < cleanText.length) snippet = snippet + '...';

        const highlightRegex = new RegExp(`(${escapeRegExp(q)})`, 'gi');
        const highlightedSnippet = snippet.replace(highlightRegex, '<mark>$1</mark>');

        results.push({
          id: section.id,
          title: section.title,
          snippet: highlightedSnippet
        });
      }
    });

    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleSelectSearchResult = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setHighlightQuery(searchQuery);
    setShowSearchResults(false);
    setIsSidebarOpen(false);
  };

  // Password Unlock Logic
  const handlePasswordSubmit = () => {
    if (passwordInput === '7725') {
      setIsEditUnlocked(true);
      setShowPasswordModal(false);
      setPasswordError(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  // Enter edit session for a section
  const handleStartEdit = (sectionId: string) => {
    setEditingSectionId(sectionId);
  };

  // Save edited section
  const handleSaveEdit = (sectionId: string) => {
    if (editableRef.current) {
      const updatedHtml = editableRef.current.innerHTML;
      localStorage.setItem(`handbook_panel_${sectionId}`, updatedHtml);
      setContentOverrides(prev => ({
        ...prev,
        [sectionId]: updatedHtml
      }));
      setEditingSectionId(null);
    }
  };

  // Cancel edit session
  const handleCancelEdit = () => {
    setEditingSectionId(null);
  };

  // Reset section content to default
  const handleResetToPristine = (sectionId: string) => {
    if (confirm('Yakin kembalikan bagian ini ke versi asli (sebelum diedit)?')) {
      localStorage.removeItem(`handbook_panel_${sectionId}`);
      setContentOverrides(prev => {
        const copy = { ...prev };
        delete copy[sectionId];
        return copy;
      });
      setEditingSectionId(null);
    }
  };

  // Safe HTML-tag-aware highlighting algorithm (WebKit/Safari/iPad compliant)
  const getHighlightedContent = () => {
    const activeSection = handbookData.find(s => s.id === activeSectionId);
    if (!activeSection) return '';
    
    const baseContent = contentOverrides[activeSectionId] || activeSection.content;
    if (!highlightQuery || highlightQuery.trim() === '') return baseContent;

    // 1. Extract all HTML tags to avoid highlighting attributes (e.g. image src)
    const tags: string[] = [];
    const placeholderPrefix = `___HTML_TAG_${Math.random().toString(36).substr(2, 9)}_`;
    
    const textWithPlaceholders = baseContent.replace(/<[^>]+>/g, (match) => {
      tags.push(match);
      return `${placeholderPrefix}${tags.length - 1}___`;
    });

    // 2. Perform highlight on the clean text content
    const escapedQuery = escapeRegExp(highlightQuery);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const highlightedText = textWithPlaceholders.replace(regex, '<mark class="search-hit">$1</mark>');

    // 3. Restore the HTML tags
    const restoreRegex = new RegExp(`${placeholderPrefix}(\\d+)___`, 'g');
    return highlightedText.replace(restoreRegex, (_, index) => {
      return tags[parseInt(index, 10)];
    });
  };

  // Decode HTML entities safely for titles (SSR safe)
  const decodeHtml = (str: string) => {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  };

  const activeSection = handbookData.find(s => s.id === activeSectionId) || handbookData[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* SCOPED COMPONENT STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hb-page-container {
          display: flex;
          min-height: calc(100vh - 52px);
          position: relative;
        }

        /* Topbar Header */
        .hb-header {
          height: 52px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(5, 6, 8, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          position: sticky;
          top: 0;
          z-index: 90;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .hb-header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .hb-header-badge {
          width: 40px;
          height: 40px;
          object-fit: contain;
          filter: drop-shadow(0 2px 10px rgba(212, 175, 55, 0.4));
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .hb-header-brand:hover .hb-header-badge {
          transform: rotate(36deg) scale(1.05);
        }

        .hb-header-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          background: linear-gradient(
            90deg,
            var(--gold-500) 0%,
            var(--gold-500) 30%,
            #fff6d6 50%,
            var(--gold-500) 70%,
            var(--gold-500) 100%
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: gold-shimmer 6s linear infinite;
          white-space: nowrap;
          user-select: none;
          text-shadow: none;
        }

        .hb-header-subtitle {
          font-size: 0.65rem;
          font-weight: 700;
          font-family: var(--font-heading);
          letter-spacing: 2px;
          color: var(--ink-mute);
          text-transform: uppercase;
          margin-top: 1px;
        }

        @keyframes gold-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }

        /* Navigation Sidebar — premium style */
        .hb-sidebar {
          width: 240px;
          min-width: 240px;
          background: rgba(7, 10, 19, 0.98);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 52px;
          align-self: flex-start;
          height: calc(100vh - 52px);
          overflow: hidden;
          transition: left 0.3s ease;
        }

        .hb-sidebar-header {
          padding: 1rem 0.85rem 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .hb-sidebar-header .brand-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.15rem;
        }

        .hb-sidebar-header .brand-icon svg {
          width: 22px;
          height: 22px;
          color: var(--gold-500);
        }

        .hb-sidebar-header .brand-title {
          font-family: var(--font-heading);
          font-size: 0.9rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .hb-sidebar-header .brand-sub {
          font-size: 0.6rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.25);
          letter-spacing: 1.2px;
          text-transform: uppercase;
          display: block;
          margin-top: 1px;
        }

        .hb-nav-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Nav group */
        .hb-nav-group {
          padding: 0.4rem 0 0.15rem;
        }
        .hb-nav-group-label {
          display: block;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: rgba(255, 255, 255, 0.2);
          padding: 0.2rem 0.85rem 0.35rem;
          text-transform: uppercase;
          font-family: var(--font-heading);
        }

        .hb-nav-group-items {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          padding: 0 0.6rem;
        }

        .hb-nav-btn {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.55rem 0.7rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: var(--font-heading);
          color: rgba(255, 255, 255, 0.45);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease;
          width: 100%;
          text-align: left;
          position: relative;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .hb-nav-btn .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          flex-shrink: 0;
          transition: background 0.18s ease;
          font-size: 0.8rem;
        }

        .hb-nav-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }

        .hb-nav-btn:hover .nav-icon {
          background: rgba(255, 255, 255, 0.08);
        }

        .hb-nav-btn.active {
          background: rgba(212, 175, 55, 0.1);
          color: var(--gold-500);
          font-weight: 700;
        }

        .hb-nav-btn.active .nav-icon {
          background: rgba(212, 175, 55, 0.15);
          color: var(--gold-500);
        }

        .hb-nav-btn.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 55%;
          width: 3px;
          background: var(--gold-500);
          border-radius: 0 3px 3px 0;
        }

        /* Right Content Panel Pane */
        .hb-content {
          flex: 1;
          padding: 1.5rem 1.75rem;
          overflow-y: auto;
          min-width: 0;
          position: relative;
          z-index: 1;
        }

        /* Search input bar styles */
        .hb-search-wrap {
          position: relative;
          width: 240px;
        }

        .hb-search-input {
          width: 100%;
          height: 30px;
          background: rgba(13, 16, 23, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          color: var(--ink);
          padding: 0 0.75rem 0 1.8rem;
          font-size: 0.75rem;
          outline: none;
          transition: var(--transition-smooth);
        }

        .hb-search-input:focus {
          border-color: var(--gold-500);
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.2);
          background: rgba(18, 23, 34, 0.8);
        }

        /* Search Results Dropdown */
        .hb-search-results {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: rgba(10, 13, 20, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          max-height: 260px;
          overflow-y: auto;
          z-index: 110;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }

        .hb-res-item {
          width: 100%;
          padding: 0.35rem 0.6rem;
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          text-align: left;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .hb-res-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .hb-res-title {
          font-family: var(--font-heading);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--gold-500);
          margin-bottom: 0.15rem;
          text-transform: uppercase;
        }

        .hb-res-snippet {
          font-size: 0.68rem;
          color: var(--ink-mute);
          line-height: 1.3;
        }

        .hb-res-empty {
          padding: 0.75rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--ink-faint);
        }

        /* Edit Toolbar controls */
        .hb-edit-bar {
          background: rgba(212, 175, 55, 0.03);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 6px;
          padding: 0.35rem 0.6rem;
          margin-bottom: 0.65rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 6px;
        }

        .hb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          font-family: var(--font-heading);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 0.25rem 0.65rem;
          border-radius: 4px;
          cursor: pointer;
          border: none;
          font-size: 0.62rem;
          transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
          background-color: transparent;
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--ink-mute);
        }

        .hb-btn:hover {
          border-color: var(--gold-500);
          color: var(--gold-500);
          background-color: rgba(212, 175, 55, 0.05);
        }

        .hb-btn-primary {
          background: var(--gold-500);
          color: #050608;
          border: none;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
        }

        .hb-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.35);
          background: var(--gold-400);
          color: #050608;
        }

        .hb-btn-danger {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--red);
          color: var(--red);
        }

        .hb-btn-danger:hover {
          background: var(--red);
          color: white;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }

        /* Modal Dialog password lock */
        .hb-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hb-modal-card {
          width: 100%;
          max-width: 280px;
          background: rgba(13, 16, 23, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: fadeInUp 0.3s ease forwards;
        }

        .hb-modal-title {
          font-family: var(--font-heading);
          color: var(--gold-500);
          font-size: 0.85rem;
          margin-bottom: 0.65rem;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .hb-modal-input {
          width: 100%;
          height: 32px;
          background-color: rgba(13, 16, 23, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          color: var(--ink);
          padding: 0 0.75rem;
          text-align: center;
          font-size: 0.8rem;
          outline: none;
          margin-bottom: 0.65rem;
          transition: var(--transition-smooth);
        }

        .hb-modal-input:focus {
          border-color: var(--gold-500);
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.2);
          background-color: rgba(18, 23, 34, 0.8);
        }

        /* Mobile drawer adjustments */
        .hb-menu-toggle {
          display: none;
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--ink-mute);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .hb-menu-toggle:hover {
          border-color: var(--gold-500);
          color: var(--gold-500);
          background-color: rgba(212, 175, 55, 0.05);
        }

        @media (max-width: 1200px) {
          .hb-sidebar {
            position: absolute;
            left: -240px;
            top: 0;
            bottom: 0;
            z-index: 85;
            background: rgba(7, 10, 19, 0.98);
            height: 100%;
          }

          .hb-sidebar.open {
            left: 0;
            box-shadow: 10px 0 25px rgba(0,0,0,0.7);
          }

          .hb-menu-toggle {
            display: flex;
          }

          .hb-content {
            padding: 0.65rem 0.5rem;
          }

          .hb-search-wrap {
            width: 120px;
          }
        }

        @media (max-width: 768px) {
          .hb-header {
            padding: 0 0.5rem;
          }
          .hb-header-title {
            font-size: 0.75rem;
          }
          .hb-header-subtitle {
            display: none;
          }
          .hb-search-wrap {
            width: 100px;
          }
          .hb-search-input {
            font-size: 0.7rem;
            padding: 0 0.65rem 0 1.5rem;
          }
          .hb-content {
            padding: 0.5rem 0.35rem;
          }
        }
      ` }} />

      {/* TOPBAR HEADER */}
      <header className="hb-header">
        
        <div className="hb-header-brand">
          <button className="hb-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <img src="/images/logo-sheriff.png" className="hb-header-badge" alt="Sheriff Badge" />
          <div className="nav-title-group">
            <h1 className="hb-header-title">Sheriff Department</h1>
            <span className="hb-header-subtitle">E-Book SOP Kerajaan Roxwood</span>
          </div>
        </div>

        {/* Search wrapped on header */}
        <div ref={searchContainerRef} className="hb-search-wrap">
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)' }} />
          <input
            type="text"
            className="hb-search-input"
            placeholder="Cari pedoman / SOP..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setSearchResults([]); setHighlightQuery(''); setShowSearchResults(false); }}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ink-mute)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}

          {showSearchResults && (
            <div className="hb-search-results">
              {searchResults.length === 0 ? (
                <div className="hb-res-empty">Tidak ditemukan hasil untuk "{searchQuery}"</div>
              ) : (
                searchResults.map((res: any, idx: number) => (
                  <button 
                    key={idx} 
                    type="button" 
                    className="hb-res-item" 
                    onClick={() => handleSelectSearchResult(res.id)}
                  >
                    <div className="hb-res-title">{decodeHtml(res.title)}</div>
                    <div className="hb-res-snippet" dangerouslySetInnerHTML={{ __html: res.snippet }} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Lock Unlock Editor Toggle */}
        <div>
          {isEditUnlocked ? (
            <button 
              className="hb-btn" 
              style={{ borderColor: 'var(--gold-500)', color: 'var(--gold-500)' }}
              onClick={() => { setIsEditUnlocked(false); setEditingSectionId(null); }}
              title="Kunci Mode Edit"
            >
              <Unlock size={14} /> Mode Edit
            </button>
          ) : (
            <button 
              className="hb-btn" 
              onClick={() => setShowPasswordModal(true)}
              title="Buka Mode Edit"
            >
              <Lock size={14} />
            </button>
          )}
        </div>

      </header>

      {/* WORKSPACE LAYOUT */}
      <div className="hb-page-container">
        
        {/* Mobile Sidebar Overlay Background */}
        {isSidebarOpen && (
          <div 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80 }} 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* LEFT NAV LIST */}
        <aside className={`hb-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="hb-sidebar-header">
            <div className="brand-icon">
              <BookOpen size={22} />
              <div>
                <div className="brand-title">Panduan SOP</div>
                <span className="brand-sub">Kerajaan Roxwood</span>
              </div>
            </div>
          </div>
          <div className="hb-nav-scroll">
            {/* Group 1: Informasi Dasar */}
            <div className="hb-nav-group">
              <span className="hb-nav-group-label">Informasi Dasar</span>
              <div className="hb-nav-group-items">
                {[{id:'pendahuluan', label:'Pendahuluan', icon:'📖'},{id:'divisi', label:'Divisi', icon:'🏛️'},{id:'kepangkatan', label:'Kepangkatan', icon:'⭐'},{id:'kendaraan', label:'Kendaraan', icon:'🚔'},{id:'penampilan', label:'Penampilan', icon:'👔'}].map(item => (
                  <button key={item.id} className={`hb-nav-btn ${activeSectionId === item.id ? 'active' : ''}`}
                    onClick={() => { setActiveSectionId(item.id); setIsSidebarOpen(false); setHighlightQuery(''); setEditingSectionId(null); }}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Group 2: Operasional */}
            <div className="hb-nav-group">
              <span className="hb-nav-group-label">Operasional</span>
              <div className="hb-nav-group-items">
                {[{id:'radio', label:'Radio', icon:'📡'},{id:'senjata', label:'Persenjataan', icon:'🔫'},{id:'penanganan', label:'Penanganan', icon:'🚨'},{id:'penyanderaan', label:'Penyanderaan', icon:'⛓️'},{id:'pengumuman', label:'Pengumuman', icon:'📢'},{id:'taktik', label:'Taktik', icon:'🧠'}].map(item => (
                  <button key={item.id} className={`hb-nav-btn ${activeSectionId === item.id ? 'active' : ''}`}
                    onClick={() => { setActiveSectionId(item.id); setIsSidebarOpen(false); setHighlightQuery(''); setEditingSectionId(null); }}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Group 3: Hukum & Referensi */}
            <div className="hb-nav-group">
              <span className="hb-nav-group-label">Hukum & Referensi</span>
              <div className="hb-nav-group-items">
                {[{id:'undang-undang', label:'Undang-Undang', icon:'⚖️'},{id:'hukum', label:'Cara Memenjarakan', icon:'🔒'},{id:'barang-ilegal', label:'Barang Ilegal', icon:'📦'},{id:'fitur-f1', label:'Fitur F1', icon:'📋'}].map(item => (
                  <button key={item.id} className={`hb-nav-btn ${activeSectionId === item.id ? 'active' : ''}`}
                    onClick={() => { setActiveSectionId(item.id); setIsSidebarOpen(false); setHighlightQuery(''); setEditingSectionId(null); }}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT AREA */}
        <main className="hb-content">
          
          {/* EDIT MODE ACTIONS PANEL */}
          {isEditUnlocked && (
            <div className="hb-edit-bar">
              <span style={{ fontSize: '0.75rem', color: 'var(--gold-300)' }}>
                {editingSectionId === activeSection.id 
                  ? '⚠️ Anda sedang mengedit konten bab ini. Klik Simpan jika selesai.' 
                  : '🔓 Mode Edit aktif. Klik tombol Edit untuk mengubah bab ini.'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {editingSectionId === activeSection.id ? (
                  <>
                    <button className="hb-btn hb-btn-primary" onClick={() => handleSaveEdit(activeSection.id)}>
                      <Save size={14} /> Simpan
                    </button>
                    <button className="hb-btn" onClick={handleCancelEdit}>
                      Batal
                    </button>
                    <button className="hb-btn hb-btn-danger" onClick={() => handleResetToPristine(activeSection.id)}>
                      <RotateCcw size={14} /> Asli
                    </button>
                  </>
                ) : (
                  <button className="hb-btn hb-btn-primary" onClick={() => handleStartEdit(activeSection.id)}>
                    <Edit3 size={14} /> Edit Bab Ini
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SOP Document Body */}
          <div className="glass-container" style={{ maxWidth: '100%', padding: '1.25rem 1.5rem' }}>
            
            <div className="hb-frame-rule" style={{ marginBottom: '0.5rem' }}>
              <div className="line"></div>
              <div className="cap"></div>
              <div className="line"></div>
            </div>

            <span style={{ 
              fontSize: '0.6rem', 
              letterSpacing: '2px', 
              textTransform: 'uppercase', 
              color: 'var(--gold-500)',
              display: 'block',
              marginBottom: '0.2rem',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)'
            }}>
              STANDAR OPERASIONAL PROSEDUR
            </span>

            <h2 style={{ 
              fontFamily: 'var(--font-heading)',
              fontSize: '1.35rem', 
              fontWeight: 800, 
              color: '#ffffff',
              marginBottom: '0.65rem',
              lineHeight: 1.25,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {decodeHtml(activeSection.title)}
            </h2>

            {/* Editable Content Frame */}
            <div 
              ref={editableRef}
              className="hb-content-body"
              contentEditable={editingSectionId === activeSection.id}
              suppressContentEditableWarning
              style={{
                outline: 'none',
                padding: editingSectionId === activeSection.id ? '1rem' : '0',
                border: editingSectionId === activeSection.id ? '1px dashed var(--gold-500)' : 'none',
                background: editingSectionId === activeSection.id ? 'rgba(212, 175, 55, 0.02)' : 'none',
                borderRadius: '6px'
              }}
              dangerouslySetInnerHTML={{ __html: getHighlightedContent() }}
            />

            </div>

        </main>

      </div>

      {/* PASSWORD PROMPT MODAL */}
      {showPasswordModal && (
        <div className="hb-modal-overlay">
          <div className="hb-modal-card">
            <h3 className="hb-modal-title">Masukkan Password Gerbang</h3>
            <input 
              type="password" 
              className="hb-modal-input"
              placeholder="••••"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
            />
            {passwordError && (
              <p style={{ color: 'var(--red)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
                ❌ Password salah! Coba lagi.
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="hb-btn hb-btn-primary" onClick={handlePasswordSubmit}>
                Kirim
              </button>
              <button className="hb-btn" onClick={() => { setShowPasswordModal(false); setPasswordError(false); setPasswordInput(''); }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
