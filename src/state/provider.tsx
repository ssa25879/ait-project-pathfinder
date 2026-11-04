import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { bindVisibilityFlush, type StorageAdapter } from '../storage';
import { sdkStorage } from '../storage/sdk';
import { appReducer, createAppStore, type AppStore } from './store';

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children, storage = sdkStorage }: { children: ReactNode; storage?: StorageAdapter }) {
  const store = useMemo(() => createAppStore(storage), [storage]);
  const [state, dispatch] = useReducer(appReducer, store.getSnapshot());
  useEffect(() => {
    const unsubscribe = store.subscribe(() => dispatch({ type: 'replace', state: store.getSnapshot() }));
    dispatch({ type: 'replace', state: store.getSnapshot() });
    const unbind = bindVisibilityFlush(store, document);
    void store.retryLoad();
    return () => { unsubscribe(); unbind(); void store.flush(); };
  }, [store]);
  // state 변경이 Context 소비자에게 전달되도록 매번 새 Context 값을 제공한다.
  const value = useMemo(() => ({ ...store, getSnapshot: () => state }), [store, state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('AppStoreProvider가 필요해요.');
  const { status, saveState, data } = store.getSnapshot();
  return { status, saveState, data, retryLoad: store.retryLoad, retrySave: store.retrySave,
    createProject: store.createProject, updateProject: store.updateProject, deleteProject: store.deleteProject,
    createTask: store.createTask, updateTask: store.updateTask, deleteTask: store.deleteTask, changeTaskStatus: store.changeTaskStatus, addSampleProject: store.addSampleProject };
}

export function useProjectView(projectId: string) {
  const store = useContext(StoreContext);
  if (!store) throw new Error('AppStoreProvider가 필요해요.');
  return store.projectView(projectId);
}
