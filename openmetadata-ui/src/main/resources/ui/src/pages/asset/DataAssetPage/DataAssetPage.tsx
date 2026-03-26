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

import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  TreeSelect,
  Typography,
  Upload,
} from 'antd';
import { AxiosError } from 'axios';
import { Operation } from 'fast-json-patch';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory, useParams } from 'react-router-dom';
import { PagingHandlerParams } from '../../../components/common/NextPrevious/NextPrevious.interface';
import { Paging } from '../../../generated/type/paging';
import { usePaging } from '../../../hooks/paging/usePaging';
import { ReactComponent as IconAssets } from '../../../assets/svg/data-asset.svg';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';

import { ReactComponent as SearchIcon } from '../../../assets/svg/ic-search.svg';

import Icon, { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import ButtonGroup from 'antd/lib/button/button-group';
import { ReactComponent as VersionIcon } from '../../../assets/svg/ic-version.svg';
import { ReactComponent as IconDropdown } from '../../../assets/svg/menu.svg';
import ActivityFeedProvider from '../../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import { ActivityFeedLayoutType } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.interface';
import { ManageButtonItemLabel } from '../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
import TabsLabel from '../../../components/common/TabsLabel/TabsLabel.component';
import { ROUTES } from '../../../constants/constants';
import { FEED_COUNT_INITIAL_DATA } from '../../../constants/entity.constants';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import { AssetCatalog } from '../../../generated/entity/data/asset/assetCatalog';
import { AssetCategory } from '../../../generated/entity/data/asset/assetCategory';
import { DataAsset } from '../../../generated/entity/data/asset/dataAsset';
import { FeedCounts } from '../../../interface/feed.interface';
import {
  createDataAsset,
  deleteDataAssetByName,
  exportDataAssets,
  getAssetCatalogsList,
  getAssetTypesList,
  getDataAssetsList,
  getDataAssetByName,
  importDataAssets,
  patchDataAssetByName,
  getAssetTypeByName,
  getAssetAttributesList,
  getAssetCategoriesList,
  updateDataAssetVotes,
} from '../../../rest/assetAPI';
import { searchQuery } from '../../../rest/searchAPI';
import { SearchIndex } from '../../../enums/search.enum';
import {
  getEntityDeleteMessage,
  getFeedCounts,
} from '../../../utils/CommonUtils';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { EntityHeader } from '../../../components/Entity/EntityHeader/EntityHeader.component';
import Voting from '../../../components/Entity/Voting/Voting.component';
import { VotingDataProps } from '../../../components/Entity/Voting/voting.interface';
import EntityDeleteModal from '../../../components/Modals/EntityDeleteModal/EntityDeleteModal';
import Table from '../../../components/common/Table/Table';

import './data-asset-page.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

// 属性分类常量
const ATTRIBUTE_CATEGORIES = [
  { value: 'basic', label: 'label.asset-attribute-category-basic' },
  { value: 'technical', label: 'label.asset-attribute-category-technical' },
  { value: 'business', label: 'label.asset-attribute-category-business' },
  { value: 'quality', label: 'label.asset-attribute-category-quality' },
  { value: 'security', label: 'label.asset-attribute-category-security' },
];

// 自定义字段值截断阈值（字符数）
const VALUE_TRUNCATE_LENGTH = 50;

const DataAssetPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const { currentUser } = useApplicationStore();
  const history = useHistory();
  const { fqn: routeFqn } = useParams<{ fqn?: string }>();

  const {
    pageSize,
    currentPage,
    handlePageChange,
    handlePageSizeChange,
    handlePagingChange,
    showPagination,
    paging,
  } = usePaging();

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [dataAssets, setDataAssets] = useState<DataAsset[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [allAttributes, setAllAttributes] = useState<AssetAttribute[]>([]);
  const [dynamicAttributes, setDynamicAttributes] = useState<AssetAttribute[]>(
    []
  );
  const selectedType = Form.useWatch('assetType', form);
  const [searchText, setSearchText] = useState('');
  const [currentPageCursor, setCurrentPageCursor] = useState<Partial<Paging>>({});
  const [selectedAssetType, setSelectedAssetType] = useState<
    string | undefined
  >();
  const [selectedCatalog, setSelectedCatalog] = useState<string | undefined>();
  const [error, setError] = useState<AxiosError | null>(null);

  // Modal 状态
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);
  const [selectedAssetForEdit, setSelectedAssetForEdit] =
    useState<DataAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);

  const [deleteDataAsset, setDeleteDataAsset] = useState<DataAsset | null>(
    null
  );
  const [feedCount, setFeedCount] = useState<FeedCounts>(
    FEED_COUNT_INITIAL_DATA
  );

  // 详情页动态属性状态
  const [detailDynamicAttributes, setDetailDynamicAttributes] = useState<
    AssetAttribute[]
  >([]);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingAttr, setEditingAttr] = useState<AssetAttribute | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [catalogTreeData, setCatalogTreeData] = useState<any[]>([]);
  const [filterCatalogTreeData, setFilterCatalogTreeData] = useState<any[]>([]);

  const [activeTabKey, setActiveTabKey] = useState<string>('basic');

  useEffect(() => {
    if (viewMode === 'detail' && selectedAsset) {
      setActiveTabKey('basic');
    }
  }, [viewMode, selectedAsset?.id]);

  const getBreadcrumb = (asset: DataAsset) => {
    const breadcrumb = [
      {
        name: t('label.data-asset-plural', '数据资产'),
        url: '/assets/data',
      },
    ];

    if (asset.catalog) {
      const path: any[] = [];
      let currentCatalogId: string | undefined = asset.catalog.id;
      let topCategory: any = null;

      while (currentCatalogId) {
        const found = catalogs.find((c) => c.id === currentCatalogId);
        if (found) {
          path.unshift({
            name: found.displayName || found.name,
            url: `/assetCatalog/${found.fullyQualifiedName || found.name}`,
          });
          if (found.category) {
            topCategory = found.category;
          }
          currentCatalogId = found.parent?.id;
        } else {
          break;
        }
      }

      if (topCategory) {
        path.unshift({
          name: topCategory.displayName || topCategory.name,
          url: `/assetCatalog/${topCategory.fullyQualifiedName || topCategory.name}`,
        });
      }

      breadcrumb.push(...path);
    }

    return breadcrumb;
  };

  const fetchAssetTypes = useCallback(async () => {
    try {
      const response = await getAssetTypesList({ limit: 100 });
      setAssetTypes(response.data || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch asset types:', err);
    }
  }, []);

  const fetchCatalogs = useCallback(async () => {
    try {
      const [categoriesResponse, catalogsResponse] = await Promise.all([
        getAssetCategoriesList({ limit: 100 }),
        getAssetCatalogsList({
          fields: 'category,parent,fullyQualifiedName',
          limit: 1000,
        }),
      ]);

      const categories = categoriesResponse.data || [];
      const catalogs = catalogsResponse.data || [];
      setCatalogs(catalogs);

      const buildCatalogNodes = (
        parentId: string,
        allCatalogs: AssetCatalog[]
      ): any[] => {
        return allCatalogs
          .filter((c) => c.parent?.id === parentId)
          .map((catalog) => {
            const childNodes = buildCatalogNodes(catalog.id ?? '', allCatalogs);

            return {
              title: catalog.displayName || catalog.name,
              value: catalog.fullyQualifiedName || catalog.name,
              key: `catalog-${catalog.id}`,
              children: childNodes.length > 0 ? childNodes : undefined,
            };
          });
      };

      const nodes: any[] = categories.map((category: AssetCategory) => {
        const topLevelCatalogs = catalogs.filter(
          (c: AssetCatalog) => c.category?.id === category.id && !c.parent
        );

        const catalogChildren: any[] = topLevelCatalogs.map(
          (catalog: AssetCatalog) => {
            const childNodes = buildCatalogNodes(catalog.id ?? '', catalogs);

            return {
              title: catalog.displayName || catalog.name,
              value: catalog.fullyQualifiedName || catalog.name,
              key: `catalog-${catalog.id}`,
              children: childNodes.length > 0 ? childNodes : undefined,
            };
          }
        );

        return {
          title: category.displayName || category.name,
          value: `category-${category.id}`,
          key: `category-${category.id}`,
          selectable: false,
          children: catalogChildren.length > 0 ? catalogChildren : undefined,
        };
      });

      setCatalogTreeData(nodes);

      // 筛选用的树结构：value 使用 catalog.id（UUID），以便传给后端通过关系表查询
      const buildFilterCatalogNodes = (
        parentId: string,
        allCatalogs: AssetCatalog[]
      ): any[] => {
        return allCatalogs
          .filter((c) => c.parent?.id === parentId)
          .map((catalog) => {
            const childNodes = buildFilterCatalogNodes(catalog.id ?? '', allCatalogs);

            return {
              title: catalog.displayName || catalog.name,
              value: catalog.id,
              key: `filter-catalog-${catalog.id}`,
              children: childNodes.length > 0 ? childNodes : undefined,
            };
          });
      };

      const filterNodes: any[] = categories.map((category: AssetCategory) => {
        const topLevelCatalogs = catalogs.filter(
          (c: AssetCatalog) => c.category?.id === category.id && !c.parent
        );

        const catalogChildren: any[] = topLevelCatalogs.map(
          (catalog: AssetCatalog) => {
            const childNodes = buildFilterCatalogNodes(catalog.id ?? '', catalogs);

            return {
              title: catalog.displayName || catalog.name,
              value: catalog.id,
              key: `filter-catalog-${catalog.id}`,
              children: childNodes.length > 0 ? childNodes : undefined,
            };
          }
        );

        return {
          title: category.displayName || category.name,
          value: `filter-category-${category.id}`,
          key: `filter-category-${category.id}`,
          selectable: false,
          children: catalogChildren.length > 0 ? catalogChildren : undefined,
        };
      });

      setFilterCatalogTreeData(filterNodes);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch catalogs:', err);
    }
  }, []);

  const fetchAssetAttributes = useCallback(async () => {
    try {
      const response = await getAssetAttributesList({ limit: 1000 });
      setAllAttributes(response.data || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch asset attributes:', err);
    }
  }, []);

  const fetchDataAssets = useCallback(
    async () => {
      setLoadingMore(true);
      setError(null);
      try {
        const trimmedSearch = searchText.trim();

        if (trimmedSearch) {
          // 有搜索文本时使用 ES 搜索
          const q = `*${trimmedSearch}*`;

          // 构建 ES queryFilter（assetType/catalog 在 ES 中存储为 FQN）
          const mustFilters: Record<string, unknown>[] = [];
          if (selectedAssetType) {
            const typeObj = assetTypes.find((t) => t.id === selectedAssetType);
            if (typeObj) {
              mustFilters.push({
                term: { assetType: typeObj.fullyQualifiedName || typeObj.name },
              });
            }
          }
          if (selectedCatalog) {
            const catalogObj = catalogs.find((c) => c.id === selectedCatalog);
            if (catalogObj) {
              mustFilters.push({
                term: {
                  catalog:
                    catalogObj.fullyQualifiedName || catalogObj.name,
                },
              });
            }
          }
          const builtQueryFilter =
            mustFilters.length > 0
              ? { query: { bool: { filter: mustFilters } } }
              : undefined;

          const response = await searchQuery({
            searchIndex: SearchIndex.DATA_ASSET_SEARCH as any,
            query: q,
            queryFilter: builtQueryFilter,
            pageNumber: currentPage,
            pageSize: pageSize,
          });

          const hits = response.hits.hits.map((hit) => {
            const asset = hit._source as unknown as DataAsset;

            // 修复 ES 数据：从 FQN 字符串还原为对象，防止导致前端详情页和编辑页异常
            if (typeof asset.assetType === 'string') {
              const matchedType = assetTypes.find(
                (t) =>
                  t.fullyQualifiedName === asset.assetType ||
                  t.name === asset.assetType
              );
              if (matchedType) {
                asset.assetType = {
                  id: matchedType.id,
                  type: 'assetType',
                  name: matchedType.name,
                  fullyQualifiedName: matchedType.fullyQualifiedName,
                  displayName: matchedType.displayName,
                } as any;
              }
            }

            if (typeof asset.catalog === 'string') {
              const matchedCatalog = catalogs.find(
                (c) =>
                  c.fullyQualifiedName === asset.catalog ||
                  c.name === asset.catalog
              );
              if (matchedCatalog) {
                asset.catalog = {
                  id: matchedCatalog.id,
                  type: 'assetCatalog',
                  name: matchedCatalog.name,
                  fullyQualifiedName: matchedCatalog.fullyQualifiedName,
                  displayName: matchedCatalog.displayName,
                } as any;
              }
            }

            return asset;
          });
          setDataAssets(hits);
          // ES 返回的分页信息
          handlePagingChange({
            total: response.hits.total.value,
          } as any);
        } else {
          // 无搜索文本时使用 DB 列表 API（支持游标分页）
          const params: Record<string, unknown> = {
            ...currentPageCursor,
            limit: pageSize,
          };
          if (selectedAssetType) {
            params.assetType = selectedAssetType;
          }
          if (selectedCatalog) {
            params.catalog = selectedCatalog;
          }

          const response = await getDataAssetsList(params);
          setDataAssets(response.data || []);
          handlePagingChange(response.paging);
        }
      } catch (err) {
        setError(err as AxiosError);
      } finally {
        setLoadingMore(false);
        setIsLoading(false);
      }
    },
    [pageSize, currentPage, selectedAssetType, selectedCatalog, searchText, assetTypes, catalogs, currentPageCursor]
  );

  const onPageChange = useCallback(
    ({ cursorType, currentPage }: PagingHandlerParams) => {
      if (cursorType) {
        setCurrentPageCursor({ [cursorType]: paging[cursorType] });
      } else {
        setCurrentPageCursor({});
      }
      handlePageChange(currentPage);
    },
    [paging, pageSize]
  );

  useEffect(() => {
    fetchAssetTypes();
    fetchCatalogs();
    fetchAssetAttributes();
  }, [fetchAssetTypes, fetchCatalogs, fetchAssetAttributes]);

  useEffect(() => {
    fetchDataAssets();
  }, [fetchDataAssets]);

  // 当 URL 包含 FQN 时，直接通过 API 获取该资产详情，避免依赖列表数据导致的双重跳转
  useEffect(() => {
    const fetchAssetByFqn = async () => {
      if (!routeFqn) {
        setViewMode('list');
        setSelectedAsset(null);

        return;
      }
      // 如果当前已在详情模式且是同一个资产，不重复加载
      if (
        selectedAsset &&
        viewMode === 'detail' &&
        (selectedAsset.fullyQualifiedName === decodeURIComponent(routeFqn) ||
          selectedAsset.name === decodeURIComponent(routeFqn))
      ) {
        return;
      }
      try {
        const decodedFqn = decodeURIComponent(routeFqn);
        const asset = await getDataAssetByName(decodedFqn, {
          fields: 'catalog,assetType,attributeValues,owners,tags',
        });
        handleViewDetails(asset);
        setViewMode('detail');
      } catch (err) {
        // 资产不存在时回退到列表
        console.error('Failed to fetch data asset by FQN:', err);
        setViewMode('list');
        setSelectedAsset(null);
        history.push(ROUTES.DATA_ASSETS);
      }
    };
    fetchAssetByFqn();
  }, [routeFqn]);

  const getEntityFeedCount = () => {
    if (selectedAsset) {
      getFeedCounts(
        'dataAsset' as any,
        selectedAsset.fullyQualifiedName || selectedAsset.name,
        setFeedCount
      );
    }
  };

  useEffect(() => {
    if (selectedAsset) {
      getEntityFeedCount();
    }
  }, [selectedAsset]);

  // 修复竞态条件：当 allAttributes 晚于 dataAssets 加载完成时，
  // 重新为当前选中的资产加载动态属性
  useEffect(() => {
    const reloadDetailAttrs = async () => {
      if (
        selectedAsset?.assetType?.name &&
        allAttributes.length > 0 &&
        detailDynamicAttributes.length === 0
      ) {
        try {
          const typeDetail = await getAssetTypeByName(
            selectedAsset.assetType.name,
            { fields: 'attributes' }
          );
          if (typeDetail.attributes && typeDetail.attributes.length > 0) {
            const attrNames = typeDetail.attributes.map((a: any) => a.name);
            setDetailDynamicAttributes(
              allAttributes.filter((a) => attrNames.includes(a.name))
            );
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to reload detail attributes:', e);
        }
      }
    };
    reloadDetailAttrs();
  }, [allAttributes, selectedAsset]);

  useEffect(() => {
    const fetchDynamicAttrs = async () => {
      if (selectedType && allAttributes.length > 0) {
        try {
          const typeDetail = await getAssetTypeByName(selectedType, {
            fields: 'attributes',
          });
          if (typeDetail.attributes && typeDetail.attributes.length > 0) {
            const attrNames = typeDetail.attributes.map((a) => a.name);
            setDynamicAttributes(
              allAttributes.filter((a) => attrNames.includes(a.name))
            );
          } else {
            setDynamicAttributes([]);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch type attributes:', e);
          setDynamicAttributes([]);
        }
      } else {
        setDynamicAttributes([]);
      }
    };
    fetchDynamicAttrs();
  }, [selectedType, allAttributes]);

  const canEditAttribute = useCallback(
    (attr: AssetAttribute) => {
      if (currentUser?.isAdmin) {
        return true;
      }
      if (!attr.assignableRoles || attr.assignableRoles.length === 0) {
        return true;
      }
      const userRoleNames =
        currentUser?.roles?.map((r: any) => r.name as string) || [];

      return attr.assignableRoles.some((role: any) =>
        userRoleNames.includes(role)
      );
    },
    [currentUser]
  );


  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPageCursor({});
    handlePageChange(1);
  };

  const handleAssetTypeChange = (value: string | undefined) => {
    setSelectedAssetType(value);
    setCurrentPageCursor({});
    handlePageChange(1);
  };

  const handleCatalogChange = (value: string | undefined) => {
    setSelectedCatalog(value);
    setCurrentPageCursor({});
    handlePageChange(1);
  };

  const handleTableChange = (pagination: unknown) => {
    const page = (pagination as { current?: number })?.current || 1;
    const size = (pagination as { pageSize?: number })?.pageSize || 10;
    handlePageChange(page);
    if (size !== pageSize) {
      handlePageSizeChange(size);
    }
  };

  const handleViewDetails = async (record: DataAsset) => {
    setSelectedAsset(record);
    // 加载这个 asset 的详细 attributes 列表
    if (record.assetType?.name && allAttributes.length > 0) {
      try {
        const typeDetail = await getAssetTypeByName(record.assetType.name, {
          fields: 'attributes',
        });
        if (typeDetail.attributes && typeDetail.attributes.length > 0) {
          const attrNames = typeDetail.attributes.map((a: any) => a.name);
          setDetailDynamicAttributes(
            allAttributes.filter((a) => attrNames.includes(a.name))
          );
        } else {
          setDetailDynamicAttributes([]);
        }
      } catch (e) {
        setDetailDynamicAttributes([]);
      }
    } else {
      setDetailDynamicAttributes([]);
    }
    // 不再用 modal，我们用右侧栏
    // setIsDetailModalVisible(true);
  };

  // 导出功能
  const handleExport = async () => {
    try {
      const csvData = await exportDataAssets('all');

      // 创建下载链接
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `data-assets-${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(t('message.export-successful'));
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', error);
      const errMsg =
        error.response?.data?.message || t('message.export-failed');
      message.error(errMsg);
    }
  };

  // 导入功能
  const handleImport = () => {
    setUploadFileList([]);
    setIsImportModalVisible(true);
  };

  const handleUploadChange = (info: any) => {
    setUploadFileList(info.fileList);
  };

  const handleImportSubmit = async () => {
    if (uploadFileList.length === 0) {
      message.warning(t('message.select-file-to-import'));

      return;
    }

    const file = uploadFileList[0].originFileObj;
    const reader = new FileReader();

    reader.onload = async (e) => {
      setIsImporting(true);
      try {
        const csvData = e.target?.result as string;
        const result: any = await importDataAssets('all', csvData, false);

        if (result.numberOfRowsFailed === 0) {
          message.success(
            t('message.import-successful-with-count', {
              count: result.numberOfRowsPassed,
            })
          );
        } else {
          message.warning(
            t('message.import-partial-success', {
              success: result.numberOfRowsPassed,
              failed: result.numberOfRowsFailed,
            })
          );
        }

        setIsImportModalVisible(false);
        setUploadFileList([]);
        await fetchDataAssets();
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Import failed:', error);
        const errMsg =
          error.response?.data?.message || t('message.import-failed');
        message.error(errMsg);
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  };

  // 添加资产
  const handleAdd = () => {
    setModalMode('create');
    setSelectedAssetForEdit(null);
    form.resetFields();
    setIsFormModalVisible(true);
  };

  // 编辑资产
  const handleEdit = (record: DataAsset) => {
    setModalMode('edit');
    setSelectedAssetForEdit(record);

    const extensionValues: Record<string, any> = {};
    if (record.attributeValues) {
      record.attributeValues.forEach((attr) => {
        extensionValues[attr.name] = attr.value;
      });
    }

    form.setFieldsValue({
      name: record.name,
      displayName: record.displayName || '',
      description: record.description || '',
      assetType: record.assetType?.fullyQualifiedName || record.assetType?.name,
      catalog: record.catalog?.fullyQualifiedName || record.catalog?.name,
      extension: extensionValues,
    });
    setIsFormModalVisible(true);
  };

  // 删除资产
  const handleDeleteClick = (record: DataAsset) => {
    setDeleteDataAsset(record);
  };

  const handleEntityDelete = async () => {
    if (!deleteDataAsset) {
      return;
    }
    try {
      await deleteDataAssetByName(deleteDataAsset.name, false, true);
      await fetchDataAssets();
      message.success(t('message.entity-deleted-successfully', { entity: t('label.data-asset') }));
      if (selectedAsset?.id === deleteDataAsset.id) {
        setViewMode('list');
        setSelectedAsset(null);
        history.push(ROUTES.DATA_ASSETS);
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      const errMsg =
        error.response?.data?.message || t('message.delete-failed');
      message.error(errMsg);
    } finally {
      setDeleteDataAsset(null);
    }
  };

  // 单个属性值行内提交
  const handleEditValueSubmit = async () => {
    if (!selectedAsset || !editingAttr) {
      return;
    }
    try {
      setIsSubmitting(true);
      const currentExtensions = selectedAsset.attributeValues || [];
      const newExtensions = currentExtensions.filter(
        (a) => a.name !== editingAttr.name
      );
      if (editingValue !== undefined && editingValue !== null) {
        newExtensions.push({ name: editingAttr.name, value: editingValue });
      }

      const patch: Operation[] = [
        {
          op: 'add',
          path: '/extension',
          value: newExtensions.reduce((acc, curr) => {
            acc[curr.name] = curr.value;

            return acc;
          }, {} as Record<string, any>),
        },
      ];

      const response = await patchDataAssetByName(selectedAsset.name, patch);
      setSelectedAsset((response as any).data || response);
      setEditingRowKey(null);
      setEditingAttr(null);
      setEditingValue(null);
      message.success(t('message.entity-updated-successfully', { entity: t('label.data-asset') }));
      await fetchDataAssets();
    } catch (e: any) {
      console.error(e);
      message.error(e.response?.data?.message || t('message.submit-failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVote = async (data: VotingDataProps, id: string) => {
    try {
      await updateDataAssetVotes(id, data);
      await fetchDataAssets();
    } catch (error) {
      message.error(t('message.entity-update-error'));
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      if (modalMode === 'create') {
        const payload: any = {
          name: values.name,
          displayName: values.displayName,
          description: values.description,
          assetType: values.assetType,
          catalog: values.catalog,
        };
        if (values.extension && Object.keys(values.extension).length > 0) {
          payload.extension = values.extension;
        }
        await createDataAsset(payload);
        message.success(t('message.entity-created-successfully', { entity: t('label.data-asset') }));
      } else if (modalMode === 'edit' && selectedAssetForEdit) {
        const patch: Operation[] = [];

        // displayName
        if (values.displayName !== selectedAssetForEdit.displayName) {
          patch.push({
            op: selectedAssetForEdit.displayName ? 'replace' : 'add',
            path: '/displayName',
            value: values.displayName || '',
          });
        }

        // description
        if (values.description !== selectedAssetForEdit.description) {
          patch.push({
            op: selectedAssetForEdit.description ? 'replace' : 'add',
            path: '/description',
            value: values.description || '',
          });
        }

        // catalog
        const currentCatalogFqn =
          selectedAssetForEdit.catalog?.fullyQualifiedName ||
          selectedAssetForEdit.catalog?.name;
        if (values.catalog !== currentCatalogFqn) {
          const selectedCatalogObj = catalogs.find(
            (c: any) => (c.fullyQualifiedName || c.name) === values.catalog
          );
          if (selectedCatalogObj) {
            patch.push({
              op: selectedAssetForEdit.catalog ? 'replace' : 'add',
              path: '/catalog',
              value: {
                id: selectedCatalogObj.id,
                type: 'assetCatalog',
              },
            });
          } else if (selectedAssetForEdit.catalog) {
            patch.push({ op: 'remove', path: '/catalog' });
          }
        }

        // assetType
        const currentAssetTypeFqn =
          selectedAssetForEdit.assetType?.fullyQualifiedName ||
          selectedAssetForEdit.assetType?.name;
        if (values.assetType !== currentAssetTypeFqn) {
          const selectedTypeObj = assetTypes.find(
            (t: any) => (t.fullyQualifiedName || t.name) === values.assetType
          );
          if (selectedTypeObj) {
            patch.push({
              op: selectedAssetForEdit.assetType ? 'replace' : 'add',
              path: '/assetType',
              value: {
                id: selectedTypeObj.id,
                type: 'assetType',
              },
            });
          } else if (selectedAssetForEdit.assetType) {
            patch.push({ op: 'remove', path: '/assetType' });
          }
        }

        // extension
        if (values.extension && Object.keys(values.extension).length > 0) {
          patch.push({
            op: 'add',
            path: '/extension',
            value: values.extension,
          });
        }

        if (patch.length > 0) {
          await patchDataAssetByName(selectedAssetForEdit.name, patch);
          message.success(t('message.entity-updated-successfully', { entity: t('label.data-asset') }));
        }
      }

      setIsFormModalVisible(false);
      form.resetFields();
      await fetchDataAssets();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Submit failed:', error);
      const errMsg =
        error.response?.data?.message || t('message.submit-failed');
      message.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      title: t('label.name'),
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string, record: DataAsset) => (
        <Space direction="vertical" size={0}>
          <Link
            className="font-bold text-primary"
            to={`/dataAsset/${record.fullyQualifiedName ?? text}`}>
            {record.displayName || text}
          </Link>
          <div className="text-xs text-grey-muted">{text}</div>
        </Space>
      ),
    },
    {
      title: t('label.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: t('label.asset-type'),
      dataIndex: 'assetType',
      key: 'assetType',
      width: 150,
      render: (assetTypeVal: any) => {
        let display = '-';
        if (assetTypeVal) {
          if (typeof assetTypeVal === 'string') {
            const match = assetTypes.find(
              (t) =>
                t.fullyQualifiedName === assetTypeVal || t.name === assetTypeVal
            );
            display = match ? match.displayName || match.name : assetTypeVal;
          } else {
            display = assetTypeVal.displayName || assetTypeVal.name;
          }
        }
        return <Tag color="geekblue">{display}</Tag>;
      },
    },
    {
      title: t('label.catalog'),
      dataIndex: 'catalog',
      key: 'catalog',
      width: 150,
      render: (catalogVal: any) => {
        let display = '-';
        if (catalogVal) {
          if (typeof catalogVal === 'string') {
            const match = catalogs.find(
              (c) =>
                c.fullyQualifiedName === catalogVal || c.name === catalogVal
            );
            display = match ? match.displayName || match.name : catalogVal;
          } else {
            display = catalogVal.displayName || catalogVal.name;
          }
        }
        return <Tag color="cyan">{display}</Tag>;
      },
    },
    {
      title: t('label.action-plural'),
      key: 'actions',
      width: 100,
      render: (_: unknown, record: DataAsset) => (
        <Space size="small">
          <Tooltip title={t('label.edit')}>
            <Button
              icon={<EditIcon className="table-action-icon" />}
              size="small"
              type="text"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={t('label.delete')}>
            <Button
              danger
              icon={<DeleteIcon height={16} width={16} />}
              size="small"
              type="text"
              onClick={() => handleDeleteClick(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const pageHeader = (
    <Row align="middle" gutter={[16, 16]} justify="space-between">
      <Col span={24}>
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <div className="flex items-center gap-2">
            <IconAssets height="32px" width="32px" />
            <h2 className="text-xl font-semibold m-0">
              {t('label.data-assets-list')}
            </h2>
          </div>
          <p className="text-sm text-grey-muted m-0">
            {t('label.data-assets-list-desc')}
          </p>
        </Space>
      </Col>
    </Row>
  );

  const filtersBar = (
    <Row align="middle" gutter={[16, 16]} wrap={false}>
      <Col flex="200px">
        <Search
          allowClear
          placeholder={t('label.search-data-assets')}
          prefix={<SearchIcon />}
          style={{ width: '100%' }}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
      </Col>
      <Col flex="180px">
        <Select
          allowClear
          loading={isLoading && assetTypes.length === 0}
          placeholder={t('label.filter-by-asset-type')}
          style={{ width: '100%' }}
          value={selectedAssetType}
          onChange={handleAssetTypeChange}>
          {assetTypes.map((type) => (
            <Option key={type.id} value={type.id}>
              {type.displayName || type.name}
            </Option>
          ))}
        </Select>
      </Col>
      <Col flex="220px">
        <TreeSelect
          allowClear
          showSearch
          treeDefaultExpandAll
          dropdownMatchSelectWidth={false}
          dropdownStyle={{ maxHeight: 400, minWidth: 300 }}
          loading={isLoading && catalogs.length === 0}
          placeholder={t('label.filter-by-catalog')}
          popupClassName="catalog-filter-dropdown"
          style={{ width: '100%' }}
          treeData={filterCatalogTreeData}
          treeNodeFilterProp="title"
          value={selectedCatalog}
          onChange={handleCatalogChange}
        />
      </Col>
      <Col flex="auto" style={{ textAlign: 'right' }}>
        <Space>
          <Button type="primary" onClick={handleAdd}>
            {t('label.add-entity', { entity: t('label.data-asset') })}
          </Button>
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            {t('label.import')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            {t('label.export')}
          </Button>
        </Space>
      </Col>
    </Row>
  );

  return (
    <ActivityFeedProvider user={currentUser?.id}>
      <PageLayoutV1
        className="data-asset-page"
        pageTitle={t('label.data-assets-list')}>
        {viewMode === 'list' && (
          <div className="p-lg">
            {pageHeader}
            <div className="mt-md mb-md">{filtersBar}</div>

            {isLoading ? (
              <Loader />
            ) : error ? (
              <div>Error</div>
            ) : (
              <Table
                className="data-asset-table"
                columns={columns}
                customPaginationProps={{
                  showPagination,
                  currentPage,
                  isLoading: loadingMore,
                  pageSize,
                  paging,
                  pagingHandler: onPageChange,
                  onShowSizeChange: handlePageSizeChange,
                }}
                dataSource={dataAssets}
                loading={loadingMore}
                pagination={false}
                rowKey="id"
                size="small"
              />
            )}
          </div>
        )}

        {viewMode === 'detail' && selectedAsset && (
          <Row
            className="p-x-lg p-y-md"
            data-testid="data-asset-details"
            gutter={[0, 12]}>
            <Col span={24}>
              <div className="flex justify-between items-start mb-md">
                <div className="w-max-70">
                  <EntityHeader
                    breadcrumb={getBreadcrumb(selectedAsset)}
                    entityData={{
                      name: selectedAsset.name,
                      displayName: selectedAsset.displayName,
                      deleted: false,
                    }}
                    entityType={'dataAsset' as any}
                    icon={
                      <IconAssets
                        className="align-middle"
                        height={36}
                        width={32}
                      />
                    }
                    serviceName=""
                  />
                  <div className="m-t-xs m-l-xl p-l-sm">
                    {selectedAsset.description && (
                      <p className="m-0 text-grey-muted">
                        {selectedAsset.description}
                      </p>
                    )}
                  </div>
                </div>

                <ButtonGroup
                  className="data-asset-button-group spaced m-t-xs"
                  size="small">
                  <Voting
                    disabled={false}
                    voteStatus={'unVoted' as any}
                    votes={selectedAsset.votes}
                    onUpdateVote={async (data) =>
                      await handleUpdateVote(data, selectedAsset.id)
                    }
                  />
                  <Tooltip title={t('label.version-plural-history')}>
                    <Button
                      className="version-button"
                      icon={<Icon component={VersionIcon} />}
                      onClick={() => {
                        history.push(
                          ROUTES.DATA_ASSET_VERSION.replace(
                            PLACEHOLDER_ROUTE_FQN,
                            selectedAsset.fullyQualifiedName ||
                              selectedAsset.name
                          )
                        );
                      }}>
                      <Typography.Text>
                        {selectedAsset.version || '0.1'}
                      </Typography.Text>
                    </Button>
                  </Tooltip>

                  <Dropdown
                    align={{ targetOffset: [-12, 0] }}
                    className="m-l-xs"
                    menu={{
                      items: [
                        {
                          label: (
                            <ManageButtonItemLabel
                              description={t('message.rename-entity', {
                                entity: t('label.data-asset'),
                              })}
                              icon={EditIcon}
                              id="rename-button"
                              name={t('label.rename')}
                            />
                          ),
                          key: 'rename-button',
                          onClick: (e: any) => {
                            e.domEvent.stopPropagation();
                            handleEdit(selectedAsset);
                          },
                        },
                        {
                          label: (
                            <ManageButtonItemLabel
                              description={t(
                                'message.delete-entity-type-action-description',
                                { entityType: t('label.data-asset') }
                              )}
                              icon={DeleteIcon}
                              id="delete-button"
                              name={t('label.delete')}
                            />
                          ),
                          key: 'delete-button',
                          onClick: (e: any) => {
                            e.domEvent.stopPropagation();
                            handleDeleteClick(selectedAsset);
                          },
                        },
                      ],
                    }}
                    placement="bottomRight"
                    trigger={['click']}>
                    <Tooltip
                      placement="topRight"
                      title={t('label.manage-entity', {
                        entity: t('label.data-asset'),
                      })}>
                      <Button
                        className="glossary-manage-dropdown-button"
                        icon={
                          <Icon
                            className="vertical-align-inherit manage-dropdown-icon"
                            component={IconDropdown}
                            height={16}
                            width={16}
                          />
                        }
                      />
                    </Tooltip>
                  </Dropdown>
                </ButtonGroup>
              </div>
            </Col>

            <Col className="entity-details-page-tabs" span={24}>
              <Tabs
                className="tabs-new"
                activeKey={activeTabKey}
                onChange={setActiveTabKey}
                items={[
                  ...(ATTRIBUTE_CATEGORIES.map((category) => {
                    const categoryAttrs = detailDynamicAttributes.filter(
                      (a) => a.attributeCategory === category.value
                    );
                    if (categoryAttrs.length === 0 && category.value !== 'basic') {
                      return null;
                    }

                    return {
                      key: category.value,
                      label: (
                        <TabsLabel
                          id={category.value}
                          name={t(category.label)}
                        />
                      ),
                      children: (
                        <div className="p-t-md p-x-md">
                          <Table
                            columns={[
                              {
                                title: t('label.name'),
                                dataIndex: 'name',
                                key: 'name',
                                width: '30%',
                              },
                              {
                                title: t('label.required', '是否必填'),
                                dataIndex: 'required',
                                key: 'required',
                                width: 100,
                                render: (_: any, record: any) =>
                                  record._rawAttr?.required ? (
                                    <Tag color="error">
                                      {t('label.required-field', '必填')}
                                    </Tag>
                                  ) : (
                                    <Tag>
                                      {t('label.optional-field', '选填')}
                                    </Tag>
                                  ),
                              },
                              {
                                title: t('label.value'),
                                dataIndex: 'value',
                                key: 'value',
                                render: (_: any, record: any) =>
                                  record.key === editingRowKey ? (
                                    record._rawAttr.dataType === 'boolean' ? (
                                      <Select
                                        allowClear
                                        size="small"
                                        style={{ width: '100%' }}
                                        value={editingValue}
                                        onChange={setEditingValue}>
                                        <Option value>{t('label.true')}</Option>
                                        <Option value={false}>
                                          {t('label.false')}
                                        </Option>
                                      </Select>
                                    ) : record._rawAttr.dataType === 'text' ? (
                                      <Input.TextArea
                                        autoSize={{ minRows: 1 }}
                                        size="small"
                                        value={editingValue}
                                        onChange={(e) =>
                                          setEditingValue(e.target.value)
                                        }
                                      />
                                    ) : record._rawAttr.dataType ===
                                      'number' ? (
                                      <Input
                                        size="small"
                                        type="number"
                                        value={editingValue}
                                        onChange={(e) =>
                                          setEditingValue(
                                            Number(e.target.value)
                                          )
                                        }
                                      />
                                    ) : (
                                      <Input
                                        size="small"
                                        value={editingValue}
                                        onChange={(e) =>
                                          setEditingValue(e.target.value)
                                        }
                                      />
                                    )
                                  ) : record.value && record.value.length > VALUE_TRUNCATE_LENGTH ? (
                                    <Tooltip
                                      title={record.value}
                                      overlayStyle={{ maxWidth: 400 }}>
                                      <Typography.Text
                                        style={{ maxWidth: '100%', display: 'inline-block', cursor: 'pointer' }}>
                                        {record.value.slice(0, VALUE_TRUNCATE_LENGTH)}...
                                      </Typography.Text>
                                    </Tooltip>
                                  ) : (
                                    record.value || '-'
                                  ),
                              },
                              {
                                title: t('label.action-plural'),
                                key: 'action',
                                width: 140,
                                render: (_: any, record: any) =>
                                  record.key === editingRowKey ? (
                                    <Space size={4}>
                                      <Button
                                        loading={isSubmitting}
                                        size="small"
                                        type="primary"
                                        onClick={() => handleEditValueSubmit()}>
                                        {t('label.save')}
                                      </Button>
                                      <Button
                                        size="small"
                                        onClick={() => setEditingRowKey(null)}>
                                        {t('label.cancel')}
                                      </Button>
                                    </Space>
                                  ) : (
                                    <Button
                                      icon={
                                        <EditIcon className="table-action-icon" />
                                      }
                                      size="small"
                                      type="text"
                                      onClick={() => {
                                        setEditingAttr(record._rawAttr);
                                        setEditingValue(record.value);
                                        setEditingRowKey(record.key);
                                      }}
                                    />
                                  ),
                              },
                            ]}
                            dataSource={categoryAttrs.map((attr) => {
                              const valObj =
                                selectedAsset.attributeValues?.find(
                                  (v) => v.name === attr.name
                                );

                              return {
                                key: attr.name,
                                name: attr.displayName || attr.name,
                                value: valObj
                                  ? String(valObj.value)
                                  : undefined,
                                _rawAttr: attr,
                              };
                            })}
                            pagination={false}
                            rowKey="key"
                            scroll={{ x: 800 }}
                            size="small"
                          />
                        </div>
                      ),
                    };
                  }).filter(Boolean) as any[]),
                  {
                    key: 'activity',
                    label: (
                      <TabsLabel
                        count={feedCount.totalCount}
                        id="activity"
                        name={t('label.activity-feed-plural')}
                      />
                    ),
                    children: (
                      <ActivityFeedTab
                        entityType={'dataAsset' as any}
                        feedCount={feedCount}
                        hasGlossaryReviewer={false}
                        layoutType={ActivityFeedLayoutType.THREE_PANEL}
                        owners={selectedAsset?.owners}
                        onFeedUpdate={getEntityFeedCount}
                        onUpdateEntityDetails={fetchDataAssets}
                      />
                    ),
                  },
                ]}
              />
            </Col>
          </Row>
        )}

        {deleteDataAsset && (
          <EntityDeleteModal
            bodyText={getEntityDeleteMessage(deleteDataAsset.name, '')}
            entityName={deleteDataAsset.name}
            entityType={t('label.data-asset')}
            visible={!!deleteDataAsset}
            onCancel={() => setDeleteDataAsset(null)}
            onConfirm={handleEntityDelete}
          />
        )}

        {/* 删除原来的资产属性Modal, 已被行内编辑取代 */}

        {/* 添加/编辑资产表单Modal */}
        <Modal
          confirmLoading={isSubmitting}
          open={isFormModalVisible}
          title={
            modalMode === 'create'
              ? t('label.add-entity', { entity: t('label.data-asset') })
              : t('label.edit-entity', { entity: t('label.data-asset') })
          }
          width={600}
          onCancel={() => {
            setIsFormModalVisible(false);
            form.resetFields();
          }}
          onOk={handleSubmit}>
          <Form form={form} layout="vertical">
            <Form.Item
              label={t('label.name')}
              name="name"
              rules={[
                {
                  required: true,
                  message: t('message.field-text-required', {
                    fieldText: t('label.name'),
                  }),
                },
                {
                  pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                  message: t('message.invalid-name-format'),
                },
              ]}>
              <Input
                disabled={modalMode === 'edit'}
                placeholder={t('label.name')}
              />
            </Form.Item>
            <Form.Item
              label={t('label.display-name')}
              name="displayName"
              rules={[
                {
                  required: true,
                  message: t('message.field-text-required', {
                    fieldText: t('label.display-name'),
                  }),
                },
              ]}>
              <Input placeholder={t('label.display-name')} />
            </Form.Item>
            <Form.Item
              label={t('label.description')}
              name="description"
              rules={[
                {
                  required: true,
                  message: t('message.field-text-required', {
                    fieldText: t('label.description'),
                  }),
                },
              ]}>
              <TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder={t('label.description')}
              />
            </Form.Item>
            <Form.Item
              label={t('label.asset-type')}
              name="assetType"
              rules={[
                {
                  required: true,
                  message: t('message.field-text-required', {
                    fieldText: t('label.asset-type'),
                  }),
                },
              ]}>
              <Select
                disabled={modalMode === 'edit'}
                placeholder={t('label.asset-type')}>
                {assetTypes.map((type) => (
                  <Option
                    key={type.id}
                    value={type.fullyQualifiedName || type.name}>
                    {type.displayName || type.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label={t('label.catalog')} name="catalog">
              <TreeSelect
                allowClear
                treeDefaultExpandAll
                placeholder={t('label.catalog')}
                treeData={catalogTreeData}
              />
            </Form.Item>

            {dynamicAttributes.length > 0 && (
              <div className="dynamic-attributes-container m-t-md p-t-md border-top">
                <h5 className="mb-sm text-grey-muted">
                  {t('label.dynamic-attributes', 'Dynamic Attributes')}
                </h5>
                {dynamicAttributes.map((attr) => {
                  const disabled = !canEditAttribute(attr);

                  return (
                    <Form.Item
                      key={attr.name}
                      label={
                        <span>
                          {attr.displayName || attr.name}
                          {disabled && (
                            <Tag className="m-l-xs">
                              {t('label.read-only', 'Read-Only')}
                            </Tag>
                          )}
                        </span>
                      }
                      name={['extension', attr.name]}>
                      {attr.dataType === 'boolean' ? (
                        <Select allowClear disabled={disabled}>
                          <Option value>{t('label.true')}</Option>
                          <Option value={false}>{t('label.false')}</Option>
                        </Select>
                      ) : attr.dataType === 'number' ? (
                        <Input disabled={disabled} type="number" />
                      ) : attr.dataType === 'text' ? (
                        <TextArea
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          disabled={disabled}
                        />
                      ) : (
                        <Input disabled={disabled} />
                      )}
                    </Form.Item>
                  );
                })}
              </div>
            )}
          </Form>
        </Modal>

        {/* 导入Modal */}
        <Modal
          cancelButtonProps={{ disabled: isImporting }}
          confirmLoading={isImporting}
          okButtonProps={{ disabled: isImporting }}
          open={isImportModalVisible}
          title={t('label.import-data-assets')}
          width={600}
          onCancel={() => {
            setIsImportModalVisible(false);
            setUploadFileList([]);
          }}
          onOk={handleImportSubmit}>
          <div className="mb-md">
            <p>{t('message.import-description')}</p>
          </div>
          <Dragger
            accept=".csv"
            beforeUpload={() => false}
            fileList={uploadFileList}
            maxCount={1}
            onChange={handleUploadChange}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              {t('message.click-or-drag-file-to-upload')}
            </p>
            <p className="ant-upload-hint">
              {t('message.support-file-types-csv')}
            </p>
          </Dragger>
        </Modal>
      </PageLayoutV1>
    </ActivityFeedProvider>
  );
};

export default DataAssetPage;
