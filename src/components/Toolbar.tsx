/**
 * Toolbar with Sort and Filter controls - Things-style
 * Ported from previous_task_widget/components/Toolbar.jsx
 * Uses inline SVGs to avoid Lucide DOM manipulation conflicts
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Project, Tag, ProjectTreeNode as ProjTreeNode, WidgetUser } from '../constants';
import { styles } from '../utils/styles';

// Simple inline SVG icons to avoid Lucide DOM issues
const Icons = {
  sort: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>
    </svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  chevronRight: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  listView: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  boardView: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/>
    </svg>
  ),
};

// Kanban status configuration
const KANBAN_STATUS_CONFIG = [
  { id: 'backlog', label: 'Backlog', color: '#9ca3af' },
  { id: 'ready', label: 'Ready', color: '#6366f1' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#8b5cf6' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

interface ToolbarProps {
  // Sort
  sortBy: string | null;
  sortDirection: string;
  onSort: (type: string | null, direction?: string | null) => void;
  // Filter
  showCompleted: boolean;
  onToggleShowCompleted: () => void;
  showUnassigned: boolean;
  onToggleShowUnassigned: () => void;
  availableProjects: Project[];
  projectTree: ProjTreeNode[];
  selectedProjectIds: string[] | null;
  onToggleProject: (id: string) => void;
  onSelectAllProjects: () => void;
  // Tags
  availableTags: Tag[];
  selectedTagIds: string[] | null;
  onToggleTag: (id: string) => void;
  onSelectAllTags: () => void;
  // Kanban Status
  selectedKanbanStatuses: string[] | null;
  onToggleKanbanStatus: (id: string) => void;
  onSelectAllKanbanStatuses: () => void;
  // Assignee
  allUsers: WidgetUser[];
  selectedUserIds: string[] | null;
  onToggleUser: (id: string) => void;
  onSelectAllUsers: () => void;
  onResetFilters: () => void;
  // View context
  isAllView: boolean;
  isProjectView: boolean;
  isUserView: boolean;
  // Dropdowns
  showSortDropdown: boolean;
  onToggleSortDropdown: () => void;
  showFilterDropdown: boolean;
  onToggleFilterDropdown: () => void;
  // Display name helper
  getDisplayName: (user: WidgetUser | null) => string;
}

function Toolbar(props: ToolbarProps) {
  const {
    sortBy, sortDirection, onSort,
    showCompleted, onToggleShowCompleted,
    showUnassigned, onToggleShowUnassigned,
    availableProjects, projectTree,
    selectedProjectIds, onToggleProject, onSelectAllProjects,
    availableTags, selectedTagIds, onToggleTag, onSelectAllTags,
    selectedKanbanStatuses, onToggleKanbanStatus, onSelectAllKanbanStatuses,
    allUsers, selectedUserIds, onToggleUser, onSelectAllUsers,
    onResetFilters,
    isAllView, isProjectView, isUserView,
    showSortDropdown, onToggleSortDropdown,
    showFilterDropdown, onToggleFilterDropdown,
    getDisplayName,
  } = props;

  // State for expanded projects in filter
  const [expandedFilterProjects, setExpandedFilterProjects] = useState<Record<string, boolean>>({});

  // Ref and state for filter dropdown positioning
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterPosition, setFilterPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Count visible filter sections to calculate appropriate width
  const visibleSectionCount = useMemo(() => {
    let count = 1; // Status is always visible
    if (!isUserView) count++; // Assignee
    if (!isProjectView && availableProjects.length > 0) count++; // Projects
    if ((availableTags || []).length > 0) count++; // Tags
    return count;
  }, [isUserView, isProjectView, availableProjects, availableTags]);

  // Reset filter position when dropdown closes
  useEffect(() => {
    if (!showFilterDropdown) {
      setFilterPosition(null);
    }
  }, [showFilterDropdown]);

  // Calculate filter dropdown position and width when opened (sync before paint)
  useLayoutEffect(() => {
    if (!showFilterDropdown || !filterButtonRef.current) return;

    const rect = filterButtonRef.current.getBoundingClientRect();
    const sectionWidth = 195;
    const maxWidth = Math.max(400, visibleSectionCount * sectionWidth);
    const minWidth = 300;
    const edgeBuffer = 48;

    const availableWidth = window.innerWidth - (edgeBuffer * 2);
    const dropdownWidth = Math.max(minWidth, Math.min(maxWidth, availableWidth));

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - edgeBuffer) {
      left = window.innerWidth - dropdownWidth - edgeBuffer;
    }
    if (left < edgeBuffer / 2) left = edgeBuffer / 2;

    setFilterPosition({
      top: rect.bottom + 8,
      left: left,
      width: dropdownWidth,
    });
  }, [showFilterDropdown, visibleSectionCount]);

  // Handle window resize for filter dropdown position
  useEffect(() => {
    if (!showFilterDropdown || !filterButtonRef.current) return;

    const updatePosition = () => {
      if (!filterButtonRef.current) return;
      const rect = filterButtonRef.current.getBoundingClientRect();
      const sectionWidth = 195;
      const maxWidth = Math.max(400, visibleSectionCount * sectionWidth);
      const minWidth = 300;
      const edgeBuffer = 48;

      const availableWidth = window.innerWidth - (edgeBuffer * 2);
      const dropdownWidth = Math.max(minWidth, Math.min(maxWidth, availableWidth));

      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - edgeBuffer) {
        left = window.innerWidth - dropdownWidth - edgeBuffer;
      }
      if (left < edgeBuffer / 2) left = edgeBuffer / 2;

      setFilterPosition({
        top: rect.bottom + 8,
        left: left,
        width: dropdownWidth,
      });
    };

    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [showFilterDropdown, visibleSectionCount]);

  const toggleFilterExpand = (projectId: string) => {
    setExpandedFilterProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const hasSortActive = sortBy !== null;

  // Check if various filters are active
  const projectsFiltered = selectedProjectIds !== null;
  const tagsFiltered = selectedTagIds !== null;
  const kanbanFiltered = selectedKanbanStatuses !== null;
  const usersFiltered = selectedUserIds !== null;

  const showCompletedToggleViews = isAllView || isProjectView || isUserView;

  const hasFilterActive = (showCompletedToggleViews && showCompleted)
    || !showUnassigned
    || (!isProjectView && projectsFiltered)
    || tagsFiltered
    || kanbanFiltered
    || (!isUserView && usersFiltered);

  // Helpers
  const isProjectSelected = (projectId: string) => selectedProjectIds === null || selectedProjectIds.includes(projectId);
  const allProjectsSelected = selectedProjectIds === null;
  const isTagSelected = (tagId: string) => selectedTagIds === null || selectedTagIds.includes(tagId);
  const allTagsSelected = selectedTagIds === null;
  const isKanbanStatusSelected = (statusId: string) => selectedKanbanStatuses === null || selectedKanbanStatuses.includes(statusId);
  const allKanbanStatusesSelected = selectedKanbanStatuses === null;
  const isUserSelected = (userId: string) => selectedUserIds === null || selectedUserIds.includes(userId);
  const allUsersSelected = selectedUserIds === null;

  return (
    <div data-toolbar data-testid="toolbar" style={{ ...styles.toolbar, borderBottom: 'none' }}>
      {/* Filter Button (first, matching Momentum toolbar order) */}
      <div style={toolbarStyles.dropdownContainer}>
        <button
          ref={filterButtonRef}
          data-testid="filter-btn"
          onClick={onToggleFilterDropdown}
          style={hasFilterActive ? { ...styles.toolbarBtn, ...styles.toolbarBtnActive } : styles.toolbarBtn}
        >
          {Icons.filter}
          <span>Filter</span>
        </button>

        {showFilterDropdown && filterPosition && (
          <>
            <div data-filter-backdrop style={toolbarStyles.backdrop} onClick={onToggleFilterDropdown} />
            <div data-filter-dropdown style={{
              ...toolbarStyles.filterDropdown,
              top: filterPosition.top,
              left: filterPosition.left,
              width: filterPosition.width,
            }}>
              {/* Header with Show Completed toggle and Reset button */}
              <div style={toolbarStyles.filterHeader}>
                <span style={toolbarStyles.filterTitle}>Filters</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {showCompletedToggleViews && (
                    <label style={toolbarStyles.filterToggle}>
                      <input
                        type="checkbox"
                        checked={showCompleted}
                        onChange={onToggleShowCompleted}
                        style={toolbarStyles.toggleCheckbox}
                      />
                      <span style={toolbarStyles.toggleLabel}>Show completed</span>
                    </label>
                  )}
                  {hasFilterActive && (
                    <button onClick={onResetFilters} style={toolbarStyles.resetButton}>
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-column grid of filter sections */}
              <div data-filter-grid style={toolbarStyles.filterGrid}>
                {/* Status Section */}
                <div data-filter-section style={{ ...toolbarStyles.filterSection, flex: 0.85 }}>
                  <div style={toolbarStyles.filterSectionHeader}>Status</div>
                  <div style={toolbarStyles.filterSectionBody}>
                    <label style={toolbarStyles.filterOption}>
                      <input type="checkbox" checked={allKanbanStatusesSelected} onChange={onSelectAllKanbanStatuses} style={toolbarStyles.checkbox} />
                      <span style={toolbarStyles.filterOptionLabel}>All</span>
                    </label>
                    {KANBAN_STATUS_CONFIG.map(status => (
                      <label key={status.id} style={toolbarStyles.filterOption}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: status.color, flexShrink: 0 }} />
                        <input type="checkbox" checked={isKanbanStatusSelected(status.id)} onChange={() => onToggleKanbanStatus(status.id)} style={toolbarStyles.checkbox} />
                        <span style={toolbarStyles.filterOptionText}>{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Assignee Section - hide in User view */}
                {!isUserView && (
                  <div data-filter-section style={{ ...toolbarStyles.filterSection, flex: isProjectView ? 1.25 : 1 }}>
                    <div style={toolbarStyles.filterSectionHeader}>Assignee</div>
                    <div style={toolbarStyles.filterSectionBody}>
                      <label style={toolbarStyles.filterOption}>
                        <input type="checkbox" checked={allUsersSelected} onChange={onSelectAllUsers} style={toolbarStyles.checkbox} />
                        <span style={toolbarStyles.filterOptionLabel}>All</span>
                      </label>
                      <label style={toolbarStyles.filterOption}>
                        <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#d1d5db', color: '#6B7280', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          ?
                        </span>
                        <input type="checkbox" checked={showUnassigned} onChange={onToggleShowUnassigned} style={toolbarStyles.checkbox} />
                        <span style={{ ...toolbarStyles.filterOptionText, color: '#6B7280' }}>Unassigned</span>
                      </label>
                      {(allUsers || []).map(user => {
                        const displayName = getDisplayName ? getDisplayName(user) : user.name;
                        return (
                          <label key={user.id} style={toolbarStyles.filterOption}>
                            <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: user.color || '#6366f1', color: '#fff', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {displayName?.charAt(0).toUpperCase() || '?'}
                            </span>
                            <input type="checkbox" checked={isUserSelected(user.id)} onChange={() => onToggleUser(user.id)} style={toolbarStyles.checkbox} />
                            <span style={toolbarStyles.filterOptionText}>{displayName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Projects Section - hide in Project view */}
                {!isProjectView && availableProjects.length > 0 && (
                  <div data-filter-section style={{ ...toolbarStyles.filterSection, flex: 1.25 }}>
                    <div style={toolbarStyles.filterSectionHeader}>Project</div>
                    <div style={toolbarStyles.filterSectionBody}>
                      <label style={toolbarStyles.filterOption}>
                        <input type="checkbox" checked={allProjectsSelected} onChange={onSelectAllProjects} style={toolbarStyles.checkbox} />
                        <span style={toolbarStyles.filterOptionLabel}>All</span>
                      </label>
                      {(projectTree || []).map(node => (
                        <ProjectFilterNode
                          key={node.id}
                          node={node}
                          depth={0}
                          isSelected={isProjectSelected}
                          onToggle={onToggleProject}
                          expandedProjects={expandedFilterProjects}
                          onToggleExpand={toggleFilterExpand}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags Section */}
                {(availableTags || []).length > 0 && (
                  <div data-filter-section style={toolbarStyles.filterSectionLast}>
                    <div style={toolbarStyles.filterSectionHeader}>Tags</div>
                    <div style={toolbarStyles.filterSectionBody}>
                      <label style={toolbarStyles.filterOption}>
                        <input type="checkbox" checked={allTagsSelected} onChange={onSelectAllTags} style={toolbarStyles.checkbox} />
                        <span style={toolbarStyles.filterOptionLabel}>All</span>
                      </label>
                      {(availableTags || []).map(tag => (
                        <label key={tag.id} style={toolbarStyles.filterOption}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: tag.color || '#007AFF', flexShrink: 0 }} />
                          <input type="checkbox" checked={isTagSelected(tag.id)} onChange={() => onToggleTag(tag.id)} style={toolbarStyles.checkbox} />
                          <span style={toolbarStyles.filterOptionText}>{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sort Button */}
      <div style={toolbarStyles.dropdownContainer}>
        <button
          data-testid="sort-btn"
          onClick={onToggleSortDropdown}
          style={hasSortActive ? { ...styles.toolbarBtn, ...styles.toolbarBtnActive } : styles.toolbarBtn}
        >
          {Icons.sort}
          <span>Sort</span>
        </button>

        {showSortDropdown && (
          <>
            <div style={toolbarStyles.backdrop} onClick={onToggleSortDropdown} />
            <div style={toolbarStyles.sortDropdown}>
              <div style={toolbarStyles.sortDropdownHeader}>Sort by</div>

              <div style={toolbarStyles.sortDropdownBody}>
                <SortOption
                  label="Priority"
                  isActive={sortBy === 'priority'}
                  direction={sortBy === 'priority' ? sortDirection : null}
                  onSelect={() => onSort('priority', sortBy === 'priority' && sortDirection === 'desc' ? 'asc' : 'desc')}
                  ascending="Low → High"
                  descending="High → Low"
                />
                <SortOption
                  label="Due Date"
                  isActive={sortBy === 'dueDate'}
                  direction={sortBy === 'dueDate' ? sortDirection : null}
                  onSelect={() => onSort('dueDate', sortBy === 'dueDate' && sortDirection === 'asc' ? 'desc' : 'asc')}
                  ascending="Earliest First"
                  descending="Latest First"
                />
                <SortOption
                  label="Created"
                  isActive={sortBy === 'createdAt'}
                  direction={sortBy === 'createdAt' ? sortDirection : null}
                  onSelect={() => onSort('createdAt', sortBy === 'createdAt' && sortDirection === 'desc' ? 'asc' : 'desc')}
                  ascending="Oldest First"
                  descending="Newest First"
                />
                <SortOption
                  label="Alphabetical"
                  isActive={sortBy === 'title'}
                  direction={sortBy === 'title' ? sortDirection : null}
                  onSelect={() => onSort('title', sortBy === 'title' && sortDirection === 'asc' ? 'desc' : 'asc')}
                  ascending="A → Z"
                  descending="Z → A"
                />
              </div>

              {hasSortActive && (
                <div style={toolbarStyles.sortDropdownFooter}>
                  <button
                    onClick={() => onSort(null, null)}
                    style={toolbarStyles.clearSortButton}
                  >
                    {Icons.x}
                    <span>Clear Sort</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sort Option Component ────────────────────────────

function SortOption({ label, isActive, direction, onSelect, ascending, descending }: {
  label: string;
  isActive: boolean;
  direction: string | null;
  onSelect: () => void;
  ascending: string;
  descending: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        background: isActive ? 'rgba(0,122,255,0.04)' : isHovered ? 'rgba(0,0,0,0.02)' : 'transparent',
        fontSize: '14px',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? '#007AFF' : '#1D1D1F',
        cursor: 'pointer',
        textAlign: 'left' as const,
        transition: 'background-color 0.15s ease',
        outline: 'none',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isActive && direction && (
          <span style={{
            fontSize: '12px',
            fontWeight: 400,
            color: '#86868B',
            whiteSpace: 'nowrap' as const,
          }}>
            {direction === 'asc' ? ascending : descending}
          </span>
        )}
        {isActive && (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {Icons.check}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Recursive Project Filter Node ────────────────────

function ProjectFilterNode({ node, depth, isSelected, onToggle, expandedProjects, onToggleExpand }: {
  node: ProjTreeNode;
  depth: number;
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  expandedProjects: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedProjects[node.id];

  return (
    <div>
      <div style={{ ...toolbarStyles.filterProjectItem, paddingLeft: 14 + depth * 16 }}>
        {hasChildren ? (
          <button
            onClick={(e) => { e.preventDefault(); onToggleExpand(node.id); }}
            style={toolbarStyles.expandButton}
          >
            {isExpanded ? Icons.chevronDown : Icons.chevronRight}
          </button>
        ) : (
          <span style={toolbarStyles.expandSpacer} />
        )}

        <span style={{ ...toolbarStyles.projectDot, backgroundColor: node.color || '#007AFF' }} />

        <label style={toolbarStyles.filterProjectLabel}>
          <input
            type="checkbox"
            checked={isSelected(node.id)}
            onChange={() => onToggle(node.id)}
            style={toolbarStyles.checkbox}
          />
          <span style={toolbarStyles.filterProjectName}>{node.title}</span>
        </label>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <ProjectFilterNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isSelected={isSelected}
              onToggle={onToggle}
              expandedProjects={expandedProjects}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toolbar-specific styles ──────────────────────────

const toolbarStyles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    gap: '12px',
    padding: '12px 24px 16px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    maxWidth: '300px',
    position: 'relative',
    backgroundColor: '#FAFAFA',
    border: '1px solid #f0f0f0',
    borderRadius: '10px',
    padding: '0 12px',
    height: '38px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  searchIcon: {
    display: 'flex',
    alignItems: 'center',
    color: '#9CA3AF',
    marginRight: '8px',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1D1D1F',
    backgroundColor: 'transparent',
    padding: 0,
    minWidth: 0,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  searchClear: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    border: 'none',
    background: '#E5E7EB',
    borderRadius: '50%',
    color: '#6B7280',
    cursor: 'pointer',
    padding: 0,
    marginLeft: '6px',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
  },
  dropdownContainer: {
    position: 'relative',
  },
  toolbarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    border: '1px solid #f0f0f0',
    borderRadius: '10px',
    background: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    color: '#6B7280',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  toolbarButtonActive: {
    border: '1px solid rgba(0,122,255,0.3)',
    background: 'rgba(0,122,255,0.06)',
    backgroundColor: 'rgba(0,122,255,0.06)',
    color: '#007AFF',
    boxShadow: '0 1px 3px rgba(0,122,255,0.1)',
  },
  activeIndicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#007AFF',
    marginLeft: '2px',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  sortDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    zIndex: 1000,
    minWidth: '240px',
    overflow: 'hidden',
  },
  sortDropdownHeader: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#86868B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '16px 16px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  sortDropdownBody: {
    padding: '8px 0',
  },
  sortDropdownFooter: {
    padding: '8px 12px 12px',
    borderTop: '1px solid #f0f0f0',
  },
  clearSortButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    background: 'rgba(255,59,48,0.06)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#FF3B30',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  filterDropdown: {
    position: 'fixed',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    border: '1px solid #f0f0f0',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  filterHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #f0f0f0',
  },
  filterTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1D1D1F',
  },
  filterToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  toggleCheckbox: {
    width: '14px',
    height: '14px',
    accentColor: '#6366f1',
    cursor: 'pointer',
  },
  toggleLabel: {
    fontSize: '12px',
    color: '#6B7280',
  },
  resetButton: {
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    outline: 'none',
  },
  filterGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    maxHeight: '400px',
    overflow: 'auto',
    borderTop: '1px solid #f0f0f0',
  },
  filterSection: {
    flex: 1,
    minWidth: '140px',
    padding: '14px 14px',
    borderRight: '1px solid #f0f0f0',
  },
  filterSectionLast: {
    flex: 1,
    minWidth: '140px',
    padding: '14px 14px',
  },
  filterSectionHeader: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '10px',
  },
  filterSectionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '280px',
    overflowY: 'auto',
  },
  filterOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.1s ease',
    minWidth: 0,
  },
  filterOptionLabel: {
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  filterOptionText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  filterProjectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px 6px 14px',
    minHeight: '32px',
  },
  filterProjectLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    cursor: 'pointer',
    minWidth: 0,
  },
  filterProjectName: {
    fontSize: '13px',
    color: '#1D1D1F',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  expandButton: {
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: '#8E8E93',
    cursor: 'pointer',
    borderRadius: '4px',
    flexShrink: 0,
  },
  expandSpacer: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  checkbox: {
    width: '14px',
    height: '14px',
    minWidth: '14px',
    minHeight: '14px',
    flexShrink: 0,
    accentColor: '#007AFF',
    cursor: 'pointer',
  },
  projectDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  viewToggle: {
    display: 'flex',
    marginLeft: 'auto',
    border: '1px solid #f0f0f0',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  viewToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: 'none',
    background: '#FFFFFF',
    color: '#9CA3AF',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    padding: 0,
  },
  viewToggleBtnActive: {
    background: 'rgba(0,122,255,0.08)',
    color: '#007AFF',
  },
};

export default React.memo(Toolbar);
