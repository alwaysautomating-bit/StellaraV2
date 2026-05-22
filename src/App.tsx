/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useCallback, useRef, useDeferredValue } from 'react';
import { 
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Folder,
  FolderPlus,
  Plus,
  X,
  Maximize2,
  Minimize2,
  Type,
  FileText,
  Trash2,
  Save,
  Check,
  Search,
  SlidersHorizontal,
  Moon,
  Sun,
  Copy,
  Download,
  Upload
} from 'lucide-react';

// --- Types ---

type CardState = 'collapsed' | 'expanded' | 'minimized' | 'active';
type CardColor = 'cobalt' | 'mint' | 'orchid' | 'seaweed' | 'lime' | 'ivory';
type ThemeMode = 'dark' | 'light';
type CardShape = 'rounded' | 'square';
type DensityMode = 'spacious' | 'standard' | 'compact';
type AppBackup = {
  version: 1;
  exportedAt: string;
  folders: { id: string; name: string }[];
  editorCards: EditorCard[];
  settings: {
    themeMode: ThemeMode;
    cardShape: CardShape;
    densityMode: DensityMode;
    editorFontSize: string;
    editorFontFamily: string;
    editorLineHeight: string;
  };
};

type EditorCard = {
  id: string;
  title: string;
  text: string;
  state: CardState;
  color: CardColor;
  tags: string[];
  folderId?: string;
};

const isCardState = (value: unknown): value is CardState =>
  value === 'collapsed' || value === 'expanded' || value === 'minimized' || value === 'active';

const isCardColor = (value: unknown): value is CardColor =>
  value === 'cobalt' ||
  value === 'mint' ||
  value === 'orchid' ||
  value === 'seaweed' ||
  value === 'lime' ||
  value === 'ivory';

const editorialPalette: { id: CardColor; label: string; swatch: string; strip: string; border: string }[] = [
  { id: 'cobalt', label: 'Cobalt', swatch: '#4F6EF7', strip: 'rgba(79,110,247,0.84)', border: 'rgba(79,110,247,0.18)' },
  { id: 'mint', label: 'Mint', swatch: '#79D0B1', strip: 'rgba(121,208,177,0.78)', border: 'rgba(121,208,177,0.18)' },
  { id: 'orchid', label: 'Orchid', swatch: '#A67AE8', strip: 'rgba(166,122,232,0.76)', border: 'rgba(166,122,232,0.18)' },
  { id: 'seaweed', label: 'Seaweed', swatch: '#3F8B78', strip: 'rgba(63,139,120,0.78)', border: 'rgba(63,139,120,0.18)' },
  { id: 'lime', label: 'Lime', swatch: '#B5D66A', strip: 'rgba(181,214,106,0.72)', border: 'rgba(181,214,106,0.2)' },
  { id: 'ivory', label: 'Ivory', swatch: '#E6DED0', strip: 'rgba(218,210,196,0.78)', border: 'rgba(219,210,194,0.18)' },
];

const paletteById = Object.fromEntries(
  editorialPalette.map((entry) => [entry.id, entry])
) as Record<CardColor, (typeof editorialPalette)[number]>;

const getInheritedColor = (cards: EditorCard[]): CardColor => {
  const nonIvory = cards.find((card) => card.color !== 'ivory');
  return nonIvory?.color ?? 'ivory';
};

const densityConfig: Record<DensityMode, {
  sidebarSectionGap: string;
  sidebarNestedGap: string;
  sidebarRowPadding: string;
  railGap: string;
  cardLargePadding: string;
  cardSmallPadding: string;
}> = {
  spacious: {
    sidebarSectionGap: 'gap-6',
    sidebarNestedGap: 'gap-2',
    sidebarRowPadding: 'px-3 py-2.5',
    railGap: 'gap-5 md:gap-6 lg:gap-7',
    cardLargePadding: 'p-6 sm:p-7 md:p-8',
    cardSmallPadding: 'p-4.5',
  },
  standard: {
    sidebarSectionGap: 'gap-5',
    sidebarNestedGap: 'gap-1.5',
    sidebarRowPadding: 'px-2.5 py-2',
    railGap: 'gap-4 md:gap-5 lg:gap-6',
    cardLargePadding: 'p-5 sm:p-6 md:p-7',
    cardSmallPadding: 'p-4',
  },
  compact: {
    sidebarSectionGap: 'gap-4',
    sidebarNestedGap: 'gap-1',
    sidebarRowPadding: 'px-2 py-1.5',
    railGap: 'gap-3 md:gap-4 lg:gap-4',
    cardLargePadding: 'p-4 sm:p-5 md:p-6',
    cardSmallPadding: 'p-3.5',
  },
};

const normalizeEditorCards = (cards: any[]): EditorCard[] => {
  const normalized = cards.map((card, index) => ({
    id: card.id ?? crypto.randomUUID(),
    title: typeof card.title === 'string' ? card.title : 'Untitled Document',
    text: typeof card.text === 'string' ? card.text : '',
    color: isCardColor(card.color) ? card.color : 'ivory',
    tags: Array.isArray(card.tags) ? card.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0) : [],
    state: isCardState(card.state)
      ? card.state
      : card.isCollapsed
        ? 'collapsed'
        : index === 0
          ? 'active'
          : 'expanded',
    folderId: typeof card.folderId === 'string' ? card.folderId : undefined,
  }));

  const activeCards = normalized.filter((card) => card.state === 'active');
  if (activeCards.length === 0 && normalized.length > 0) {
    normalized[0] = { ...normalized[0], state: 'active' };
  }

  if (activeCards.length > 1) {
    let activeAssigned = false;
    return normalized.map((card) => {
      if (card.state !== 'active') {
        return card;
      }

      if (!activeAssigned) {
        activeAssigned = true;
        return card;
      }

      return { ...card, state: 'expanded' };
    });
  }

  return normalized;
};

// --- Components ---

