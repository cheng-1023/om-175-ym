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
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Upload,
} from 'antd';
import { AxiosError } from 'axios';
import { Operation } from 'fast-json-patch';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory, useParams } from 'react-router-dom';
import { ReactComponent as IconAssets } from '../../../assets/svg/data-asset.svg';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';

import { ReactComponent as SearchIcon } from '../../../assets/svg/ic-search.svg';

import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import Icon, { LikeOutlined, DislikeOutlined } from '@ant-design/icons';
import { ReactComponent as VersionIcon } from '../../../assets/svg/ic-version.svg';
import { ReactComponent as IconDropdown } from '../../../assets/svg/menu.svg';
import { ManageButtonItemLabel } from '../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
import TabsLabel from '../../../components/common/TabsLabel/TabsLabel.component';
import { EntityHeader } from '../../../components/Entity/EntityHeader/EntityHeader.component';
import ResizablePanels from '../../../components/common/ResizablePanels/ResizablePanels';
import { COMMON_RESIZABLE_PANEL_CONFIG } from '../../../constants/ResizablePanel.constants';
import {
  BLACK_COLOR,
  DE_ACTIVE_COLOR,
} from '../../../constants/constants';
import { EntityType } from '../../../enums/entity.enum';

import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import {
  createDataAsset,
  deleteDataAssetByName,
  exportDataAssets,
  getAssetCatalogsList,
  getAssetTypesList,
  getDataAssetsList,
  importDataAssets,
  patchDataAssetByName,
  getAssetTypeByName,
  getAssetAttributesList,
} from '../../../rest/assetAPI';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';

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

import { DataAsset } from '../../../generated/entity/data/asset/dataAsset';

const DataAssetPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const { currentUser } = useApplicationStore();
  const history = useHistory();
  const { fqn: routeFqn } = useParams<{ fqn?: string }>();

  const [isLoading, setIsLoading] = useState(true);
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
  const [selectedAssetType, setSelectedAssetType] = useState<
    string | undefined
  >();
  const [selectedCatalog, setSelectedCatalog] = useState<string | undefined>();
  const [error, setError] = useState<AxiosError | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal 状态
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);
  const [selectedAssetForEdit, setSelectedAssetForEdit] =
    useState<DataAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);

  // 详情页动态属性状态
  const [detailDynamicAttributes, setDetailDynamicAttributes] = useState<AssetAttribute[]>([]);
  const [isEditValueModalVisible, setIsEditValueModalVisible] = useState(false);
  const [editingAttr, setEditingAttr] = useState<AssetAttribute | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);

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
      const response = await getAssetCatalogsList({ limit: 100 });
      setCatalogs(response.data || []);
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

  const fetchDataAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedAssetType, selectedCatalog]);

  useEffect(() => {
    fetchAssetTypes();
    fetchCatalogs();
    fetchDataAssets();
    fetchAssetAttributes();
  }, [fetchDataAssets, fetchAssetTypes, fetchCatalogs, fetchAssetAttributes]);

  useEffect(() => {
    if (routeFqn && dataAssets.length > 0 && !isLoading) {
      const decodedFqn = decodeURIComponent(routeFqn);
      const matchedAsset = dataAssets.find(
        (asset) =>
          asset.fullyQualifiedName === decodedFqn || asset.name === decodedFqn
      );
      if (
        matchedAsset &&
        (!selectedAsset || selectedAsset.id !== matchedAsset.id)
      ) {
        handleViewDetails(matchedAsset);
        setViewMode('detail');
      } else if (!matchedAsset) {
        setViewMode('list');
        setSelectedAsset(null);
      }
    } else if (!routeFqn) {
      setViewMode('list');
      setSelectedAsset(null);
    }
  }, [routeFqn, dataAssets, isLoading, selectedAsset]);

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

      return attr.assignableRoles.some((role: any) => userRoleNames.includes(role));
    },
    [currentUser]
  );

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleAssetTypeChange = (value: string) => {
    setSelectedAssetType(value);
    setCurrentPage(1);
  };

  const handleCatalogChange = (value: string) => {
    setSelectedCatalog(value);
    setCurrentPage(1);
  };

  const handleTableChange = (pagination: unknown) => {
    const page = (pagination as { current?: number })?.current || 1;
    const size = (pagination as { pageSize?: number })?.pageSize || 10;
    setCurrentPage(page);
    setPageSize(size);
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
      const errMsg = error.response?.data?.message || t('message.export-failed');
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
      try {
        const csvData = e.target?.result as string;
        const result: any = await importDataAssets('all', csvData, false);

        if (result.failedCount === 0) {
          message.success(
            t('message.import-successful-with-count', {
              count: result.successCount,
            })
          );
        } else {
          message.warning(
            t('message.import-partial-success', {
              success: result.successCount,
              failed: result.failedCount,
            })
          );
        }

        setIsImportModalVisible(false);
        setUploadFileList([]);
        await fetchDataAssets();
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Import failed:', error);
        const errMsg = error.response?.data?.message || t('message.import-failed');
        message.error(errMsg);
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
  const handleDelete = (record: DataAsset) => {
    Modal.confirm({
      title: t('label.delete-entity', { entity: t('label.data-asset') }),
      content: t('message.delete-confirmation', {
        name: record.displayName || record.name,
      }),
      okText: t('label.delete'),
      okType: 'danger',
      cancelText: t('label.cancel'),
      onOk: async () => {
        try {
          await deleteDataAssetByName(record.name, false, true);
          await fetchDataAssets();
          message.success(t('message.entity-deleted-successfully'));
          if (selectedAsset?.id === record.id) setSelectedAsset(null);
        } catch (error: any) {
          // eslint-disable-next-line no-console
          console.error('Delete failed:', error);
          const errMsg = error.response?.data?.message || t('message.delete-failed');
          message.error(errMsg);
        }
      },
    });
  };

  // 单个属性值行内提交
  const handleEditValueSubmit = async () => {
    if (!selectedAsset || !editingAttr) return;
    try {
      setIsSubmitting(true);
      const currentExtensions = selectedAsset.attributeValues || [];
      const newExtensions = currentExtensions.filter((a) => a.name !== editingAttr.name);
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
      setSelectedAsset(response.data || response);
      setIsEditValueModalVisible(false);
      setEditingAttr(null);
      setEditingValue(null);
      message.success(t('message.entity-updated-successfully'));
      await fetchDataAssets();
    } catch (e: any) {
      console.error(e);
      message.error(e.response?.data?.message || t('message.submit-failed'));
    } finally {
      setIsSubmitting(false);
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
        message.success(t('message.entity-created-successfully'));
      } else if (modalMode === 'edit' && selectedAssetForEdit) {
        const patch: Operation[] = [];

        if (values.displayName !== selectedAssetForEdit.displayName) {
          patch.push({
            op: 'replace',
            path: '/displayName',
            value: values.displayName,
          });
        }
        if (values.description !== selectedAssetForEdit.description) {
          patch.push({
            op: 'replace',
            path: '/description',
            value: values.description,
          });
        }
        if (values.extension && Object.keys(values.extension).length > 0) {
          patch.push({
            op: 'add',
            path: '/extension',
            value: values.extension,
          });
        }

        if (patch.length > 0) {
          await patchDataAssetByName(selectedAssetForEdit.name, patch);
          message.success(t('message.entity-updated-successfully'));
        }
      }

      setIsFormModalVisible(false);
      form.resetFields();
      await fetchDataAssets();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Submit failed:', error);
      const errMsg = error.response?.data?.message || t('message.submit-failed');
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
        <Tag color="green">{catalog?.displayName || catalog?.name || '-'}</Tag>
      ),
    },
    {
      title: t('label.attribute-values'),
      dataIndex: 'attributeValues',
      key: 'attributeValues',
      width: 200,
      ellipsis: true,
      render: (attributeValues: DataAsset['attributeValues']) => {
        if (!attributeValues || attributeValues.length === 0) {
          return '-';
        }

        return (
          <Space wrap size={4}>
            {attributeValues.slice(0, 3).map((attr, index) => {
              const displayVal =
                attr.value === undefined || attr.value === null
                  ? '-'
                  : String(attr.value);

              return (
                <Tag color="default" key={index}>
                  {attr.name}:{displayVal}
                </Tag>
              );
            })}
            {attributeValues.length > 3 && (
              <Tag color="default">+{attributeValues.length - 3}</Tag>
            )}
          </Space>
        );
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
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredAssets = dataAssets.filter((asset) => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();

      return (
        asset.name.toLowerCase().includes(searchLower) ||
        (asset.displayName || '').toLowerCase().includes(searchLower) ||
        (asset.description || '').toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

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
            <Option key={type.id} value={type.name}>
              {type.displayName || type.name}
            </Option>
          ))}
        </Select>
      </Col>
      <Col flex="180px">
        <Select
          allowClear
          loading={isLoading && catalogs.length === 0}
          placeholder={t('label.filter-by-catalog')}
          style={{ width: '100%' }}
          value={selectedCatalog}
          onChange={handleCatalogChange}>
          {catalogs.map((catalog) => (
            <Option key={catalog.id} value={catalog.name}>
              {catalog.displayName || catalog.name}
            </Option>
          ))}
        </Select>
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
    <PageLayoutV1
      className="data-asset-page"
      pageTitle={t('label.data-assets-list')}>
      <div className="p-lg">
        {viewMode === 'list' && pageHeader}
        {viewMode === 'list' && <div className="mt-md mb-md">{filtersBar}</div>}

        {isLoading ? (
          <Loader />
        ) : error ? (
          <ErrorPlaceHolder
            type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
            onClick={fetchDataAssets}
          />
        ) : viewMode === 'detail' && selectedAsset ? (
          <div className="data-asset-detail-view" style={{ background: '#fff', minHeight: '100%', borderRadius: '4px' }}>
            <Breadcrumb className="m-b-md">
              <Breadcrumb.Item>
                <a onClick={() => {
                  setViewMode('list');
                  setSelectedAsset(null);
                  history.push('/assets/data');
                }}>
                  {t('label.data-assets-list')}
                </a>
              </Breadcrumb.Item>
              <Breadcrumb.Item>{selectedAsset.displayName || selectedAsset.name}</Breadcrumb.Item>
            </Breadcrumb>
            {/* 详情区头部 */}
            <div className="flex justify-between items-start mb-md border-bottom p-b-md">
              <Space direction="vertical" size={2}>
                <h4 className="m-0 text-lg font-bold">{selectedAsset.displayName || selectedAsset.name}</h4>
                <span className="text-grey-muted">{selectedAsset.name}</span>
              </Space>
              <Space size="small">
                <Button
                  onClick={() => {
                    setViewMode('list');
                    setSelectedAsset(null);
                    history.push('/assets/data');
                  }}>
                  {t('label.close')}
                </Button>
              </Space>
            </div>
            
            {/* 动态 Tabs */}
            <Tabs
              className="tabs-new"
              defaultActiveKey={ATTRIBUTE_CATEGORIES[0].value}
              items={[
                ...ATTRIBUTE_CATEGORIES.map(category => {
                  const categoryAttrs = detailDynamicAttributes.filter(a => a.attributeCategory === category.value);
                  if (categoryAttrs.length === 0) return null;
                  
                  return {
                    key: category.value,
                    label: <TabsLabel id={category.value} name={t(category.label)} />,
                    children: (
                      <div className="p-t-md">
                        <Card size="small">
                          <Table
                            size="small"
                            pagination={false}
                            columns={[
                              { title: t('label.name'), dataIndex: 'name', key: 'name', width: '30%' },
                              { title: t('label.value'), dataIndex: 'value', key: 'value', render: (text, record: any) => text || '-' },
                              {
                                title: t('label.action-plural'),
                                key: 'action',
                                width: 60,
                                render: (text, record: any) => (
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<Icon component={DetailsIcon} />}
                                    onClick={() => {
                                      setEditingAttr(record._rawAttr);
                                      setEditingValue(record.value);
                                      setIsEditValueModalVisible(true);
                                    }}
                                  />
                                ),
                              }
                            ]}
                            dataSource={categoryAttrs.map(attr => {
                              const valObj = selectedAsset.attributeValues?.find(v => v.name === attr.name);
                              return {
                                key: attr.name,
                                name: attr.displayName || attr.name,
                                value: valObj ? String(valObj.value) : undefined,
                                _rawAttr: attr,
                              };
                            })}
                          />
                        </Card>
                      </div>
                    )
                  };
                }).filter(Boolean) as any[],
                {
                  key: 'activity',
                  label: <TabsLabel id="activity" name={t('label.activity-feed-plural')} />,
                  children: (
                    <div className="text-center p-lg">
                      <p className="text-grey-muted">{t('message.feature-coming-soon')}</p>
                    </div>
                  )
                }
              ]}
            />
          </div>
        ) : (
          <Table
            className="data-asset-table"
            columns={columns}
            dataSource={filteredAssets}
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
            rowKey="id"
            onChange={handleTableChange}
          />
        )}
        {/* 覆盖原 Modal */}
        {/* 添加/编辑扩展值 Modal */}
        <Modal
          title={t('label.edit-entity', { entity: editingAttr?.displayName || editingAttr?.name })}
          visible={isEditValueModalVisible}
          onOk={handleEditValueSubmit}
          onCancel={() => setIsEditValueModalVisible(false)}
          confirmLoading={isSubmitting}
        >
          <div className="m-b-sm">{t('label.field-data-type')}: {editingAttr?.dataType}</div>
          {editingAttr?.dataType === 'boolean' ? (
            <Select style={{ width: '100%' }} value={editingValue} onChange={setEditingValue} allowClear>
              <Option value={true}>{t('label.true')}</Option>
              <Option value={false}>{t('label.false')}</Option>
            </Select>
          ) : editingAttr?.dataType === 'text' ? (
            <TextArea value={editingValue} onChange={(e) => setEditingValue(e.target.value)} autoSize={{ minRows: 3 }} />
          ) : editingAttr?.dataType === 'number' ? (
            <Input type="number" value={editingValue} onChange={(e) => setEditingValue(Number(e.target.value))} />
          ) : (
            <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} />
          )}
        </Modal>

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
            <Form.Item label={t('label.description')} name="description">
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
              <Select placeholder={t('label.asset-type')}>
                {assetTypes.map((type) => (
                  <Option key={type.id} value={type.fullyQualifiedName || type.name}>
                    {type.displayName || type.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label={t('label.catalog')} name="catalog">
              <Select allowClear placeholder={t('label.catalog')}>
                {catalogs.map((catalog) => (
                  <Option key={catalog.id} value={catalog.fullyQualifiedName || catalog.name}>
                    {catalog.displayName || catalog.name}
                  </Option>
                ))}
              </Select>
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
                      name={['extension', attr.name]}
                      rules={[
                        {
                          required: attr.required,
                          message: t('message.field-text-is-required', {
                            fieldText: attr.displayName || attr.name,
                          }),
                        },
                      ]}>
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
      </div>
    </PageLayoutV1>
  );
};

export default DataAssetPage;
