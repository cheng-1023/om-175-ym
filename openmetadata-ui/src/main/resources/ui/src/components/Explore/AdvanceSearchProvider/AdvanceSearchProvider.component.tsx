/*
 *  Copyright 2024 Collate.
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
import { isArray, isEmpty, isEqual, isNil, isString } from 'lodash';
import Qs from 'qs';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Config,
  Field,
  FieldGroup,
  ImmutableTree,
  JsonTree,
  Utils as QbUtils,
  ValueField,
  ValueSource,
} from 'react-awesome-query-builder';
import { useHistory, useParams } from 'react-router-dom';
import {
  RANGE_FIELD_OPERATORS,
  TEXT_FIELD_OPERATORS,
} from '../../../constants/AdvancedSearch.constants';
import { SearchIndex } from '../../../enums/search.enum';
import {
  AssetAttribute,
  DataType,
} from '../../../generated/entity/data/asset/assetAttribute';
import useCustomLocation from '../../../hooks/useCustomLocation/useCustomLocation';
import { TabsInfoData } from '../../../pages/ExplorePage/ExplorePage.interface';
import { getAssetAttributesList } from '../../../rest/assetAPI';
import { getAllCustomProperties } from '../../../rest/metadataTypeAPI';
import advancedSearchClassBase from '../../../utils/AdvancedSearchClassBase';
import {
  getEmptyJsonTree,
  getTierOptions,
  getTreeConfig,
} from '../../../utils/AdvancedSearchUtils';
import { elasticSearchFormat } from '../../../utils/QueryBuilderElasticsearchFormatUtils';
import searchClassBase from '../../../utils/SearchClassBase';
import Loader from '../../common/Loader/Loader';
import { AdvancedSearchModal } from '../AdvanceSearchModal.component';
import { ExploreSearchIndex, UrlParams } from '../ExplorePage.interface';
import {
  AdvanceSearchContext,
  AdvanceSearchProviderProps,
  SearchOutputType,
} from './AdvanceSearchProvider.interface';

const AdvancedSearchContext = React.createContext<AdvanceSearchContext>(
  {} as AdvanceSearchContext
);

const getSearchIndexFromTabInfo = (
  tabsInfo: Record<ExploreSearchIndex, TabsInfoData>,
  tab: string
) => {
  const tabInfo = Object.entries(tabsInfo).find(
    ([, tabInfo]) => tabInfo.path === tab
  );
  if (isNil(tabInfo)) {
    return SearchIndex.DATA_ASSET;
  }

  return tabInfo[0] as SearchIndex;
};

export const AdvanceSearchProvider = ({
  children,
  isExplorePage = true,
  modalProps,
  updateURL = true,
  fieldOverrides = [],
  searchOutputType = SearchOutputType.ElasticSearch,
  searchIndex: propSearchIndex,
}: AdvanceSearchProviderProps) => {
  const tabsInfo = searchClassBase.getTabsInfo();
  const tierOptions = useMemo(getTierOptions, []);
  const location = useCustomLocation();
  const history = useHistory();
  const { tab } = useParams<UrlParams>();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [customProps, setCustomProps] = useState<Record<
    string,
    ValueField
  > | null>(null);

  const [searchIndex, setSearchIndex] = useState<
    SearchIndex | Array<SearchIndex>
  >(propSearchIndex ?? getSearchIndexFromTabInfo(tabsInfo, tab));

  const changeSearchIndex = useCallback(
    (index: SearchIndex | Array<SearchIndex>) => {
      setIsUpdating(true);
      setSearchIndex(index);
    },
    []
  );

  const [config, setConfig] = useState<Config>(
    getTreeConfig({
      searchIndex: searchIndex,
      searchOutputType: searchOutputType,
      isExplorePage,
      tierOptions,
    })
  );

  const [initialised, setInitialised] = useState(false);

  const defaultTree = useMemo(
    () => QbUtils.checkTree(QbUtils.loadTree(getEmptyJsonTree()), config),
    []
  );

  const parsedSearch = useMemo(
    () =>
      Qs.parse(
        location.search.startsWith('?')
          ? location.search.slice(1)
          : location.search
      ),
    [location.search]
  );

  const jsonTree = useMemo(() => {
    if (!isString(parsedSearch.queryFilter)) {
      return undefined;
    }

    try {
      const filter = JSON.parse(parsedSearch.queryFilter);
      const immutableTree = QbUtils.loadTree(filter as JsonTree);
      if (QbUtils.isValidTree(immutableTree)) {
        return filter as JsonTree;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }, [parsedSearch]);

  const [showModal, setShowModal] = useState(false);
  const [treeInternal, setTreeInternal] = useState<ImmutableTree>(() =>
    jsonTree
      ? QbUtils.checkTree(QbUtils.loadTree(jsonTree), config)
      : defaultTree
  );
  const [queryFilter, setQueryFilter] = useState<
    Record<string, unknown> | undefined
  >();
  const [sqlQuery, setSQLQuery] = useState(
    treeInternal ? QbUtils.sqlFormat(treeInternal, config) ?? '' : ''
  );

  useEffect(() => {
    setConfig(
      getTreeConfig({
        searchIndex: searchIndex,
        searchOutputType: searchOutputType,
        isExplorePage,
        tierOptions,
      })
    );
  }, [searchIndex, isExplorePage]);

  const handleChange = useCallback(
    (nTree, nConfig) => {
      setConfig(nConfig);
      setTreeInternal(nTree);
    },
    [setConfig, setTreeInternal]
  );

  const handleTreeUpdate = useCallback(
    (tree?: ImmutableTree) => {
      history.push({
        pathname: location.pathname,
        search: Qs.stringify({
          ...parsedSearch,
          queryFilter: tree ? JSON.stringify(tree) : undefined,
          page: 1,
        }),
      });
    },
    [history, parsedSearch, location.pathname]
  );

  const toggleModal = (show: boolean) => {
    setShowModal(show);
  };

  const handleReset = useCallback(() => {
    setTreeInternal(
      QbUtils.checkTree(QbUtils.loadTree(getEmptyJsonTree()), config)
    );
    setQueryFilter(undefined);
    setSQLQuery('');
  }, [config]);

  // Reset all filters, quick filter and query filter
  const handleResetAllFilters = useCallback(() => {
    setQueryFilter(undefined);
    setSQLQuery('');
    history.push({
      pathname: location.pathname,
      search: Qs.stringify({
        quickFilter: undefined,
        queryFilter: undefined,
        page: 1,
      }),
    });
  }, [history, location.pathname]);

  const fetchCustomPropertyType = async () => {
    const subfields: Record<string, Field> = {};

    try {
      const res = await getAllCustomProperties();

      Object.entries(res).forEach(([_, fields]) => {
        if (Array.isArray(fields) && fields.length > 0) {
          fields.forEach((field) => {
            if (field.name && field.type) {
              const { subfieldsKey, dataObject } =
                advancedSearchClassBase.getCustomPropertiesSubFields(field);
              subfields[subfieldsKey] = {
                ...dataObject,
                valueSources: dataObject.valueSources as ValueSource[],
              };
            }
          });
        }
      });
    } catch (error) {
      return subfields;
    }

    return subfields;
  };

  // 将资产属性的 dataType 映射为 query-builder 字段类型和操作符
  const mapDataTypeToQbField = (attr: AssetAttribute) => {
    const fieldKey = `extension.${attr.name}`;
    const label = attr.displayName || attr.name;
    switch (attr.dataType) {
      case DataType.Number:
        return {
          key: fieldKey,
          config: {
            label,
            type: 'number' as const,
            operators: RANGE_FIELD_OPERATORS,
            valueSources: ['value'] as any,
          },
        };
      case DataType.Date:
        return {
          key: fieldKey,
          config: {
            label,
            type: 'date' as const,
            operators: RANGE_FIELD_OPERATORS,
            valueSources: ['value'] as any,
          },
        };
      case DataType.Boolean:
        return {
          key: fieldKey,
          config: {
            label,
            type: 'boolean' as const,
            defaultValue: true,
            valueSources: ['value'] as any,
          },
        };
      case DataType.String:
      case DataType.Text:
      case DataType.Array:
      default:
        return {
          key: fieldKey,
          config: {
            label,
            type: 'text' as const,
            operators: TEXT_FIELD_OPERATORS,
            valueSources: ['value'] as any,
          },
        };
    }
  };

  const loadData = async () => {
    const actualConfig = getTreeConfig({
      searchIndex: searchIndex,
      searchOutputType: searchOutputType,
      isExplorePage,
      tierOptions,
    });

    // 针对 DATA_ASSET_SEARCH：完全替换字段为资产属性
    const currentIndex = isArray(searchIndex) ? searchIndex : [searchIndex];
    const isDataAssetSearch = currentIndex.includes(
      SearchIndex.DATA_ASSET_SEARCH as any
    );

    if (isDataAssetSearch) {
      try {
        const attrResponse = await getAssetAttributesList({ limit: 1000 });
        const attributes: AssetAttribute[] = attrResponse.data || [];
        const attrFields: Fields = {};
        attributes.forEach((attr) => {
          const mapped = mapDataTypeToQbField(attr);
          attrFields[mapped.key] = mapped.config;
        });
        // 完全替换字段为资产属性
        actualConfig.fields = attrFields;
      } catch (err) {
        // 加载失败则保留已有字段
        console.error(
          'Failed to load asset attributes for advanced search:',
          err
        );
      }
    } else {
      // 非 DATA_ASSET_SEARCH 保持原逻辑
      let extensionSubField = customProps;
      if (extensionSubField === null) {
        extensionSubField = await fetchCustomPropertyType();
        setCustomProps(extensionSubField);
      }

      if (!isEmpty(extensionSubField)) {
        (actualConfig.fields.extension as FieldGroup).subfields =
          extensionSubField;
      }
    }

    // Update field type if field override is provided
    // For example type of extension is group but it is required as struct in some cases
    fieldOverrides.forEach((fieldOverride: { field: string; type: string }) => {
      if (actualConfig.fields[fieldOverride.field]) {
        actualConfig.fields[fieldOverride.field].type = fieldOverride.type;
      }
    });

    setConfig(actualConfig);
    setInitialised(true);
    setIsUpdating(false);
  };

  const loadTree = useCallback(
    async (treeObj: JsonTree) => {
      const updatedConfig = config;
      const tree = QbUtils.checkTree(QbUtils.loadTree(treeObj), updatedConfig);

      setTreeInternal(tree);
      const qFilter = {
        query: elasticSearchFormat(tree, updatedConfig),
      };
      if (isEqual(qFilter, queryFilter)) {
        return;
      }

      setQueryFilter(qFilter);
      setSQLQuery(QbUtils.sqlFormat(tree, updatedConfig) ?? '');
    },
    [config, queryFilter]
  );

  useEffect(() => {
    setSearchIndex(getSearchIndexFromTabInfo(tabsInfo, tab));
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [searchOutputType, searchIndex]);

  useEffect(() => {
    if (!initialised) {
      return;
    }
    if (jsonTree) {
      loadTree(jsonTree);
    } else {
      handleReset();
    }

    setLoading(false);
  }, [jsonTree, initialised]);

  const handleSubmit = useCallback(() => {
    const qFilter = {
      query: elasticSearchFormat(treeInternal, config),
    };
    setQueryFilter(qFilter);
    setSQLQuery(
      treeInternal ? QbUtils.sqlFormat(treeInternal, config) ?? '' : ''
    );

    updateURL && handleTreeUpdate(treeInternal);
    setShowModal(false);
  }, [treeInternal, config, handleTreeUpdate, updateURL]);

  const contextValues = useMemo(
    () => ({
      queryFilter,
      sqlQuery,
      onTreeUpdate: handleChange,
      toggleModal,
      treeInternal,
      config,
      isUpdating,
      searchIndex,
      onReset: handleReset,
      onResetAllFilters: handleResetAllFilters,
      onChangeSearchIndex: changeSearchIndex,
      onSubmit: handleSubmit,
      modalProps,
    }),
    [
      queryFilter,
      sqlQuery,
      handleChange,
      toggleModal,
      treeInternal,
      config,
      isUpdating,
      searchIndex,
      handleReset,
      handleResetAllFilters,
      changeSearchIndex,
      handleSubmit,
      modalProps,
    ]
  );

  return (
    <AdvancedSearchContext.Provider value={contextValues}>
      {loading ? <Loader /> : children}
      <AdvancedSearchModal
        visible={showModal}
        onCancel={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />
    </AdvancedSearchContext.Provider>
  );
};

export const useAdvanceSearch = () => useContext(AdvancedSearchContext);
