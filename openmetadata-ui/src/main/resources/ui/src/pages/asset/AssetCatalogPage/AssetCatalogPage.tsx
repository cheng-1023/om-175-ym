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
import { compare } from 'fast-json-patch';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { ROUTES, PLACEHOLDER_ROUTE_FQN } from '../../../constants/constants';

import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Menu,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
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
  UploadOutlined,
} from '@ant-design/icons';
import { ManageButtonItemLabel } from '../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
import TabsLabel from '../../../components/common/TabsLabel/TabsLabel.component';
import ButtonGroup from 'antd/lib/button/button-group';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import ResizableLeftPanels from '../../../components/common/ResizablePanels/ResizableLeftPanels';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { useEntityExportModalProvider } from '../../../components/Entity/EntityExportModalProvider/EntityExportModalProvider.component';
import { ActivityFeedTab } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import { ActivityFeedLayoutType } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.interface';
import { FEED_COUNT_INITIAL_DATA } from '../../../constants/entity.constants';
import AssetCatalogTab from './AssetCatalogTab';
import AssetCatalogDetails from './AssetCatalogDetails.component';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { useEntityExportModalProvider } from '../../../components/Entity/EntityExportModalProvider/EntityExportModalProvider.component';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { ExportTypes } from '../../../constants/Export.constants';
import ActivityFeedProvider from '../../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import {
  createAssetCatalog,
  createAssetCategory,
  deleteAssetCatalogByName,
  deleteAssetCategoryByName,
  exportAssetCategories,
  exportAssetCatalogs,
  importAssetCategories,
  getAssetCategoriesList,
  getAssetCatalogsList,
  getAssetCatalogByName,
  getAssetCategoryByName,
  patchAssetCatalog,
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
  const { fqn: routeFqn } = useParams<{ fqn?: string }>();
  const { showModal } = useEntityExportModalProvider();
  const { currentUser } = useApplicationStore();
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 数据加载状态
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isRoutingInitialized, setIsRoutingInitialized] = useState(false);
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
  // 编辑时暂存目录（独立于 selectedCatalog，避免影响 activeNode 导致页面跳转）
  const [editingCatalog, setEditingCatalog] = useState<AssetCatalog | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentCatalogForCreate, setParentCatalogForCreate] =
    useState<AssetCatalog | null>(null);

  // 资产分类Modal状态
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>(
    'create'
  );
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] =
    useState<AssetCategory | null>(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // 详情页状态
  const [activeTab, setActiveTab] = useState('catalogs');
  // 视图模式：'list' 或 'detail'（当 FQN 匹配到具体目录时显示独立详情页）
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // 移动资产目录状态
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);
  const [moveCatalogTarget, setMoveCatalogTarget] = useState<string | null>(
    null
  );
  const [isMoveSubmitting, setIsMoveSubmitting] = useState(false);

  // 导入状态
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 获取资产分类列表（纯数据获取，不附带副作用）
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

      return categoriesData;
    } catch (err) {
      setCategoriesError(err as AxiosError);

      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

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

      return response.data || [];
    } catch (err) {
      setCatalogsError(err as AxiosError);

      return [];
    } finally {
      setIsLoadingCatalogs(false);
    }
  }, []);

  // 初始加载：采用快路径策略
  // 当 URL 含有 routeFqn 时，优先按 FQN 点查单条数据快速渲染，全量列表后台异步加载
  // 当 URL 无 routeFqn 时，走常规全量加载流程
  useEffect(() => {
    const initLoad = async () => {
      if (routeFqn) {
        // ====== 快路径：先按 FQN 点查，极速渲染目标页面 ======
        const decodedFqn = decodeURIComponent(routeFqn);

        // 并行尝试：按 FQN 点查目录、点查分类（总有一个会 404）
        const [catalogResult, categoryResult] = await Promise.allSettled([
          getAssetCatalogByName(decodedFqn, {
            fields: 'category,parent,fullyQualifiedName',
          }),
          getAssetCategoryByName(decodedFqn, {
            fields: 'fullyQualifiedName',
          }),
        ]);

        if (catalogResult.status === 'fulfilled') {
          // 匹配到了具体目录 → 直接进入详情视图
          const catalog = catalogResult.value;
          setSelectedCatalog(catalog);
          setViewMode('detail');

          // 如果目录有所属分类，同步设置
          if (catalog.category) {
            // 如果分类点查也成功了（不太可能和目录同名），忽略
            // 否则单独获取分类信息
            try {
              const categoryFqn =
                catalog.category.fullyQualifiedName || catalog.category.name;
              if (categoryFqn) {
                const parentCat = await getAssetCategoryByName(categoryFqn, {
                  fields: 'fullyQualifiedName',
                });
                setSelectedCategory(parentCat);
              }
            } catch {
              // 获取分类失败不影响主流程
            }
          }
          setIsRoutingInitialized(true);

          // 后台异步加载全量数据，供左侧面板和后续操作使用
          fetchCategories();
          fetchCatalogs();

          return;
        }

        if (categoryResult.status === 'fulfilled') {
          // 匹配到了分类 → 进入列表视图
          const category = categoryResult.value;
          setSelectedCategory(category);
          setSelectedCatalog(null);
          setViewMode('list');
          setIsRoutingInitialized(true);

          // 后台异步加载全量数据
          const [categoriesData] = await Promise.all([
            fetchCategories(),
            fetchCatalogs(),
          ]);

          // 用全量数据更新 selectedCategory（确保引用一致）
          if (categoriesData.length > 0) {
            const fullCategory = categoriesData.find(
              (c: any) =>
                c.fullyQualifiedName === decodedFqn || c.name === decodedFqn
            );
            if (fullCategory) {
              setSelectedCategory(fullCategory);
            }
          }

          return;
        }

        // 两个都失败了 → fallback 到普通加载
      }

      // ====== 常规路径：无 routeFqn 或快路径匹配失败 ======
      const [categoriesData] = await Promise.all([
        fetchCategories(),
        fetchCatalogs(),
      ]);

      // 没有 routeFqn：默认选中第一个分类
      if (!routeFqn && categoriesData.length > 0) {
        const firstCategory = categoriesData[0];
        setSelectedCategory(firstCategory);
        setViewMode('list');
        history.replace(
          ROUTES.ASSET_CATALOG_DETAILS.replace(
            PLACEHOLDER_ROUTE_FQN,
            encodeURIComponent(
              firstCategory.fullyQualifiedName || firstCategory.name
            )
          )
        );
      }
      setIsRoutingInitialized(true);
    };

    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // routeFqn 变化时的路由匹配（用户在页面内点击导航切换时触发）
  // 不会在初始化阶段执行（isRoutingInitialized 为 false 时跳过）
  useEffect(() => {
    if (!isRoutingInitialized) {
      return;
    }
    // 等待全量数据加载完成后再执行路由匹配
    if (isLoadingCategories || isLoadingCatalogs) {
      return;
    }

    if (categories.length === 0 && catalogs.length === 0) {
      return;
    }

    if (routeFqn) {
      const decodedFqn = decodeURIComponent(routeFqn);
      // 先在分类中查找
      const matchedCategory = categories.find(
        (c: any) => c.fullyQualifiedName === decodedFqn || c.name === decodedFqn
      );
      if (matchedCategory) {
        setSelectedCategory(matchedCategory);
        setSelectedCatalog(null);
        setViewMode('list');

        return;
      }
      // 在目录中查找
      const matchedCatalog = catalogs.find(
        (c: any) => c.fullyQualifiedName === decodedFqn || c.name === decodedFqn
      );
      if (matchedCatalog) {
        if (matchedCatalog.category) {
          const parentCategory = categories.find(
            (c: any) => c.id === matchedCatalog.category?.id
          );
          if (parentCategory) {
            setSelectedCategory(parentCategory);
          }
        }
        setSelectedCatalog(matchedCatalog);
        setViewMode('detail');

        return;
      }
    }
  }, [routeFqn, categories, catalogs, isLoadingCategories, isLoadingCatalogs, isRoutingInitialized]);

  // 处理分类选择
  const handleCategorySelect = (info: { key: string }) => {
    const category = categories.find((c) => c.id === info.key);
    if (category) {
      setSelectedCategory(category);
      setSelectedCatalog(null);
      setViewMode('list');
      // 更新 URL 到分类的 FQN
      history.push(
        ROUTES.ASSET_CATALOG_DETAILS.replace(
          PLACEHOLDER_ROUTE_FQN,
          encodeURIComponent(category.fullyQualifiedName || category.name)
        )
      );
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
        await deleteAssetCategoryByName(
          data.fullyQualifiedName || data.name,
          false,
          true
        );
        await fetchCategories();
        setSelectedCategory(null);
      } else {
        await deleteAssetCatalogByName(
          data.fullyQualifiedName || data.name,
          false,
          true
        );
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
  const handleAddCatalog = (parentCatalog?: AssetCatalog) => {
    setCatalogModalMode('create');
    setParentCatalogForCreate(parentCatalog || null);
    form.resetFields();
    setIsCatalogModalVisible(true);
  };

  // 编辑资产目录（使用独立的 editingCatalog state，避免改变 activeNode 导致页面跳转）
  const handleEditCatalog = (catalog: AssetCatalog) => {
    setCatalogModalMode('edit');
    setEditingCatalog(catalog);
    form.setFieldsValue({
      name: catalog.name,
      displayName: catalog.displayName || '',
      description: catalog.description || '',
      order: catalog.order,
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
          order: values.order ?? 0,
          category:
            selectedCategory?.fullyQualifiedName ||
            selectedCategory?.name ||
            '',
        };
        // 如果指定了父级目录，则新建的当做它的子目录
        if (
          parentCatalogForCreate?.fullyQualifiedName ||
          parentCatalogForCreate?.name
        ) {
          payload.parent =
            parentCatalogForCreate.fullyQualifiedName ||
            parentCatalogForCreate.name;
        }

        await createAssetCatalog(payload);
        message.success(
          t('message.entity-created-successfully', {
            entity: values.displayName || values.name,
          })
        );
      } else if (catalogModalMode === 'edit' && editingCatalog) {
        const updatedCatalog = {
          ...editingCatalog,
          displayName: values.displayName,
          description: values.description,
          order: values.order ?? 0,
        };
        const patch = compare(editingCatalog, updatedCatalog);
        if (patch.length > 0) {
          await patchAssetCatalog(editingCatalog.id || '', patch);
          message.success(
            t('message.entity-updated-successfully', {
              entity: values.displayName || values.name,
            })
          );
        }
      }

      setIsCatalogModalVisible(false);
      setEditingCatalog(null);
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
      const updatedCatalog = {
        ...selectedCatalog,
        parent: moveCatalogTarget
          ? { id: moveCatalogTarget, type: 'assetCatalog' }
          : undefined,
      };
      // 如果移到根级别且原来有 parent，需要移除 parent 字段
      if (!moveCatalogTarget) {
        delete (updatedCatalog as any).parent;
      }
      const patch = compare(selectedCatalog, updatedCatalog);
      if (patch.length > 0) {
        await patchAssetCatalog(selectedCatalog.id || '', patch);
      }
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
    if (selectedCatalog) {
      // 选中了具体目录：导出该目录下的递归子目录
      showModal({
        name: selectedCatalog.fullyQualifiedName || selectedCatalog.name,
        onExport: exportAssetCatalogs,
        exportTypes: [ExportTypes.CSV],
      });
    } else if (selectedCategory) {
      // 选中了分类：导出分类下的全部目录
      showModal({
        name: selectedCategory.fullyQualifiedName || selectedCategory.name,
        onExport: exportAssetCategories,
        exportTypes: [ExportTypes.CSV],
      });
    }
  }, [selectedCatalog, selectedCategory, showModal]);

  // 导入资产目录
  const handleImportCatalogs = useCallback(() => {
    if (selectedCategory) {
      setImportFile(null);
      setIsImportModalVisible(true);
    } else {
      message.warning(
        t('message.select-category-first') || 'Please select a category first.'
      );
    }
  }, [selectedCategory, t]);

  const handleImportSubmit = async () => {
    if (!importFile) {
      message.error(
        t('message.please-select-file') || 'Please select a file to import.'
      );

      return;
    }
    if (!selectedCategory) {
      return;
    }
    try {
      setIsImporting(true);
      const text = await importFile.text();
      // 调用导入 API (dryRun = false 表示直接导入)
      await importAssetCategories(
        selectedCategory.fullyQualifiedName || selectedCategory.name,
        text,
        false
      );
      message.success(
        t('message.entity-imported-successfully', {
          entity: t('label.asset-catalog'),
        }) || 'Asset Catalogs imported successfully.'
      );
      setIsImportModalVisible(false);
      setImportFile(null);
      // 刷新目录列表
      await fetchCatalogs();
    } catch (error: any) {
      console.error('Import failed:', error);
      const errMsg =
        error.response?.data?.message ||
        t('message.import-failed') ||
        'Import failed.';
      message.error(errMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      // 检查文件类型
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      if (!isCSV) {
        message.error(
          t('message.only-csv-files-allowed') || 'Only CSV files are allowed.'
        );

        return Upload.LIST_IGNORE;
      }
      setImportFile(file);

      return false; // 防止自动上传
    },
    onRemove: () => {
      setImportFile(null);
    },
    fileList: importFile ? [importFile as any] : [],
    maxCount: 1,
  };

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
          <div
            className="font-bold text-blue-600 cursor-pointer hover:text-blue-800"
            onClick={() => {
              setSelectedCatalog(record);
              history.push(
                ROUTES.ASSET_CATALOG_DETAILS.replace(
                  PLACEHOLDER_ROUTE_FQN,
                  encodeURIComponent(record.fullyQualifiedName || record.name)
                )
              );
            }}>
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

  const detailContent = activeNode ? (
    <AssetCatalogDetails
      activeNode={activeNode}
      activeTab={activeTab}
      catalogs={catalogs}
      categories={categories}
      fetchCatalogs={fetchCatalogs}
      setActiveTab={setActiveTab}
      onAddCatalog={(parent) => handleAddCatalog(parent)}
      onBreadcrumbNodeClick={(fqn) => {
        history.push(
          ROUTES.ASSET_CATALOG_DETAILS.replace(
            PLACEHOLDER_ROUTE_FQN,
            encodeURIComponent(fqn)
          )
        );
      }}
      onBreadcrumbRootClick={() => {
        setViewMode('list');
        if ('category' in activeNode && activeNode.category) {
          const cat = categories.find((c) => c.id === activeNode.category?.id);
          if (cat) {
            setSelectedCategory(cat);
          }
        }
        setSelectedCatalog(null);
        history.push(ROUTES.ASSET_CATALOGS);
      }}
      onDeleteCatalog={handleDeleteCatalog}
      onDeleteCategory={handleDeleteCategory}
      onEditCatalog={handleEditCatalog}
      onEditCategory={handleEditCategory}
      onExportCatalogs={handleExportCatalogs}
      onImportCatalogs={handleImportCatalogs}
      onMoveCatalog={() => setIsMoveModalVisible(true)}
    />
  ) : (
    <Card>
      <div className="text-center p-lg">
        <p className="text-grey-muted">
          {t('label.select-category-view-details')}
        </p>
      </div>
    </Card>
  );

  return (
    <ActivityFeedProvider user={currentUser?.id}>
      <PageLayoutV1 pageTitle={t('label.asset-catalog-management')}>
        {!isRoutingInitialized ? (
          <Loader />
        ) : viewMode === 'list' ? (
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
                      className="custom-menu"
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
              children: detailContent,
            }}
          />
        ) : (
          <div className="h-full min-h-screen content-resizable-panel-container">
            {detailContent}
          </div>
        )}

        {/* 资产目录编辑/创建 Modal */}
        <Modal
          confirmLoading={isSubmitting}
          open={isCatalogModalVisible}
          title={
            catalogModalMode === 'create'
              ? t('label.add-entity', { entity: t('label.asset-catalog') })
              : t('label.edit-entity', { entity: t('label.asset-catalog') })
          }
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
            <Form.Item
              label={t('label.order')}
              name="order"
              rules={[
                {
                  required: false,
                },
              ]}>
              <InputNumber
                min={0}
                placeholder={t('label.order')}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 资产分类编辑/创建 Modal */}
        <Modal
          confirmLoading={isCategorySubmitting}
          open={isCategoryModalVisible}
          title={
            categoryModalMode === 'create'
              ? t('label.add-asset-category')
              : t('label.edit-asset-category')
          }
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
          open={deleteConfirmVisible}
          title={t('label.delete-entity', {
            entity: t(
              entityToDelete?.type === 'catalog'
                ? 'label.asset-catalog'
                : 'label.asset-category'
            ),
          })}
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
          open={isMoveModalVisible}
          title={t('label.change-parent-entity', { entity: t('label.asset-catalog') })}
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

        {/* 导入资产目录 Modal */}
        <Modal
          confirmLoading={isImporting}
          open={isImportModalVisible}
          title={t('label.import-entity', { entity: t('label.asset-catalog') })}
          onCancel={() => {
            setIsImportModalVisible(false);
            setImportFile(null);
          }}
          onOk={handleImportSubmit}>
          <div className="m-b-sm">
            {t('message.import-csv-description') ||
              'Please select a CSV file to import asset catalogs.'}
          </div>
          <Upload {...uploadProps} accept=".csv">
            <Button icon={<UploadOutlined />}>
              {t('label.select-file') || 'Select File'}
            </Button>
          </Upload>
        </Modal>
      </PageLayoutV1>
    </ActivityFeedProvider>
  );
};

export default AssetCatalogPage;
