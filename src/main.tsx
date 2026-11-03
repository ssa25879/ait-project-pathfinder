import React from 'react';
import ReactDOM from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import App from './App';
import { AppStoreProvider } from './state';
import { syncSdkUserKey } from './storage/sdk';

void syncSdkUserKey();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TDSMobileAITProvider>
      <AppStoreProvider><App /></AppStoreProvider>
    </TDSMobileAITProvider>
  </React.StrictMode>,
);
