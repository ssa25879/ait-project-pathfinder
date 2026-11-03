import { useEffect, useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { NavigationBar, closeView, graniteEvent } from '@apps-in-toss/web-framework';
import { useAppStore } from './state';
import { HomeScreen } from './screens/HomeScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { TaskScreen } from './screens/TaskScreen';
import { MapScreen } from './screens/MapScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { MissingScreen } from './ui/common';
import './ui/app.css';

function Shell() {
  const store = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationError, setNavigationError] = useState('');
  useEffect(() => {
    void NavigationBar.setOptions({ theme: 'light', withBackButton: true, withTitle: true }).catch(() => setNavigationError('내비게이션을 설정하지 못했어요.'));
  }, []);
  useEffect(() => graniteEvent.addEventListener('backEvent', {
    onEvent: () => {
      if (location.pathname === '/') void closeView().catch(() => setNavigationError('화면을 닫지 못했어요. 다시 시도해 주세요.'));
      else if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
      else navigate('/', { replace: true });
    },
    onError: () => setNavigationError('뒤로가기를 연결하지 못했어요.'),
  }), [location.pathname, navigate]);
  if (store.status === 'loading') return <main role="status">프로젝트를 불러오고 있어요.</main>;
  if (store.status !== 'ready') return <main><h1>{store.status === 'newer_version' ? '앱 업데이트가 필요해요' : '데이터를 불러오지 못했어요'}</h1><p>기기에 저장된 원본 데이터는 그대로 보존하고 있어요.</p><Button onClick={() => void store.retryLoad()}>다시 불러오기</Button></main>;
  return <>
    {navigationError && <p role="alert">{navigationError}</p>}
    {store.saveState === 'error' && <section className="save-notice" role="alert"><p>변경 내용을 기기에 저장하지 못했어요. 화면의 입력은 유지돼요.</p><Button onClick={() => void store.retrySave()}>저장 다시 시도</Button></section>}
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/projects/:projectId" element={<ProjectScreen />} />
      <Route path="/projects/:projectId/tasks/:taskId" element={<TaskScreen key={location.pathname} />} />
      <Route path="/projects/:projectId/map" element={<MapScreen />} />
      <Route path="/projects/:projectId/schedule" element={<ScheduleScreen />} />
      <Route path="*" element={<MissingScreen />} />
    </Routes>
  </>;
}

export default function App() {
  return <HashRouter><Shell /></HashRouter>;
}
