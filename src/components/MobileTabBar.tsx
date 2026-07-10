/**
 * MobileTabBar — bottom navigation for the mobile layout (Momentum screen 10).
 * Four tabs: Today · All · Assistant · Logbook. Fixed to the bottom of the
 * viewport; only rendered on mobile. Drives the existing view/chat state.
 */
import React from 'react';
import { Icon } from '../utils/icons';
import { T } from '../utils/styles';
import { VIEWS, ViewType } from '../constants';

export type MobileTab = 'today' | 'all' | 'assistant' | 'logbook';

interface MobileTabBarProps {
  currentViewType: ViewType;
  chatOpen: boolean;
  onSelectView: (type: ViewType) => void;
  onOpenAssistant: () => void;
  /** Hide the Assistant tab in read-only mode (AI is gated the same way). */
  showAssistant?: boolean;
}

const ICONS: Record<MobileTab, string> = {
  today: 'calendar',
  all: 'inbox',
  assistant: 'sparkles',
  logbook: 'check-circle',
};

export default function MobileTabBar({
  currentViewType, chatOpen, onSelectView, onOpenAssistant, showAssistant = true,
}: MobileTabBarProps) {
  const tabs: { key: MobileTab; label: string; onClick: () => void; active: boolean }[] = [
    { key: 'today', label: 'Today', onClick: () => onSelectView(VIEWS.TODAY), active: !chatOpen && currentViewType === VIEWS.TODAY },
    { key: 'all', label: 'All', onClick: () => onSelectView(VIEWS.ALL), active: !chatOpen && currentViewType === VIEWS.ALL },
    ...(showAssistant ? [{ key: 'assistant' as MobileTab, label: 'Assistant', onClick: onOpenAssistant, active: chatOpen }] : []),
    { key: 'logbook', label: 'Logbook', onClick: () => onSelectView(VIEWS.LOGBOOK), active: !chatOpen && currentViewType === VIEWS.LOGBOOK },
  ];

  return (
    <nav data-mobile-tabbar style={{
      display: 'flex', alignItems: 'stretch', justifyContent: 'space-around',
      borderTop: `1px solid ${T.borderRowLight}`, background: T.bgSecondary,
      padding: '9px 8px calc(8px + env(safe-area-inset-bottom))',
      flexShrink: 0,
    }}>
      {tabs.map(tab => {
        const color = tab.active ? T.accent : T.textFaint;
        return (
          <button
            key={tab.key}
            onClick={tab.onClick}
            aria-current={tab.active ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              border: 'none', background: 'none', cursor: 'pointer', padding: '4px 0',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon name={ICONS[tab.key]} size={21} color={color} />
            <span style={{ fontSize: 10, fontWeight: tab.active ? 600 : 500, color }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
