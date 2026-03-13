/*
 *  Copyright 2025 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import React, {
    createContext,
    FC,
    ReactNode,
    useContext
} from 'react';
import { GlobalSettings } from '../../generated/entity/globalSettings';

export interface GlobalSettingsProviderProps {
  children: ReactNode;
}

interface GlobalSettingsContextType {
  globalSettings: GlobalSettings;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType>(
  {} as GlobalSettingsContextType
);

export const GlobalSettingsProvider: FC<GlobalSettingsProviderProps> = ({
  children,
}) => {
  // 提供一个默认的 GlobalSettings 对象
  const globalSettings: GlobalSettings = {
    authorizerConfig: undefined,
    authenticationMechanism: 'basic',
    baseUrl: '',
    bot: undefined,
    emailConfiguration: undefined,
    anomalyChecker: undefined,
    eventFilterType: undefined,
    glossaryConfig: undefined,
    ingestion: undefined,
    logoUrl: undefined,
    oAuthConfig: undefined,
    organization: undefined,
    publicDisplayRotation: undefined,
    ssoConfiguration: undefined,
    intercomText: undefined,
    enableBasicAuth: undefined,
    queryMaxSeconds: undefined,
    totalQueryLimit: undefined,
    dataProductConfig: undefined,
    version: undefined,
    personalizedDisplayName: undefined,
  };

  return (
    <GlobalSettingsContext.Provider value={{ globalSettings }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export const useGlobalSettingsProvider = () => {
  const context = useContext(GlobalSettingsContext);

  if (!context) {
    throw new Error(
      'useGlobalSettingsProvider must be used within a GlobalSettingsProvider'
    );
  }

  return context;
};
