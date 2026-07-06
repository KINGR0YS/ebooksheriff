'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Plus, GripVertical, Trash2, Copy, MoveUp, MoveDown,
  Image, Type, Heading, List, ListOrdered, Quote, Minus,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Link
} from 'lucide-react';

// ============ Types ============
export interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'image' | 'list' | 'numbered-list' | 'quote' | 'divider';
  html: string;
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
const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  ({ initialContent, onChange, onOpenImageManager }, ref) => {
    const [blocks, setBlocks] = useState<ContentBlock[]>(() =>
      parseHtmlToBlocks(initialContent)
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState<string | null>(null);

    const dragRef = useRef<string | null>(null);

    const emitChange = useCallback(
      (newBlocks: ContentBlock[]) => {
        setBlocks(newBlocks);
        onChange(blocksToHtml(newBlocks));
      },
      [onChange]
    );

    const updateBlock = (id: string, upd: Partial<ContentBlock>) => {
      const newBlocks = blocks.map((b) => (b.id === id ? { ...b, ...upd } : b));
      emitChange(newBlocks);
    };

    const removeBlock = (id: string) => {
      const newBlocks = blocks.filter((b) => b.id !== id);
      emitChange(newBlocks);
      if (selectedId === id) setSelectedId(null);
    };

    const duplicateBlock = (id: string) => {
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const newBlock = { ...blocks[idx], id: crypto.randomUUID() };
      const newBlocks = [
        ...blocks.slice(0, idx + 1),
        newBlock,
        ...blocks.slice(idx + 1),
      ];
      emitChange(newBlocks);
    };

    const moveBlock = (id: string, dir: -1 | 1) => {
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const to = idx + dir;
      if (to < 0 || to >= blocks.length) return;
      const newBlocks = [...blocks];
      [newBlocks[idx], newBlocks[to]] = [newBlocks[to], newBlocks[idx]];
      emitChange(newBlocks);
    };

    const addBlock = (afterId: string | null, type: ContentBlock['type']) => {
      const newBlock = createEmptyBlock(type);
      const idx = afterId
        ? blocks.findIndex((b) => b.id === afterId)
        : blocks.length - 1;
      const newBlocks = [
        ...blocks.slice(0, idx + 1),
        newBlock,
        ...blocks.slice(idx + 1),
      ];
      emitChange(newBlocks);
      setShowAddMenu(null);
      setSelectedId(newBlock.id);
    };

    // Drag
    const handleDragStart = (id: string) => {
      dragRef.current = id;
    };
    const handleDragOver = (e: React.DragEvent, id: string) => {
      e.preventDefault();
      setDragOverId(id);
    };
    const handleDrop = (targetId: string) => {
      const sourceId = dragRef.current;
      if (!sourceId || sourceId === targetId) return;
      const srcIdx = blocks.findIndex((b) => b.id === sourceId);
      const tgtIdx = blocks.findIndex((b) => b.id === targetId);
      if (srcIdx === -1 || tgtIdx === -1) return;
      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(srcIdx, 1);
      newBlocks.splice(tgtIdx, 0, moved);
      emitChange(newBlocks);
      setDragOverId(null);
    };

    const selectedBlock = blocks.find((b) => b.id === selectedId);

    // Expose image inserter
    useImperativeHandle(
      ref,
      () => ({
        insertImageBlock(url: string, alt: string) {
          const newBlock: ContentBlock = {
            id: crypto.randomUUID(),
            type: 'image',
            html: `<img src="${url}" alt="${alt}" draggable="false" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:1rem auto;width:100%" />`,
          };
          const idx = selectedId
            ? blocks.findIndex((b) => b.id === selectedId)
            : blocks.length - 1;
          const insertAt = idx >= 0 ? idx : blocks.length - 1;
          const newBlocks = [
            ...blocks.slice(0, insertAt + 1),
            newBlock,
            ...blocks.slice(insertAt + 1),
          ];
          emitChange(newBlocks);
          setSelectedId(newBlock.id);
          setShowAddMenu(null);
        },
      }),
      [blocks, selectedId, emitChange]
    );

    // ====== Add Menu Popup ======
    const AddBlockMenu = ({
      afterId,
    }: {
      afterId: string | null;
    }) => (
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: '#1a1d29',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '0.5rem',
          display: 'flex',
          gap: '0.25rem',
          flexWrap: 'wrap',
          width: '300px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          justifyContent: 'center',
        }}
      >
        <ABtn icon={<Type size={13} />} label="Teks" onClick={() => addBlock(afterId, 'text')} />
        <ABtn icon={<Heading size={13} />} label="Heading" onClick={() => addBlock(afterId, 'heading')} />
        <ABtn icon={<Image size={13} />} label="Gambar" onClick={() => { addBlock(afterId, 'image'); onOpenImageManager(); }} />
        <ABtn icon={<List size={13} />} label="List" onClick={() => addBlock(afterId, 'list')} />
        <ABtn icon={<ListOrdered size={13} />} label="Nomor" onClick={() => addBlock(afterId, 'numbered-list')} />
        <ABtn icon={<Quote size={13} />} label="Quote" onClick={() => addBlock(afterId, 'quote')} />
        <ABtn icon={<Minus size={13} />} label="Divider" onClick={() => addBlock(afterId, 'divider')} />
      </div>
    );

    // ====== Render ======
    return (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {blocks.map((block) => (
            <div key={block.id}>
              {/* Add button above each block */}
              <AddBtn
                active={showAddMenu === block.id}
                onClick={() =>
                  setShowAddMenu(showAddMenu === block.id ? null : block.id)
                }
              >
                {showAddMenu === block.id && <AddBlockMenu afterId={block.id} />}
              </AddBtn>

              {/* Block container */}
              <BlockContainer
                block={block}
                isSelected={selectedId === block.id}
                isDragOver={dragOverId === block.id}
                onSelect={() => setSelectedId(block.id)}
                onDragStart={() => handleDragStart(block.id)}
                onDragOver={(e) => handleDragOver(e, block.id)}
                onDrop={() => handleDrop(block.id)}
                onDragEnd={() => setDragOverId(null)}
                onMoveUp={() => moveBlock(block.id, -1)}
                onMoveDown={() => moveBlock(block.id, 1)}
                onDuplicate={() => duplicateBlock(block.id)}
                onDelete={() => removeBlock(block.id)}
              >
                <BlockContent
                  block={block}
                  isSelected={selectedId === block.id}
                  onUpdate={(html) => updateBlock(block.id, { html })}
                />
              </BlockContainer>
            </div>
          ))}

          {/* Last add button */}
          <AddBtn
            active={showAddMenu === 'last'}
            onClick={() =>
              setShowAddMenu(showAddMenu === 'last' ? null : 'last')
            }
          >
            {showAddMenu === 'last' && <AddBlockMenu afterId={null} />}
          </AddBtn>
        </div>
      </div>
    );
  }
);