const StarField = ({ mode }: { mode: ThemeMode }) => {
  const [stars, setStars] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    const starCount = 120;
    const newStars = Array.from({ length: starCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100 + 10, // Start slightly lower
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * -20, // Negative delay to start mid-animation
      duration: Math.random() * 40 + 40 // 40-80s drift up
    }));
    setStars(newStars);
  }, []);

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${mode === 'dark' ? 'bg-[#05070A]' : 'bg-[#f2ede4]'}`}>
      <div
        className="nebula nebula-1 animate-[drift_60s_infinite_alternate_ease-in-out]"
        style={mode === 'light' ? { opacity: 0.45, filter: 'blur(96px)' } : undefined}
      />
      <div
        className="nebula nebula-2 animate-[drift_80s_infinite_alternate-reverse_ease-in-out]"
        style={mode === 'light' ? { opacity: 0.28, filter: 'blur(100px)' } : undefined}
      />
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${(star.duration / 10).toFixed(2)}s infinite alternate ease-in-out, driftUp ${star.duration.toFixed(2)}s infinite linear`,
            animationDelay: `${star.delay.toFixed(2)}s, ${star.delay.toFixed(2)}s`,
            opacity: mode === 'dark' ? 0.8 : 0.32,
            background: mode === 'dark' ? 'white' : '#ffffff'
          }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const [text, setText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('stellara_themeMode') as ThemeMode) || 'dark');
  const [cardShape, setCardShape] = useState<CardShape>(() => (localStorage.getItem('stellara_cardShape') as CardShape) || 'rounded');
  const [densityMode, setDensityMode] = useState<DensityMode>(() => (localStorage.getItem('stellara_densityMode') as DensityMode) || 'standard');
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('stellara_searchQuery') || '');
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  
  // Folder State
  const [folders, setFolders] = useState<{id: string, name: string}[]>(() => {
    const cached = localStorage.getItem('stellara_folders');
    return cached ? JSON.parse(cached) : [];
  });
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'uncategorized': true
  });
  
  // Editor Cards State
  const [editorCards, setEditorCards] = useState<EditorCard[]>(() => {
    const cached = localStorage.getItem('stellara_cards');
    return cached ? normalizeEditorCards(JSON.parse(cached)) : [
      { id: 'default', title: 'Untitled Document', text: '', state: 'active', color: 'ivory', tags: [] }
    ];
  });
  const [activeCardId, setActiveCardId] = useState<string | null>(() => {
    const cached = localStorage.getItem('stellara_cards');
    if (!cached) return 'default';
    const cards = normalizeEditorCards(JSON.parse(cached));
    return cards.find((card) => card.state === 'active')?.id ?? cards[0]?.id ?? null;
  });
  const [openToolbarCardId, setOpenToolbarCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Save & Organize Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalFolderId, setSaveModalFolderId] = useState<string>('uncategorized');
  const [saveModalColor, setSaveModalColor] = useState<CardColor>('ivory');
  const [saveModalTag, setSaveModalTag] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingImportBackup, setPendingImportBackup] = useState<AppBackup | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const getCardOrganizationSignals = (card: EditorCard) => ({
    hasFolder: Boolean(card.folderId),
    hasTag: card.tags.length > 0,
    hasColor: card.color !== 'ivory',
  });

  const shouldPromptForOrganization = (card: EditorCard) => {
    const signals = getCardOrganizationSignals(card);
    return !signals.hasFolder && !signals.hasTag && !signals.hasColor;
  };

  const openSaveModal = () => {
    const activeCard = editorCards.find(c => c.id === activeCardId);
    if (activeCard) {
      setSaveModalFolderId(activeCard.folderId || 'uncategorized');
      setSaveModalColor(activeCard.color);
      setSaveModalTag(activeCard.tags[0] || '');
    } else {
      setSaveModalFolderId('uncategorized');
      setSaveModalColor('ivory');
      setSaveModalTag('');
    }
    setIsSaveModalOpen(true);
  };

  const commitActiveCardText = () => {
    if (!activeCardId) return null;

    let updatedCard: EditorCard | null = null;
    setEditorCards((prev) =>
      prev.map((card) => {
        if (card.id !== activeCardId) {
          return card;
        }

        updatedCard = { ...card, text };
        return updatedCard;
      })
    );

    return updatedCard;
  };

  const handleSaveClick = () => {
    const activeCard = commitActiveCardText() ?? editorCards.find((card) => card.id === activeCardId) ?? null;
    if (!activeCard) {
      return;
    }

    showToast('Saved');

    if (shouldPromptForOrganization(activeCard)) {
      openSaveModal();
    }
  };

  const applySaveModalRouting = () => {
    if (!activeCardId) {
      setIsSaveModalOpen(false);
      return;
    }

    const folderId = saveModalFolderId === 'uncategorized' ? undefined : saveModalFolderId;
    const trimmedTag = saveModalTag.trim();
    const nextTags = trimmedTag ? [trimmedTag] : [];

    setEditorCards(editorCards.map(c => 
      c.id === activeCardId ? { ...c, text, folderId, color: saveModalColor, tags: nextTags } : c
    ));
    
    if (folderId) {
      setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
    } else {
      setExpandedFolders(prev => ({ ...prev, 'uncategorized': true }));
    }

    setIsSaveModalOpen(false);
    showToast(trimmedTag || folderId || saveModalColor !== 'ivory' ? 'Saved and organized' : 'Saved');
  };

  // Text Editor Settings State
  const [editorFontSize, setEditorFontSize] = useState<string>(() => localStorage.getItem('stellara_fontSize') || 'text-2xl lg:text-3xl');
  const [editorFontFamily, setEditorFontFamily] = useState<string>(() => localStorage.getItem('stellara_fontFamily') || 'font-serif');
  const [editorLineHeight, setEditorLineHeight] = useState<string>(() => localStorage.getItem('stellara_lineHeight') || 'leading-relaxed');

  useEffect(() => {
    localStorage.setItem('stellara_fontSize', editorFontSize);
    localStorage.setItem('stellara_fontFamily', editorFontFamily);
    localStorage.setItem('stellara_lineHeight', editorLineHeight);
  }, [editorFontSize, editorFontFamily, editorLineHeight]);

  useEffect(() => {
    localStorage.setItem('stellara_themeMode', themeMode);
    localStorage.setItem('stellara_cardShape', cardShape);
    localStorage.setItem('stellara_densityMode', densityMode);
    localStorage.setItem('stellara_searchQuery', searchQuery);
  }, [themeMode, cardShape, densityMode, searchQuery]);

  useEffect(() => {
    localStorage.setItem('stellara_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('stellara_cards', JSON.stringify(editorCards));
  }, [editorCards]);

  const activateCard = (cardId: string) => {
    setActiveCardId(cardId);
    setEditorCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return { ...card, state: 'active' };
        }

        if (card.state === 'active') {
          return { ...card, state: 'minimized' };
        }

        return card;
      })
    );
  };

  const openToolbarForCard = (cardId: string) => {
    if (activeCardId !== cardId) {
      activateCard(cardId);
    }
    setOpenToolbarCardId(cardId);
  };

  const copyNoteText = async (card: EditorCard) => {
    try {
      await navigator.clipboard.writeText(card.text);
      showToast('Note copied');
    } catch {
      showToast('Copy unavailable');
    }
  };

  const pasteNoteText = async (card: EditorCard) => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        showToast('Clipboard is empty');
        return;
      }

      const textarea = document.getElementById(`textarea-${card.id}`) as HTMLTextAreaElement | null;
      const currentValue = card.id === activeCardId ? text : card.text;
      const selectionStart = textarea?.selectionStart ?? currentValue.length;
      const selectionEnd = textarea?.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, selectionStart)}${clipboardText}${currentValue.slice(selectionEnd)}`;
      const nextCursorPosition = selectionStart + clipboardText.length;

      setText(nextValue);
      setEditorCards((prev) => prev.map((entry) => entry.id === card.id ? { ...entry, text: nextValue } : entry));

      setTimeout(() => {
        const nextTextarea = document.getElementById(`textarea-${card.id}`) as HTMLTextAreaElement | null;
        if (nextTextarea) {
          nextTextarea.focus();
          nextTextarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
        }
      }, 0);

      showToast('Pasted into note');
    } catch {
      showToast('Paste unavailable');
    }
  };

  const exportNote = (card: EditorCard, format: 'txt' | 'md') => {
    const filename = `${slugifyFilename(card.title || 'note')}.${format}`;
    const content = format === 'md'
      ? `# ${card.title || 'Untitled Note'}\n\n${card.text}`
      : card.text;
    createDownload(filename, content, format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8');
    showToast(`Exported ${format.toUpperCase()}`);
  };

  const exportBackup = () => {
    const payload: AppBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      folders,
      editorCards,
      settings: {
        themeMode,
        cardShape,
        densityMode,
        editorFontSize,
        editorFontFamily,
        editorLineHeight,
      },
    };

    createDownload('stellara-backup.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    showToast('Backup exported');
  };

  const applyImportedBackup = () => {
    if (!pendingImportBackup) return;

    setFolders(pendingImportBackup.folders);
    const normalizedCards = normalizeEditorCards(pendingImportBackup.editorCards);
    setEditorCards(normalizedCards);
    const nextActive = normalizedCards.find((card) => card.state === 'active') ?? normalizedCards[0] ?? null;
    setActiveCardId(nextActive?.id ?? null);
    setText(nextActive?.text ?? '');
    setThemeMode(pendingImportBackup.settings.themeMode);
    setCardShape(pendingImportBackup.settings.cardShape);
    setDensityMode(pendingImportBackup.settings.densityMode);
    setEditorFontSize(pendingImportBackup.settings.editorFontSize);
    setEditorFontFamily(pendingImportBackup.settings.editorFontFamily);
    setEditorLineHeight(pendingImportBackup.settings.editorLineHeight);
    setExpandedFolders({ uncategorized: true });
    setActiveFolderId(null);
    setPendingImportBackup(null);
    showToast('Backup imported');
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<AppBackup>;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.folders) || !Array.isArray(parsed.editorCards) || !parsed.settings) {
        throw new Error('Invalid backup');
      }

      const backup: AppBackup = {
        version: 1,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
        folders: parsed.folders.filter((folder): folder is { id: string; name: string } => typeof folder?.id === 'string' && typeof folder?.name === 'string'),
        editorCards: normalizeEditorCards(parsed.editorCards),
        settings: {
          themeMode: parsed.settings.themeMode === 'light' ? 'light' : 'dark',
          cardShape: parsed.settings.cardShape === 'square' ? 'square' : 'rounded',
          densityMode: parsed.settings.densityMode === 'spacious' || parsed.settings.densityMode === 'compact' ? parsed.settings.densityMode : 'standard',
          editorFontSize: typeof parsed.settings.editorFontSize === 'string' ? parsed.settings.editorFontSize : 'text-2xl lg:text-3xl',
          editorFontFamily: typeof parsed.settings.editorFontFamily === 'string' ? parsed.settings.editorFontFamily : 'font-serif',
          editorLineHeight: typeof parsed.settings.editorLineHeight === 'string' ? parsed.settings.editorLineHeight : 'leading-relaxed',
        },
      };

      setPendingImportBackup(backup);
    } catch {
      showToast('Backup import failed');
    } finally {
      event.target.value = '';
    }
  };

  const updateCardState = (cardId: string, nextState: Exclude<CardState, 'active'>) => {
    setEditorCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, state: nextState } : card))
    );

    if (activeCardId === cardId) {
      setActiveCardId(null);
    }
  };

  const cycleCardState = (card: EditorCard) => {
    if (card.state === 'active') {
      updateCardState(card.id, 'expanded');
      return;
    }

    if (card.state === 'expanded') {
      updateCardState(card.id, 'minimized');
      return;
    }

    if (card.state === 'minimized') {
      updateCardState(card.id, 'collapsed');
      return;
    }

    updateCardState(card.id, 'expanded');
  };

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderHighlightedText = (value: string, query: string, limit?: number) => {
    if (!value) return null;

    const trimmed = query.trim();
    const source = limit && value.length > limit ? `${value.slice(0, limit).trimEnd()}...` : value;
    if (!trimmed) return source;

    const match = source.toLowerCase().indexOf(trimmed.toLowerCase());
    if (match === -1) return source;

    const start = source.slice(0, match);
    const middle = source.slice(match, match + trimmed.length);
    const end = source.slice(match + trimmed.length);

    return (
      <>
        {start}
        <mark className="rounded-sm bg-[#efe4b8]/70 px-0.5 text-inherit">{middle}</mark>
        {end}
      </>
    );
  };

  const createDownload = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const slugifyFilename = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'note';

  const density = densityConfig[densityMode];
  const isDarkMode = themeMode === 'dark';
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const cardRadiusClasses = cardShape === 'rounded'
    ? {
        active: 'rounded-[28px] md:rounded-[34px]',
        expanded: 'rounded-[28px] md:rounded-[34px]',
        minimized: 'rounded-[24px]',
        collapsed: 'rounded-[22px]',
        modal: 'rounded-2xl md:rounded-3xl',
        panel: 'rounded-2xl',
      }
    : {
        active: 'rounded-[12px] md:rounded-[14px]',
        expanded: 'rounded-[12px] md:rounded-[14px]',
        minimized: 'rounded-[10px]',
        collapsed: 'rounded-[10px]',
        modal: 'rounded-[14px] md:rounded-[16px]',
        panel: 'rounded-[12px]',
      };
  const surfaceTheme = isDarkMode
    ? {
        shell: 'text-slate-200 selection:bg-white/10',
        headerButton: 'border-white/8 bg-white/3 text-white/55 hover:border-white/12 hover:bg-white/6 hover:text-white',
        plusButton: 'border-blue-400/25 bg-blue-600/20 text-blue-300 shadow-blue-500/10 hover:bg-blue-600/35 hover:text-blue-100',
        sidebar: 'bg-[#070A13]/98 border-white/5',
        headerLabel: 'text-slate-400',
        preferencePanel: 'border-white/8 bg-white/[0.04]',
        searchInput: 'border-white/8 bg-white/[0.04] text-white placeholder:text-slate-500',
        footer: 'text-slate-400',
        toast: 'bg-[#070A13] border-emerald-400/30 text-white',
        modal: 'bg-[#070A13] border-white/10 text-white',
        modalInput: 'bg-white/5 border-white/10 text-white',
      }
    : {
        shell: 'text-slate-800 selection:bg-slate-300/50',
        headerButton: 'border-[#d7cfbf] bg-white/55 text-slate-500 hover:border-[#cfc5b3] hover:bg-white/80 hover:text-slate-800',
        plusButton: 'border-[#c8c0b1] bg-[#f6f1e8] text-slate-700 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.16)] hover:bg-[#fffaf2] hover:text-slate-900',
        sidebar: 'bg-[#f7f1e8]/96 border-[#ddd4c6]',
        headerLabel: 'text-slate-500',
        preferencePanel: 'border-[#ddd5c8] bg-white/60',
        searchInput: 'border-[#ddd5c8] bg-white/70 text-slate-700 placeholder:text-slate-400',
        footer: 'text-slate-500',
        toast: 'bg-[#fffaf3] border-[#d8cfbf] text-slate-800',
        modal: 'bg-[#f7f1e8] border-[#ddd4c6] text-slate-800',
        modalInput: 'bg-white/70 border-[#ddd5c8] text-slate-700',
      };
  const sidebarTone = isDarkMode
    ? {
        sectionActive: 'border-white/14 bg-white/[0.045] text-slate-100',
        sectionIdle: 'border-white/[0.06] text-slate-300 hover:bg-white/[0.035] hover:text-white',
        rowActive: 'bg-white/[0.06] text-slate-100',
        rowIdle: 'text-slate-400 hover:bg-white/[0.035] hover:text-slate-200',
        drop: 'bg-white/[0.06] ring-1 ring-white/10',
        nestedBorder: 'border-white/[0.04]',
        iconButton: 'text-slate-400 hover:text-white hover:bg-white/5',
        actionHover: 'hover:bg-white/5',
      }
    : {
        sectionActive: 'border-[#d7cebf] bg-white/65 text-slate-800',
        sectionIdle: 'border-[#e3dacd] text-slate-600 hover:bg-white/45 hover:text-slate-800',
        rowActive: 'bg-white/65 text-slate-800',
        rowIdle: 'text-slate-500 hover:bg-white/45 hover:text-slate-700',
        drop: 'bg-white/80 ring-1 ring-slate-300/45',
        nestedBorder: 'border-[#e7dfd2]',
        iconButton: 'text-slate-500 hover:text-slate-800 hover:bg-black/[0.04]',
        actionHover: 'hover:bg-black/[0.04]',
      };
  const folderNameById = Object.fromEntries(folders.map((folder) => [folder.id, folder.name])) as Record<string, string>;
  const matchingCards = normalizedSearchQuery
    ? editorCards.filter((card) => {
        const folderName = card.folderId ? folderNameById[card.folderId] || '' : 'Loose Notes';
        const haystack = [card.title, card.text, folderName, card.tags.join(' ')].join(' ').toLowerCase();
        return haystack.includes(normalizedSearchQuery);
      })
    : [];
  const activeCanvasCard = editorCards.find((card) => card.state === 'active') ?? null;
  const defaultCanvasCards = editorCards.filter((card) => card.folderId === (activeFolderId || undefined));
  const cardsToRender = normalizedSearchQuery
    ? matchingCards
    : activeCanvasCard
      ? [activeCanvasCard]
      : defaultCanvasCards;
  const isSoloActiveCanvas =
    !normalizedSearchQuery &&
    cardsToRender.length === 1 &&
    cardsToRender[0]?.state === 'active';
  const isWritingFocus = isSoloActiveCanvas;

  // Set initial text when active card loads
  useEffect(() => {
    const activeCard = editorCards.find(c => c.id === activeCardId);
    if (activeCard) {
      setText(activeCard.text);
    }
  }, [activeCardId, editorCards]);

  const addFolder = () => {
    if (newFolderName.trim()) {
      const newId = crypto.randomUUID();
      setFolders([...folders, { id: newId, name: newFolderName.trim() }]);
      setNewFolderName('');
      setIsAddingFolder(false);
      // Automatically expand newly created folder
      setExpandedFolders(prev => ({ ...prev, [newId]: true }));
    }
  };

  const deleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolders(folders.filter(f => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(null);
    // Unassign cards from the deleted folder
    setEditorCards(editorCards.map(c => c.folderId === id ? { ...c, folderId: undefined } : c));
  };

  const renameFolder = (id: string, newName: string) => {
    if (newName.trim()) {
      setFolders(folders.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    }
    setEditingFolderId(null);
  };

  const moveCardToFolder = (cardId: string, folderId: string | null) => {
    setEditorCards(editorCards.map(c => c.id === cardId ? { ...c, folderId: folderId ?? undefined } : c));
  };

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const createNoteInFolder = (folderId: string | null) => {
    const newId = crypto.randomUUID();
    const newCard = { 
      id: newId, 
      title: 'Untitled Document', 
      text: '', 
      state: 'active' as const,
      color: 'ivory' as const,
      tags: [],
      folderId: folderId ?? undefined 
    };
    setEditorCards([
      ...editorCards.map((card) => card.state === 'active' ? { ...card, state: 'expanded' as const } : card),
      newCard
    ]);
    setActiveCardId(newId);
    setText('');
    if (folderId) {
      setExpandedFolders(prev => ({ ...prev, [folderId]: true }));
    } else {
      setExpandedFolders(prev => ({ ...prev, 'uncategorized': true }));
    }

    // Auto-focus the new note's textarea after a brief render delay
    setTimeout(() => {
      const textarea = document.getElementById(`textarea-${newId}`);
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  const deleteCard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newCards = editorCards.filter(c => c.id !== id);
    const nextActiveId = activeCardId === id ? (newCards[0]?.id ?? null) : activeCardId;
    const normalizedCards = activeCardId === id && nextActiveId
      ? newCards.map((card) => {
          if (card.id === nextActiveId) {
            return { ...card, state: 'active' as const };
          }
          return card.state === 'active' ? { ...card, state: 'expanded' as const } : card;
        })
      : newCards;

    setEditorCards(normalizedCards);
    if (activeCardId === id) {
      if (normalizedCards.length > 0) {
        setActiveCardId(nextActiveId);
        const nextActiveCard = normalizedCards.find((card) => card.id === nextActiveId) ?? normalizedCards[0];
        setText(nextActiveCard.text);
      } else {
        // Create an initial fallback card if everything is empty
        const fallbackId = crypto.randomUUID();
        setEditorCards([{ id: fallbackId, title: 'Untitled Document', text: '', state: 'active', color: 'ivory', tags: [] }]);
        setActiveCardId(fallbackId);
        setText('');
      }
    }
  };

  const renameCard = (id: string, newTitle: string) => {
    if (newTitle.trim()) {
      setEditorCards(editorCards.map(c => c.id === id ? { ...c, title: newTitle.trim() } : c));
    }
    setEditingCardId(null);
  };

  return (
    <div className={`relative min-h-screen flex flex-col px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 overflow-x-hidden ${surfaceTheme.shell}`}>
      <StarField mode={themeMode} />

      {/* Header */}
      <AnimatePresence>
        {(
          <motion.header 
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            animate={{
              opacity: isWritingFocus ? 0.62 : 1,
              y: 0,
            }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`relative z-10 flex h-14 sm:h-16 w-full items-center justify-between gap-3 sm:gap-4 mb-6 md:mb-8 transition-opacity duration-300 ${isWritingFocus ? 'lg:hover:opacity-100' : ''}`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${surfaceTheme.headerButton}`}
                title="Toggle Sidebar"
              >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
              </button>
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-w-0 items-center"
              >
                <h1 className={`truncate text-[1.15rem] sm:text-2xl md:text-3xl font-light tracking-[0.28em] sm:tracking-[0.32em] uppercase shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>STELLARA</h1>
              </motion.div>
            </div>

            <div className="flex shrink-0 items-center">
              <button
                onClick={() => createNoteInFolder(activeFolderId)}
                className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer ${surfaceTheme.plusButton}`}
                title="New Note"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Sidebar + Main Layout */}
      <div className={`relative z-10 flex-1 flex flex-col lg:flex-row pl-0 lg:-ml-4 transition-[gap] duration-300 ${isWritingFocus ? 'gap-6 lg:gap-8' : 'gap-8 lg:gap-12'}`}>
        
        {/* Mobile Sidebar Backdrop */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#05070A]/80 backdrop-blur-sm z-20 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="popLayout">
          {isSidebarOpen && (
            <motion.aside 
              initial={{ opacity: 0, x: -260 }}
              animate={{
                opacity: isWritingFocus ? 0.38 : 1,
                x: 0,
                scale: isWritingFocus ? 0.985 : 1,
              }}
              exit={{ opacity: 0, x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed lg:relative top-0 bottom-0 left-0 z-30 lg:z-10 w-[280px] lg:w-64 h-[100dvh] lg:h-auto pt-12 lg:pt-4 pb-6 px-6 lg:px-0 lg:py-0 flex flex-col gap-4 shrink-0 border-r lg:border-none overflow-y-auto lg:overflow-visible shadow-2xl lg:shadow-none transition-[opacity,transform,filter] duration-300 ${isWritingFocus ? 'lg:-translate-x-2 lg:blur-[0.2px] lg:hover:translate-x-0 lg:hover:opacity-100 lg:hover:scale-100 lg:hover:blur-none' : ''} ${surfaceTheme.sidebar}`}
            >
              <div className="w-full lg:w-[240px] flex flex-col pt-4">
                {/* Folders & Notes List Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${surfaceTheme.headerLabel}`}>Workspace</span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        setIsAddingFolder(true);
                        setIsPreferencesOpen(false);
                      }}
                      className={`transition-colors cursor-pointer p-1 rounded-md ${sidebarTone.iconButton}`}
                      title="Add Folder"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsPreferencesOpen((prev) => !prev)}
                      className={`transition-colors cursor-pointer p-1 rounded-md ${sidebarTone.iconButton}`}
                      title="View preferences"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsSidebarOpen(false)}
                      className={`transition-colors cursor-pointer p-1 rounded-md lg:hidden ${sidebarTone.iconButton}`}
                      title="Close Sidebar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isAddingFolder && (
                  <div className="flex items-center gap-2 mb-4 bg-white/5 rounded-lg p-2 border border-white/10 mx-2">
                    <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <input 
                      type="text" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addFolder()}
                      autoFocus
                      className={`bg-transparent border-none outline-none text-xs w-full ${isDarkMode ? 'text-white' : 'text-slate-700'}`}
                      placeholder="New folder..."
                    />
                    <button onClick={addFolder} className="text-blue-400 hover:text-blue-300 shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => {setIsAddingFolder(false); setNewFolderName('');}} className="text-slate-400 hover:text-slate-200 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="px-2 mb-4">
                  <label className={`mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium ${surfaceTheme.headerLabel}`}>
                    <Search className="w-3.5 h-3.5" />
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Titles, notes, tags, folders"
                    className={`w-full ${cardRadiusClasses.panel} border px-3 py-2 text-sm outline-none transition-colors ${surfaceTheme.searchInput}`}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {isPreferencesOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      className={`mx-2 mb-4 overflow-hidden border ${cardRadiusClasses.panel} ${surfaceTheme.preferencePanel}`}
                    >
                      <div className="space-y-4 p-3">
                        <div className="space-y-2">
                          <span className={`text-[10px] uppercase tracking-[0.2em] font-medium ${surfaceTheme.headerLabel}`}>Theme</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setThemeMode('dark')}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors ${themeMode === 'dark' ? 'bg-white/10 text-white' : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                              <Moon className="w-3.5 h-3.5" />
                              Dark
                            </button>
                            <button
                              onClick={() => setThemeMode('light')}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors ${themeMode === 'light' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-900/8 text-slate-700') : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}
                            >
                              <Sun className="w-3.5 h-3.5" />
                              Light
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className={`text-[10px] uppercase tracking-[0.2em] font-medium ${surfaceTheme.headerLabel}`}>Cards</span>
                          <div className="flex gap-2">
                            {(['rounded', 'square'] as CardShape[]).map((shape) => (
                              <button
                                key={shape}
                                onClick={() => setCardShape(shape)}
                                className={`flex-1 rounded-full px-3 py-2 text-xs capitalize transition-colors ${cardShape === shape ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-900/8 text-slate-700') : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}
                              >
                                {shape}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className={`text-[10px] uppercase tracking-[0.2em] font-medium ${surfaceTheme.headerLabel}`}>Density</span>
                          <div className="flex gap-2">
                            {(['spacious', 'standard', 'compact'] as DensityMode[]).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setDensityMode(mode)}
                                className={`flex-1 rounded-full px-3 py-2 text-xs capitalize transition-colors ${densityMode === mode ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-900/8 text-slate-700') : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className={`text-[10px] uppercase tracking-[0.2em] font-medium ${surfaceTheme.headerLabel}`}>Backup</span>
                          <div className="flex gap-2">
                            <button
                              onClick={exportBackup}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors ${isDarkMode ? 'bg-white/8 text-slate-200 hover:bg-white/12' : 'bg-slate-900/6 text-slate-700 hover:bg-slate-900/10'}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              Export
                            </button>
                            <button
                              onClick={() => importFileInputRef.current?.click()}
                              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors ${isDarkMode ? 'bg-white/8 text-slate-200 hover:bg-white/12' : 'bg-slate-900/6 text-slate-700 hover:bg-slate-900/10'}`}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Import
                            </button>
                          </div>
                          <input
                            ref={importFileInputRef}
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={handleImportBackup}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`flex flex-col ${density.sidebarSectionGap} px-1 max-h-[70vh] overflow-y-auto pr-1 hide-scrollbar`}>
                  {normalizedSearchQuery && (
                    <div className="flex flex-col gap-2">
                      <div className="px-2 flex items-center justify-between">
                        <span className={`text-[10px] uppercase tracking-[0.22em] font-medium ${surfaceTheme.headerLabel}`}>Results</span>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300"
                        >
                          Clear
                        </button>
                      </div>
                      <div className={`flex flex-col ${density.sidebarNestedGap}`}>
                        {matchingCards.length > 0 ? matchingCards.map((card) => (
                          <div
                            key={`search-${card.id}`}
                            onClick={() => {
                              setActiveFolderId(card.folderId ?? null);
                              activateCard(card.id);
                              setText(card.text);
                            }}
                            className={`${cardRadiusClasses.panel} cursor-pointer transition-colors ${activeCardId === card.id ? sidebarTone.rowActive : sidebarTone.rowIdle} ${density.sidebarRowPadding}`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: paletteById[card.color].strip }} />
                              <span className="truncate text-xs">{renderHighlightedText(card.title || 'Untitled', normalizedSearchQuery, 44)}</span>
                            </div>
                            <div className="mt-1 truncate text-[10px] text-slate-500">
                              {renderHighlightedText(
                                `${card.folderId ? folderNameById[card.folderId] : 'Loose Notes'}${card.tags.length > 0 ? ` · ${card.tags.join(', ')}` : ''}`,
                                normalizedSearchQuery,
                                52
                              )}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                              {renderHighlightedText(card.text || 'No note text yet.', normalizedSearchQuery, 88)}
                            </div>
                          </div>
                        )) : (
                          <div className={`text-xs italic text-slate-500 ${density.sidebarRowPadding}`}>No matching notes.</div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* 1. Uncategorized Folder */}
                  <div className="flex flex-col gap-2">
                    <div className="px-2">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-medium">Loose Notes</span>
                    </div>
                    <div
                      onClick={() => setActiveFolderId(null)}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedCardId) moveCardToFolder(draggedCardId, null);
                      }}
                      className={`group flex items-center justify-between text-left w-full transition-all cursor-pointer border-l ${cardRadiusClasses.panel} ${density.sidebarRowPadding} ${activeFolderId === null ? sidebarTone.sectionActive : sidebarTone.sectionIdle} ${draggedCardId ? sidebarTone.drop : ''}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <button 
                          onClick={(e) => toggleFolderExpand('uncategorized', e)}
                        className={`p-0.5 ${sidebarTone.iconButton}`}
                        >
                          {expandedFolders['uncategorized'] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#d8d0c4]" />
                        <span className="text-xs truncate font-medium">Loose Notes</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); createNoteInFolder(null); }}
                        className={`p-1 rounded transition-colors ${sidebarTone.iconButton}`}
                        title="Add note here"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Uncategorized files list */}
                    {expandedFolders['uncategorized'] && (
                      <div className={`ml-3 flex flex-col ${density.sidebarNestedGap} pl-3 border-l ${sidebarTone.nestedBorder}`}>
                        {editorCards.filter(c => !c.folderId).map(card => (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={() => setDraggedCardId(card.id)}
                            onDragEnd={() => setDraggedCardId(null)}
                            onClick={() => {
                              activateCard(card.id);
                              setText(card.text);
                            }}
                            className={`group/item flex items-center justify-between text-xs transition-colors cursor-pointer ${cardRadiusClasses.panel} ${density.sidebarRowPadding} ${activeCardId === card.id ? sidebarTone.rowActive : sidebarTone.rowIdle}`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: paletteById[card.color].strip }}
                              />
                              <span className="truncate">{card.title || 'Untitled'}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                              className="opacity-0 group-item-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all rounded"
                              title="Delete note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {editorCards.filter(c => !c.folderId).length === 0 && (
                          <span className="text-[10px] text-slate-600 italic py-1 pl-2">Nothing here yet</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Folders tree list */}
                  <div className="flex flex-col gap-2">
                    <div className="px-2">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-medium">Folders</span>
                    </div>
                  {folders.map(folder => {
                    const isExpanded = !!expandedFolders[folder.id];
                    const folderNotes = editorCards.filter(c => c.folderId === folder.id);
                    const folderColor = paletteById[getInheritedColor(folderNotes)];

                    return (
                      <div key={folder.id} className="flex flex-col gap-2">
                        <div
                          onClick={() => setActiveFolderId(folder.id)}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedCardId) moveCardToFolder(draggedCardId, folder.id);
                          }}
                          className={`group flex items-center justify-between text-left w-full transition-all cursor-pointer border-l ${cardRadiusClasses.panel} ${density.sidebarRowPadding} ${activeFolderId === folder.id ? sidebarTone.sectionActive : sidebarTone.sectionIdle} ${draggedCardId ? sidebarTone.drop : ''}`}
                          style={{ borderLeftColor: folderColor.border }}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <button 
                              onClick={(e) => toggleFolderExpand(folder.id, e)}
                              className={`p-0.5 ${sidebarTone.iconButton}`}
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: folderColor.strip }}
                            />
                            {editingFolderId === folder.id ? (
                              <input
                                autoFocus
                                value={editingFolderName}
                                onChange={(e) => setEditingFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') renameFolder(folder.id, editingFolderName);
                                  if (e.key === 'Escape') setEditingFolderId(null);
                                }}
                                onBlur={() => renameFolder(folder.id, editingFolderName)}
                                onClick={(e) => e.stopPropagation()}
                                className={`bg-transparent border-none outline-none text-xs w-full ${isDarkMode ? 'text-white' : 'text-slate-700'}`}
                              />
                            ) : (
                              <span 
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFolderId(folder.id);
                                  setEditingFolderName(folder.name);
                                }}
                                className="text-xs truncate"
                              >
                                {folder.name}
                              </span>
                            )}
                          </div>
                          
                          {!editingFolderId && (
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); createNoteInFolder(folder.id); }}
                                className={`p-1 rounded transition-colors ${sidebarTone.iconButton}`}
                                title="Add note in folder"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => deleteFolder(folder.id, e)}
                                className={`p-1 rounded transition-colors ${sidebarTone.iconButton}`}
                                title="Delete folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Foldered files list */}
                        {isExpanded && (
                          <div className={`ml-3 flex flex-col ${density.sidebarNestedGap} pl-3 border-l ${sidebarTone.nestedBorder}`}>
                            {folderNotes.map(card => (
                              <div
                                key={card.id}
                                draggable
                                onDragStart={() => setDraggedCardId(card.id)}
                                onDragEnd={() => setDraggedCardId(null)}
                                onClick={() => {
                                  activateCard(card.id);
                                  setText(card.text);
                                }}
                                className={`group/item flex items-center justify-between text-xs transition-colors cursor-pointer ${cardRadiusClasses.panel} ${density.sidebarRowPadding} ${activeCardId === card.id ? sidebarTone.rowActive : sidebarTone.rowIdle}`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                  <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: paletteById[card.color].strip }}
                                  />
                                  <span className="truncate">{card.title || 'Untitled'}</span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                                  className="opacity-0 group-item-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all rounded"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {folderNotes.length === 0 && (
                              <span className="text-[10px] text-slate-600 italic py-1 pl-2">No notes yet</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                  
                  {folders.length === 0 && !isAddingFolder && (
                    <div className="p-4 text-center border border-dashed border-white/5 rounded-xl mt-4 mx-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">No custom folders</span>
                      <button 
                        onClick={() => setIsAddingFolder(true)}
                        className="text-xs text-blue-400 hover:underline font-medium"
                      >
                        Create one
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col transition-all gap-6 overflow-y-auto overflow-x-hidden hide-scrollbar pb-10 ${isSoloActiveCanvas ? 'pl-0 lg:pl-8' : 'pl-0 lg:pl-4'}`}>
          <div className={isSoloActiveCanvas ? '-mx-2 px-2 sm:-mx-3 sm:px-3 md:mx-0 md:px-0' : '-mx-4 px-4 sm:-mx-5 sm:px-5 md:mx-0 md:px-0'}>
            <div className={`flex w-full items-start pb-3 hide-scrollbar ${
              isSoloActiveCanvas
                ? 'justify-center overflow-x-hidden'
                : `overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pr-4 md:flex-wrap md:justify-center md:overflow-x-visible md:overscroll-x-auto md:snap-none lg:justify-start ${density.railGap}`
            }`}>
            <AnimatePresence>
              {cardsToRender.map(card => {
                const isActiveCard = card.state === 'active';
                const isExpandedCard = card.state === 'expanded' || isActiveCard;
                const isMinimizedCard = card.state === 'minimized';
                const isCollapsedCard = card.state === 'collapsed';
                const cardPalette = paletteById[card.color];
                const accentStripHeight = isCollapsedCard ? '0.35rem' : isMinimizedCard ? '0.45rem' : '0.55rem';
                const cardClassName = isActiveCard
                  ? `w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2.5rem)] md:w-[min(52rem,calc(100vw-6rem))] lg:w-[min(64rem,calc(100vw-24rem))] xl:w-[min(68rem,calc(100vw-28rem))] h-[min(78vh,52rem)] sm:h-[min(80vh,54rem)] md:h-[min(82vh,56rem)] min-h-[28rem] max-h-[58rem] ${density.cardLargePadding} creamy-card ${cardRadiusClasses.active} cursor-pointer transition-all duration-500 flex flex-col relative overflow-hidden shrink-0 snap-center ring-1 ring-slate-300/70 shadow-[0_24px_56px_-36px_rgba(15,23,42,0.34)]`
                  : isExpandedCard
                    ? `w-[calc(100vw-2.75rem)] sm:w-[calc(100vw-3.5rem)] md:w-[min(24rem,calc(50vw-2.75rem))] lg:w-[22.5rem] h-[min(64vh,31rem)] sm:h-[min(66vh,33rem)] md:h-[31rem] min-h-[20rem] max-h-[38rem] ${density.cardLargePadding} creamy-card ${cardRadiusClasses.expanded} cursor-pointer hover:shadow-[0_18px_42px_-28px_rgba(15,23,42,0.32)] hover:cursor-grab active:cursor-grabbing transition-all duration-300 flex flex-col relative overflow-hidden shrink-0 snap-center`
                    : isMinimizedCard
                      ? `w-[15rem] sm:w-[16rem] md:w-[15.5rem] min-h-[10.5rem] ${density.cardSmallPadding} creamy-card ${cardRadiusClasses.minimized} cursor-pointer hover:shadow-[0_14px_32px_-24px_rgba(15,23,42,0.28)] transition-all duration-300 flex flex-col relative shrink-0 snap-start`
                      : `w-[11.5rem] sm:w-[12.5rem] md:w-[12rem] min-h-[4.75rem] ${density.cardSmallPadding} creamy-card ${cardRadiusClasses.collapsed} cursor-pointer hover:shadow-[0_12px_24px_-22px_rgba(15,23,42,0.24)] transition-all duration-300 flex flex-col justify-center relative shrink-0 snap-start`;

                return (
                  <motion.div 
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    draggable={!isCollapsedCard}
                    onDragStart={() => setDraggedCardId(card.id)}
                    onDragEnd={() => setDraggedCardId(null)}
                    className={cardClassName}
                    onClick={() => {
                      if (activeCardId !== card.id) {
                        activateCard(card.id);
                        setText(card.text);
                      }
                      
                      if (!isCollapsedCard) {
                        setTimeout(() => {
                          const textarea = document.getElementById(`textarea-${card.id}`);
                          if (textarea) {
                            textarea.focus();
                            const len = (textarea as HTMLTextAreaElement).value.length;
                            (textarea as HTMLTextAreaElement).setSelectionRange(len, len);
                          }
                        }, 50);
                      }
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 z-10"
                      style={{
                        height: accentStripHeight,
                        backgroundColor: cardPalette.strip,
                        boxShadow: `inset 0 -1px 0 ${cardPalette.border}`,
                      }}
                    />
                    {isActiveCard && (
                      <>
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_15%_20%,rgba(79,110,247,0.06),transparent_22%),radial-gradient(circle_at_85%_16%,rgba(255,255,255,0.08),transparent_16%)] opacity-90" />
                        <div className="pointer-events-none absolute inset-x-[8%] top-8 h-16 rounded-full bg-white/40 blur-3xl opacity-55" />
                      </>
                    )}
                    <div className="flex flex-col h-full overflow-hidden">
                      {/* Card Header with Title and Control Buttons */}
                      <div 
                        onClick={(e) => {
                          if (isCollapsedCard) {
                            e.stopPropagation();
                            activateCard(card.id);
                            setText(card.text);
                            
                            setTimeout(() => {
                              const textarea = document.getElementById(`textarea-${card.id}`);
                              if (textarea) {
                                textarea.focus();
                                const len = (textarea as HTMLTextAreaElement).value.length;
                                (textarea as HTMLTextAreaElement).setSelectionRange(len, len);
                              }
                            }, 50);
                          }
                        }}
                        className={`flex items-center justify-between gap-4 shrink-0 select-none ${isCollapsedCard ? 'pt-1' : 'mb-4 pb-3 pt-1.5 border-b border-slate-200/60'}`}
                      >
                        <input
                          type="text"
                          className={`bg-transparent border-none outline-none text-slate-800 font-light w-full focus:text-slate-900 transition-colors cursor-text ${isActiveCard ? 'text-lg sm:text-xl font-normal' : isCollapsedCard ? 'text-sm font-semibold' : 'text-sm font-semibold'}`}
                          style={{
                            textDecorationColor: cardPalette.border,
                          }}
                          value={card.title}
                          onChange={(e) => {
                            setEditorCards(editorCards.map(c => c.id === card.id ? { ...c, title: e.target.value } : c));
                          }}
                          placeholder="Title..."
                          readOnly={isCollapsedCard}
                          onClick={(e) => {
                            if (isCollapsedCard) {
                              e.stopPropagation();
                              activateCard(card.id);
                              setText(card.text);
                              
                              setTimeout(() => {
                                const textarea = document.getElementById(`textarea-${card.id}`);
                                if (textarea) {
                                  textarea.focus();
                                  const len = (textarea as HTMLTextAreaElement).value.length;
                                  (textarea as HTMLTextAreaElement).setSelectionRange(len, len);
                                }
                              }, 50);
                            } else {
                              e.stopPropagation();
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cycleCardState(card);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title={
                              isActiveCard
                                ? "Demote to expanded"
                                : isExpandedCard
                                  ? "Minimize note"
                                  : isMinimizedCard
                                    ? "Collapse note"
                                    : "Re-expand note"
                            }
                          >
                            {isActiveCard ? (
                              <Minimize2 className="w-4 h-4" />
                            ) : isCollapsedCard ? (
                              <Maximize2 className="w-4 h-4" />
                            ) : (
                              <Minimize2 className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                            )}
                          </button>
                          <button
                            onClick={(e) => deleteCard(card.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Delete Note"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Content with scrollable textarea */}
                      {isExpandedCard && (
                        <div className="relative flex min-h-0 flex-col flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            id={`textarea-${card.id}`}
                            value={card.id === activeCardId ? text : card.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (card.id === activeCardId) setText(val);
                              setEditorCards(editorCards.map(c => c.id === card.id ? { ...c, text: val } : c));
                            }}
                            onFocus={() => {
                              if (activeCardId !== card.id) {
                                activateCard(card.id);
                                setText(card.text);
                              }
                            }}
                            className={`flex-1 w-full h-full bg-transparent border-none outline-none resize-none overflow-y-auto hide-scrollbar ${editorFontFamily} ${editorLineHeight} placeholder-slate-400/80 transition-colors ${card.id === activeCardId ? 'text-slate-800' : 'text-slate-600'} ${editorFontSize} ${isActiveCard ? 'mx-auto max-w-[56rem] pb-[5rem] pt-2 sm:pb-[5.5rem]' : 'pb-[3.5rem] sm:pb-[4rem]'}`}
                            placeholder=""
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-1 pb-1 sm:px-0 sm:pb-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isActiveCard && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="pointer-events-auto ml-1 flex items-center gap-2"
                              >
                                <button
                                  onClick={() => copyNoteText(card)}
                                  className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200/75 bg-[#f4f1ea]/92 px-3 text-[11px] font-sans font-medium text-slate-500 transition-colors hover:bg-[#efebe2] hover:text-slate-700 cursor-pointer"
                                  title="Copy note"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </button>
                                <button
                                  onClick={handleSaveClick}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/75 bg-[#f4f1ea]/92 text-slate-500 transition-colors hover:bg-[#efebe2] hover:text-slate-700 cursor-pointer"
                                  title="Save note"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            )}

                            <div className="pointer-events-auto mr-1 flex items-end">
                              <AnimatePresence initial={false} mode="popLayout">
                                {openToolbarCardId === card.id ? (
                                  <motion.div
                                    key="format-tools"
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    className="flex max-w-[13.5rem] sm:max-w-none flex-col gap-2 rounded-[20px] border border-slate-200/80 bg-[#f7f4ee]/96 p-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)] backdrop-blur-sm"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-[10px] font-sans font-medium uppercase tracking-[0.18em] text-slate-400">Style</span>
                                      <button 
                                        onClick={() => setOpenToolbarCardId(null)}
                                        className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
                                        title="Hide formatting tools"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                      <div className="flex flex-wrap items-center gap-2 sm:basis-full">
                                        {editorialPalette.map((palette) => {
                                          const isSelected = card.color === palette.id;

                                          return (
                                            <button
                                              key={palette.id}
                                              onClick={() => {
                                                setEditorCards(editorCards.map((entry) =>
                                                  entry.id === card.id ? { ...entry, color: palette.id } : entry
                                                ));
                                              }}
                                              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer ${
                                                isSelected ? 'border-slate-500 bg-white/90' : 'border-slate-200 bg-[#fcfbf8] hover:border-slate-300'
                                              }`}
                                              title={palette.label}
                                              aria-label={palette.label}
                                            >
                                              <span
                                                className="h-4 w-4 rounded-full"
                                                style={{ backgroundColor: palette.swatch, boxShadow: `inset 0 0 0 1px ${palette.border}` }}
                                              />
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <select 
                                        value={editorFontFamily} 
                                        onChange={(e) => setEditorFontFamily(e.target.value)}
                                        className="min-w-0 rounded-xl border border-slate-200 bg-[#fcfbf8] px-2.5 py-2 text-[11px] font-sans text-slate-700 outline-none transition-colors focus:border-slate-300"
                                      >
                                        <option value="font-serif">Serif</option>
                                        <option value="font-inter">Sans</option>
                                        <option value="font-mono">Mono</option>
                                      </select>

                                      <select 
                                        value={editorFontSize} 
                                        onChange={(e) => setEditorFontSize(e.target.value)}
                                        className="min-w-0 rounded-xl border border-slate-200 bg-[#fcfbf8] px-2.5 py-2 text-[11px] font-sans text-slate-700 outline-none transition-colors focus:border-slate-300"
                                      >
                                        <option value="text-lg lg:text-xl">Small</option>
                                        <option value="text-2xl lg:text-3xl">Medium</option>
                                        <option value="text-4xl lg:text-5xl">Large</option>
                                        <option value="text-5xl lg:text-6xl">Jumbo</option>
                                      </select>

                                      <select 
                                        value={editorLineHeight} 
                                        onChange={(e) => setEditorLineHeight(e.target.value)}
                                        className="min-w-0 rounded-xl border border-slate-200 bg-[#fcfbf8] px-2.5 py-2 text-[11px] font-sans text-slate-700 outline-none transition-colors focus:border-slate-300"
                                      >
                                        <option value="leading-tight">Tight</option>
                                        <option value="leading-normal">Normal</option>
                                        <option value="leading-relaxed">Relaxed</option>
                                        <option value="leading-loose">Loose</option>
                                      </select>

                                      {isActiveCard && (
                                        <div className="flex gap-2 sm:basis-full">
                                          <button
                                            onClick={() => copyNoteText(card)}
                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-[#fcfbf8] px-2.5 py-2 text-[11px] font-sans text-slate-700 transition-colors hover:bg-[#f3eee6]"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                            Copy
                                          </button>
                                          <button
                                            onClick={() => pasteNoteText(card)}
                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-[#fcfbf8] px-2.5 py-2 text-[11px] font-sans text-slate-700 transition-colors hover:bg-[#f3eee6]"
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            Paste
                                          </button>
                                          <button
                                            onClick={() => exportNote(card, 'txt')}
                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-[#fcfbf8] px-2.5 py-2 text-[11px] font-sans text-slate-700 transition-colors hover:bg-[#f3eee6]"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            TXT
                                          </button>
                                          <button
                                            onClick={() => exportNote(card, 'md')}
                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-[#fcfbf8] px-2.5 py-2 text-[11px] font-sans text-slate-700 transition-colors hover:bg-[#f3eee6]"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            MD
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                ) : (
                                  <motion.button
                                    key="format-toggle"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => openToolbarForCard(card.id)}
                                    className="rounded-full border border-slate-200/75 bg-[#f4f1ea]/92 px-3 py-2 text-[11px] font-sans font-medium text-slate-500 transition-colors hover:bg-[#efebe2] hover:text-slate-700 cursor-pointer"
                                    title="Show formatting tools"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Type className="w-3.5 h-3.5" />
                                      <span>Aa</span>
                                    </span>
                                  </motion.button>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      )}
                      {isMinimizedCard && (
                        <div className="flex flex-1 flex-col justify-between gap-4 text-slate-600" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs leading-relaxed line-clamp-5">
                            {card.text.trim() || 'Minimized note. Click the card to activate it or use the control to collapse it further.'}
                          </p>
                          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                            Minimized
                          </div>
                        </div>
                      )}
                      {isCollapsedCard && (
                        <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                          Collapsed
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-10 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 pb-4">
        <div className={`text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-center md:text-left ${surfaceTheme.footer}`}>System status: Orbital</div>
        <div className={`text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-center md:text-right ${surfaceTheme.footer}`}>Interstellar Connectivity: Active</div>
      </footer>

      {/* Save & Organize Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070A]/85 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md border p-6 md:p-8 shadow-2xl relative ${cardRadiusClasses.modal} ${surfaceTheme.modal}`}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className={`absolute right-4 top-4 p-1.5 rounded-lg transition-all cursor-pointer ${sidebarTone.iconButton}`}
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Saved. Want to organize this note?
              </h3>
              <p className={`text-sm mb-6 ${surfaceTheme.footer}`}>
                A quick touch is enough. You can also leave it uncategorized.
              </p>

              <div className="space-y-3 mb-5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">Move to folder</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSaveModalFolderId('uncategorized')}
                    className={`rounded-full px-3 py-2 text-xs transition-all cursor-pointer border ${saveModalFolderId === 'uncategorized' ? (isDarkMode ? 'bg-white/10 border-white/15 text-white' : 'bg-slate-900/8 border-slate-400/20 text-slate-800') : (isDarkMode ? 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10' : 'bg-slate-900/4 border-transparent text-slate-600 hover:bg-slate-900/8')}`}
                  >
                    Leave uncategorized
                  </button>
                  {folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSaveModalFolderId(f.id)}
                      className={`rounded-full px-3 py-2 text-xs transition-all cursor-pointer border ${saveModalFolderId === f.id ? (isDarkMode ? 'bg-white/10 border-white/15 text-white' : 'bg-slate-900/8 border-slate-400/20 text-slate-800') : (isDarkMode ? 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10' : 'bg-slate-900/4 border-transparent text-slate-600 hover:bg-slate-900/8')}`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">Assign color</label>
                <div className="flex flex-wrap gap-2">
                  {editorialPalette.map((palette) => {
                    const isSelected = saveModalColor === palette.id;

                    return (
                      <button
                        key={palette.id}
                        onClick={() => setSaveModalColor(palette.id)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer ${isSelected ? (isDarkMode ? 'border-white/30 bg-white/10' : 'border-slate-400/25 bg-slate-900/8') : (isDarkMode ? 'border-white/8 bg-white/5 hover:bg-white/10' : 'border-slate-300/30 bg-slate-900/4 hover:bg-slate-900/8')}`}
                        title={palette.label}
                        aria-label={palette.label}
                      >
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: palette.swatch }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">Add tag</label>
                <input 
                  type="text" 
                  value={saveModalTag}
                  onChange={(e) => setSaveModalTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applySaveModalRouting();
                    }
                  }}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-sans ${surfaceTheme.modalInput}`}
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={applySaveModalRouting}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-widest active:scale-95 transition-all cursor-pointer ${isDarkMode ? 'bg-white/10 hover:bg-white/14 text-white' : 'bg-slate-900/10 hover:bg-slate-900/14 text-slate-800'}`}
                >
                  Done
                </button>
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className={`px-5 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10' : 'bg-slate-900/4 text-slate-600 hover:text-slate-800 hover:bg-slate-900/8'}`}
                >
                  Not now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingImportBackup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#05070A]/78 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className={`w-full max-w-md border p-6 md:p-7 shadow-2xl relative ${cardRadiusClasses.modal} ${surfaceTheme.modal}`}
            >
              <button
                onClick={() => setPendingImportBackup(null)}
                className={`absolute right-4 top-4 p-1.5 rounded-lg transition-all cursor-pointer ${sidebarTone.iconButton}`}
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Replace this workspace with the backup?
              </h3>
              <p className={`text-sm mb-5 ${surfaceTheme.footer}`}>
                This will overwrite your current notes, folders, and preferences.
              </p>

              <div className={`mb-6 border ${cardRadiusClasses.panel} ${isDarkMode ? 'border-white/8 bg-white/[0.04]' : 'border-[#ddd5c8] bg-white/65'} p-4`}>
                <div className={`text-xs uppercase tracking-[0.18em] mb-3 ${surfaceTheme.headerLabel}`}>Backup Preview</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{pendingImportBackup.editorCards.length}</div>
                    <div className={`text-[10px] uppercase tracking-[0.18em] ${surfaceTheme.footer}`}>Notes</div>
                  </div>
                  <div>
                    <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{pendingImportBackup.folders.length}</div>
                    <div className={`text-[10px] uppercase tracking-[0.18em] ${surfaceTheme.footer}`}>Folders</div>
                  </div>
                  <div>
                    <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{pendingImportBackup.exportedAt.slice(0, 10)}</div>
                    <div className={`text-[10px] uppercase tracking-[0.18em] ${surfaceTheme.footer}`}>Exported</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={applyImportedBackup}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-widest active:scale-95 transition-all cursor-pointer ${isDarkMode ? 'bg-white/10 hover:bg-white/14 text-white' : 'bg-slate-900/10 hover:bg-slate-900/14 text-slate-800'}`}
                >
                  Import Backup
                </button>
                <button
                  onClick={() => setPendingImportBackup(null)}
                  className={`px-5 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10' : 'bg-slate-900/4 text-slate-600 hover:text-slate-800 hover:bg-slate-900/8'}`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 border px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-sans text-xs uppercase tracking-wider font-medium ${surfaceTheme.toast}`}
          >
            <div className="p-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
