'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, GripVertical, Trash2, Copy, MoveUp, MoveDown, Image, Type, Heading, List, ListOrdered, Quote, SeparatorHorizontal, PanelTop, PanelBottom, Palette, ChevronDown, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Minus } from 'lucide-react';

// ============ Types ============
export interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'image' | 'list' | 'numbered-list' | 'quote' | 'divider' | 'custom';
  html: string;
  style: Record<string, string>;
  gridCols?: number;
}

export interface BlockEditorHandle {
  insertImageBlock: (url: string, alt: string) => void;
}

interface BlockEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  onOpenImageManager: () => void;
}

// ============ Block Editor Component ============
const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(({ initialContent, onChange, onOpenImageManager }, ref) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => parseHtmlToBlocks(initialContent));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
  const [imgEditor, setImgEditor] = useState<string | null>(null); // block id of image being edited
  const [imgWidth, setImgWidth] = useState('100%');
  const [imgBorderRadius, setImgBorderRadius] = useState('8px');
  const [imgShadow, setImgShadow] = useState(false);
  const [imgFloat, setImgFloat] = useState('none');

  const dragRef = useRef<string | null>(null);

  // Sync back to parent
  const emitChange = useCallback((newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
    onChange(blocksToHtml(newBlocks));
  }, [onChange]);

  // Update a single block
  const updateBlock = (id: string, upd: Partial<ContentBlock>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...upd } : b);
    emitChange(newBlocks);
  };

  // Remove block
  const removeBlock = (id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    emitChange(newBlocks);
    if (selectedId === id) setSelectedId(null);
  };

  // Duplicate block
  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const newBlock = { ...blocks[idx], id: crypto.randomUUID() };
    const newBlocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    emitChange(newBlocks);
  };

  // Move block
  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const to = idx + dir;
    if (to < 0 || to >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[to]] = [newBlocks[to], newBlocks[idx]];
    emitChange(newBlocks);
  };

  // Add new block after
  const addBlock = (afterId: string | null, type: ContentBlock['type']) => {
    const newBlock = createEmptyBlock(type);
    const idx = afterId ? blocks.findIndex(b => b.id === afterId) : blocks.length - 1;
    const newBlocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    emitChange(newBlocks);
    setShowAddMenu(null);
    setSelectedId(newBlock.id);
  };

  // Drag handlers
  const handleDragStart = (id: string) => { dragRef.current = id; };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    const sourceId = dragRef.current;
    if (!sourceId || sourceId === targetId) return;
    const srcIdx = blocks.findIndex(b => b.id === sourceId);
    const tgtIdx = blocks.findIndex(b => b.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(srcIdx, 1);
    newBlocks.splice(tgtIdx, 0, moved);
    emitChange(newBlocks);
    setDragOverId(null);
  };

  // Image style update — accepts direct values so Closure is never stale
  const applyImgStyle = (overrides?: { w?: string; r?: string; sh?: boolean; fl?: string }) => {
    if (!imgEditor) return;
    const block = blocks.find(b => b.id === imgEditor);
    if (!block) return;
    const w = overrides?.w ?? imgWidth;
    const r = overrides?.r ?? imgBorderRadius;
    const sh = overrides?.sh ?? imgShadow;
    const fl = overrides?.fl ?? imgFloat;

    let html = block.html;

    // Build style string
    const margin = fl === 'none' ? '1rem auto' : fl === 'left' ? '0 1rem 0.5rem 0' : '0 0 0.5rem 1rem';
    const newStyle = `max-width:100%;height:auto;border-radius:${r};width:${w};display:block;float:${fl};margin:${margin};box-shadow:${sh ? '0 4px 20px rgba(0,0,0,0.3)' : 'none'}`;

    // If <img> has a style attr, replace it; otherwise add it
    if (/<img[^>]+style="/.test(html)) {
      html = html.replace(/style="[^"]*"/, `style="${newStyle}"`);
    } else {
      html = html.replace('<img ', `<img style="${newStyle}" `);
    }
    // Ensure draggable=false to prevent native browser drag
    if (!html.includes('draggable="false"')) {
      html = html.replace('<img ', '<img draggable="false" ');
    }
    updateBlock(imgEditor, { html });
  };

  // Selected block
  const selectedBlock = blocks.find(b => b.id === selectedId);

  // Load image editor when selecting an image block
  useEffect(() => {
    if (selectedBlock?.type === 'image') {
      setImgEditor(selectedBlock.id);
      const matchStyle = selectedBlock.html.match(/style="([^"]*)"/);
      if (matchStyle) {
        const s = matchStyle[1];
        const w = s.match(/width:([^;]+)/);
        const r = s.match(/border-radius:([^;]+)/);
        const f = s.match(/float:([^;]+)/);
        const sh = s.includes('box-shadow') && !s.includes('none');
        if (w) setImgWidth(w[1]);
        if (r) setImgBorderRadius(r[1]);
        if (f) setImgFloat(f[1]);
        setImgShadow(sh);
      }
    } else {
      setImgEditor(null);
    }
  }, [selectedBlock]);

  // Expose insertImageBlock to parent via ref
  useImperativeHandle(ref, () => ({
    insertImageBlock(url: string, alt: string) {
      const newHtml = `<img src="${url}" alt="${alt}" draggable="false" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:1rem auto;width:100%;box-shadow:none" />`;
      // If selected block is an image placeholder (has no <img> tag), replace it
      if (selectedId) {
        const selBlock = blocks.find(b => b.id === selectedId);
        if (selBlock?.type === 'image' && !selBlock.html.includes('<img')) {
          const newBlocks = blocks.map(b => b.id === selectedId ? { ...b, html: newHtml } : b);
          emitChange(newBlocks);
          setShowAddMenu(null);
          return;
        }
      }
      // Otherwise insert a new image block after selection
      const newBlock: ContentBlock = {
        id: crypto.randomUUID(),
        type: 'image',
        html: newHtml,
        style: {},
      };
      const idx = selectedId ? blocks.findIndex(b => b.id === selectedId) : blocks.length - 1;
      const insertAt = idx >= 0 ? idx : blocks.length - 1;
      const newBlocks = [...blocks.slice(0, insertAt + 1), newBlock, ...blocks.slice(insertAt + 1)];
      emitChange(newBlocks);
      setSelectedId(newBlock.id);
      setShowAddMenu(null);
    }
  }), [blocks, selectedId, emitChange]);

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      {/* Main Editor Area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {blocks.map((block, bi) => (
            <div key={block.id}>
              {/* Add block button */}
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: '24px' }}>
                <button
                  onClick={() => setShowAddMenu(showAddMenu === block.id ? null : block.id)}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px dashed rgba(212,175,55,0.3)', color: '#d4af37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: 'opacity 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                  title="Tambah Block"
                ><Plus size={14} /></button>

                {showAddMenu === block.id && (
                  <div style={{ position: 'absolute', top: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#1a1d29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', justifyContent: 'center' }}>
                    <AddBlockBtn icon={<Type size={14} />} label="Teks" onClick={() => addBlock(block.id, 'text')} />
                    <AddBlockBtn icon={<Heading size={14} />} label="Heading" onClick={() => addBlock(block.id, 'heading')} />
                    <AddBlockBtn icon={<Image size={14} />} label="Gambar" onClick={() => { addBlock(block.id, 'image'); onOpenImageManager(); }} />
                    <AddBlockBtn icon={<List size={14} />} label="List" onClick={() => addBlock(block.id, 'list')} />
                    <AddBlockBtn icon={<ListOrdered size={14} />} label="Nomor" onClick={() => addBlock(block.id, 'numbered-list')} />
                    <AddBlockBtn icon={<Quote size={14} />} label="Quote" onClick={() => addBlock(block.id, 'quote')} />
                    <AddBlockBtn icon={<Minus size={14} />} label="Divider" onClick={() => addBlock(block.id, 'divider')} />
                  </div>
                )}
              </div>

              {/* Block */}
              <div
                draggable
                onDragStart={() => handleDragStart(block.id)}
                onDragOver={(e) => handleDragOver(e, block.id)}
                onDrop={() => handleDrop(block.id)}
                onDragEnd={() => setDragOverId(null)}
                onClick={() => setSelectedId(block.id)}
                style={{
                  position: 'relative',
                  padding: '0.35rem 0.35rem 0.35rem 2rem',
                  borderRadius: '8px',
                  border: dragOverId === block.id ? '2px dashed #d4af37' : selectedId === block.id ? '2px solid rgba(212,175,55,0.4)' : '2px solid transparent',
                  background: selectedId === block.id ? 'rgba(212,175,55,0.04)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {/* Drag handle & actions */}
                <div style={{ position: 'absolute', left: '2px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '1px', opacity: selectedId === block.id ? 1 : 0.2 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', cursor: 'grab' }}><GripVertical size={14} /></span>
                </div>

                {selectedId === block.id && (
                  <div style={{ position: 'absolute', right: '4px', top: '-14px', display: 'flex', gap: '2px', zIndex: 10 }}>
                    <MiniBtn icon={<MoveUp size={12} />} title="Naik" onClick={() => moveBlock(block.id, -1)} />
                    <MiniBtn icon={<MoveDown size={12} />} title="Turun" onClick={() => moveBlock(block.id, 1)} />
                    <MiniBtn icon={<Copy size={12} />} title="Duplikat" onClick={() => duplicateBlock(block.id)} />
                    <MiniBtn icon={<Trash2 size={12} />} title="Hapus" onClick={() => removeBlock(block.id)} danger />
                  </div>
                )}

                {/* Block content */}
                <BlockContent block={block} onUpdate={(html) => updateBlock(block.id, { html })} />
              </div>
            </div>
          ))}

          {/* Last add button */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: '24px' }}>
            <button
              onClick={() => setShowAddMenu(showAddMenu === 'last' ? null : 'last')}
              style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px dashed rgba(212,175,55,0.3)', color: '#d4af37', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            ><Plus size={14} /></button>
            {showAddMenu === 'last' && (
              <div style={{ position: 'absolute', top: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#1a1d29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', justifyContent: 'center' }}>
                <AddBlockBtn icon={<Type size={14} />} label="Teks" onClick={() => addBlock(null, 'text')} />
                <AddBlockBtn icon={<Heading size={14} />} label="Heading" onClick={() => addBlock(null, 'heading')} />
                <AddBlockBtn icon={<Image size={14} />} label="Gambar" onClick={() => { addBlock(null, 'image'); onOpenImageManager(); }} />
                <AddBlockBtn icon={<List size={14} />} label="List" onClick={() => addBlock(null, 'list')} />
                <AddBlockBtn icon={<ListOrdered size={14} />} label="Nomor" onClick={() => addBlock(null, 'numbered-list')} />
                <AddBlockBtn icon={<Quote size={14} />} label="Quote" onClick={() => addBlock(null, 'quote')} />
                <AddBlockBtn icon={<Minus size={14} />} label="Divider" onClick={() => addBlock(null, 'divider')} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Style Panel (right side) */}
      {selectedBlock && (
        <div style={{ width: '260px', flexShrink: 0, background: 'rgba(13,16,23,0.9)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', position: 'sticky', top: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>{selectedBlock.type} Properties</div>

          {/* Image properties */}
          {selectedBlock.type === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <PropRow label="Lebar">
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {['50%', '75%', '100%'].map(w => (
                    <button key={w} onClick={() => { setImgWidth(w); applyImgStyle({ w }); }}
                      style={{ flex: 1, padding: '0.25rem 0', background: imgWidth === w ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: imgWidth === w ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: imgWidth === w ? '#d4af37' : '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>{w}</button>
                  ))}
                </div>
              </PropRow>
              <PropRow label="Posisi">
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {['kiri', 'tengah', 'kanan'].map(p => {
                    const fl = p === 'kiri' ? 'left' : p === 'kanan' ? 'right' : 'none';
                    return (
                      <button key={p} onClick={() => { setImgFloat(fl); applyImgStyle({ fl }); }}
                        style={{ flex: 1, padding: '0.25rem 0', background: imgFloat === fl ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: imgFloat === fl ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: imgFloat === fl ? '#d4af37' : '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>{p}</button>
                    );
                  })}
                </div>
              </PropRow>
              <PropRow label="Sudut">
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {['0', '4px', '8px', '12px', '50%'].map(r => (
                    <button key={r} onClick={() => { setImgBorderRadius(r); applyImgStyle({ r }); }}
                      style={{ flex: 1, padding: '0.25rem 0', background: imgBorderRadius === r ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: imgBorderRadius === r ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', color: imgBorderRadius === r ? '#d4af37' : '#fff', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}>{r}</button>
                  ))}
                </div>
              </PropRow>
              <PropRow label="Bayangan">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.78rem', color: '#c8d0dc' }}>
                  <input type="checkbox" checked={imgShadow} onChange={() => { const next = !imgShadow; setImgShadow(next); applyImgStyle({ sh: next }); }} style={{ accentColor: '#d4af37' }} />
                  Aktifkan bayangan
                </label>
              </PropRow>
            </div>
          )}

          {/* Text/Heding properties */}
          {(selectedBlock.type === 'text' || selectedBlock.type === 'heading') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <InlineTextToolbar
                block={selectedBlock}
                onUpdate={(html) => updateBlock(selectedBlock.id, { html })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default BlockEditor;

// Mini action button
function MiniBtn({ icon, title, onClick, danger }: { icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: danger ? '#ef4444' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.6rem' }}>
      {icon}
    </button>
  );
}

// Add block button
function AddBlockBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500, transition: 'all 0.1s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,175,55,0.12)'; e.currentTarget.style.color = '#d4af37'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
      {icon} {label}
    </button>
  );
}

// Property row
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      {children}
    </div>
  );
}

// Inline text toolbar
function InlineTextToolbar({ block, onUpdate }: { block: ContentBlock; onUpdate: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  return (
    <div>
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem' }}>Klik teks untuk edit langsung</div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={() => onUpdate(editorRef.current?.innerHTML || '')}
        style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#c8d0dc', fontSize: '0.82rem', lineHeight: '1.5', outline: 'none', minHeight: '60px', fontFamily: 'Inter, sans-serif' }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    </div>
  );
}

// Block content renderer
function BlockContent({ block, onUpdate }: { block: ContentBlock; onUpdate: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  const handleDoubleClick = () => {
    if (block.type === 'text' || block.type === 'heading' || block.type === 'quote' || block.type === 'list' || block.type === 'numbered-list') {
      setEditing(true);
    }
  };

  const handleBlur = () => {
    setEditing(false);
    if (ref.current) {
      onUpdate(ref.current.innerHTML);
    }
  };

  if (block.type === 'image') {
    return (
      <div style={{ lineHeight: 0, position: 'relative' }}>
        <div dangerouslySetInnerHTML={{ __html: block.html }} />
      </div>
    );
  }

  if (block.type === 'divider') {
    return <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />;
  }

  if (editing) {
    return (
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
        style={{ outline: 'none', color: '#c8d0dc', fontSize: block.type === 'heading' ? '1.1rem' : '0.88rem', fontWeight: block.type === 'heading' ? 700 : 400, fontFamily: block.type === 'heading' ? 'Outfit, sans-serif' : 'Inter, sans-serif', lineHeight: '1.7', minHeight: '1.5em' }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }

  return (
    <div onDoubleClick={handleDoubleClick}
      style={{ color: '#c8d0dc', fontSize: block.type === 'heading' ? '1.1rem' : '0.88rem', fontWeight: block.type === 'heading' ? 700 : 400, fontFamily: block.type === 'heading' ? 'Outfit, sans-serif' : 'Inter, sans-serif', lineHeight: '1.7', userSelect: 'none' }}
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  );
}

// ============ Utilities ============

function createEmptyBlock(type: ContentBlock['type']): ContentBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case 'text':
      return { id, type, html: '<p style="margin:0;color:#c8d0dc;font-size:0.88rem;line-height:1.7">Tulis teks di sini...</p>', style: {} };
    case 'heading':
      return { id, type: 'heading', html: '<h3 style="margin:0.5rem 0;color:#fff;font-family:Outfit,sans-serif;font-weight:700;font-size:1.1rem">Judul Baru</h3>', style: {} };
    case 'image':
      return { id, type: 'image', html: '<div style="padding:2rem;text-align:center;background:rgba(255,255,255,0.03);border:2px dashed rgba(255,255,255,0.1);border-radius:8px;color:rgba(255,255,255,0.3);font-size:0.8rem">Klik "Gambar" untuk memilih</div>', style: {} };
    case 'list':
      return { id, type: 'list', html: '<ul style="margin:0.5rem 0;padding-left:1.5rem"><li style="color:#c8d0dc;font-size:0.88rem;line-height:1.7">Item list</li><li style="color:#c8d0dc;font-size:0.88rem;line-height:1.7">Item list</li></ul>', style: {} };
    case 'numbered-list':
      return { id, type: 'numbered-list', html: '<ol style="margin:0.5rem 0;padding-left:1.5rem"><li style="color:#c8d0dc;font-size:0.88rem;line-height:1.7">Item pertama</li><li style="color:#c8d0dc;font-size:0.88rem;line-height:1.7">Item kedua</li></ol>', style: {} };
    case 'quote':
      return { id, type: 'quote', html: '<blockquote style="margin:0.5rem 0;padding:0.75rem 1rem;border-left:3px solid #d4af37;background:rgba(212,175,55,0.05);border-radius:0 8px 8px 0;color:#c8d0dc;font-style:italic;font-size:0.88rem">Kutipan teks di sini...</blockquote>', style: {} };
    case 'divider':
      return { id, type: 'divider', html: '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:1rem 0">', style: {} };
    default:
      return { id, type: 'text', html: '<p style="margin:0;color:#c8d0dc;font-size:0.88rem">Konten</p>', style: {} };
  }
}

function parseHtmlToBlocks(html: string): ContentBlock[] {
  if (!html || html.trim() === '') return [createEmptyBlock('text')];

  const blocks: ContentBlock[] = [];
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  let i = 0;
  for (const node of wrapper.children) {
    const tag = node.tagName?.toLowerCase() || '';
    const outerHtml = node.outerHTML;

    let type: ContentBlock['type'] = 'custom';

    // Check for image first — could be <img>, <figure>, <picture>, or a <div>/<p> containing <img>
    const hasImg = node.querySelector ? !!node.querySelector('img') : false;
    if (tag === 'img') type = 'image';
    else if (tag === 'figure' || tag === 'picture') type = 'image';
    else if (hasImg) type = 'image';
    else if (tag === 'p' || tag === 'span' || tag === 'div') type = 'text';
    else if (tag.match(/^h[1-6]$/)) type = 'heading';
    else if (tag === 'ul') type = 'list';
    else if (tag === 'ol') type = 'numbered-list';
    else if (tag === 'blockquote') type = 'quote';
    else if (tag === 'hr') type = 'divider';

    blocks.push({
      id: `block-${i++}`,
      type,
      html: outerHtml,
      style: {},
    });
  }

  if (blocks.length === 0) blocks.push(createEmptyBlock('text'));
  return blocks;
}

function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map(b => b.html).join('\n');
}
