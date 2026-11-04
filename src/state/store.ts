import * as domain from '../domain';
import { createSaveScheduler, deserialize, serialize, type StorageAdapter } from '../storage';

export type AppStatus = 'loading' | 'ready' | 'load_error' | 'newer_version';
export type AppState = { status: AppStatus; saveState: 'idle' | 'saving' | 'error'; data: domain.AppData };
export const initialState = (): AppState => ({ status: 'loading', saveState: 'idle', data: domain.emptyData() });
export type StateAction = { type: 'replace'; state: AppState } | { type: 'data'; data: domain.AppData };
export function appReducer(state: AppState, action: StateAction): AppState {
  if (action.type === 'replace') return action.state;
  return state.status === 'ready' ? { ...state, data: action.data } : state;
}

export function createAppStore(storage: StorageAdapter) {
  let state = initialState();
  let disposed = false;
  let loadGeneration = 0;
  const listeners = new Set<() => void>();
  const publish = (next: AppState) => {
    if (disposed) return;
    state = appReducer(state, { type: 'replace', state: next });
    listeners.forEach(listener => listener());
  };
  const scheduler = createSaveScheduler(storage, status => publish({
    ...state,
    saveState: status === 'error' ? 'error' : status === 'saved' ? 'idle' : 'saving',
  }));
  let cachedData: domain.AppData | undefined;
  const views = new Map<string, ReturnType<typeof makeView>>();
  function makeView(project: domain.Project) {
    const tasks = domain.tasksOfProject(state.data, project.id);
    return { project, tasks, readiness: domain.computeReadiness(tasks), schedule: domain.computeSchedule(tasks), summary: domain.summarizeProject(tasks) };
  }
  function mutate(fn: (data: domain.AppData) => domain.MutationResult): domain.MutationResult {
    if (state.status !== 'ready') throw new Error('데이터를 불러온 뒤 변경할 수 있어요.');
    const result = fn(state.data);
    if (result.ok && result.data !== state.data) {
      publish(appReducer(state, { type: 'data', data: result.data }));
      scheduler.schedule(serialize(result.data));
    }
    return result;
  }
  const store = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async retryLoad() {
      if (disposed || state.status === 'ready') return;
      const generation = ++loadGeneration;
      publish({ ...state, status: 'loading' });
      let result: ReturnType<typeof deserialize>;
      try { result = deserialize(await storage.load()); } catch { result = { status: 'load_error' }; }
      if (disposed || generation !== loadGeneration) return;
      publish(result.status === 'ready' ? { status: 'ready', saveState: 'idle', data: result.data } : { ...state, status: result.status });
    },
    retrySave: () => state.status === 'ready' ? scheduler.retry() : Promise.resolve(),
    flush: () => state.status === 'ready' ? scheduler.flush() : Promise.resolve(),
    createProject: (input: domain.ProjectInput, opts?: domain.MutationOptions) => mutate(data => domain.createProject(data, input, opts)),
    updateProject: (id: string, input: domain.ProjectInput, opts?: domain.MutationOptions) => mutate(data => domain.updateProject(data, id, input, opts)),
    deleteProject: (id: string) => mutate(data => domain.deleteProject(data, id)),
    createTask: (projectId: string, input: domain.TaskInput, opts?: domain.MutationOptions) => mutate(data => domain.createTask(data, projectId, input, opts)),
    updateTask: (id: string, input: domain.TaskInput, opts?: domain.MutationOptions) => mutate(data => domain.updateTask(data, id, input, opts)),
    deleteTask: (id: string, opts?: domain.MutationOptions) => mutate(data => domain.deleteTask(data, id, opts)),
    changeTaskStatus: (id: string, status: domain.TaskStatus, opts?: domain.MutationOptions) => mutate(data => domain.changeTaskStatus(data, id, status, opts)),
    addSampleProject: (startDate: string) => mutate(data => domain.addSampleProject(data, startDate)),
    projectView(projectId: string) {
      if (cachedData !== state.data) { views.clear(); cachedData = state.data; }
      const project = state.data.projects.find(p => p.id === projectId);
      if (!project) return null;
      if (!views.has(projectId)) views.set(projectId, makeView(project));
      return views.get(projectId)!;
    },
    dispose() { disposed = true; loadGeneration++; scheduler.dispose(); listeners.clear(); },
  };
  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