export default BlockEditor;

// ======================================================================
// SUB-COMPONENTS
// ======================================================================

/** Little plus button between blocks */
function AddBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        height: '24px',
      }}
    >
      <button
        onClick={onClick}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: active
            ? 'rgba(212,175,55,0.25)'
            : 'rgba(212,175,55,0.08)',
          border: active
            ? '1px solid rgba(212,175,55,0.5)'
            : '1px dashed rgba(212,175,55,0.2)',
          color: '#d4af37',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: active ? 1 : 0.4,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.opacity = active ? '1' : '0.4')
        }
        title="Tambah Block"
      >
        <Plus size={14} />
      </button>
      {children}
    </div>
  );
}

/** Add block button inside the popup */
function ABtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.3rem 0.55rem',
        background: 'rgba(255,255,255,0.04)',
        border: 'none',
        borderRadius: '6px',
        color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: '0.7rem',
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(212,175,55,0.12)';
        e.currentTarget.style.color = '#d4af37';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
      }}
    >
      {icon} {label}
    </button>
  );
}

/** Wrapper for each block — handles selection highlight & drag */
function BlockContainer({
  block,
  isSelected,
  isDragOver,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children,
}: {
  block: ContentBlock;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      style={{
        position: 'relative',
        padding: '0.5rem 0.5rem 0.5rem 2.2rem',
        borderRadius: '8px',
        border: isDragOver
          ? '2px dashed #d4af37'
          : isSelected
            ? '2px solid rgba(212,175,55,0.4)'
            : '2px solid transparent',
        background: isSelected
          ? 'rgba(212,175,55,0.04)'
          : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          position: 'absolute',
          left: '4px',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: isSelected ? 0.6 : 0.15,
          color: 'rgba(255,255,255,0.3)',
          cursor: 'grab',
        }}
      >
        <GripVertical size={14} />
      </div>

      {/* Action buttons (visible on select) */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            right: '4px',
            top: '-14px',
            display: 'flex',
            gap: '2px',
            zIndex: 10,
          }}
        >
          <MiniBtn icon={<MoveUp size={12} />} title="Naik" onClick={onMoveUp} />
          <MiniBtn icon={<MoveDown size={12} />} title="Turun" onClick={onMoveDown} />
          <MiniBtn icon={<Copy size={12} />} title="Duplikat" onClick={onDuplicate} />
          <MiniBtn icon={<Trash2 size={12} />} title="Hapus" onClick={onDelete} danger />
        </div>
      )}

      {children}
    </div>
  );
}

/** Mini action button */
function MiniBtn({
  icon,
  title,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.08)',
        border: 'none',
        borderRadius: '4px',
        color: danger ? '#ef4444' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        fontSize: '0.6rem',
      }}
    >
      {icon}
    </button>
  );
}

