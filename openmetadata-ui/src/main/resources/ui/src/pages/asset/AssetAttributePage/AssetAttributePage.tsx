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
  Switch,
} from 'antd';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, Link } from 'react-router-dom';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as IconAssets } from '../../../assets/svg/data-asset.svg';
import { ReactComponent as SearchIcon } from '../../../assets/svg/ic-search.svg';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { useEntityExportModalProvider } from '../../../components/Entity/EntityExportModalProvider/EntityExportModalProvider.component';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { ExportTypes } from '../../../constants/Export.constants';
import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import {
  createAssetAttribute,
  deleteAssetAttributeByName,
  exportAssetAttributes,
  getAssetAttributesList,
  patchAssetAttributeByName,
} from '../../../rest/assetAPI';

import './asset-page.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const ATTRIBUTE_CATEGORIES = [
  { value: 'basic', label: 'label.asset-attribute-category-basic' },
  { value: 'technical', label: 'label.asset-attribute-category-technical' },
  { value: 'business', label: 'label.asset-attribute-category-business' },
  { value: 'quality', label: 'label.asset-attribute-category-quality' },
  { value: 'security', label: 'label.asset-attribute-category-security' },
];

const DATA_TYPES = [
  { value: 'string', label: 'label.asset-data-type-string' },
  { value: 'number', label: 'label.asset-data-type-number' },
  { value: 'date', label: 'label.asset-data-type-date' },
  { value: 'boolean', label: 'label.asset-data-type-boolean' },
  { value: 'text', label: 'label.asset-data-type-text' },
  { value: 'array', label: 'label.asset-data-type-array' },
];

