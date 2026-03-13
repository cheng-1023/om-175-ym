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
import { useHistory } from 'react-router-dom';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Menu,
  message,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { Operation } from 'fast-json-patch';
import {
  ReactComponent as EditIcon,
} from '../../../assets/svg/edit-new.svg';
import {
  ReactComponent as DeleteIcon,
} from '../../../assets/svg/ic-delete.svg';
import {
  ReactComponent as PlusIcon,
} from '../../../assets/svg/plus-primary.svg';
import {
  ReactComponent as CatalogIcon,
} from '../../../assets/svg/catalog.svg';
import {
  ReactComponent as ExportIcon,
} from '../../../assets/svg/ic-export.svg';
import {
  ReactComponent as ImportIcon,
} from '../../../assets/svg/ic-import.svg';
import {
  ReactComponent as VersionIcon,
} from '../../../assets/svg/ic-version.svg';
import {
  ReactComponent as IconDropdown,
} from '../../../assets/svg/menu.svg';
import Icon, {
  LikeOutlined,
  DislikeOutlined,
} from '@ant-design/icons';
import { ManageButtonItemLabel } from '../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
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
  const history = useHistory();
  const { showModal } = useEntityExportModalProvider();
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 数据加载状态
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [categoriesError, setCategoriesError] = useState<AxiosError | null>(null);
  const [catalogsError, setCatalogsError] = useState<AxiosError | null>(null);

  // 数据状态
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [catalogs, setCatalogs] = useState<AssetCatalog[]>([]);

  // Modal 状态
  const [isCatalogModalVisible, setIsCatalogModalVisible] = useState(false);
  const [catalogModalMode, setCatalogModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCatalog, setSelectedCatalog] = useState<AssetCatalog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 资产分类Modal状态
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<AssetCategory | null>(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // 获取资产分类列表
  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const response = await getAssetCategoriesList({ limit: 100 });
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

  // 获取选中分类的资产目录列表
  const fetchCatalogs = useCallback(async () => {
    if (!selectedCategory) return;

    setIsLoadingCatalogs(true);
    setCatalogsError(null);
    try {
      const response = await getAssetCatalogsList({ limit: 1000 });
      const allCatalogs = response.data || [];

      // 筛选出属于当前分类的目录
      const filteredCatalogs = allCatalogs.filter(
        (catalog) => catalog.category?.id === selectedCategory.id
      );

      setCatalogs(filteredCatalogs);
    } catch (err) {
      setCatalogsError(err as AxiosError);
    } finally {
      setIsLoadingCatalogs(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  // 处理分类选择
  const handleCategoryClick = useCallback((category: AssetCategory) => {
    setSelectedCategory(category);
  }, []);

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
    Modal.confirm({
      title: t('label.delete-entity', { entity: t('label.asset-catalog') }),
      content: t('message.delete-confirmation', {
        name: catalog.displayName || catalog.name,
      }),
      okText: t('label.delete'),
      okType: 'danger',
      cancelText: t('label.cancel'),
      onOk: async () => {
        try {
          await deleteAssetCatalogByName(catalog.name);
          await fetchCatalogs();
          message.success(t('message.entity-deleted-successfully'));
        } catch (error) {
          console.error('Delete failed:', error);
          message.error(t('message.delete-failed'));
        }
      },
    });
  };

  // 提交资产目录表单
  const handleCatalogSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      if (catalogModalMode === 'create') {
        await createAssetCatalog({
          name: values.name,
          displayName: values.displayName,
          description: values.description,
          category: selectedCategory?.id || '',
        });
        message.success(t('message.entity-created-successfully'));
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
          message.success(t('message.entity-updated-successfully'));
        }
      }

      setIsCatalogModalVisible(false);
      form.resetFields();
      await fetchCatalogs();
    } catch (error) {
      console.error('Submit failed:', error);
      message.error(t('message.submit-failed'));
    } finally {
      setIsSubmitting(false);
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
    if (!selectedCategory) return;
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
    if (!selectedCategory) return;

    Modal.confirm({
      title: t('label.delete-entity', { entity: t('label.asset-category') }),
      content: t('message.delete-confirmation', {
        name: selectedCategory.displayName || selectedCategory.name,
      }),
      okText: t('label.delete'),
      okType: 'danger',
      cancelText: t('label.cancel'),
      onOk: async () => {
        try {
          await deleteAssetCategoryByName(selectedCategory.name);
          await fetchCategories();
          setSelectedCategory(null);
          message.success(t('message.entity-deleted-successfully'));
        } catch (error) {
          console.error('Delete category failed:', error);
          message.error(t('message.delete-failed'));
        }
      },
    });
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
        message.success(t('message.entity-created-successfully'));
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
          message.success(t('message.entity-updated-successfully'));
        }
      }

      setIsCategoryModalVisible(false);
      categoryForm.resetFields();
      await fetchCategories();
    } catch (error) {
      console.error('Category submit failed:', error);
      message.error(t('message.submit-failed'));
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

  // 导入资产目录 — 跳转到通用导入页面
  const handleImportCatalogs = useCallback(() => {
    if (selectedCategory) {
      // 使用标准的导入路由：/asset-catalogs/{fqn}/import
      const fqn = selectedCategory.fullyQualifiedName || selectedCategory.name;
      history.push(`/assetCatalogs/${encodeURIComponent(fqn)}/import`);
    }
  }, [selectedCategory, history]);

  // 左侧面板菜单项
  const menuItems: ItemType[] = useMemo(() => {
    return categories.map((category) => ({
      key: category.id,
      label: category.displayName || category.name,
      icon: <CatalogIcon style={{ width: '16px', height: '16px' }} />,
    }));
  }, [categories]);

  const selectedMenuKey = selectedCategory?.id || categories[0]?.id || '';

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
      render: (level: number) => <Tag color="blue">Level {level}</Tag>,
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
            icon={<DeleteIcon width={16} height={16} />}
            size="small"
            type="text"
            onClick={() => handleDeleteCatalog(record)}
          />
        </Space>
      ),
    },
  ];

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
                  <p className="text-grey-muted">{t('label.no-categories-found')}</p>
                </div>
              ) : (
                <Menu
                  className="custom-menu"
                  mode="inline"
                  selectedKeys={[selectedMenuKey]}
                  items={menuItems}
                  onClick={(item) => {
                    const category = categories.find((c) => c.id === item.key);
                    if (category) {
                      handleCategoryClick(category);
                    }
                  }}
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
              {selectedCategory ? (
                <>
                  {/* 头部区域 - 对齐 GlossaryHeader 布局 */}
                  <div className="glossary-header flex gap-4 justify-between no-wrap p-b-md">
                    <div className="flex w-min-0 flex-auto">
                      <Space direction="vertical" size={0}>
                        <Title level={4} className="m-0">
                          {selectedCategory.displayName || selectedCategory.name}
                        </Title>
                        <Text type="secondary">{selectedCategory.description}</Text>
                      </Space>
                    </div>
                    <div className="flex items-center">
                      <div className="d-flex gap-3 justify-end">
                        {/* 添加资产目录按钮 */}
                        <Button
                          className="m-l-xs"
                          type="primary"
                          onClick={handleAddCatalog}>
                          {t('label.add-entity', { entity: t('label.asset-catalog') })}
                        </Button>

                        <ButtonGroup className="spaced" size="small">
                          {/* 点赞/点踩 - coming soon */}
                          <Tooltip title={t('label.like')}>
                            <Button
                              icon={<LikeOutlined />}
                              onClick={() => message.info(t('message.feature-coming-soon'))}
                            />
                          </Tooltip>
                          <Tooltip title={t('label.dis-like')}>
                            <Button
                              icon={<DislikeOutlined />}
                              onClick={() => message.info(t('message.feature-coming-soon'))}
                            />
                          </Tooltip>

                          {/* 版本历史 */}
                          <Tooltip title={t('label.version-plural-history')}>
                            <Button
                              icon={<Icon component={VersionIcon} />}
                              onClick={() => message.info(t('message.feature-coming-soon'))}>
                              <Typography.Text>{'0.1'}</Typography.Text>
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
                                      description={t('message.export-entity-help', {
                                        entity: t('label.asset-catalog-plural'),
                                      })}
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
                                      description={t('message.import-entity-help', {
                                        entity: t('label.asset-catalog'),
                                      })}
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
                                        entity: t('label.asset-category'),
                                      })}
                                      icon={EditIcon}
                                      id="rename-button"
                                      name={t('label.rename')}
                                    />
                                  ),
                                  key: 'rename-button',
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    handleEditCategory();
                                  },
                                },
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t('message.delete-entity-type-action-description', {
                                        entityType: t('label.asset-category'),
                                      })}
                                      icon={DeleteIcon}
                                      id="delete-button"
                                      name={t('label.delete')}
                                    />
                                  ),
                                  key: 'delete-button',
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    handleDeleteCategory();
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
                    defaultActiveKey="catalogs"
                    items={[
                      {
                        key: 'catalogs',
                        label: `${t('label.asset-catalog-plural')} (${catalogs.length})`,
                        children: (
                          <div>
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
                                dataSource={catalogs}
                                rowKey="id"
                                pagination={{
                                  pageSize: 10,
                                  showSizeChanger: true,
                                  showTotal: (total) =>
                                    t('label.total-items', { count: total }),
                                }}
                                size="small"
                              />
                            )}
                          </div>
                        ),
                      },
                      {
                        key: 'activity',
                        label: t('label.activity-feed-plural'),
                        children: (
                          <div className="text-center p-lg">
                            <p className="text-grey-muted">{t('message.feature-coming-soon')}</p>
                          </div>
                        ),
                      },
                    ]}
                  />
                </>
              ) : (
                <Card>
                  <div className="text-center p-lg">
                    <p className="text-grey-muted">{t('label.select-category-view-details')}</p>
                  </div>
                </Card>
              )}
            </div>
          ),
        }}
      />

      {/* 资产目录编辑/创建 Modal */}
      <Modal
        title={
          catalogModalMode === 'create'
            ? t('label.add-entity', { entity: t('label.asset-catalog') })
            : t('label.edit-entity', { entity: t('label.asset-catalog') })
        }
        open={isCatalogModalVisible}
        onOk={handleCatalogSubmit}
        onCancel={() => {
          setIsCatalogModalVisible(false);
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
          <Form.Item label={t('label.description')} name="description">
            <TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('label.description')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 资产分类编辑/创建 Modal */}
      <Modal
        title={
          categoryModalMode === 'create'
            ? t('label.add-asset-category')
            : t('label.edit-asset-category')
        }
        open={isCategoryModalVisible}
        onOk={handleCategorySubmit}
        onCancel={() => {
          setIsCategoryModalVisible(false);
          categoryForm.resetFields();
        }}
        confirmLoading={isCategorySubmitting}
        width={600}
      >
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
          <Form.Item label={t('label.description')} name="description">
            <TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder={t('label.description')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayoutV1>
  );
};

export default AssetCatalogPage;