// ======================================================================
// BLOCK CONTENT (the actual editable area)
// ======================================================================

function BlockContent({
  block,
  isSelected,
  onUpdate,
}: {
  block: ContentBlock;
  isSelected: boolean;
  onUpdate: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  // Auto-activate editing when selected + it's a text type
  useEffect(() => {
    if (isSelected && isTextType(block.type) && !editing) {
      const t = setTimeout(() => setEditing(true), 150);
      return () => clearTimeout(t);
    }
    if (!isSelected && editing) {
      setEditing(false);
    }
  }, [isSelected, block.type]);

  // Focus when entering edit mode
  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  // Save on input/blur — clean empty tags
  const save = useCallback(() => {
    if (ref.current) {
      let html = ref.current.innerHTML;
      if (html === '<br>' || html.trim() === '') {
        html = getEmptyHtmlForType(block.type);
      }
      onUpdate(html);
    }
  }, [block.type, onUpdate]);

  // Image block — just display
  if (block.type === 'image') {
    return (
      <div style={{ lineHeight: 0 }}>
        <div dangerouslySetInnerHTML={{ __html: block.html }} />
      </div>
    );
  }

  // Divider block
  if (block.type === 'divider') {
    return (
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
    );
  }

  // Text types — show toolbar above when selected
  return (
    <div>
      {/* Formatting toolbar — always visible when block is selected */}
      {isSelected && (
        <FormatToolbar editorRef={ref} onFormat={save} />
      )}

      {/* Editable content */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={save}
        onInput={save}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            (e.target as HTMLElement).blur();
          }
        }}
        style={{
          padding: '0.5rem',
          borderRadius: '6px',
          outline: 'none',
          color: '#c8d0dc',
          fontSize: block.type === 'heading' ? '1.15rem' : '0.88rem',
          fontWeight: block.type === 'heading' ? 700 : 400,
          fontFamily: block.type === 'heading' ? 'Outfit, sans-serif' : 'Inter, sans-serif',
          lineHeight: '1.7',
          minHeight: '1.5em',
          background: isSelected ? 'rgba(0,0,0,0.15)' : 'transparent',
          border: isSelected ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'all 0.15s',
        }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    </div>
  );
}

// ======================================================================
// FORMATTING TOOLBAR
// ======================================================================

function FormatToolbar({
  editorRef,
  onFormat,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onFormat: () => void;
}) {
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    onFormat();
  };

  const addLink = () => {
    const url = prompt('Masukkan URL:');
    if (url) exec('createLink', url);
  };

  const addHr = () => {
    exec('insertHTML', '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:1.5rem 0">');
  };

  const addCode = () => {
    exec(
      'insertHTML',
      '<pre style="background:rgba(0,0,0,0.3);padding:0.75rem;border-radius:6px;overflow-x:auto;font-family:monospace;font-size:0.82rem;line-height:1.6;color:#e2e8f0;margin:0.5rem 0"><code>Kode...</code></pre>'
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.15rem',
        padding: '0.3rem 0.5rem',
        marginBottom: '0.35rem',
        background: 'rgba(13,16,23,0.85)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        alignItems: 'center',
        userSelect: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <TbBtn icon={<Bold size={14} />} title="Tebal (Ctrl+B)" onClick={() => exec('bold')} />
      <TbBtn icon={<Italic size={14} />} title="Miring (Ctrl+I)" onClick={() => exec('italic')} />
      <TbBtn icon={<Underline size={14} />} title="Garis Bawah (Ctrl+U)" onClick={() => exec('underline')} />
      <DivTb />
      <TbBtn label="H1" title="Heading 1" onClick={() => exec('formatBlock', 'h3')} />
      <TbBtn label="H2" title="Heading 2" onClick={() => exec('formatBlock', 'h4')} />
      <TbBtn label="H3" title="Heading 3" onClick={() => exec('formatBlock', 'h5')} />
      <DivTb />
      <TbBtn icon={<List size={14} />} title="List Berpoin" onClick={() => exec('insertUnorderedList')} />
      <TbBtn icon={<ListOrdered size={14} />} title="List Bernomor" onClick={() => exec('insertOrderedList')} />
      <DivTb />
      <TbBtn icon={<AlignLeft size={14} />} title="Rata Kiri" onClick={() => exec('justifyLeft')} />
      <TbBtn icon={<AlignCenter size={14} />} title="Rata Tengah" onClick={() => exec('justifyCenter')} />
      <TbBtn icon={<AlignRight size={14} />} title="Rata Kanan" onClick={() => exec('justifyRight')} />
      <DivTb />
      <TbBtn icon={<Quote size={13} />} title="Kutipan" onClick={() => exec('formatBlock', 'blockquote')} />
      <TbBtn icon={<span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>{'</>'}</span>} title="Kode" onClick={addCode} />
      <TbBtn icon={<Link size={13} />} title="Tautan" onClick={addLink} />
      <TbBtn icon={<Minus size={14} />} title="Garis Horizontal" onClick={addHr} />
    </div>
  );
}

