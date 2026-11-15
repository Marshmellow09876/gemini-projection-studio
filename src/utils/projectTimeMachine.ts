/**
 * Project Time Machine, Visual Diff & Auto-Save Crash Recovery Engine
 * Implements persistent timeline snapshots with visual diffing and one-click rollback.
 */

export interface ProjectSnapshot {
  id: string;
  timestamp: number;
  formattedTime: string;
  label: string;
  screenId: number;
  layerCount: number;
  playlistCount: number;
  runTime?: string;
  stateJson: string;
}

export interface StateDiffSummary {
  addedLayers: string[];
  removedLayers: string[];
  modifiedLayers: string[];
  changedPrompts: boolean;
  projectorChanges: boolean;
  beatFlagsDelta: number;
  rawDiffCount: number;
}

const STORAGE_KEY = 'lumen_time_machine_snapshots_v1';
const MAX_SNAPSHOTS = 50;

/**
 * Retrieves all stored project snapshots ordered newest first
 */
export function getStoredSnapshots(): ProjectSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: ProjectSnapshot[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.timestamp - a.timestamp) : [];
  } catch (err) {
    console.error('Failed to read time machine snapshots:', err);
    return [];
  }
}

/**
 * Records a new project state snapshot
 */
export function recordProjectSnapshot(
  label: string,
  screenId: number,
  state: Record<string, any>
): ProjectSnapshot {
  const snapshots = getStoredSnapshots();
  const now = Date.now();
  const d = new Date(now);
  const formattedTime = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

  // Extract key metadata
  const layers = Array.isArray(state.layers) ? state.layers : [];
  const playlist = Array.isArray(state.playlist) ? state.playlist : [];

  const snapshot: ProjectSnapshot = {
    id: `snap-${now}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    formattedTime,
    label: label || `Auto-Save at ${formattedTime}`,
    screenId,
    layerCount: layers.length,
    playlistCount: playlist.length,
    runTime: state.recentProjects?.[0]?.runTime || '03:45',
    stateJson: JSON.stringify(state),
  };

  const updated = [snapshot, ...snapshots].slice(0, MAX_SNAPSHOTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Storage quota limit reached, trimming oldest snapshots:', err);
    const trimmed = [snapshot, ...snapshots.slice(0, 10)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }

  return snapshot;
}

/**
 * Removes a specific snapshot by ID
 */
export function deleteProjectSnapshot(id: string): void {
  const snapshots = getStoredSnapshots().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
}

/**
 * Clears all snapshots
 */
export function clearAllSnapshots(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Computes a human-readable visual diff between two project state snapshots
 */
export function computeStateDiff(oldJson: string, newJson: string): StateDiffSummary {
  try {
    const oldState = JSON.parse(oldJson);
    const newState = JSON.parse(newJson);

    const oldLayers: { id: string; name?: string }[] = oldState.layers || [];
    const newLayers: { id: string; name?: string }[] = newState.layers || [];

    const oldIds = new Set(oldLayers.map((l) => l.id));
    const newIds = new Set(newLayers.map((l) => l.id));

    const addedLayers = newLayers.filter((l) => !oldIds.has(l.id)).map((l) => l.name || l.id);
    const removedLayers = oldLayers.filter((l) => !newIds.has(l.id)).map((l) => l.name || l.id);

    const modifiedLayers: string[] = [];
    newLayers.forEach((nl) => {
      if (oldIds.has(nl.id)) {
        const ol = oldLayers.find((o) => o.id === nl.id);
        if (ol && JSON.stringify(ol) !== JSON.stringify(nl)) {
          modifiedLayers.push(nl.name || nl.id);
        }
      }
    });

    const changedPrompts =
      oldState.aiStudioParams?.positivePrompt !== newState.aiStudioParams?.positivePrompt ||
      oldState.aiStudioParams?.negativePrompt !== newState.aiStudioParams?.negativePrompt;

    const projectorChanges =
      JSON.stringify(oldState.projectorOutputs) !== JSON.stringify(newState.projectorOutputs);

    const oldBeatCount = Array.isArray(oldState.beatFlags) ? oldState.beatFlags.length : 0;
    const newBeatCount = Array.isArray(newState.beatFlags) ? newState.beatFlags.length : 0;

    const rawDiffCount =
      addedLayers.length +
      removedLayers.length +
      modifiedLayers.length +
      (changedPrompts ? 1 : 0) +
      (projectorChanges ? 1 : 0) +
      Math.abs(newBeatCount - oldBeatCount);

    return {
      addedLayers,
      removedLayers,
      modifiedLayers,
      changedPrompts,
      projectorChanges,
      beatFlagsDelta: newBeatCount - oldBeatCount,
      rawDiffCount,
    };
  } catch (err) {
    return {
      addedLayers: [],
      removedLayers: [],
      modifiedLayers: [],
      changedPrompts: false,
      projectorChanges: false,
      beatFlagsDelta: 0,
      rawDiffCount: 0,
    };
  }
}
