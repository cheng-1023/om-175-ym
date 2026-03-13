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
import { useHistory } from 'react-router-dom';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import { Menu } from 'antd';
import {
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus-primary.svg';
import { ReactComponent as TypeIcon } from '../../../assets/svg/ic-asset-types.svg';
import { ReactComponent as ExportIcon } from '../../../assets/svg/ic-export.svg';
import { ReactComponent as ImportIcon } from '../../../assets/svg/ic-import.svg';
import { ReactComponent as VersionIcon } from '../../../assets/svg/ic-version.svg';
import { ReactComponent as IconDropdown } from '../../../assets/svg/menu.svg';
import Icon, { LikeOutlined, DislikeOutlined } from '@ant-design/icons';
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
  createAssetType,
  deleteAssetTypeByName,
  exportAssetTypes,
  getAssetAttributesList,
  getAssetTypesList,
  patchAssetTypeByName,
} from '../../../rest/assetAPI';
import { AssetType } from '../../../generated/entity/data/asset/assetType';
import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import { AttributeCategory } from '../../../generated/entity/data/asset/assetAttribute';
import './asset-type-page.less';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface AssetTypeFormData {
  name: string;
  displayName: string;
  description: string;
}

const AssetTypePage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { showModal } = useEntityExportModalProvider();

  // 数据加载状态
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [typesError, setTypesError] = useState<AxiosError | null>(null);
  const [attributesError, setAttributesError] = useState<AxiosError | null>(
    null
  );

  // 数据状态
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [allAttributes, setAllAttributes] = useState<AssetAttribute[]>([]);

  // Modal 状态
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [typeModalMode, setTypeModalMode] = useState<'create' | 'edit'>(
    'create'
  );
  const [selectedTypeForEdit, setSelectedTypeForEdit] =
    useState<AssetType | null>(null);
  const [formData, setFormData] = useState<AssetTypeFormData>({
    name: '',
    displayName: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 添加属性Modal状态
  const [isAddAttributeModalVisible, setIsAddAttributeModalVisible] =
    useState(false);
  const [availableAttributes, setAvailableAttributes] = useState<
    AssetAttribute[]
  >([]);
  const [selectedAttributeToAdd, setSelectedAttributeToAdd] = useState<
    string[]
  >([]);
  const [isAddingAttribute, setIsAddingAttribute] = useState(false);

  // 获取资产类型列表
  const fetchAssetTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    setTypesError(null);
    try {
      const response = await getAssetTypesList({
        limit: 100,
        fields: 'attributes',
      });
      const typesData = response.data || [];
      setAssetTypes(typesData);

      // 默认选中第一个类型
      if (typesData.length > 0 && !selectedType) {
        setSelectedType(typesData[0]);
      }
    } catch (err) {
      setTypesError(err as AxiosError);
    } finally {
      setIsLoadingTypes(false);
    }
  }, [selectedType]);

  // 获取所有资产属性（用于显示）
  const fetchAllAttributes = useCallback(async () => {
    setIsLoadingAttributes(true);
    setAttributesError(null);
    try {
      const response = await getAssetAttributesList({ limit: 1000 });
      setAllAttributes(response.data || []);
    } catch (err) {
      setAttributesError(err as AxiosError);
    } finally {
      setIsLoadingAttributes(false);
    }
  }, []);

  useEffect(() => {
    fetchAssetTypes();
    fetchAllAttributes();
  }, [fetchAssetTypes, fetchAllAttributes]);

  // 处理类型选择
  const handleTypeClick = useCallback((type: AssetType) => {
    setSelectedType(type);
  }, []);

  // 添加资产类型
  const handleAddType = () => {
    setTypeModalMode('create');
    setSelectedTypeForEdit(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
    });
    setIsTypeModalVisible(true);
  };

  // 编辑资产类型
  const handleEditType = (type: AssetType) => {
    setTypeModalMode('edit');
    setSelectedTypeForEdit(type);
    setFormData({
      name: type.name,
      displayName: type.displayName || '',
      description: type.description || '',
    });
    setIsTypeModalVisible(true);
  };

  // 删除资产类型
  const handleDeleteType = (type: AssetType) => {
    Modal.confirm({
      title: t('label.delete-entity', { entity: t('label.asset-type') }),
      content: t('message.delete-confirmation', {
        name: type.displayName || type.name,
      }),
      okText: t('label.delete'),
      okType: 'danger',
      cancelText: t('label.cancel'),
      onOk: async () => {
        try {
          await deleteAssetTypeByName(type.name, false, true);
          await fetchAssetTypes();
          message.success(t('message.entity-deleted-successfully'));
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Delete failed:', error);
          message.error(t('message.delete-failed'));
        }
      },
    });
  };

  // 提交资产类型表单
  const handleTypeSubmit = async () => {
    if (!formData.description?.trim()) {
      message.warning(
        t('message.field-text-required', { fieldText: t('label.description') })
      );

      return;
    }
    setIsSubmitting(true);
    try {
      if (typeModalMode === 'create') {
        await createAssetType({
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description,
        });
        message.success(t('message.entity-created-successfully'));
      } else if (typeModalMode === 'edit' && selectedTypeForEdit) {
        const patch = compare(selectedTypeForEdit, {
          ...selectedTypeForEdit,
          displayName: formData.displayName,
          description: formData.description,
        });

        if (patch.length > 0) {
          await patchAssetTypeByName(selectedTypeForEdit.name, patch);
          message.success(t('message.entity-updated-successfully'));
        }
      }

      setIsTypeModalVisible(false);
      await fetchAssetTypes();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Submit failed:', error);
      message.error(t('message.submit-failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 添加资产属性到资产类型（支持多选）
  const handleAddAttribute = async () => {
    if (!selectedType || selectedAttributeToAdd.length === 0) {
      message.warning(t('message.select-attribute-first'));

      return;
    }

    setIsAddingAttribute(true);
    try {
      const attributesToAdd = allAttributes.filter((attr) =>
        selectedAttributeToAdd.includes(attr.id!)
      );
      if (attributesToAdd.length > 0) {
        const currentAttributes = selectedType.attributes || [];
        const newAttributes = [
          ...currentAttributes,
          ...attributesToAdd.map((attr) => ({
            id: attr.id,
            type: 'assetAttribute',
            name: attr.name,
            displayName: attr.displayName,
            fullyQualifiedName: attr.fullyQualifiedName,
          })),
        ];

        await patchAssetTypeByName(selectedType.name, [
          {
            op: selectedType.attributes ? 'replace' : 'add',
            path: '/attributes',
            value: newAttributes,
          },
        ]);

        message.success(t('message.entity-updated-successfully'));
        await fetchAssetTypes();
        setIsAddAttributeModalVisible(false);
        setSelectedAttributeToAdd([]);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Add attribute failed:', error);
      message.error(t('message.entity-update-failed'));
    } finally {
      setIsAddingAttribute(false);
    }
  };

  // 打开添加属性Modal
  const handleOpenAddAttributeModal = () => {
    if (!selectedType) {
      message.warning(t('message.select-type-first'));

      return;
    }

    // 获取可用的属性（排除已添加的属性）
    const existingAttributeIds =
      selectedType.attributes?.map((attr) => attr.id) || [];
    const available = allAttributes.filter(
      (attr) => !existingAttributeIds.includes(attr.id)
    );
    setAvailableAttributes(available);
    setIsAddAttributeModalVisible(true);
  };

  // 导出资产类型属性配置 — 使用 EntityExportModalProvider 通用导出组件
  const handleExportAttributes = useCallback(() => {
    if (selectedType) {
      showModal({
        name: selectedType.fullyQualifiedName || selectedType.name,
        onExport: exportAssetTypes,
        exportTypes: [ExportTypes.CSV],
      });
    }
  }, [selectedType, showModal]);

  // 导入资产类型属性配置 — 跳转到导入页面
  const handleImportAttributes = useCallback(() => {
    if (selectedType) {
      const fqn = selectedType.fullyQualifiedName || selectedType.name;
      history.push(`/assetTypes/${encodeURIComponent(fqn)}/import`);
    }
  }, [selectedType, history]);

  // 版本历史
  const handleVersionHistory = () => {
    message.info(t('message.feature-coming-soon'));
  };

  // 获取选中类型的属性详情
  const selectedTypeAttributes = useMemo(() => {
    if (!selectedType?.attributes) {
      return [];
    }

    return selectedType.attributes
      .map((attrRef) => {
        return allAttributes.find((attr) => attr.id === attrRef.id);
      })
      .filter((attr): attr is AssetAttribute => attr !== undefined);
  }, [selectedType, allAttributes]);

  // 按属性分类分组
  const groupedAttributes = useMemo(() => {
    const groups: Record<string, AssetAttribute[]> = {};

    selectedTypeAttributes.forEach((attr) => {
      const category = attr.attributeCategory || AttributeCategory.Basic;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(attr);
    });

    return groups;
  }, [selectedTypeAttributes]);

  // 生成Tab页项
  const tabItems = useMemo(() => {
    const categories = Object.keys(groupedAttributes).sort();

    if (categories.length === 0) {
      return [
        {
          key: 'all',
          label: t('label.all-attributes'),
          children: (
            <div className="text-center p-lg">
              <Text type="secondary">{t('label.no-attributes-found')}</Text>
            </div>
          ),
        },
      ];
    }

    return categories.map((category) => ({
      key: category,
      label: `${t(`label.attribute-category-${category}`)} (${
        groupedAttributes[category].length
      })`,
      children: (
        <Table
          columns={[
            {
              title: t('label.name'),
              dataIndex: 'name',
              key: 'name',
              width: 200,
              render: (text: string, record: AssetAttribute) => (
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
              title: t('label.data-type'),
              dataIndex: 'dataType',
              key: 'dataType',
              width: 120,
              render: (dataType: string) => <Tag color="blue">{dataType}</Tag>,
            },
            {
              title: t('label.required'),
              dataIndex: 'required',
              key: 'required',
              width: 100,
              render: (required: boolean) => (
                <Tag color={required ? 'red' : 'green'}>
                  {required ? t('label.yes') : t('label.no')}
                </Tag>
              ),
            },
          ]}
          dataSource={groupedAttributes[category]}
          pagination={false}
          rowKey="id"
          size="small"
        />
      ),
    }));
  }, [groupedAttributes, t]);

  // 左侧面板菜单项
  const menuItems: ItemType[] = useMemo(() => {
    return assetTypes.map((type) => ({
      key: type.id,
      label: type.displayName || type.name,
      icon: <TypeIcon style={{ width: '16px', height: '16px' }} />,
    }));
  }, [assetTypes]);

  const selectedMenuKey = selectedType?.id || assetTypes[0]?.id || '';

  return (
    <PageLayoutV1 pageTitle={t('label.asset-type-management')}>
      <ResizableLeftPanels
        className="content-height-with-resizable-panel"
        firstPanel={{
          className: 'content-resizable-panel-container',
          flex: 0.2,
          minWidth: 280,
          title: t('label.asset-type-plural'),
          children: (
            <div className="p-x-sm">
              <Button
                block
                className="text-primary mb-md"
                data-testid="add-asset-type"
                onClick={handleAddType}>
                <div className="flex-center">
                  <PlusIcon className="anticon m-r-xss" />
                  {t('label.add-entity', { entity: t('label.asset-type') })}
                </div>
              </Button>

              {isLoadingTypes ? (
                <Loader />
              ) : typesError ? (
                <ErrorPlaceHolder
                  type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
                  onClick={fetchAssetTypes}
                />
              ) : assetTypes.length === 0 ? (
                <div className="text-center p-lg">
                  <p className="text-grey-muted">{t('label.no-types-found')}</p>
                </div>
              ) : (
                <Menu
                  className="custom-menu"
                  items={menuItems}
                  mode="inline"
                  selectedKeys={[selectedMenuKey]}
                  onClick={(item) => {
                    const type = assetTypes.find((t) => t.id === item.key);
                    if (type) {
                      handleTypeClick(type);
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
              {selectedType ? (
                <>
                  {/* 头部区域 - 对齐 GlossaryHeader 布局 */}
                  <div className="glossary-header flex gap-4 justify-between no-wrap p-b-md">
                    <div className="flex w-min-0 flex-auto">
                      <Space direction="vertical" size={0}>
                        <Title className="m-0" level={4}>
                          {selectedType.displayName || selectedType.name}
                        </Title>
                        <Text type="secondary">{selectedType.description}</Text>
                      </Space>
                    </div>
                    <div className="flex items-center">
                      <div className="d-flex gap-3 justify-end">
                        {/* 添加资产属性按钮 */}
                        <Button
                          className="m-l-xs"
                          type="primary"
                          onClick={handleOpenAddAttributeModal}>
                          {t('label.add-attribute')}
                        </Button>

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
                              onClick={handleVersionHistory}>
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
                                            'label.asset-attribute-plural'
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
                                    handleExportAttributes();
                                  },
                                },
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t(
                                        'message.import-entity-help',
                                        {
                                          entity: t(
                                            'label.asset-attribute-plural'
                                          ),
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
                                    handleImportAttributes();
                                  },
                                },
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t('message.rename-entity', {
                                        entity: t('label.asset-type'),
                                      })}
                                      icon={EditIcon}
                                      id="rename-button"
                                      name={t('label.rename')}
                                    />
                                  ),
                                  key: 'rename-button',
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    handleEditType(selectedType);
                                  },
                                },
                                {
                                  label: (
                                    <ManageButtonItemLabel
                                      description={t(
                                        'message.delete-entity-type-action-description',
                                        {
                                          entityType: t('label.asset-type'),
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
                                    handleDeleteType(selectedType);
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
                                entity: t('label.asset-type'),
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
                  <Card>
                    {/* Tab 页 (去除了已移到头部的 Add 按钮和标题行) */}

                    {isLoadingAttributes ? (
                      <Loader />
                    ) : attributesError ? (
                      <ErrorPlaceHolder
                        type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
                        onClick={fetchAllAttributes}
                      />
                    ) : (
                      <Tabs
                        defaultActiveKey={
                          Object.keys(groupedAttributes)[0] || 'all'
                        }
                        items={tabItems}
                      />
                    )}
                  </Card>
                </>
              ) : (
                <Card>
                  <div className="text-center p-lg">
                    <p className="text-grey-muted">
                      {t('label.select-type-view-details')}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          ),
        }}
      />

      {/* 资产类型编辑/创建 Modal */}
      <Modal
        confirmLoading={isSubmitting}
        open={isTypeModalVisible}
        title={
          typeModalMode === 'create'
            ? t('label.add-entity', { entity: t('label.asset-type') })
            : t('label.edit-entity', { entity: t('label.asset-type') })
        }
        width={600}
        onCancel={() => {
          setIsTypeModalVisible(false);
          setFormData({ name: '', displayName: '', description: '' });
        }}
        onOk={handleTypeSubmit}>
        <Form layout="vertical">
          <Form.Item required label={t('label.name')}>
            <Input
              disabled={typeModalMode === 'edit'}
              placeholder={t('label.name')}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </Form.Item>
          <Form.Item required label={t('label.display-name')}>
            <Input
              placeholder={t('label.display-name')}
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
            />
          </Form.Item>
          <Form.Item required label={t('label.description')}>
            <TextArea
              placeholder={t('label.description')}
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加属性到资产类型 Modal */}
      <Modal
        confirmLoading={isAddingAttribute}
        open={isAddAttributeModalVisible}
        title={t('label.add-attribute')}
        width={600}
        onCancel={() => {
          setIsAddAttributeModalVisible(false);
          setSelectedAttributeToAdd([]);
        }}
        onOk={handleAddAttribute}>
        <Space className="w-full" direction="vertical" size="large">
          <Form layout="vertical">
            <Form.Item label={t('label.asset-attribute')}>
              <Select
                showSearch
                className="w-full"
                filterOption={(
                  input: string,
                  option?: { value: string; label: string }
                ) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                mode="multiple"
                options={availableAttributes.map((attr) => ({
                  value: attr.id,
                  label: attr.displayName || attr.name,
                }))}
                placeholder={t('label.select-attribute')}
                value={selectedAttributeToAdd}
                onChange={(value: string[]) => setSelectedAttributeToAdd(value)}
              />
              {availableAttributes.length === 0 && (
                <Text className="mt-xs block" type="secondary">
                  {t('label.no-available-attributes')}
                </Text>
              )}
            </Form.Item>
          </Form>

          <div>
            <Text type="secondary">
              {t('message.add-attribute-to-type-description')}
            </Text>
          </div>
        </Space>
      </Modal>
    </PageLayoutV1>
  );
};

export default AssetTypePage;
