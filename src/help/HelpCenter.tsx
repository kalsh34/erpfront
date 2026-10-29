import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, BookOpen, PlayCircle, FileText, CornerDownRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Modal } from '../components/ui';
import { useHelp } from './HelpContext';
import { allGuidesForRole, allToursForRole, allArticlesForRole, getTourById } from './registry';

type ResultKind = 'guide' | 'tour' | 'article';

interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;
  module: string;
  excerpt: string;
  route?: string;
  keywords?: string[];
}

/**
 * Help Center: one searchable place to find any page guide, tour, or concept
 * article the user's role may access. Selecting a result navigates to its
 * page (guides) or starts the walkthrough (tours) / opens the article.
 */
export function HelpCenter() {
  const { centerOpen, closeCenter, navigateWithGuide, startTour, isTourCompleted, restartTour, userRole } = useHelp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (centerOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [centerOpen]);

  const guides = useMemo(() => allGuidesForRole(userRole), [userRole]);
  const tours = useMemo(() => allToursForRole(userRole), [userRole]);
  const articles = useMemo(() => allArticlesForRole(userRole), [userRole]);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool: SearchResult[] = [
      ...guides.map((g) => ({
        kind: 'guide' as const,
        id: g.id,
        title: g.title,
        module: g.module,
        excerpt: g.purpose,
      })),
      ...tours.map((t) => ({
        kind: 'tour' as const,
        id: t.id,
        title: t.title,
        module: t.routePrefixes[0] === '/' ? 'Getting started' : `Page: ${t.routePrefixes[0]}`,
        excerpt: t.description,
        route: t.routePrefixes[0] === '/' ? '/' : t.routePrefixes[0],
      })),
      ...articles.map((a) => ({
        kind: 'article' as const,
        id: a.id,
        title: a.title,
        module: a.module,
        excerpt: a.body[0],
        keywords: a.keywords,
      })),
    ];
    if (!q) return pool;
    return pool.filter((r) => {
      const hay = `${r.title} ${r.module} ${r.excerpt} ${(r.keywords || []).join(' ')}`.toLowerCase();
      return q.split(/\s+/).every((term) => hay.includes(term));
    });
  }, [guides, tours, articles, query]);

  const openResult = (r: SearchResult) => {
    if (r.kind === 'guide' && r.route !== undefined) navigateWithGuide(r.route);
    if (r.kind === 'tour') {
      const tour = getTourById(r.id);
      if (tour && tour.routePrefixes[0] && tour.routePrefixes[0] !== '/') {
        navigateWithGuide(tour.routePrefixes[0]);
        setTimeout(() => startTour(tour.id), 350);
      } else {
        if (tour) startTour(tour.id);
      }
    }
    // Articles render inline below; no navigation.
  };

  return (
    <Modal open={centerOpen} onClose={closeCenter} title="Help Center" size="lg">
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          className="v-input !pl-10"
          placeholder="Search by module, task, or question — e.g. “sunday hours”, “how do I pay”, “locked”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search help articles"
        />
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="text-center py-10">
          <FileText className="w-8 h-8 text-subtext mx-auto mb-2" />
          <p className="text-sm text-muted">Nothing matches “{query}”. Try fewer words or a different term.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2 max-h-[55vh] overflow-y-auto pr-1" role="list">
          {results.map((r) => (
            <ResultRow key={`${r.kind}-${r.id}`} result={r} onOpen={openResult}>              {r.kind === 'tour' ? (
                <TourActionRow id={r.id} onRestart={restartTour} completed={isTourCompleted(r.id)} onStart={() => openResult(r)} />
              ) : r.kind === 'article' ? (
                <ArticlePeek excerpt={r.excerpt} />
              ) : (
                <p className="text-xs text-muted line-clamp-2">{r.excerpt}</p>
              )}
            </ResultRow>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-subtext flex items-center gap-1.5">
        <BookOpen className="w-3 h-3" />
        {guides.length} page guides · {tours.length} guided tours · {articles.length} concept articles — filtered to your role
      </p>
    </Modal>
  );
}

function ResultRow({ result, onOpen, children }: { result: SearchResult; onOpen: (r: SearchResult) => void; children: React.ReactNode }) {
  const icons: Record<ResultKind, React.ReactNode> = {
    guide: <CornerDownRight className="w-4 h-4" />,
    tour: <PlayCircle className="w-4 h-4" />,
    article: <FileText className="w-4 h-4" />,
  };
  const label: Record<ResultKind, string> = { guide: 'Page guide', tour: 'Guided tour', article: 'Concept' };
  return (
    <div role="listitem" className="v-card p-3.5 hover:border-primary-400 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => onOpen(result)} className="flex items-start gap-3 text-left flex-1 min-w-0 group">
          <span className="mt-0.5 p-1.5 rounded-lg bg-subtle text-muted group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors shrink-0">
            {icons[result.kind]}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{result.title}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{label[result.kind]}</span>
              <span className="text-[10px] text-subtext">{result.module}</span>
            </span>
            {children}
          </span>
        </button>
      </div>
    </div>
  );
}

function TourActionRow({ id, completed, onStart, onRestart }: { id: string; completed: boolean; onStart: () => void; onRestart: (id: string) => void }) {
  return (
    <span className="mt-0.5 flex items-center gap-1.5">
      {completed && <CheckCircle2 className="w-3.5 h-3.5 text-success-text shrink-0" aria-label="Completed" />}
      <button
        onClick={completed ? () => onRestart(id) : onStart}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
          completed
            ? 'text-primary-600 dark:text-primary-400 hover:underline'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {completed ? (<><RotateCcw className="w-3 h-3" /> Restart</>) : ('Start tour')}
      </button>
    </span>
  );
}

function ArticlePeek({ excerpt }: { excerpt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="mt-1 block">
      {open ? (
        <span className="block text-xs text-ink leading-relaxed whitespace-pre-line">{excerpt}</span>
      ) : (
        <span className="block text-xs text-muted truncate">{excerpt}</span>
      )}
      <button onClick={() => setOpen((o) => !o)} className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline mt-1">
        {open ? 'Show less' : 'Read more'}
      </button>
    </span>
  );
}

export default HelpCenter;
