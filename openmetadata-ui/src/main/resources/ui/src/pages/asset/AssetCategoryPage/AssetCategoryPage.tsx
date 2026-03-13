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
  Input,
  message,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import { AxiosError } from 'axios';
import { Operation } from 'fast-json-patch';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus.svg';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import {
  createAssetCategory,
  deleteAssetCategoryByName,
  getAssetCategoriesList,
  patchAssetCategoryByName,
} from '../../../rest/assetAPI';

import { AssetCategory } from '../../../generated/entity/data/asset/assetCategory';
import './asset-category-page.less';

const { TextArea } = Input;

interface AssetCategoryFormData {
  name: string;
  displayName: string;
  description: string;
}

const AssetCategoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useApplicationStore();

  const [isLoading, setIsLoading] = useState(true);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [searchText] = useState('');
  const [error, setError] = useState<AxiosError | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] =
    useState<AssetCategory | null>(null);
  const [formData, setFormData] = useState<AssetCategoryFormData>({
    name: '',
    displayName: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssetCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        limit: pageSize,
        page: currentPage,
      };

      const response = await getAssetCategoriesList(params);
      setAssetCategories(response.data || []);
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchAssetCategories();
  }, [fetchAssetCategories]);

  const handleTableChange = (pagination: unknown) => {
    const page = (pagination as { current?: number })?.current || 1;
    const size = (pagination as { pageSize?: number })?.pageSize || 10;
    setCurrentPage(page);
    setPageSize(size);
  };

  const handleAdd = () => {
    setModalMode('create');
    setFormData({ name: '', displayName: '', description: '' });
    setIsModalVisible(true);
  };

  const handleEdit = (record: AssetCategory) => {
    setModalMode('edit');
    setSelectedCategory(record);
    setFormData({
      name: record.name,
      displayName: record.displayName || '',
      description: record.description || '',
    });
    setIsModalVisible(true);
  };

  const handleDelete = (record: AssetCategory) => {
    Modal.confirm({
      title: t('label.delete-entity', { entity: t('label.asset-category') }),
      content: t('message.delete-confirmation', {
        entity: record.displayName || record.name,
      }),
      okText: t('label.delete'),
      okType: 'danger',
      cancelText: t('label.cancel'),
      onOk: async () => {
        try {
          await deleteAssetCategoryByName(record.name, false, true);
          await fetchAssetCategories();
          message.success(
            t('message.entity-deleted-successfully', {
              entity: record.displayName || record.name,
            })
          );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Delete failed:', error);
          message.error(t('message.delete-failed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    if (!formData.description?.trim()) {
      message.warning(
        t('message.field-text-required', { fieldText: t('label.description') })
      );

      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createAssetCategory({
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description,
          owners: currentUser
            ? [{ id: currentUser.id, type: 'user', name: currentUser.name }]
            : [],
        });
        message.success(
          t('message.entity-created-successfully', {
            entity: formData.displayName || formData.name,
          })
        );
      } else if (modalMode === 'edit' && selectedCategory) {
        const patch: Operation[] = [];
        if (formData.displayName !== selectedCategory.displayName) {
          patch.push({
            op: 'replace',
            path: '/displayName',
            value: formData.displayName,
          });
        }
        if (formData.description !== selectedCategory.description) {
          patch.push({
            op: 'replace',
            path: '/description',
            value: formData.description,
          });
        }
        if (patch.length > 0) {
          await patchAssetCategoryByName(selectedCategory.name, patch);
          message.success(
            t('message.entity-updated-successfully', {
              entity: formData.displayName || formData.name,
            })
          );
        }
      }

      setIsModalVisible(false);
      await fetchAssetCategories();
    } catch (error) {
      // eslint-disable-next-line no-console
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
      width: 200,
      render: (text: string, record: AssetCategory) => (
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
      title: t('label.catalog-count'),
      dataIndex: 'catalogCount',
      key: 'catalogCount',
      width: 100,
      render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
    },
    {
      title: t('label.action-plural'),
      key: 'actions',
      width: 100,
      render: (_text: string, record: AssetCategory) => (
        <Space size="middle">
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

  const filteredCategories = assetCategories.filter((category) => {
    if (searchText) {
      const searchLower = searchText.toLowerCase();

      return (
        category.name.toLowerCase().includes(searchLower) ||
        (category.displayName || '').toLowerCase().includes(searchLower) ||
        (category.description || '').toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const pageHeader = (
    <Row align="middle" gutter={[16, 16]} justify="space-between">
      <Col span={24}>
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <h2 className="text-xl font-semibold m-0">
            {t('label.asset-category-management')}
          </h2>
          <p className="text-sm text-grey-muted m-0">
            {t('label.asset-category-management-desc')}
          </p>
        </Space>
      </Col>
    </Row>
  );

  const filtersBar = (
    <Row align="middle" gutter={[16, 16]} justify="space-between">
      <Col md={18} xs={24}>
        <Button
          icon={<PlusIcon height={16} width={16} />}
          type="primary"
          onClick={handleAdd}>
          {t('label.add-entity', { entity: t('label.asset-category') })}
        </Button>
      </Col>
    </Row>
  );

  return (
    <PageLayoutV1
      className="asset-category-page"
      pageTitle={t('label.asset-category-management')}>
      <div className="p-lg">
        {pageHeader}
        <div className="mt-md mb-md">{filtersBar}</div>

        {isLoading ? (
          <Loader />
        ) : error ? (
          <ErrorPlaceHolder
            type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
            onClick={fetchAssetCategories}
          />
        ) : (
          <Table
            className="asset-category-table"
            columns={columns}
            dataSource={filteredCategories}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredCategories.length,
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
              ? t('label.add-entity', { entity: t('label.asset-category') })
              : t('label.edit-entity', { entity: t('label.asset-category') })
          }
          width={600}
          onCancel={() => setIsModalVisible(false)}
          onOk={handleSubmit}>
          <Card bordered={false}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <label className="block mb-sm font-semibold">
                  {t('label.name')} <span className="text-red-500">*</span>
                </label>
                <Input
                  disabled={modalMode === 'edit'}
                  placeholder={t('label.name')}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block mb-sm font-semibold">
                  {t('label.display-name')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t('label.display-name')}
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block mb-sm font-semibold">
                  {t('label.description')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <TextArea
                  placeholder={t('label.description')}
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </Space>
          </Card>
        </Modal>
      </div>
    </PageLayoutV1>
  );
};

export default AssetCategoryPage;
