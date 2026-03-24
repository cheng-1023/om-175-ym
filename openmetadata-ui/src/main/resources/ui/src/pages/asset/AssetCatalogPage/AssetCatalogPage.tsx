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

import { AxiosError } from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Card,
  Col,
  Descriptions,
  Dropdown,
  Form,
  Input,
  Menu,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { Operation } from 'fast-json-patch';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus-primary.svg';
import { ReactComponent as CatalogIcon } from '../../../assets/svg/catalog.svg';
import { ReactComponent as ExportIcon } from '../../../assets/svg/ic-export.svg';
import { ReactComponent as ImportIcon } from '../../../assets/svg/ic-import.svg';
import { ReactComponent as VersionIcon } from '../../../assets/svg/ic-version.svg';
import { ReactComponent as IconDropdown } from '../../../assets/svg/menu.svg';
import Icon, {
  LikeOutlined,
  DislikeOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { ManageButtonItemLabel } from '../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
import TabsLabel from '../../../components/common/TabsLabel/TabsLabel.component';
import ButtonGroup from 'antd/lib/button/button-group';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import ResizableLeftPanels from '../../../components/common/ResizablePanels/ResizableLeftPanels';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { useEntityExportModalProvider } from '../../../components/Entity/EntityExportModalProvider/EntityExportModalProvider.component';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { ExportTypes } from '../../../constants/Export.constants';
import {
  createAssetCatalog,
  createAssetCategory,
  deleteAssetCatalogByName,
  deleteAssetCategoryByName,
  exportAssetCategories,
  getAssetCategoriesList,
  getAssetCatalogsList,
  patchAssetCatalogByName,
  patchAssetCategoryByName,
} from '../../../rest/assetAPI';
import { AssetCategory } from '../../../generated/entity/data/asset/assetCategory';
import { AssetCatalog } from '../../../generated/entity/data/asset/assetCatalog';
import './asset-catalog-page.less';

const { TextArea } = Input;
const { Title, Text } = Typography;

const AssetCatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const { showModal } = useEntityExportModalProvider();
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 数据加载状态
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [categoriesError, setCategoriesError] = useState<AxiosError | null>(
    null
  );
  const [catalogsError, setCatalogsError] = useState<AxiosError | null>(null);

  // 数据状态
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<AssetCategory | null>(null);
  const [catalogs, setCatalogs] = useState<AssetCatalog[]>([]);

  // Modal 状态
  const [isCatalogModalVisible, setIsCatalogModalVisible] = useState(false);
  const [catalogModalMode, setCatalogModalMode] = useState<'create' | 'edit'>(
    'create'
  );
  const [selectedCatalog, setSelectedCatalog] = useState<AssetCatalog | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 资产分类Modal状态
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>(
    'create'
  );
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] =
    useState<AssetCategory | null>(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // 详情页状态
  const [activeTab, setActiveTab] = useState('overview');

  // 移动资产目录状态
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);
  const [moveCatalogTarget, setMoveCatalogTarget] = useState<string | null>(
    null
  );
  const [isMoveSubmitting, setIsMoveSubmitting] = useState(false);

  // 获取资产分类列表
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const response = await getAssetCategoriesList({
        fields: 'fullyQualifiedName',
        limit: 100,
      });
      const categoriesData = response.data || [];
      setCategories(categoriesData);

      // 默认选中第一个分类
      if (categoriesData.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesData[0]);
      }
    } catch (err) {
      setCategoriesError(err as AxiosError);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [selectedCategory]);

  // 获取选中分类或所有目录数据
  const fetchCatalogs = useCallback(async () => {
    setIsLoadingCatalogs(true);
    setCatalogsError(null);
    try {
      const response = await getAssetCatalogsList({
        fields: 'category,parent,fullyQualifiedName',
        limit: 1000,
      });
      setCatalogs(response.data || []);
    } catch (err) {
      setCatalogsError(err as AxiosError);
    } finally {
      setIsLoadingCatalogs(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchCatalogs();
  }, [fetchCategories, fetchCatalogs]);

  // 处理分类选择
  const handleCategorySelect = (info: { key: string }) => {
    const category = categories.find((c) => c.id === info.key);
    if (category) {
      setSelectedCategory(category);
      setSelectedCatalog(null);
    }
  };

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [entityToDelete, setEntityToDelete] = useState<{
    type: 'category' | 'catalog';
    data: any;
  } | null>(null);

  const triggerDelete = (type: 'category' | 'catalog', data: any) => {
    setEntityToDelete({ type, data });
    setDeleteConfirmText('');
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (!entityToDelete) {
      return;
    }
    const { type, data } = entityToDelete;
    try {
      if (type === 'category') {
        await deleteAssetCategoryByName(data.name, false, true);
        await fetchCategories();
        setSelectedCategory(null);
      } else {
        await deleteAssetCatalogByName(data.name, false, true);
        await fetchCatalogs();
        setSelectedCatalog(null);
      }
      message.success(
        t('message.entity-deleted-successfully', {
          entity: data.displayName || data.name,
        })
      );
    } catch (error: any) {
      console.error('Delete failed:', error);
      const errMsg =
        error.response?.data?.message || t('message.delete-failed');
      message.error(errMsg);
    } finally {
      setDeleteConfirmVisible(false);
      setEntityToDelete(null);
    }
  };

  // 添加资产目录
  const handleAddCatalog = () => {
    setCatalogModalMode('create');
    setSelectedCatalog(null);
    form.resetFields();
    setIsCatalogModalVisible(true);
  };

  // 编辑资产目录
  const handleEditCatalog = (catalog: AssetCatalog) => {
    setCatalogModalMode('edit');
    setSelectedCatalog(catalog);
    form.setFieldsValue({
      name: catalog.name,
      displayName: catalog.displayName || '',
      description: catalog.description || '',
    });
    setIsCatalogModalVisible(true);
  };

  // 删除资产目录
  const handleDeleteCatalog = (catalog: AssetCatalog) => {
    triggerDelete('catalog', catalog);
  };

  // 提交资产目录表单
  const handleCatalogSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      if (catalogModalMode === 'create') {
        const payload: any = {
          name: values.name,
          displayName: values.displayName,
          description: values.description,
          category:
            selectedCategory?.fullyQualifiedName ||
            selectedCategory?.name ||
            '',
        };
        // 如果当前选中了一个 Catalog，则新建的当做它的子分类
        if (selectedCatalog?.fullyQualifiedName || selectedCatalog?.name) {
          payload.parent =
            selectedCatalog.fullyQualifiedName || selectedCatalog.name;
        }

        await createAssetCatalog(payload);
        message.success(
          t('message.entity-created-successfully', {
            entity: values.displayName || values.name,
          })
        );
      } else if (catalogModalMode === 'edit' && selectedCatalog) {
        const patch: Operation[] = [];
        if (values.displayName !== selectedCatalog.displayName) {
          patch.push({
            op: 'replace',
            path: '/displayName',
            value: values.displayName,
          });
        }
        if (values.description !== selectedCatalog.description) {
          patch.push({
            op: 'replace',
            path: '/description',
            value: values.description,
          });
        }
        if (patch.length > 0) {
          await patchAssetCatalogByName(selectedCatalog.name, patch);
          message.success(
            t('message.entity-updated-successfully', {
              entity: values.displayName || values.name,
            })
          );
        }
      }

      setIsCatalogModalVisible(false);
      form.resetFields();
      await fetchCatalogs();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Submit failed:', error);
      const currentValues = form.getFieldsValue();
      const statusCode = error.response?.status;
      let errMsg = error.response?.data?.message || t('message.submit-failed');

      if (statusCode === 409) {
        errMsg =
          t('message.entity-already-exists', {
            entity: currentValues.displayName || currentValues.name,
          }) || errMsg;
      } else if (statusCode === 400) {
        errMsg = error.response?.data?.message || '校验失败，请检查填写内容';
      }

      message.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 更改父级目录
  const handleMoveCatalogSubmit = async () => {
    if (!selectedCatalog) {
      return;
    }
    try {
      setIsMoveSubmitting(true);
      // parent字段如果在根下面可以设置为null，在其他目录下面设置为对象的引用
      // TODO: OpenMetadata 后端 API 可以支持 JSON Patch 修改 parent（如果支持），实际需依赖确切后端逻辑，这里暂以最常见 patch 方式处理
      const patch: Operation[] = [
        {
          op: moveCatalogTarget
            ? selectedCatalog.parent
              ? 'replace'
              : 'add'
            : 'remove',
          path: '/parent',
          value: moveCatalogTarget
            ? { id: moveCatalogTarget, type: 'assetCatalog' }
            : null,
        },
      ];
      await patchAssetCatalogByName(selectedCatalog.name, patch);
      message.success(
        t('message.entity-updated-successfully', {
          entity: selectedCatalog.displayName || selectedCatalog.name,
        })
      );
      setIsMoveModalVisible(false);
      setMoveCatalogTarget(null);
      await fetchCatalogs();
    } catch (error: any) {
      console.error('Move failed:', error);
      message.error(
        error.response?.data?.message || t('message.submit-failed')
      );
    } finally {
      setIsMoveSubmitting(false);
    }
  };

  // 添加资产分类
  const handleAddCategory = () => {
    setCategoryModalMode('create');
    setSelectedCategoryForEdit(null);
    categoryForm.resetFields();
    setIsCategoryModalVisible(true);
  };

  // 编辑资产分类
  const handleEditCategory = () => {
    if (!selectedCategory) {
      return;
    }
    setCategoryModalMode('edit');
    setSelectedCategoryForEdit(selectedCategory);
    categoryForm.setFieldsValue({
      name: selectedCategory.name,
      displayName: selectedCategory.displayName || '',
      description: selectedCategory.description || '',
    });
    setIsCategoryModalVisible(true);
  };

  // 删除资产分类
  const handleDeleteCategory = () => {
    if (selectedCategory) {
      triggerDelete('category', selectedCategory);
    }
  };

  // 提交资产分类表单
  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields();
      setIsCategorySubmitting(true);

      if (categoryModalMode === 'create') {
        await createAssetCategory({
          name: values.name,
          displayName: values.displayName,
          description: values.description,
        });
        message.success(
          t('message.entity-created-successfully', {
            entity: values.displayName || values.name,
          })
        );
      } else if (categoryModalMode === 'edit' && selectedCategoryForEdit) {
        const patch: Operation[] = [];
        if (values.displayName !== selectedCategoryForEdit.displayName) {
          patch.push({
            op: 'replace',
            path: '/displayName',
            value: values.displayName,
          });
        }
        if (values.description !== selectedCategoryForEdit.description) {
          patch.push({
            op: 'replace',
            path: '/description',
            value: values.description,
          });
        }
        if (patch.length > 0) {
          await patchAssetCategoryByName(selectedCategoryForEdit.name, patch);
          message.success(
            t('message.entity-updated-successfully', {
              entity: values.displayName || values.name,
            })
          );
        }
      }

      setIsCategoryModalVisible(false);
      categoryForm.resetFields();
      await fetchCategories();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Category submit failed:', error);
      const errMsg =
        error.response?.data?.message || t('message.submit-failed');
      message.error(errMsg);
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  // 导出资产目录 — 使用 EntityExportModalProvider 通用导出组件
  const handleExportCatalogs = useCallback(() => {
    if (selectedCategory) {
      showModal({
        name: selectedCategory.fullyQualifiedName || selectedCategory.name,
        onExport: exportAssetCategories,
        exportTypes: [ExportTypes.CSV],
      });
    }
  }, [selectedCategory, showModal]);

  // 导入资产目录 — 暂未注册 ResourceEntity，临时提示即将上线
  const handleImportCatalogs = useCallback(() => {
    message.info(t('message.feature-coming-soon'));
  }, []);

  // 生成左侧分类菜单数据
  const categoryMenuItems = useMemo(() => {
    return categories.map((category) => ({
      key: category.id || '',
      label: category.displayName || category.name,
      icon: <CatalogIcon style={{ width: '16px', height: '16px' }} />,
    }));
  }, [categories]);

  // 资产目录表格列定义
  const catalogColumns = [
    {
      title: t('label.name'),
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string, record: AssetCatalog) => (
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
      title: t('label.hierarchy-level'),
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (level: number) => (
        <Tag color="blue">
          {t('label.level')} {level}
        </Tag>
      ),
    },
    {
      title: t('label.order'),
      dataIndex: 'order',
      key: 'order',
      width: 100,
      render: (order: number) => order || '-',
    },
    {
      title: t('label.asset-count'),
      dataIndex: 'assetCount',
      key: 'assetCount',
      width: 100,
      render: (count: number) => count ?? 0,
    },
    {
      title: t('label.action'),
      key: 'action',
      width: 120,
      render: (_: any, record: AssetCatalog) => (
        <Space size="small">
          <Button
            icon={<EditIcon className="table-action-icon" />}
            size="small"
            type="text"
            onClick={() => handleEditCatalog(record)}
          />
          <Button
            danger
            icon={<DeleteIcon height={16} width={16} />}
            size="small"
            type="text"
            onClick={() => handleDeleteCatalog(record)}
          />
        </Space>
      ),
    },
  ];

  const activeNode = selectedCatalog || selectedCategory;

  return (
    <PageLayoutV1 pageTitle={t('label.asset-catalog-management')}>
      <ResizableLeftPanels
        className="content-height-with-resizable-panel"
        firstPanel={{
          className: 'content-resizable-panel-container',
          flex: 0.2,
          minWidth: 280,
          title: t('label.asset-category-plural'),
          children: (
            <div className="p-x-sm">
              <Button
                block
                className="text-primary mb-md"
                data-testid="add-asset-category"
                onClick={handleAddCategory}>
                <div className="flex-center">
                  <PlusIcon className="anticon m-r-xss" />
                  {t('label.add-asset-category')}
                </div>
              </Button>

              {isLoadingCategories ? (
                <Loader />
              ) : categoriesError ? (
                <ErrorPlaceHolder
                  type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
                  onClick={fetchCategories}
                />
              ) : categories.length === 0 ? (
                <div className="text-center p-lg">
                  <p className="text-grey-muted">
                    {t('label.no-categories-found')}
                  </p>
                </div>
              ) : (
                <Menu
                  className="p-t-xs"
                  items={categoryMenuItems}
                  mode="inline"
                  selectedKeys={
                    selectedCategory?.id ? [selectedCategory.id] : []
                  }
                  onClick={handleCategorySelect}
                />
              )}
            </div>
          ),
        }}
        secondPanel={{
          className: 'content-resizable-panel-container',
          flex: 0.8,
          minWidth: 800,
          children: (
            <div className="p-lg">
              {activeNode ? (
                <>
                  {/* 头部区域 - 对齐 GlossaryHeader 布局 */}
                  <div className="glossary-header flex gap-4 justify-between no-wrap p-b-md">
                    <div className="flex w-min-0 flex-auto">
                      <Space direction="vertical" size={0}>
                        <Title className="m-0" level={4}>
                          {activeNode.displayName || activeNode.name}
                        </Title>
                        <Text type="secondary">{activeNode.description}</Text>
                      </Space>
                    </div>
                    <div className="flex items-center">
                      <div className="d-flex gap-3 justify-end">
                        {/* 添加下拉按钮 */}
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'add-catalog',
                                label: t('label.asset-catalog'),
                                onClick: handleAddCatalog,
                              },
                              {
                                key: 'add-data-asset',
                                label: t('label.data-asset'),
                                onClick: () =>
                                  message.info(
                                    t('message.feature-coming-soon')
                                  ),
                              },
                            ],
                          }}
                          trigger={['click']}>
                          <Button className="m-l-xs" type="primary">
                            {t('label.add')} <DownOutlined />
                          </Button>
                        </Dropdown>

                        <ButtonGroup className="spaced" size="small">
                          {/* 点赞/点踩 - coming soon */}
                          <Tooltip title={t('label.like')}>
                            <Button
                              icon={<LikeOutlined />}
                              onClick={() =>
                                message.info(t('message.feature-coming-soon'))
                              }
                            />
                          </Tooltip>
                          <Tooltip title={t('label.dis-like')}>
                            <Button
                              icon={<DislikeOutlined />}
                              onClick={() =>
                                message.info(t('message.feature-coming-soon'))
                              }
                            />
                          </Tooltip>

                          {/* 版本历史 */}
                          <Tooltip title={t('label.version-plural-history')}>
                            <Button
                              icon={<Icon component={VersionIcon} />}
                              onClick={() =>
                                message.info(t('message.feature-coming-soon'))
                              }>
                              <Typography.Text>0.1</Typography.Text>
                            </Button>
                          </Tooltip>

                          {/* 管理按钮 */}
                          <Dropdown
                            align={{ targetOffset: [-12, 0] }}
                            className="m-l-xs"
                            menu={{
                              items: [
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t(
                                        'message.export-entity-help',
                                        {
                                          entity: t(
                                            'label.asset-catalog-plural'
                                          ),
                                        }
                                      )}
                                      icon={ExportIcon}
                                      id="export-button"
                                      name={t('label.export')}
                                    />
                                  ),
                                  key: 'export-button',
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    handleExportCatalogs();
                                  },
                                },
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t(
                                        'message.import-entity-help',
                                        {
                                          entity: t('label.asset-catalog'),
                                        }
                                      )}
                                      icon={ImportIcon}
                                      id="import-button"
                                      name={t('label.import')}
                                    />
                                  ),
                                  key: 'import-button',
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    handleImportCatalogs();
                                  },
                                },
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t('message.rename-entity', {
                                        entity: t(
                                          selectedCatalog
                                            ? 'label.asset-catalog'
                                            : 'label.asset-category'
                                        ),
                                      })}
                                      icon={EditIcon}
                                      id="rename-button"
                                      name={t('label.rename')}
                                    />
                                  ),
                                  key: 'rename-button',
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    if (selectedCatalog) {
                                      handleEditCatalog(selectedCatalog);
                                    } else {
                                      handleEditCategory();
                                    }
                                  },
                                },
                                ...(selectedCatalog
                                  ? [
                                      {
                                        label: (
                                          <ManageButtonItemLabel
                                            description={t(
                                              'message.edit-entity',
                                              {
                                                entity: t(
                                                  'label.parent-entity',
                                                  {
                                                    entity: t(
                                                      'label.asset-catalog'
                                                    ),
                                                  }
                                                ),
                                              }
                                            )}
                                            icon={EditIcon}
                                            id="move-button"
                                            name={t('label.change-entity', {
                                              entity: t('label.parent'),
                                            })}
                                          />
                                        ),
                                        key: 'move-button',
                                        onClick: (e: any) => {
                                          e.domEvent.stopPropagation();
                                          setIsMoveModalVisible(true);
                                        },
                                      },
                                    ]
                                  : []),
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t(
                                        'message.delete-entity-type-action-description',
                                        {
                                          entityType: t(
                                            selectedCatalog
                                              ? 'label.asset-catalog'
                                              : 'label.asset-category'
                                          ),
                                        }
                                      )}
                                      icon={DeleteIcon}
                                      id="delete-button"
                                      name={t('label.delete')}
                                    />
                                  ),
                                  key: 'delete-button',
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    if (selectedCatalog) {
                                      handleDeleteCatalog(selectedCatalog);
                                    } else {
                                      handleDeleteCategory();
                                    }
                                  },
                                },
                              ],
                            }}
                            overlayClassName="glossary-manage-dropdown-list-container"
                            overlayStyle={{ width: '350px' }}
                            placement="bottomRight"
                            trigger={['click']}>
                            <Tooltip
                              placement="topRight"
                              title={t('label.manage-entity', {
                                entity: t('label.asset-category'),
                              })}>
                              <Button
                                className="glossary-manage-dropdown-button"
                                data-testid="manage-button"
                                icon={
                                  <IconDropdown
                                    className="vertical-align-inherit manage-dropdown-icon"
                                    height={16}
                                    width={16}
                                  />
                                }
                              />
                            </Tooltip>
                          </Dropdown>
                        </ButtonGroup>
                      </div>
                    </div>
                  </div>

                  {/* Tab 页 */}
                  <Tabs
                    activeKey={activeTab}
                    className="tabs-new"
                    items={[
                      {
                        key: 'overview',
                        label: (
                          <TabsLabel id="overview" name={t('label.overview')} />
                        ),
                        children: (
                          <Row className="m-t-md p-x-md" gutter={[16, 16]}>
                            <Col span={24}>
                              <Card title={t('label.detail-plural')}>
                                <Descriptions
                                  bordered
                                  column={2}
                                  labelStyle={{
                                    fontWeight: 600,
                                    width: '200px',
                                  }}
                                  size="middle">
                                  <Descriptions.Item label={t('label.name')}>
                                    {activeNode.name}
                                  </Descriptions.Item>
                                  <Descriptions.Item
                                    label={t('label.display-name')}>
                                    {activeNode.displayName || '-'}
                                  </Descriptions.Item>
                                  <Descriptions.Item
                                    label={t('label.description')}
                                    span={2}>
                                    {activeNode.description || '-'}
                                  </Descriptions.Item>
                                  {selectedCatalog && (
                                    <>
                                      <Descriptions.Item
                                        label={t('label.hierarchy-level')}>
                                        {selectedCatalog.level ?? '-'}
                                      </Descriptions.Item>
                                      <Descriptions.Item
                                        label={t('label.asset-count')}>
                                        {selectedCatalog.assetCount ?? 0}
                                      </Descriptions.Item>
                                    </>
                                  )}
                                </Descriptions>
                              </Card>
                            </Col>
                          </Row>
                        ),
                      },
                      {
                        key: 'catalogs',
                        label: (
                          <TabsLabel
                            count={
                              selectedCatalog
                                ? catalogs.filter(
                                    (c) => c.parent?.id === selectedCatalog.id
                                  ).length
                                : catalogs.filter(
                                    (c) =>
                                      c.category?.id === selectedCategory?.id &&
                                      !c.parent
                                  ).length
                            }
                            id="catalogs"
                            name={t('label.asset-catalog-plural')}
                          />
                        ),
                        children: (
                          <div className="p-t-md">
                            {isLoadingCatalogs ? (
                              <Loader />
                            ) : catalogsError ? (
                              <ErrorPlaceHolder
                                type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
                                onClick={fetchCatalogs}
                              />
                            ) : (
                              <Table
                                columns={catalogColumns}
                                dataSource={
                                  selectedCatalog
                                    ? catalogs.filter(
                                        (c) =>
                                          c.parent?.id === selectedCatalog.id
                                      )
                                    : catalogs.filter(
                                        (c) =>
                                          c.category?.id ===
                                            selectedCategory?.id && !c.parent
                                      )
                                }
                                pagination={{
                                  pageSize: 10,
                                  showSizeChanger: true,
                                  showTotal: (total) =>
                                    t('label.total-items', { count: total }),
                                }}
                                rowKey="id"
                                size="small"
                              />
                            )}
                          </div>
                        ),
                      },
                      {
                        key: 'assets',
                        label: (
                          <TabsLabel
                            id="assets"
                            name={t('label.data-asset-plural')}
                          />
                        ),
                        children: (
                          <div className="text-center p-lg">
                            <p className="text-grey-muted">
                              {/* // TODO: Fetch data assets inside this catalog and its descendants */}
                              {t('message.feature-coming-soon')}
                            </p>
                          </div>
                        ),
                      },
                      {
                        key: 'activity',
                        label: (
                          <TabsLabel
                            id="activity"
                            name={t('label.activity-feed-plural')}
                          />
                        ),
                        children: (
                          <div className="text-center p-lg">
                            <p className="text-grey-muted">
                              {t('message.feature-coming-soon')}
                            </p>
                          </div>
                        ),
                      },
                    ]}
                    onChange={(k) => setActiveTab(k)}
                  />
                </>
              ) : (
                <Card>
                  <div className="text-center p-lg">
                    <p className="text-grey-muted">
                      {t('label.select-category-view-details')}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          ),
        }}
      />

      {/* 资产目录编辑/创建 Modal */}
      <Modal
        confirmLoading={isSubmitting}
        title={
          catalogModalMode === 'create'
            ? t('label.add-entity', { entity: t('label.asset-catalog') })
            : t('label.edit-entity', { entity: t('label.asset-catalog') })
        }
        visible={isCatalogModalVisible}
        width={600}
        onCancel={() => {
          setIsCatalogModalVisible(false);
          form.resetFields();
        }}
        onOk={handleCatalogSubmit}>
        <Form form={form} layout="vertical">
          <Form.Item
            label={t('label.name')}
            name="name"
            rules={[
              {
                required: true,
                message: t('message.field-text-is-required', {
                  fieldText: t('label.name'),
                }),
              },
              {
                pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                message: t('label.invalid-name'),
              },
            ]}>
            <Input
              disabled={catalogModalMode === 'edit'}
              placeholder={t('label.name')}
            />
          </Form.Item>
          <Form.Item
            label={t('label.display-name')}
            name="displayName"
            rules={[
              {
                required: true,
                message: t('message.field-text-is-required', {
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
                message: t('message.field-text-is-required', {
                  fieldText: t('label.description'),
                }),
              },
            ]}>
            <TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('label.description')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 资产分类编辑/创建 Modal */}
      <Modal
        confirmLoading={isCategorySubmitting}
        title={
          categoryModalMode === 'create'
            ? t('label.add-asset-category')
            : t('label.edit-asset-category')
        }
        visible={isCategoryModalVisible}
        width={600}
        onCancel={() => {
          setIsCategoryModalVisible(false);
          categoryForm.resetFields();
        }}
        onOk={handleCategorySubmit}>
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            label={t('label.name')}
            name="name"
            rules={[
              {
                required: true,
                message: t('message.field-text-is-required', {
                  fieldText: t('label.name'),
                }),
              },
              {
                pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                message: t('label.invalid-name'),
              },
            ]}>
            <Input
              disabled={categoryModalMode === 'edit'}
              placeholder={t('label.name')}
            />
          </Form.Item>
          <Form.Item
            label={t('label.display-name')}
            name="displayName"
            rules={[
              {
                required: true,
                message: t('message.field-text-is-required', {
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
                message: t('message.field-text-is-required', {
                  fieldText: t('label.description'),
                }),
              },
            ]}>
            <TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('label.description')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除资产确认 Modal 防呆保护 */}
      <Modal
        footer={[
          <Button key="cancel" onClick={() => setDeleteConfirmVisible(false)}>
            {t('label.cancel')}
          </Button>,
          <Button
            danger
            disabled={deleteConfirmText !== 'DELETE'}
            key="submit"
            type="primary"
            onClick={executeDelete}>
            {t('label.delete')}
          </Button>,
        ]}
        title={t('label.delete-entity', {
          entity: t(
            entityToDelete?.type === 'catalog'
              ? 'label.asset-catalog'
              : 'label.asset-category'
          ),
        })}
        visible={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}>
        <p>
          {t('message.delete-confirmation', {
            entity:
              entityToDelete?.data?.displayName ||
              entityToDelete?.data?.name ||
              '',
          })}
        </p>
        <p className="m-t-md">
          To confirm deletion, type <strong>DELETE</strong> below:
        </p>
        <Input
          className="m-t-xs"
          placeholder="DELETE"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
        />
      </Modal>

      {/* 更改父级目录 Modal */}
      <Modal
        confirmLoading={isMoveSubmitting}
        title={t('label.change-entity', { entity: t('label.parent') })}
        visible={isMoveModalVisible}
        onCancel={() => setIsMoveModalVisible(false)}
        onOk={handleMoveCatalogSubmit}>
        <div className="m-b-sm">{t('message.move-catalog-description')}</div>
        <Form layout="vertical">
          <Form.Item label={t('label.parent-catalog')}>
            <Select
              allowClear
              options={catalogs
                .filter((c) => c.id !== selectedCatalog?.id) // 不能移动到自己内部等，简化起见跳过自身
                .map((c) => ({
                  label: c.displayName || c.name,
                  value: c.id,
                }))}
              placeholder={t('label.select-parent-catalog')}
              value={moveCatalogTarget}
              onChange={setMoveCatalogTarget}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayoutV1>
  );
};

export default AssetCatalogPage;
