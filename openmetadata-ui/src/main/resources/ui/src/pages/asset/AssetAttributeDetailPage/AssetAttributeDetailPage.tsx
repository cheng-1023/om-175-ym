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
  Descriptions,
  Dropdown,
  Row,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';

import Icon, { LikeOutlined, DislikeOutlined } from '@ant-design/icons';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as IconDelete } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as VersionIcon } from '../../../assets/svg/ic-version.svg';
import { ReactComponent as IconDropdown } from '../../../assets/svg/menu.svg';
import { ReactComponent as IconTag } from '../../../assets/svg/classification.svg';

import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import { ManageButtonItemLabel } from '../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
import TabsLabel from '../../../components/common/TabsLabel/TabsLabel.component';
import { TitleBreadcrumbProps } from '../../../components/common/TitleBreadcrumb/TitleBreadcrumb.interface';
import { EntityHeader } from '../../../components/Entity/EntityHeader/EntityHeader.component';
import EntityDeleteModal from '../../../components/Modals/EntityDeleteModal/EntityDeleteModal';
import EntityNameModal from '../../../components/Modals/EntityNameModal/EntityNameModal.component';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { BLACK_COLOR, DE_ACTIVE_COLOR, ROUTES } from '../../../constants/constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { EntityType } from '../../../enums/entity.enum';
import { getEntityDeleteMessage } from '../../../utils/CommonUtils';
import { showErrorToast, showSuccessToast } from '../../../utils/ToastUtils';

import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import {
  deleteAssetAttributeByName,
  getAssetAttributeByName,
  patchAssetAttributeByName,
} from '../../../rest/assetAPI';

import './asset-page.less';

// 属性分类常量
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

enum TabSpecificField {
  OVERVIEW = 'overview',
  ACTIVITY_FEED = 'activity_feed',
}

const AssetAttributeDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { fqn } = useParams<{ fqn: string }>();
  const history = useHistory();

  const [isLoading, setIsLoading] = useState(true);
  const [attribute, setAttribute] = useState<AssetAttribute | null>(null);
  const [error, setError] = useState<AxiosError | null>(null);

  const [activeTab, setActiveTab] = useState<string>(TabSpecificField.OVERVIEW);
  const [isNameEditing, setIsNameEditing] = useState<boolean>(false);
  const [isDelete, setIsDelete] = useState<boolean>(false);
  const [showActions, setShowActions] = useState(false);

  const breadcrumb: TitleBreadcrumbProps['titleLinks'] = useMemo(() => {
    return [
      {
        name: t('label.asset-attribute-plural'),
        url: ROUTES.ASSET_ATTRIBUTES,
        activeTitle: false,
      },
    ];
  }, [t]);

  const fetchAttribute = useCallback(async () => {
    if (!fqn) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAssetAttributeByName(decodeURIComponent(fqn));
      setAttribute(data);
    } catch (err) {
      setError(err as AxiosError);
      showErrorToast(err as AxiosError, t('message.entity-fetch-error'));
    } finally {
      setIsLoading(false);
    }
  }, [fqn, t]);

  useEffect(() => {
    fetchAttribute();
  }, [fetchAttribute]);

  const handleTabChange = (activeKey: string) => {
    setActiveTab(activeKey);
  };

  const getCategoryLabel = (category: string) => {
    const info = ATTRIBUTE_CATEGORIES.find((c) => c.value === category);
    return info ? t(info.label) : category;
  };

  const getDataTypeLabel = (dataType: string) => {
    const info = DATA_TYPES.find((d) => d.value === dataType);
    return info ? t(info.label) : dataType;
  };

  const onNameSave = async (obj: { name: string; displayName?: string }) => {
    if (attribute) {
      const { name, displayName } = obj;
      const updatedDetails = {
        ...cloneDeep(attribute),
        name: name?.trim(),
        displayName: displayName?.trim(),
      };

      const jsonPatch = compare(attribute, updatedDetails);
      try {
        const response = await patchAssetAttributeByName(attribute.name, jsonPatch);
        setAttribute(response.data || response);
        setIsNameEditing(false);
        // 如果名字改了，重新跳转 URL
        if (name !== attribute.name) {
          history.push(ROUTES.ASSET_ATTRIBUTE_DETAILS.replace(':fqn', name || ''));
        }
      } catch (err) {
        showErrorToast(err as AxiosError);
      }
    }
  };

  const handleDelete = async () => {
    if (attribute?.name) {
      try {
        await deleteAssetAttributeByName(attribute.name, false, true);
        showSuccessToast(
          t('server.entity-deleted-successfully', {
            entity: t('label.asset-attribute'),
          })
        );
        setIsDelete(false);
        history.push(ROUTES.ASSET_ATTRIBUTES);
      } catch (err) {
        showErrorToast(
          err as AxiosError,
          t('server.delete-entity-error', {
            entity: t('label.asset-attribute'),
          })
        );
      }
    }
  };

  const manageButtonContent: ItemType[] = [
    {
      label: (
        <ManageButtonItemLabel
          description={t('message.rename-entity', {
            entity: t('label.asset-attribute'),
          })}
          icon={EditIcon}
          id="rename-button"
          name={t('label.rename')}
        />
      ),
      key: 'rename-button',
      onClick: (e: { domEvent: { stopPropagation: () => void } }) => {
        e.domEvent.stopPropagation();
        setIsNameEditing(true);
        setShowActions(false);
      },
    },
    {
      label: (
        <ManageButtonItemLabel
          description={t('message.delete-entity-type-action-description', {
            entityType: t('label.asset-attribute'),
          })}
          icon={IconDelete}
          id="delete-button"
          name={t('label.delete')}
        />
      ),
      key: 'delete-button',
      onClick: (e: { domEvent: { stopPropagation: () => void } }) => {
        e.domEvent.stopPropagation();
        setIsDelete(true);
        setShowActions(false);
      },
    },
  ];

  const tabItems = useMemo(() => {
    if (!attribute) return [];
    
    return [
      {
        label: <TabsLabel id={TabSpecificField.OVERVIEW} name={t('label.overview')} />,
        key: TabSpecificField.OVERVIEW,
        children: (
          <Row gutter={[16, 16]} className="m-t-md p-x-md">
            <Col span={24}>
              <Card title={t('label.detail-plural')}>
                <Descriptions
                  bordered
                  column={2}
                  labelStyle={{ fontWeight: 600, width: '200px' }}
                  size="middle">
                  <Descriptions.Item label={t('label.name')}>
                    {attribute.name}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('label.display-name')}>
                    {attribute.displayName || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('label.description')} span={2}>
                    {attribute.description || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('label.asset-attribute-category')}>
                    <Tag color="geekblue">{getCategoryLabel(attribute.attributeCategory)}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('label.field-data-type')}>
                    <Tag color="green">{getDataTypeLabel(attribute.dataType)}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('label.required')}>
                    <Tag
                      color={attribute.required ? undefined : 'default'}
                      style={
                        attribute.required
                          ? {
                              color: '#cf1322',
                              background: '#fff1f0',
                              borderColor: '#ffa39e',
                            }
                          : undefined
                      }>
                      {attribute.required
                        ? t('label.asset-attribute-required')
                        : t('label.asset-attribute-optional')}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('label.version')}>
                    {attribute.version ?? '-'}
                  </Descriptions.Item>
                  {attribute.updatedBy && (
                    <Descriptions.Item label={t('label.updated-by')}>
                      {attribute.updatedBy}
                    </Descriptions.Item>
                  )}
                  {attribute.updatedAt && (
                    <Descriptions.Item label={t('label.last-updated')}>
                      {new Date(attribute.updatedAt).toLocaleString()}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            </Col>
          </Row>
        ),
      },
      {
        label: <TabsLabel id={TabSpecificField.ACTIVITY_FEED} name={t('label.activity-feed-plural')} />,
        key: TabSpecificField.ACTIVITY_FEED,
        children: (
          <div className="text-center p-lg">
            <p className="text-grey-muted">{t('message.feature-coming-soon')}</p>
          </div>
        ),
      },
    ];
  }, [attribute, t]);

  if (isLoading) {
    return <Loader />;
  }

  if (error || !attribute) {
    return (
      <ErrorPlaceHolder
        type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
        onClick={fetchAttribute}
      />
    );
  }

  return (
    <PageLayoutV1 pageTitle={attribute.displayName || attribute.name}>
      <Row gutter={[0, 12]}>
        <Col span={24}>
          <Row className="data-classification" gutter={[0, 12]}>
            <Col className="p-x-md" flex="1">
              <EntityHeader
                breadcrumb={breadcrumb}
                entityData={attribute as any}
                entityType={EntityType.TAG}
                icon={<IconTag className="h-9" style={{ color: DE_ACTIVE_COLOR }} />}
                serviceName={attribute.name}
                titleColor={BLACK_COLOR}
              />
            </Col>
            <Col className="p-x-md">
              <div className="d-flex self-end gap-2">
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
                <Tooltip title={t('label.version-plural-history')}>
                  <Button
                    icon={<Icon component={VersionIcon} />}
                    onClick={() =>
                      message.info(t('message.feature-coming-soon'))
                    }>
                    <Typography.Text>{attribute.version ?? '0.1'}</Typography.Text>
                  </Button>
                </Tooltip>
                <Dropdown
                  align={{ targetOffset: [-12, 0] }}
                  className="m-l-xs"
                  menu={{ items: manageButtonContent }}
                  open={showActions}
                  overlayStyle={{ width: '350px' }}
                  placement="bottomRight"
                  trigger={['click']}
                  onOpenChange={setShowActions}>
                  <Tooltip
                    placement="topRight"
                    title={t('label.manage-entity', {
                      entity: t('label.asset-attribute'),
                    })}>
                    <Button
                      className="flex-center"
                      data-testid="manage-button"
                      icon={<IconDropdown className="manage-dropdown-icon" />}
                      onClick={() => setShowActions(true)}
                    />
                  </Tooltip>
                </Dropdown>
              </div>
            </Col>
          </Row>
        </Col>

        <Col span={24}>
          <Tabs
            activeKey={activeTab}
            className="tabs-new"
            items={tabItems}
            onChange={handleTabChange}
          />
        </Col>
      </Row>

      <EntityDeleteModal
        bodyText={getEntityDeleteMessage(attribute.name, '')}
        entityName={attribute.name}
        entityType="AssetAttribute"
        visible={isDelete}
        onCancel={() => setIsDelete(false)}
        onConfirm={handleDelete}
      />

      <EntityNameModal
        allowRename
        entity={attribute as any}
        nameValidationRules={[
          {
            min: 1,
            max: 128,
            message: t('message.entity-size-in-between', {
              entity: t('label.name'),
              min: 1,
              max: 128,
            }),
          },
        ]}
        title={t('label.edit-entity', {
          entity: t('label.name'),
        })}
        visible={isNameEditing}
        onCancel={() => setIsNameEditing(false)}
        onSave={onNameSave as any}
      />
    </PageLayoutV1>
  );
};

export default AssetAttributeDetailPage;