const AssetAttributePage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { showModal } = useEntityExportModalProvider();
  const [form] = Form.useForm();

  const [isLoading, setIsLoading] = useState(true);
  const [assetAttributes, setAssetAttributes] = useState<AssetAttribute[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    string | undefined
  >();
  const [error, setError] = useState<AxiosError | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAttribute, setSelectedAttribute] =
    useState<AssetAttribute | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssetAttributes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        limit: pageSize,
        page: currentPage,
      };
      if (selectedCategory) {
        params.attributeCategory = selectedCategory;
      }

      const response = await getAssetAttributesList(params);
      setAssetAttributes(response.data || []);
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedCategory]);

  useEffect(() => {
    fetchAssetAttributes();
  }, [fetchAssetAttributes]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1); // 重置到第一页
  };

  const handleTableChange = (pagination: unknown) => {
    const page = (pagination as { current?: number })?.current || 1;
    const size = (pagination as { pageSize?: number })?.pageSize || 10;
    setCurrentPage(page);
    setPageSize(size);
  };

  // 添加属性
  const handleAdd = () => {
    setModalMode('create');
    setSelectedAttribute(null);
    form.resetFields();
    form.setFieldsValue({
      attributeCategory: 'basic',
      dataType: 'string',
      required: false,
    });
    setIsModalVisible(true);
  };

  // 导出资产属性 — 使用 EntityExportModalProvider 通用导出组件
  const handleExport = useCallback(() => {
    showModal({
      name: 'assetAttributes',
      onExport: exportAssetAttributes,
      exportTypes: [ExportTypes.CSV],
    });
  }, [showModal]);

  // 导入资产属性 — 跳转到导入页面
  const handleImport = useCallback(() => {
    history.push('/assetAttributes/import');
  }, [history]);

  // 编辑属性
  const handleEdit = (record: AssetAttribute) => {
    setModalMode('edit');
    setSelectedAttribute(record);
    form.setFieldsValue({
      name: record.name,
      displayName: record.displayName || '',
      description: record.description || '',
      attributeCategory: record.attributeCategory,
      dataType: record.dataType,
      required: record.required || false,
    });
    setIsModalVisible(true);
  };

  // 删除属性
  const handleDelete = (record: AssetAttribute) => {
    Modal.confirm({
      title: t('label.delete-entity', { entity: t('label.asset-attribute') }),
      content: t('message.delete-confirmation', {
        name: record.displayName || record.name,
      }),
      okText: t('label.delete'),
      okType: 'danger',
      cancelText: t('label.cancel'),
      onOk: async () => {
        try {
          await deleteAssetAttributeByName(record.name, false, true);
          await fetchAssetAttributes();
          message.success(t('message.entity-deleted-successfully'));
        } catch (error: any) {
          // eslint-disable-next-line no-console
          console.error('Delete failed:', error);
          const errMsg = error.response?.data?.message || t('message.delete-failed');
          message.error(errMsg);
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
        await createAssetAttribute({
          name: values.name,
          displayName: values.displayName,
          description: values.description,
          attributeCategory: values.attributeCategory,
          dataType: values.dataType,
          required: values.required,
        });
        message.success(t('message.entity-created-successfully'));
      } else if (modalMode === 'edit' && selectedAttribute) {
        const updatedAttribute = {
          ...selectedAttribute,
          displayName: values.displayName,
          description: values.description,
          attributeCategory: values.attributeCategory,
          dataType: values.dataType,
          required: values.required,
        };
        const patch = compare(selectedAttribute, updatedAttribute);

        if (patch.length > 0) {
          await patchAssetAttributeByName(selectedAttribute.name, patch);
          message.success(t('message.entity-updated-successfully'));
        }
      }

      setIsModalVisible(false);
      form.resetFields();
      await fetchAssetAttributes();
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
      width: 200,
      render: (text: string, record: AssetAttribute) => (
        <Space direction="vertical" size={0}>
          <Link
            className="font-bold text-primary cursor-pointer"
            to={`/assets/attributes/${encodeURIComponent(
              record.fullyQualifiedName || record.name
            )}`}>
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
      title: t('label.asset-attribute-category'),
      dataIndex: 'attributeCategory',
      key: 'attributeCategory',
      width: 120,
      render: (category: string) => {
        const categoryInfo = ATTRIBUTE_CATEGORIES.find(
          (c) => c.value === category
        );

        return <Tag>{t(categoryInfo?.label || category)}</Tag>;
      },
    },
    {
      title: t('label.field-data-type'),
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (type: string) => {
        const typeInfo = DATA_TYPES.find((d) => d.value === type);

        return <Tag color="blue">{t(typeInfo?.label || type)}</Tag>;
      },
    },
    {
      title: t('label.required'),
      dataIndex: 'required',
      key: 'required',
      width: 80,
      render: (required: boolean) => (
        <Tag
          color={required ? undefined : 'default'}
          style={
            required
              ? {
                  color: '#cf1322',
                  background: '#fff1f0',
                  borderColor: '#ffa39e',
                }
              : undefined
          }>
          {required
            ? t('label.asset-attribute-required')
            : t('label.asset-attribute-optional')}
        </Tag>
      ),
    },
    {
      title: t('label.action-plural'),
      key: 'actions',
      width: 120,
      render: (_: any, record: AssetAttribute) => (
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

  const filteredAttributes = assetAttributes.filter((attr) => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();

      return (
        attr.name.toLowerCase().includes(searchLower) ||
        (attr.displayName || '').toLowerCase().includes(searchLower) ||
        (attr.description || '').toLowerCase().includes(searchLower)
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
              {t('label.asset-attribute-management')}
            </h2>
          </div>
          <p className="text-sm text-grey-muted m-0">
            {t('label.asset-attribute-management-desc')}
          </p>
        </Space>
      </Col>
    </Row>
  );

  const filtersBar = (
    <Row align="middle" gutter={[16, 16]}>
      <Col md={8} sm={12} xs={24}>
        <Search
          allowClear
          placeholder={t('label.search-asset-attributes')}
          prefix={<SearchIcon />}
          style={{ width: '100%' }}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
      </Col>
      <Col md={6} sm={12} xs={24}>
        <Select
          allowClear
          placeholder={t('label.filter-attribute-category')}
          style={{ width: '100%' }}
          value={selectedCategory}
          onChange={handleCategoryChange}>
          {ATTRIBUTE_CATEGORIES.map((cat) => (
            <Option key={cat.value} value={cat.value}>
              {t(cat.label)}
            </Option>
          ))}
        </Select>
      </Col>
      <Col md={10} sm={24} style={{ textAlign: 'right' }} xs={24}>
        <Space>
          <Button type="primary" onClick={handleAdd}>
            {t('label.add-entity', { entity: t('label.asset-attribute') })}
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
      className="asset-attribute-page"
      pageTitle={t('label.asset-attribute-management')}>
      <div className="p-lg">
        {pageHeader}
        <div className="mt-md mb-md">{filtersBar}</div>

        {isLoading ? (
          <Loader />
        ) : error ? (
          <ErrorPlaceHolder
            type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
            onClick={fetchAssetAttributes}
          />
        ) : (
          <Table
            className="asset-attribute-table"
            columns={columns}
            dataSource={filteredAttributes}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredAttributes.length,
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

        <Modal
          confirmLoading={isSubmitting}
          open={isModalVisible}
          title={
            modalMode === 'create'
              ? t('label.add-entity', { entity: t('label.asset-attribute') })
              : t('label.edit-entity', { entity: t('label.asset-attribute') })
          }
          width={600}
          onCancel={() => {
            setIsModalVisible(false);
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
              label={t('label.asset-attribute-category')}
              name="attributeCategory"
              rules={[
                {
                  required: true,
                  message: t('message.field-text-required', {
                    fieldText: t('label.asset-attribute-category'),
                  }),
                },
              ]}>
              <Select placeholder={t('label.asset-attribute-category')}>
                {ATTRIBUTE_CATEGORIES.map((cat) => (
                  <Option key={cat.value} value={cat.value}>
                    {t(cat.label)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label={t('label.field-data-type')}
              name="dataType"
              rules={[
                {
                  required: true,
                  message: t('message.field-text-required', {
                    fieldText: t('label.field-data-type'),
                  }),
                },
              ]}>
              <Select placeholder={t('label.field-data-type')}>
                {DATA_TYPES.map((type) => (
                  <Option key={type.value} value={type.value}>
                    {t(type.label)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label={t('label.required')}
              name="required"
              valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageLayoutV1>
  );
};

export default AssetAttributePage;
