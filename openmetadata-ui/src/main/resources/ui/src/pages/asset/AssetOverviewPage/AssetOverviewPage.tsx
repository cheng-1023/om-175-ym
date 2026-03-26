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
  Badge,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Tree,
  Typography,
  Pagination,
} from 'antd';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ReactComponent as IconDown } from '../../../assets/svg/ic-arrow-down.svg';
import { ReactComponent as IconRight } from '../../../assets/svg/ic-arrow-right.svg';
import { ReactComponent as SearchIcon } from '../../../assets/svg/ic-search.svg';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import ResizableLeftPanels from '../../../components/common/ResizablePanels/ResizableLeftPanels';
import DataAssetDetailPanel from './DataAssetDetailPanel';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { SearchIndex } from '../../../enums/search.enum';
import { AssetCatalog } from '../../../generated/entity/data/asset/assetCatalog';
import { AssetCategory } from '../../../generated/entity/data/asset/assetCategory';
import { AssetType } from '../../../generated/entity/data/asset/assetType';
import { DataAsset } from '../../../generated/entity/data/asset/dataAsset';
import {
  getAssetCategoriesList,
  getAssetCatalogsList,
  getAssetTypesList,
} from '../../../rest/assetAPI';
import { searchQuery } from '../../../rest/searchAPI';
import '../../../components/Explore/ExploreTree/explore-tree.less';
import './asset-overview-page.less';

const { Search } = Input;
const { Option } = Select;

interface TreeNode {
  title: React.ReactNode;
  key: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  isLeaf?: boolean;
  type: 'category' | 'catalog';
  data?: AssetCategory | AssetCatalog;
}