function TbBtn({
  icon,
  label,
  title,
  onClick,
}: {
  icon?: React.ReactNode;
  label?: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: 'none',
        borderRadius: '6px',
        color: 'rgba(255,255,255,0.75)',
        minWidth: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: label ? '0 0.4rem' : undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(212,175,55,0.12)';
        e.currentTarget.style.color = '#d4af37';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
      }}
    >
      {label || icon}
    </button>
  );
}

function DivTb() {
  return (
    <span
      style={{
        width: '1px',
        height: '18px',
        background: 'rgba(255,255,255,0.06)',
        margin: '0 0.1rem',
      }}
    />
  );
}

// ======================================================================
// UTILITIES
// ======================================================================

function isTextType(type: ContentBlock['type']) {
  return type === 'text' || type === 'heading' || type === 'quote' || type === 'list' || type === 'numbered-list';
}

function getEmptyHtmlForType(type: ContentBlock['type']): string {
  switch (type) {
    case 'heading':
      return '<h3 style="margin:0;color:#fff;font-family:Outfit,sans-serif;font-weight:700;font-size:1.15rem">Judul</h3>';
    case 'quote':
      return '<blockquote style="margin:0;padding:0.5rem 0.75rem;border-left:3px solid #d4af37;background:rgba(212,175,55,0.05);border-radius:0 6px 6px 0;color:#c8d0dc;font-style:italic">Kutipan...</blockquote>';
    case 'list':
      return '<ul style="margin:0.25rem 0;padding-left:1.5rem"><li style="color:#c8d0dc">Item</li></ul>';
    case 'numbered-list':
      return '<ol style="margin:0.25rem 0;padding-left:1.5rem"><li style="color:#c8d0dc">Item</li></ol>';
    default:
      return '<p style="margin:0;color:#c8d0dc;font-size:0.88rem;line-height:1.7">Teks...</p>';
  }
}

function createEmptyBlock(type: ContentBlock['type']): ContentBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case 'text':
      return { id, type, html: '<p style="margin:0;color:#c8d0dc;font-size:0.88rem;line-height:1.7">Tulis teks di sini...</p>' };
    case 'heading':
      return { id, type: 'heading', html: '<h3 style="margin:0;color:#fff;font-family:Outfit,sans-serif;font-weight:700;font-size:1.15rem">Judul Baru</h3>' };
    case 'image':
      return { id, type: 'image', html: '<div style="padding:2rem;text-align:center;background:rgba(255,255,255,0.03);border:2px dashed rgba(255,255,255,0.1);border-radius:8px;color:rgba(255,255,255,0.25);font-size:0.8rem">Klik "Gambar" untuk memilih</div>' };
    case 'list':
      return { id, type: 'list', html: '<ul style="margin:0.25rem 0;padding-left:1.5rem"><li style="color:#c8d0dc;font-size:0.88rem;line-height:1.7">Item list</li></ul>' };
    case 'numbered-list':
      return { id, type: 'numbered-list', html: '<ol style="margin:0.25rem 0;padding-left:1.5rem"><li style="color:#c8d0dc;font-size:0.88rem;line-height:1.7">Item pertama</li></ol>' };
    case 'quote':
      return { id, type: 'quote', html: '<blockquote style="margin:0;padding:0.5rem 0.75rem;border-left:3px solid #d4af37;background:rgba(212,175,55,0.05);border-radius:0 6px 6px 0;color:#c8d0dc;font-style:italic;font-size:0.88rem">Kutipan teks di sini...</blockquote>' };
    case 'divider':
      return { id, type: 'divider', html: '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:1rem 0">' };
    default:
      return { id, type: 'text', html: '<p style="margin:0;color:#c8d0dc;font-size:0.88rem">Konten</p>' };
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
    let type: ContentBlock['type'] = 'text';

    const hasImg = node.querySelector ? !!node.querySelector('img') : false;
    if (tag === 'img' || tag === 'figure' || tag === 'picture' || hasImg) type = 'image';
    else if (tag.match(/^h[1-6]$/)) type = 'heading';
    else if (tag === 'ul') type = 'list';
    else if (tag === 'ol') type = 'numbered-list';
    else if (tag === 'blockquote') type = 'quote';
    else if (tag === 'hr') type = 'divider';

    blocks.push({ id: `block-${i++}`, type, html: outerHtml });
  }

  if (blocks.length === 0) blocks.push(createEmptyBlock('text'));
  return blocks;
}

function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map((b) => b.html).join('\n');
}
