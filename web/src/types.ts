export interface CanvasTask {
  id: string;
  task: string;
  owner: string;
  section: string;
  dueDate?: string;
  priority?: string;
  info?: string;
  notes?: string;
}

export interface ShowLink {
  label: string;
  url: string;
  kind?: string;
}

export interface CanvasShow {
  id: string;
  name: string;
  dates: { start: string | null; end: string | null };
  location: string;
  booth?: string | number | null;
  exhibitorPortal?: string | null;
  links?: ShowLink[];
  resourceNotes?: string;
  status: string;
  tasks: CanvasTask[];
}

export interface AppData {
  year: number;
  lastUpdated?: string;
  teams: Record<string, string>;
  shows: CanvasShow[];
  owners: string[];
  ownerCounts: Record<string, number>;
}

export type CompletedMap = Record<string, string | boolean>;
export type TaskDueDatesMap = Record<string, string>;
export type TaskOwnerOverridesMap = Record<string, string>;

export interface TaskWithShow extends CanvasTask {
  showId: string;
  showName: string;
}
