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
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tree,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as SearchIcon } from '../../../assets/svg/ic-search.svg';
import {
  ReactComponent as CatalogIcon
} from '../../../assets/svg/catalog.svg';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import ResizableLeftPanels from '../../../components/common/ResizablePanels/ResizableLeftPanels';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { getAssetCategoriesList, getAssetCatalogsList, getAssetTypesList, getDataAssetsList } from '../../../rest/assetAPI';
import { DataAsset } from '../../../generated/entity/data/asset/dataAsset';
import { AssetCategory } from '../../../generated/entity/data/asset/assetCategory';
import { AssetCatalog } from '../../../generated/entity/data/asset/assetCatalog';
import { AssetType } from '../../../generated/entity/data/asset/assetType';
import './asset-overview-page.less';

const { Search } = Input;
const { Option } = Select;
const { DirectoryTree } = Tree;

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
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);

  // 筛选状态
  const [selectedAssetType, setSelectedAssetType] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [selectedCatalog, setSelectedCatalog] = useState<string | undefined>();

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 获取树形数据
  const fetchTreeData = useCallback(async () => {
    setIsLoadingTree(true);
    setTreeError(null);
    try {
      const [categoriesResponse, catalogsResponse] = await Promise.all([
        getAssetCategoriesList({ limit: 100 }),
        getAssetCatalogsList({ limit: 1000 })
      ]);

      const categories = categoriesResponse.data || [];
      const catalogs = catalogsResponse.data || [];

      // 构建树形结构
      const nodes: TreeNode[] = categories.map((category: AssetCategory) => ({
        title: (
          <Space>
            <span className="font-semibold">{category.displayName || category.name}</span>
            <Badge count={category.catalogCount || 0} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        ),
        key: `category-${category.id}`,
        icon: <CatalogIcon style={{ width: '16px', height: '16px' }} />,
        type: 'category',
        data: category,
        isLeaf: false,
        children: catalogs
          .filter((catalog: AssetCatalog) => catalog.category?.id === category.id)
          .map((catalog: AssetCatalog) => ({
            title: (
              <Space>
                <span>{catalog.displayName || catalog.name}</span>
                {catalog.assetCount !== undefined && (
                  <Badge count={catalog.assetCount} style={{ backgroundColor: '#1890ff' }} />
                )}
              </Space>
            ),
            key: `catalog-${catalog.id}`,
            type: 'catalog',
            data: catalog,
            isLeaf: true,
          }))
      }));

      setTreeData(nodes);
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

  // 获取数据资产列表
  const fetchDataAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    setAssetsError(null);
    try {
      const params: Record<string, unknown> = {
        limit: pageSize,
        page: currentPage,
      };

      if (selectedAssetType) {
        params.assetType = selectedAssetType;
      }

      if (selectedCatalog) {
        params.catalog = selectedCatalog;
      }

      const response = await getDataAssetsList(params);
      setDataAssets(response.data || []);

      // 如果有选中的资产且列表不为空,默认选中第一个
      if (!selectedAsset && response.data && response.data.length > 0) {
        setSelectedAsset(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch data assets:', err);
      setAssetsError(err as Error);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [currentPage, pageSize, selectedAssetType, selectedCatalog, selectedAsset]);

  useEffect(() => {
    fetchTreeData();
    fetchAssetTypes();
  }, [fetchTreeData, fetchAssetTypes]);

  useEffect(() => {
    fetchDataAssets();
  }, [fetchDataAssets]);

  // 树节点点击事件
  const handleTreeSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const node = info.node;

      if (node.type === 'catalog') {
        setSelectedCatalog((node.data as AssetCatalog).name);
        setCurrentPage(1);
      } else {
        setSelectedCatalog(undefined);
        setCurrentPage(1);
      }
    } else {
      setSelectedCatalog(undefined);
      setCurrentPage(1);
    }
  }, []);

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
  }, []);

  // 资产类型改变
  const handleAssetTypeChange = useCallback((value: string | undefined) => {
    setSelectedAssetType(value);
    setCurrentPage(1);
  }, []);

  // 分页改变
  const handleTableChange = useCallback((pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);

  // 资产行点击事件
  const handleRowClick = useCallback((record: DataAsset) => {
    setSelectedAsset(record);
  }, []);

  // 过滤后的资产列表
  const filteredAssets = useMemo(() => {
    if (!searchText) {
      return dataAssets;
    }

    const searchLower = searchText.toLowerCase();
    return dataAssets.filter((asset) =>
      asset.name.toLowerCase().includes(searchLower) ||
      (asset.displayName || '').toLowerCase().includes(searchLower) ||
      (asset.description || '').toLowerCase().includes(searchLower)
    );
  }, [dataAssets, searchText]);

  // 表格列定义
  const columns = useMemo(() => [
    {
      title: t('label.name'),
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string, record: DataAsset) => (
        <Space direction="vertical" size={0}>
          <div className="font-bold text-blue-600 cursor-pointer hover:text-blue-800">
            {record.displayName || text}
          </div>
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
      render: (assetType: DataAsset['assetType']) => (
        <Tag color="geekblue">
          {assetType?.displayName || assetType?.name || '-'}
        </Tag>
      ),
    },
    {
      title: t('label.catalog'),
      dataIndex: 'catalog',
      key: 'catalog',
      width: 150,
      render: (catalog: DataAsset['catalog']) => (
        <Tag color="green">
          {catalog?.displayName || catalog?.name || '-'}
        </Tag>
      ),
    },
  ], [t]);

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
            <div className="p-x-sm">
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
                <DirectoryTree
                  multiple={false}
                  defaultExpandAll
                  onSelect={handleTreeSelect}
                  treeData={treeData}
                  showIcon
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
              <Row className="quick-filters-container" gutter={[20, 0]} wrap={false}>
                <Col span={24}>
                  <Card className="p-md card-padding-0 m-b-box">
                    <Row>
                      <Col className="searched-data-container w-full">
                        <Row gutter={[0, 8]}>
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
                                onChange={handleAssetTypeChange}
                              >
                                {assetTypes.map((type) => (
                                  <Option key={type.id} value={type.name}>
                                    {type.displayName || type.name}
                                  </Option>
                                ))}
                              </Select>
                              <Button type="primary" onClick={() => message.info(t('message.feature-coming-soon'))}>
                                {t('label.advanced-search')}
                              </Button>
                            </Space>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>

              {/* 数据展示区域 */}
              <Row className="asset-data-container" gutter={[20, 0]} wrap={false}>
                <Col flex="auto">
                  <Card className="h-full explore-main-card">
                    <div className="h-full">
                      {!isLoadingAssets && !assetsError ? (
                        <Table
                          columns={columns}
                          dataSource={filteredAssets}
                          rowKey="id"
                          pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            total: filteredAssets.length,
                            showSizeChanger: true,
                            showTotal: (total, range) =>
                              t('label.showing-range-of-total', {
                                start: range[0],
                                end: range[1],
                                total: total,
                              }),
                            pageSizeOptions: ['10', '20', '50', '100'],
                          }}
                          onChange={handleTableChange}
                          onRow={(record) => ({
                            onClick: () => handleRowClick(record),
                            style: {
                              cursor: 'pointer',
                              backgroundColor: selectedAsset?.id === record.id ? '#e6f7ff' : undefined,
                            },
                          })}
                          size="small"
                        />
                      ) : (
                        <>
                          {isLoadingAssets ? <Loader /> : <></>}
                          {assetsError ? (
                            <ErrorPlaceHolder
                              type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
                              onClick={fetchDataAssets}
                            />
                          ) : <></>}
                        </>
                      )}
                    </div>
                  </Card>
                </Col>

                {selectedAsset && !isLoadingAssets && (
                  <Col flex="0.4">
                    <Card className="h-full" title={t('label.asset-overview')}>
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                          <label className="block mb-sm font-semibold text-grey-muted">
                            {t('label.name')}
                          </label>
                          <div className="text-lg">{selectedAsset.name}</div>
                        </div>
                        {selectedAsset.displayName && (
                          <div>
                            <label className="block mb-sm font-semibold text-grey-muted">
                              {t('label.display-name')}
                            </label>
                            <div>{selectedAsset.displayName}</div>
                          </div>
                        )}
                        {selectedAsset.description && (
                          <div>
                            <label className="block mb-sm font-semibold text-grey-muted">
                              {t('label.description')}
                            </label>
                            <div>{selectedAsset.description}</div>
                          </div>
                        )}
                        {selectedAsset.assetType && (
                          <div>
                            <label className="block mb-sm font-semibold text-grey-muted">
                              {t('label.asset-type')}
                            </label>
                            <Tag color="geekblue">
                              {selectedAsset.assetType.displayName || selectedAsset.assetType.name}
                            </Tag>
                          </div>
                        )}
                        {selectedAsset.catalog && (
                          <div>
                            <label className="block mb-sm font-semibold text-grey-muted">
                              {t('label.catalog')}
                            </label>
                            <Tag color="green">
                              {selectedAsset.catalog.displayName || selectedAsset.catalog.name}
                            </Tag>
                          </div>
                        )}
                        {selectedAsset.attributeValues && selectedAsset.attributeValues.length > 0 && (
                          <div>
                            <label className="block mb-sm font-semibold text-grey-muted">
                              {t('label.attribute-values')}
                            </label>
                            <Space size={8} wrap>
                              {selectedAsset.attributeValues.map((attr, index) => (
                                <Tag key={index} color="blue">
                                  <strong>{attr.name}:</strong> {attr.value}
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        )}
                      </Space>
                    </Card>
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
