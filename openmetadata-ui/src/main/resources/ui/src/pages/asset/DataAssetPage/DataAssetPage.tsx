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
    Tag,
    Tooltip,
    Upload
} from 'antd';
import { AxiosError } from 'axios';
import { Operation } from 'fast-json-patch';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ReactComponent as IconAssets
} from '../../../assets/svg/data-asset.svg';
import {
    ReactComponent as EditIcon
} from '../../../assets/svg/edit-new.svg';
import {
    ReactComponent as DeleteIcon
} from '../../../assets/svg/ic-delete.svg';
import {
    ReactComponent as DetailsIcon
} from '../../../assets/svg/edit-new.svg';
import {
    ReactComponent as SearchIcon
} from '../../../assets/svg/ic-search.svg';

import {
    UploadOutlined,
    DownloadOutlined
} from '@ant-design/icons';
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
} from '../../../rest/assetAPI';

import './data-asset-page.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

import { DataAsset } from '../../../generated/entity/data/asset/dataAsset';

const DataAssetPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const [isLoading, setIsLoading] = useState(true);
  const [dataAssets, setDataAssets] = useState<DataAsset[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string | undefined>();
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
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<DataAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);

  const fetchAssetTypes = useCallback(async () => {
    try {
      const response = await getAssetTypesList({ limit: 100 });
      setAssetTypes(response.data || []);
    } catch (err) {
      console.error('Failed to fetch asset types:', err);
    }
  }, []);

  const fetchCatalogs = useCallback(async () => {
    try {
      const response = await getAssetCatalogsList({ limit: 100 });
      setCatalogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch catalogs:', err);
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
  }, [fetchDataAssets, fetchAssetTypes, fetchCatalogs]);

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

  const handleViewDetails = (record: DataAsset) => {
    setSelectedAsset(record);
    setIsDetailModalVisible(true);
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
    } catch (error) {
      console.error('Export failed:', error);
      message.error(t('message.export-failed'));
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
      } catch (error) {
        console.error('Import failed:', error);
        message.error(t('message.import-failed'));
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
    form.setFieldsValue({
      name: record.name,
      displayName: record.displayName || '',
      description: record.description || '',
      assetType: record.assetType?.name,
      catalog: record.catalog?.name,
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
          await deleteDataAssetByName(record.name);
          await fetchDataAssets();
          message.success(t('message.entity-deleted-successfully'));
        } catch (error) {
          console.error('Delete failed:', error);
          message.error(t('message.delete-failed'));
        }
      },
    });
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      if (modalMode === 'create') {
        await createDataAsset({
          name: values.name,
          displayName: values.displayName,
          description: values.description,
          assetType: values.assetType,
          catalog: values.catalog,
        });
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

        if (patch.length > 0) {
          await patchDataAssetByName(selectedAssetForEdit.name, patch);
          message.success(t('message.entity-updated-successfully'));
        }
      }

      setIsFormModalVisible(false);
      form.resetFields();
      await fetchDataAssets();
    } catch (error) {
      console.error('Submit failed:', error);
      message.error(t('message.submit-failed'));
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
          <div className="font-bold">{record.displayName || text}</div>
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
          <Space size={4} wrap>
            {attributeValues.slice(0, 3).map((attr, index) => (
              <Tag key={index} color="default">
                {attr.name}: {String(attr.value)}
              </Tag>
            ))}
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
      width: 120,
      render: (_: any, record: DataAsset) => (
        <Space size="small">
          <Tooltip title={t('label.view-details')}>
            <Button
              icon={<DetailsIcon width="14px" />}
              size="small"
              type="text"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
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
              icon={<DeleteIcon width={16} height={16} />}
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
    <Row align="middle" gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Search
          allowClear
          placeholder={t('label.search-data-assets')}
          prefix={<SearchIcon />}
          style={{ width: '100%' }}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Select
          allowClear
          placeholder={t('label.filter-by-asset-type')}
          style={{ width: '100%' }}
          value={selectedAssetType}
          onChange={handleAssetTypeChange}
          loading={isLoading && assetTypes.length === 0}>
          {assetTypes.map((type) => (
            <Option key={type.id} value={type.name}>
              {type.displayName || type.name}
            </Option>
          ))}
        </Select>
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Select
          allowClear
          placeholder={t('label.filter-by-catalog')}
          style={{ width: '100%' }}
          value={selectedCatalog}
          onChange={handleCatalogChange}
          loading={isLoading && catalogs.length === 0}>
          {catalogs.map((catalog) => (
            <Option key={catalog.id} value={catalog.name}>
              {catalog.displayName || catalog.name}
            </Option>
          ))}
        </Select>
      </Col>
      <Col xs={24} sm={24} md={12} style={{ textAlign: 'right' }}>
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
    <PageLayoutV1 className="data-asset-page" pageTitle={t('label.data-assets-list')}>
      <div className="p-lg">
        {pageHeader}
        <div className="mt-md mb-md">{filtersBar}</div>

        {isLoading ? (
          <Loader />
        ) : error ? (
          <ErrorPlaceHolder
            type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
            onClick={fetchDataAssets}
          />
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

        {/* 资产详情模态框 */}
        <Modal
          title={selectedAsset?.displayName || selectedAsset?.name}
          open={isDetailModalVisible}
          onCancel={() => setIsDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
              {t('label.close')}
            </Button>,
          ]}
          width={800}
        >
          {selectedAsset && (
            <Card bordered={false}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <label className="block mb-sm font-semibold">
                    {t('label.name')}
                  </label>
                  <div>{selectedAsset.name}</div>
                </div>
                <div>
                  <label className="block mb-sm font-semibold">
                    {t('label.display-name')}
                  </label>
                  <div>{selectedAsset.displayName || '-'}</div>
                </div>
                <div>
                  <label className="block mb-sm font-semibold">
                    {t('label.description')}
                  </label>
                  <div>{selectedAsset.description || '-'}</div>
                </div>
                <div>
                  <label className="block mb-sm font-semibold">
                    {t('label.asset-type')}
                  </label>
                  <Tag color="geekblue">
                    {selectedAsset.assetType?.displayName ||
                      selectedAsset.assetType?.name ||
                      '-'}
                  </Tag>
                </div>
                <div>
                  <label className="block mb-sm font-semibold">
                    {t('label.catalog')}
                  </label>
                  <Tag color="green">
                    {selectedAsset.catalog?.displayName ||
                      selectedAsset.catalog?.name ||
                      '-'}
                  </Tag>
                </div>
                {selectedAsset.attributeValues &&
                  selectedAsset.attributeValues.length > 0 && (
                    <div>
                      <label className="block mb-sm font-semibold">
                        {t('label.attribute-values')}
                      </label>
                      <Space size={8} wrap>
                        {selectedAsset.attributeValues.map((attr, index) => (
                          <Tag key={index} color="blue">
                            <strong>{attr.name}:</strong> {String(attr.value)}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
              </Space>
            </Card>
          )}
        </Modal>

        {/* 添加/编辑资产表单Modal */}
        <Modal
          title={
            modalMode === 'create'
              ? t('label.add-entity', { entity: t('label.data-asset') })
              : t('label.edit-entity', { entity: t('label.data-asset') })
          }
          open={isFormModalVisible}
          onOk={handleSubmit}
          onCancel={() => {
            setIsFormModalVisible(false);
            form.resetFields();
          }}
          confirmLoading={isSubmitting}
          width={600}
        >
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
                  <Option key={type.id} value={type.name}>
                    {type.displayName || type.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label={t('label.catalog')} name="catalog">
              <Select
                placeholder={t('label.catalog')}
                allowClear>
                {catalogs.map((catalog) => (
                  <Option key={catalog.id} value={catalog.name}>
                    {catalog.displayName || catalog.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* 导入Modal */}
        <Modal
          title={t('label.import-data-assets')}
          open={isImportModalVisible}
          onOk={handleImportSubmit}
          onCancel={() => {
            setIsImportModalVisible(false);
            setUploadFileList([]);
          }}
          width={600}
        >
          <div className="mb-md">
            <p>{t('message.import-description')}</p>
          </div>
          <Dragger
            fileList={uploadFileList}
            onChange={handleUploadChange}
            beforeUpload={() => false}
            accept=".csv"
            maxCount={1}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">{t('message.click-or-drag-file-to-upload')}</p>
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
