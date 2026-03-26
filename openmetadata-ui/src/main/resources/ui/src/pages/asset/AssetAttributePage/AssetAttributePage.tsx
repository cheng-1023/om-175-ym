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
  Pagination,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Switch,
  Upload,
  Typography,
} from 'antd';
import type { UploadFile as AntUploadFile } from 'antd/lib/upload/interface';
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
import { PagingHandlerParams } from '../../../components/common/NextPrevious/NextPrevious.interface';
import Table from '../../../components/common/Table/Table';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { useEntityExportModalProvider } from '../../../components/Entity/EntityExportModalProvider/EntityExportModalProvider.component';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { ExportTypes } from '../../../constants/Export.constants';
import { PLACEHOLDER_ROUTE_FQN, ROUTES } from '../../../constants/constants';
import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import { Role } from '../../../generated/entity/teams/role';
import { Paging } from '../../../generated/type/paging';
import { usePaging } from '../../../hooks/paging/usePaging';
import {
  createAssetAttribute,
  deleteAssetAttributeByName,
  exportAssetAttributes,
  importAssetAttributes,
  getAssetAttributesList,
  patchAssetAttributeByName,
} from '../../../rest/assetAPI';
import { getRoles } from '../../../rest/rolesAPIV1';

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
  const [assetAttributes, setAssetAttributes] = useState<AssetAttribute[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    string | undefined
  >();
  const [error, setError] = useState<AxiosError | null>(null);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAttribute, setSelectedAttribute] =
    useState<AssetAttribute | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 导入 Modal 状态
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState<AntUploadFile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchAssetAttributes = useCallback(
    async (params?: Partial<Paging>) => {
      setLoadingMore(true);
      setError(null);
      try {
        const requestParams: Record<string, unknown> = {
          ...params,
          limit: pageSize,
          fields: 'assignableRoles',
        };
        if (selectedCategory) {
          requestParams.attributeCategory = selectedCategory;
        }
        if (searchText) {
          requestParams.nameSearch = searchText;
        }

        const response = await getAssetAttributesList(requestParams);
        setAssetAttributes(response.data || []);
        handlePagingChange(response.paging);
      } catch (err) {
        setError(err as AxiosError);
      } finally {
        setLoadingMore(false);
        setIsLoading(false);
      }
    },
    [pageSize, selectedCategory, searchText]
  );

  const fetchRoles = useCallback(async () => {
    try {
      const response = await getRoles('', undefined, undefined, false, 100);
      setRoles(response.data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  }, []);

  useEffect(() => {
    fetchAssetAttributes();
    fetchRoles();
  }, [fetchAssetAttributes, fetchRoles]);

  const onPageChange = useCallback(
    ({ cursorType, currentPage }: PagingHandlerParams) => {
      if (cursorType) {
        fetchAssetAttributes({ [cursorType]: paging[cursorType] });
        handlePageChange(currentPage);
      }
    },
    [paging, pageSize]
  );

  const handleSearch = (value: string) => {
    setSearchText(value.trim());
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
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
      assignableRoles: [],
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

  // 导入资产属性 — 打开导入弹窗
  const handleImport = useCallback(() => {
    setImportFileList([]);
    setImportResult(null);
    setIsImportModalVisible(true);
  }, []);

  // 处理导入提交
  const handleImportSubmit = useCallback(
    async (dryRun: boolean) => {
      if (importFileList.length === 0) {
        message.warning(t('message.select-csv-file'));

        return;
      }

      const file = importFileList[0].originFileObj;
      if (!file) {
        message.warning(t('message.select-csv-file'));

        return;
      }

      setIsImporting(true);
      setImportResult(null);
      try {
        const csvText = await file.text();
        const result = await importAssetAttributes(
          'assetAttributes',
          csvText,
          dryRun
        );

        if (dryRun) {
          // 预览模式：显示校验结果
          const successCount = result?.numberOfRowsPassed ?? 0;
          const failCount = result?.numberOfRowsFailed ?? 0;
          setImportResult(
            `${t('label.validation-result')}: ${successCount} ${t(
              'label.success-lowercase'
            )}, ${failCount} ${t('label.failed-lowercase')}`
          );
          if (failCount === 0 && successCount > 0) {
            message.success(t('message.validation-passed'));
          } else if (failCount > 0) {
            message.warning(t('message.validation-has-errors'));
          }
        } else {
          // 正式导入
          message.success(t('message.import-success'));
          setIsImportModalVisible(false);
          setImportFileList([]);
          setImportResult(null);
          await fetchAssetAttributes();
        }
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Import failed:', error);
        const errMsg =
          error.response?.data?.message || t('message.import-failed');
        message.error(errMsg);
      } finally {
        setIsImporting(false);
      }
    },
    [importFileList, t, fetchAssetAttributes]
  );

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
      assignableRoles: record.assignableRoles || [],
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
          message.success(t('message.entity-deleted-successfully', { entity: t('label.asset-attribute') }));
        } catch (error: any) {
          // eslint-disable-next-line no-console
          console.error('Delete failed:', error);
          const errMsg =
            error.response?.data?.message || t('message.delete-failed');
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
          assignableRoles: values.assignableRoles,
        });
        message.success(t('message.entity-created-successfully', { entity: t('label.asset-attribute') }));
      } else if (modalMode === 'edit' && selectedAttribute) {
        const updatedAttribute = {
          ...selectedAttribute,
          displayName: values.displayName,
          description: values.description,
          attributeCategory: values.attributeCategory,
          dataType: values.dataType,
          required: values.required,
          assignableRoles: values.assignableRoles,
        };
        const patch = compare(selectedAttribute, updatedAttribute);

        if (patch.length > 0) {
          await patchAssetAttributeByName(selectedAttribute.name, patch);
          message.success(t('message.entity-updated-successfully', { entity: t('label.asset-attribute') }));
        }
      }

      setIsModalVisible(false);
      form.resetFields();
      await fetchAssetAttributes();
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
      width: 200,
      render: (text: string, record: AssetAttribute) => (
        <Space direction="vertical" size={0}>
          <Link
            className="font-bold text-primary cursor-pointer"
            to={ROUTES.ASSET_ATTRIBUTE_DETAILS.replace(
              PLACEHOLDER_ROUTE_FQN,
              encodeURIComponent(record.fullyQualifiedName || record.name)
            )}>
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
      title: t('label.filler-personnel', '填写人员'),
      dataIndex: 'assignableRoles',
      key: 'assignableRoles',
      width: 150,
      render: (assignableRoles: string[]) => (
        <Space wrap size={[0, 4]}>
          {assignableRoles?.length > 0
            ? assignableRoles.map((roleName) => {
                const matchedRole = roles.find((r) => r.name === roleName);

                return (
                  <Tag key={roleName}>
                    {matchedRole?.displayName || roleName}
                  </Tag>
                );
              })
            : '-'}
        </Space>
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

  // 搜索已由后端处理，无需前端过滤

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
            customPaginationProps={{
              showPagination,
              currentPage,
              isLoading: loadingMore,
              pageSize,
              paging,
              pagingHandler: onPageChange,
              onShowSizeChange: handlePageSizeChange,
            }}
            dataSource={assetAttributes}
            loading={loadingMore}
            pagination={false}
            rowKey="id"
            size="small"
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
            <Form.Item
              label={t('label.filler-personnel', '填写人员')}
              name="assignableRoles"
              rules={[{ type: 'array' }]}>
              <Select
                mode="multiple"
                placeholder={t('label.select-roles', '请选择填写人员（角色）')}>
                {roles.map((role) => (
                  <Option key={role.name} value={role.name}>
                    {role.displayName || role.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* 导入资产属性 CSV Modal */}
        <Modal
          confirmLoading={isImporting}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setIsImportModalVisible(false);
                setImportFileList([]);
                setImportResult(null);
              }}>
              {t('label.cancel')}
            </Button>,
            <Button
              disabled={importFileList.length === 0}
              key="validate"
              loading={isImporting}
              onClick={() => handleImportSubmit(true)}>
              {t('label.validate')}
            </Button>,
            <Button
              disabled={importFileList.length === 0}
              key="import"
              loading={isImporting}
              type="primary"
              onClick={() => handleImportSubmit(false)}>
              {t('label.import')}
            </Button>,
          ]}
          open={isImportModalVisible}
          title={t('label.import-entity', {
            entity: t('label.asset-attribute'),
          })}
          width={600}
          onCancel={() => {
            setIsImportModalVisible(false);
            setImportFileList([]);
            setImportResult(null);
          }}>
          <Space className="w-full" direction="vertical" size="large">
            <Upload.Dragger
              accept=".csv"
              beforeUpload={() => false}
              fileList={importFileList}
              maxCount={1}
              onChange={({ fileList }) => {
                setImportFileList(fileList);
                setImportResult(null);
              }}
              onRemove={() => {
                setImportFileList([]);
                setImportResult(null);
              }}>
              <p className="ant-upload-text">{t('message.upload-csv-file')}</p>
              <p className="ant-upload-hint">
                {t('message.import-entity-help', {
                  entity: t('label.asset-attribute-plural'),
                })}
              </p>
            </Upload.Dragger>
            {importResult && (
              <Typography.Text type="secondary">{importResult}</Typography.Text>
            )}
          </Space>
        </Modal>
      </div>
    </PageLayoutV1>
  );
};

export default AssetAttributePage;
