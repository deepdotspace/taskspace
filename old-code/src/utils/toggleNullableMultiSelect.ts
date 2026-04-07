/**
 * Toggle a value in a nullable multi-select filter.
 * 
 * null means "all selected".
 * When toggling, it switches from null → all-except-toggled,
 * or toggles within the explicit selection.
 * If the result would be all IDs selected, returns null (back to "all" mode).
 * If the result would be empty, returns [] (nothing selected).
 */
export function toggleNullableMultiSelect(
  current: string[] | null,
  allIds: string[],
  toggledId: string
): string[] | null {
  if (current === null) {
    // Currently "all" → deselect this one → explicit list of all except toggled
    const newSelection = allIds.filter(id => id !== toggledId);
    return newSelection.length === 0 ? [] : newSelection;
  }

  const isSelected = current.includes(toggledId);
  let newSelection: string[];

  if (isSelected) {
    // Remove from selection
    newSelection = current.filter(id => id !== toggledId);
  } else {
    // Add to selection
    newSelection = [...current, toggledId];
  }

  // If all are now selected, return null (= "all" mode)
  if (newSelection.length === allIds.length && allIds.every(id => newSelection.includes(id))) {
    return null;
  }

  return newSelection;
}