const AssetOverviewPage: React.FC = () => {
  const { t } = useTranslation();

  // 加载状态
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [treeError, setTreeError] = useState<Error | null>(null);
  const [assetsError, setAssetsError] = useState<Error | null>(null);

  // 数据状态
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [dataAssets, setDataAssets] = useState<DataAsset[]>([]);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);

  // 筛选状态
  const [selectedAssetType, setSelectedAssetType] = useState<
    string | undefined
  >();
  const [searchText, setSearchText] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<string[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 展开配置
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  // 获取树形数据
  const fetchTreeData = useCallback(async () => {
    setIsLoadingTree(true);
    setTreeError(null);
    try {
      const [categoriesResponse, catalogsResponse] = await Promise.all([
        getAssetCategoriesList({ limit: 100 }),
        getAssetCatalogsList({
          fields: 'category,parent,fullyQualifiedName,order',
          limit: 1000,
        }),
      ]);

      const categories = categoriesResponse.data || [];
      const catalogs = catalogsResponse.data || [];

      // 构建树形结构：递归构建目录子节点
      const buildCatalogNodes = (
        parentId: string,
        allCatalogs: AssetCatalog[]
      ): TreeNode[] => {
        return allCatalogs
          .filter((c) => c.parent?.id === parentId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((catalog) => {
            const childNodes = buildCatalogNodes(catalog.id ?? '', allCatalogs);

            return {
              title: (
                <div className="d-flex justify-between w-full">
                  <Typography.Text>
                    {catalog.displayName || catalog.name}
                  </Typography.Text>
                  {catalog.assetCount !== undefined && (
                    <span className="explore-node-count">
                      <Badge
                        className="m-l-xs"
                        count={catalog.assetCount}
                        style={{ backgroundColor: '#1890ff' }}
                      />
                    </span>
                  )}
                </div>
              ),
              key: `catalog-${catalog.id}`,
              type: 'catalog' as const,
              data: catalog,
              isLeaf: childNodes.length === 0,
              children: childNodes.length > 0 ? childNodes : undefined,
            };
          });
      };

      const nodes: TreeNode[] = categories.map((category: AssetCategory) => {
        const topLevelCatalogs = catalogs
          .filter(
            (c: AssetCatalog) => c.category?.id === category.id && !c.parent
          )
          .sort(
            (a: AssetCatalog, b: AssetCatalog) =>
              (a.order ?? 0) - (b.order ?? 0)
          );

        const catalogChildren: TreeNode[] = topLevelCatalogs.map(
          (catalog: AssetCatalog) => {
            const childNodes = buildCatalogNodes(catalog.id ?? '', catalogs);

            return {
              title: (
                <div className="d-flex justify-between w-full">
                  <Typography.Text>
                    {catalog.displayName || catalog.name}
                  </Typography.Text>
                  {catalog.assetCount !== undefined && (
                    <span className="explore-node-count">
                      <Badge
                        className="m-l-xs"
                        count={catalog.assetCount}
                        style={{ backgroundColor: '#1890ff' }}
                      />
                    </span>
                  )}
                </div>
              ),
              key: `catalog-${catalog.id}`,
              type: 'catalog' as const,
              data: catalog,
              isLeaf: childNodes.length === 0,
              children: childNodes.length > 0 ? childNodes : undefined,
            };
          }
        );

        return {
          title: (
            <div className="d-flex justify-between w-full">
              <span className="font-semibold text-grey-body">
                {category.displayName || category.name}
              </span>
              <span className="explore-node-count">
                <Badge
                  className="m-l-xs"
                  count={category.catalogCount || 0}
                  style={{ backgroundColor: '#52c41a' }}
                />
              </span>
            </div>
          ),
          key: `category-${category.id}`,

          type: 'category',
          data: category,
          isLeaf: catalogChildren.length === 0,
          children: catalogChildren.length > 0 ? catalogChildren : undefined,
        };
      });

      setTreeData(nodes);

      // 默认全部折叠
      setExpandedKeys([]);
    } catch (err) {
      console.error('Failed to fetch tree data:', err);
      setTreeError(err as Error);
    } finally {
      setIsLoadingTree(false);
    }
  }, []);

  // 获取资产类型列表
  const fetchAssetTypes = useCallback(async () => {
    try {
      const response = await getAssetTypesList({ limit: 100 });
      setAssetTypes(response.data || []);
    } catch (err) {
      console.error('Failed to fetch asset types:', err);
    }
  }, []);

  // 获取数据资产列表 (通过 ES)
  const fetchDataAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    setAssetsError(null);
    try {
      // 搜索文本作为 query string
      const q = searchText ? `*${searchText}*` : '*';

      // 将 assetType 和 catalog 筛选通过 queryFilter (ES bool filter) 传入
      // 避免 query_string 对 keyword+normalizer 字段的大小写不匹配问题
      const mustFilters: Record<string, unknown>[] = [];
      if (selectedAssetType) {
        mustFilters.push({ term: { assetType: selectedAssetType } });
      }
      if (catalogFilter.length > 0) {
        mustFilters.push({ terms: { catalog: catalogFilter } });
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

      const hits = response.hits.hits.map(
        (hit) => hit._source as unknown as DataAsset
      );
      setDataAssets(hits);
      setTotalAssets(response.hits.total.value);

      // 筛选后自动选中第一条记录；无结果时清空选中
      if (hits.length > 0) {
        setSelectedAsset(hits[0]);
      } else {
        setSelectedAsset(null);
      }
    } catch (err) {
      console.error('Failed to fetch data assets:', err);
      setAssetsError(err as Error);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [currentPage, pageSize, selectedAssetType, catalogFilter, searchText]);

  useEffect(() => {
    fetchTreeData();
    fetchAssetTypes();
  }, [fetchTreeData, fetchAssetTypes]);

  useEffect(() => {
    fetchDataAssets();
  }, [fetchDataAssets]);

  // Escape 关闭面板
  useEffect(() => {
    const escapeKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAsset(null);
      }
    };
    document.addEventListener('keydown', escapeKeyHandler);

    return () => {
      document.removeEventListener('keydown', escapeKeyHandler);
    };
  }, []);

  // 树节点点击事件
  const handleTreeSelect = useCallback(
    (selectedKeys: React.Key[], info: any) => {
      if (selectedKeys.length > 0) {
        const node = info.node;

        const collectCatalogNames = (n: any): string[] => {
          let names: string[] = [];
          if (n.type === 'catalog' && n.data) {
            names.push(
              (n.data as AssetCatalog).fullyQualifiedName ||
                (n.data as AssetCatalog).name
            );
          }
          if (n.children && n.children.length > 0) {
            n.children.forEach((child: any) => {
              names = names.concat(collectCatalogNames(child));
            });
          }

          return names;
        };

        const collectedNames = collectCatalogNames(node);
        setCatalogFilter(collectedNames);
        setCurrentPage(1);
      } else {
        setCatalogFilter([]);
        setCurrentPage(1);
      }
    },
    []
  );

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  }, []);

  // 资产类型改变
  const handleAssetTypeChange = useCallback((value: string | undefined) => {
    setSelectedAssetType(value);
    setCurrentPage(1);
  }, []);

  // 分页改变
  const handleTableChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  // 资产行点击事件
  const handleRowClick = useCallback((record: DataAsset) => {
    setSelectedAsset(record);
  }, []);

  // 映射字典，用于将 ES 仅存 FQN 的短板映射为 displayName
  const assetTypeMap = useMemo(() => {
    return assetTypes.reduce((acc, curr) => {
      acc[curr.fullyQualifiedName || curr.name] = curr.displayName || curr.name;

      return acc;
    }, {} as Record<string, string>);
  }, [assetTypes]);

  // 同理转换资产目录
  const catalogMap = useMemo(() => {
    const map: Record<string, string> = {};
    const traverse = (nodes: any[]) => {
      nodes.forEach((n) => {
        if (n.type === 'catalog' && n.data) {
          map[n.data.fullyQualifiedName || n.data.name] =
            n.data.displayName || n.data.name;
        }
        if (n.children) {
          traverse(n.children);
        }
      });
    };
    traverse(treeData);

    return map;
  }, [treeData]);

  return (
    <PageLayoutV1 pageTitle={t('label.asset-overview')}>
      <ResizableLeftPanels
        className="content-height-with-resizable-panel"
        firstPanel={{
          className: 'content-resizable-panel-container',
          flex: 0.2,
          minWidth: 280,
          title: t('label.data-assets'),
          children: (
            <div className="p-x-sm h-full explore-tree">
              {isLoadingTree ? (
                <Loader />
              ) : treeError ? (
                <ErrorPlaceHolder
                  type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
                  onClick={fetchTreeData}
                />
              ) : treeData.length === 0 ? (
                <Empty description={t('label.no-catalogs-found')} />
              ) : (
                <Tree
                  blockNode
                  showIcon
                  expandedKeys={expandedKeys}
                  multiple={false}
                  switcherIcon={({ expanded }: { expanded: boolean }) =>
                    expanded ? <IconDown /> : <IconRight />
                  }
                  treeData={treeData as any}
                  onExpand={(keys) => setExpandedKeys(keys)}
                  onSelect={handleTreeSelect}
                />
              )}
            </div>
          ),
        }}
        secondPanel={{
          className: 'content-height-with-resizable-panel',
          flex: 0.8,
          minWidth: 800,
          children: (
            <div className="asset-overview-main-container">
              {/* 搜索和过滤器区域 */}
              <Row
                className="quick-filters-container"
                gutter={[20, 0]}
                wrap={false}>
                <Col span={24}>
                  <Card className="p-md card-padding-0 m-b-box">
                    <Row>
                      <Col className="searched-data-container w-full">
                        <Row gutter={[0, 8]} justify="space-between">
                          <Col>
                            <Space size="middle">
                              <Search
                                allowClear
                                placeholder={t('label.search-data-assets')}
                                prefix={<SearchIcon />}
                                style={{ width: 300 }}
                                onChange={(e) => handleSearch(e.target.value)}
                                onSearch={handleSearch}
                              />
                              <Select
                                allowClear
                                placeholder={t('label.filter-by-asset-type')}
                                style={{ width: 200 }}
                                value={selectedAssetType}
                                onChange={handleAssetTypeChange}>
                                {assetTypes.map((type) => (
                                  <Option
                                    key={type.id}
                                    value={
                                      type.fullyQualifiedName || type.name
                                    }>
                                    {type.displayName || type.name}
                                  </Option>
                                ))}
                              </Select>
                            </Space>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>

              {/* 数据展示区域 */}
              <Row
                className="explore-data-container"
                gutter={[20, 0]}
                wrap={false}>
                <Col flex="auto">
                  <Card className="h-full explore-main-card">
                    <div className="h-full">
                      {!isLoadingAssets && !assetsError ? (
                        dataAssets.length === 0 ? (
                          <div className="d-flex justify-center items-center h-full">
                            <Empty description={t('label.no-data-found')} />
                          </div>
                        ) : (
                          <div className="d-flex flex-col gap-4">
                            {dataAssets.map((record) => {
                              const assetTypeName =
                                typeof record.assetType === 'string'
                                  ? record.assetType
                                  : record.assetType?.fullyQualifiedName ||
                                    record.assetType?.name ||
                                    '';
                              const catalogName =
                                typeof record.catalog === 'string'
                                  ? record.catalog
                                  : record.catalog?.fullyQualifiedName ||
                                    record.catalog?.name ||
                                    '';

                              const displayAssetType = assetTypeName
                                ? assetTypeMap[assetTypeName] || assetTypeName
                                : '-';
                              const displayCatalog = catalogName
                                ? catalogMap[catalogName] || catalogName
                                : '-';

                              return (
                                <Card
                                  hoverable
                                  className={classNames(
                                    'data-asset-card m-b-md',
                                    {
                                      'highlight-card':
                                        selectedAsset?.id === record.id,
                                    }
                                  )}
                                  key={record.id}
                                  size="small"
                                  onClick={() => handleRowClick(record)}>
                                  <div className="d-flex flex-col gap-2 p-sm">
                                    <div>
                                      <Link
                                        className="text-lg font-medium text-link-color cursor-pointer"
                                        to={`/dataAsset/${
                                          record.fullyQualifiedName ??
                                          record.name
                                        }`}
                                        onClick={(e) => e.stopPropagation()}>
                                        {record.displayName || record.name}
                                      </Link>
                                    </div>
                                    <div className="text-sm text-grey-muted max-two-lines m-b-sm">
                                      {record.description || (
                                        <span className="text-italic">
                                          {t('label.no-description')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="d-flex items-center gap-2 m-t-xs">
                                      <span className="text-grey-muted text-xs">
                                        {t('label.asset-type')}:
                                      </span>
                                      <Tag color="geekblue">
                                        {displayAssetType}
                                      </Tag>

                                      <span className="text-grey-muted text-xs m-l-sm">
                                        {t('label.catalog')}:
                                      </span>
                                      <Tag color="cyan">{displayCatalog}</Tag>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}

                            {totalAssets > 0 && (
                              <div className="d-flex justify-center m-t-md p-b-md">
                                <Pagination
                                  showSizeChanger
                                  current={currentPage}
                                  pageSize={pageSize}
                                  pageSizeOptions={['10', '20', '50', '100']}
                                  showTotal={(total, range) =>
                                    t('label.showing-range-of-total', {
                                      start: range[0],
                                      end: range[1],
                                      total: total,
                                    })
                                  }
                                  total={totalAssets}
                                  onChange={handleTableChange}
                                />
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <>
                          {isLoadingAssets ? <Loader /> : <></>}
                          {assetsError ? (
                            <ErrorPlaceHolder
                              type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
                              onClick={fetchDataAssets}
                            />
                          ) : (
                            <></>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                </Col>

                {!isLoadingAssets && (
                  <Col className="explore-right-panel" flex="400px">
                    {selectedAsset ? (
                      <DataAssetDetailPanel selectedAsset={selectedAsset} />
                    ) : (
                      <Card className="h-full">
                        <div className="d-flex justify-center items-center h-full">
                          <Empty description={t('label.no-data-found')} />
                        </div>
                      </Card>
                    )}
                  </Col>
                )}
              </Row>
            </div>
          ),
        }}
      />
    </PageLayoutV1>
  );
};

export default AssetOverviewPage;
