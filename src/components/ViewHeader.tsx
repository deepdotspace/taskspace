import React from 'react';
import { Icon } from '../utils/icons';
import { styles, T } from '../utils/styles';
import { VIEWS, ViewState, Project, WidgetUser } from '../constants';

interface ViewHeaderProps {
  view: ViewState;
  project: Project | null;
  user: WidgetUser | null;
  taskCount: number;
  taskCountData: { completed: number; uncompleted: number; total: number };
  getDisplayName: (user: WidgetUser | null) => string;
  onMenuClick?: () => void;
  // View mode toggle (moved here from Toolbar)
  viewMode?: 'list' | 'board';
  onViewModeChange?: (mode: 'list' | 'board') => void;
}

const VIEW_TITLES: Record<string, string> = {
  [VIEWS.ALL]: 'All Tasks',
  [VIEWS.TODAY]: 'Today',
  [VIEWS.UPCOMING]: 'Upcoming',
  [VIEWS.LOGBOOK]: 'Logbook',
  [VIEWS.TRASH]: 'Trash',
};

// ── Tab icons (inline to match design stroke SVGs) ──────
const ListTabIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
const BoardTabIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="18" rx="1" />
    <rect x="14" y="3" width="7" height="12" rx="1" />
  </svg>
);

function ViewHeader({
  view,
  project,
  user,
  taskCount,
  taskCountData,
  getDisplayName,
  onMenuClick,
  viewMode,
  onViewModeChange,
}: ViewHeaderProps) {
  let title = VIEW_TITLES[view.type] || '';
  let crumbParent: string | null = null;

  if (view.type === VIEWS.PROJECT && project) {
    title = project.title;
    crumbParent = 'Projects';
  } else if (view.type === VIEWS.USER) {
    crumbParent = 'People';
    if (view.id === 'unassigned') {
      title = 'Unassigned';
    } else if (user) {
      title = getDisplayName(user);
    }
  }

  const isUpcoming = view.type === VIEWS.UPCOMING;
  const isLogbook = view.type === VIEWS.LOGBOOK;
  const isTrash = view.type === VIEWS.TRASH;

  // View tabs (List / Board) only for the primary work views
  const showTabs = Boolean(viewMode && onViewModeChange)
    && (view.type === VIEWS.ALL || view.type === VIEWS.TODAY
      || view.type === VIEWS.PROJECT || view.type === VIEWS.USER);

  // Subtitle only for Upcoming / Logbook
  let subtitle: string | null = null;
  if (isUpcoming) subtitle = 'Everything with a due date, ahead of today';
  else if (isLogbook) subtitle = 'A history of everything your team has shipped';

  const { uncompleted, completed, total } = taskCountData;

  return (
    <div data-testid="view-header">
      <div style={styles.viewHeader}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {/* Hamburger menu button — visible only on mobile via CSS */}
          {onMenuClick && (
            <button className="mobile-hamburger" onClick={onMenuClick} aria-label="Open menu" style={{ marginTop: '2px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb (only when a project/user context exists) */}
            {crumbParent && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                fontSize: '12.5px', color: T.textFaint, marginBottom: '10px',
              }}>
                <span>{crumbParent}</span>
                <Icon name="chevron-right" size={13} color="#C4C8D6" />
                <span style={{ color: T.textSecondary, fontWeight: 550 }}>{title}</span>
              </div>
            )}

            {/* Title row + count pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={styles.viewTitle}>{title}</h1>
              {isUpcoming ? (
                <span style={styles.countPill}>{total} scheduled</span>
              ) : isLogbook ? (
                <span style={{ ...styles.countPill, ...styles.countPillGreen }}>{completed} completed</span>
              ) : isTrash ? (
                total > 0 && <span style={styles.countPill}>{total} item{total !== 1 ? 's' : ''}</span>
              ) : (
                <>
                  <span style={styles.countPill}>{uncompleted} open</span>
                  {completed > 0 && (
                    <span style={{ ...styles.countPill, ...styles.countPillGreen }}>{completed} done</span>
                  )}
                </>
              )}
            </div>

            {subtitle && (
              <p data-view-subtitle style={{ ...styles.viewSubtitle, margin: '4px 0 0' }}>{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* View tabs */}
      {showTabs && viewMode && onViewModeChange && (
        <div style={{ ...styles.viewTabs, marginTop: '14px' }}>
          <button
            data-testid="view-mode-list"
            onClick={() => onViewModeChange('list')}
            style={{ ...styles.viewTab, ...(viewMode === 'list' ? styles.viewTabActive : {}) }}
          >
            {ListTabIcon}
            List
          </button>
          <button
            data-testid="view-mode-board"
            onClick={() => onViewModeChange('board')}
            style={{ ...styles.viewTab, ...(viewMode === 'board' ? styles.viewTabActive : {}) }}
          >
            {BoardTabIcon}
            Board
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(ViewHeader);
