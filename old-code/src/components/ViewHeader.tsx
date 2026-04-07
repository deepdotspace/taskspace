import React from 'react';
import { Icon } from '../utils/icons';
import { styles } from '../utils/styles';
import { VIEWS, ViewState, Project, WidgetUser } from '../constants';

interface ViewHeaderProps {
  view: ViewState;
  project: Project | null;
  user: WidgetUser | null;
  taskCount: number;
  taskCountData: { completed: number; uncompleted: number; total: number };
  getDisplayName: (user: WidgetUser | null) => string;
  onMenuClick?: () => void;
}

const VIEW_ICONS: Record<string, string> = {
  [VIEWS.ALL]: 'inbox',
  [VIEWS.TODAY]: 'star',
  [VIEWS.UPCOMING]: 'calendar',
  [VIEWS.LOGBOOK]: 'check-circle',
  [VIEWS.TRASH]: 'trash-2',
};

const VIEW_TITLES: Record<string, string> = {
  [VIEWS.ALL]: 'All Tasks',
  [VIEWS.TODAY]: 'Today',
  [VIEWS.UPCOMING]: 'Upcoming',
  [VIEWS.LOGBOOK]: 'Logbook',
  [VIEWS.TRASH]: 'Trash',
};

function ViewHeader({
  view,
  project,
  user,
  taskCount,
  taskCountData,
  getDisplayName,
  onMenuClick,
}: ViewHeaderProps) {
  let title = VIEW_TITLES[view.type] || '';
  let icon = VIEW_ICONS[view.type] || 'inbox';
  let iconColor = '#007AFF';

  if (view.type === VIEWS.PROJECT && project) {
    title = project.title;
    icon = 'folder';
    iconColor = project.color || '#007AFF';
  } else if (view.type === VIEWS.USER) {
    if (view.id === 'unassigned') {
      title = 'Unassigned';
      icon = 'user-x';
      iconColor = '#8E8E93';
    } else if (user) {
      title = getDisplayName(user);
      icon = 'user';
      iconColor = user.color || '#007AFF';
    }
  }

  const subtitle = taskCountData.total > 0
    ? `${taskCountData.uncompleted} task${taskCountData.uncompleted !== 1 ? 's' : ''}${taskCountData.completed > 0 ? ` · ${taskCountData.completed} completed` : ''}`
    : 'No tasks';

  return (
    <div data-testid="view-header" style={styles.viewHeader}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Hamburger menu button — visible only on mobile via CSS */}
        {onMenuClick && (
          <button className="mobile-hamburger" onClick={onMenuClick} aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <Icon name={icon} size={22} color={iconColor} />
        <h1 style={styles.viewTitle}>{title}</h1>
      </div>
      <div data-view-subtitle style={styles.viewSubtitle}>{subtitle}</div>
    </div>
  );
}

export default React.memo(ViewHeader);
