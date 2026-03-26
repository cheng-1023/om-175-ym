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
  Dropdown,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { cloneDeep, isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';

import Icon, {
  LikeOutlined,
  DislikeOutlined,
  CheckOutlined,
} from '@ant-design/icons';
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
import {
  BLACK_COLOR,
  DE_ACTIVE_COLOR,
  ROUTES,
  PLACEHOLDER_ROUTE_FQN,
} from '../../../constants/constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { EntityType } from '../../../enums/entity.enum';
import { getEntityDeleteMessage } from '../../../utils/CommonUtils';
import { showErrorToast, showSuccessToast } from '../../../utils/ToastUtils';

import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import {
  deleteAssetAttributeByName,
  getAssetAttributeByName,
  patchAssetAttributeByName,
  updateAssetAttributeVotes,
} from '../../../rest/assetAPI';
import { getRoles } from '../../../rest/rolesAPIV1';
import { Role } from '../../../generated/entity/teams/role';

import Voting from '../../../components/Entity/Voting/Voting.component';
import { VotingDataProps } from '../../../components/Entity/Voting/voting.interface';
import ActivityFeedProvider from '../../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import { ActivityFeedLayoutType } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.interface';
import { FEED_COUNT_INITIAL_DATA } from '../../../constants/entity.constants';
import { FeedCounts } from '../../../interface/feed.interface';
import { getFeedCounts } from '../../../utils/CommonUtils';
import { useApplicationStore } from '../../../hooks/useApplicationStore';

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

  const { currentUser } = useApplicationStore();
  const [feedCount, setFeedCount] = useState<FeedCounts>(
    FEED_COUNT_INITIAL_DATA
  );
  const [activeTab, setActiveTab] = useState<string>(TabSpecificField.OVERVIEW);
  const [isNameEditing, setIsNameEditing] = useState<boolean>(false);
  const [isDelete, setIsDelete] = useState<boolean>(false);
  const [showActions, setShowActions] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const getEntityFeedCount = useCallback(() => {
    if (attribute) {
      getFeedCounts(
        'assetAttribute' as any,
        attribute.fullyQualifiedName || attribute.name,
        setFeedCount
      );
    }
  }, [attribute]);

  useEffect(() => {
    if (attribute) {
      getEntityFeedCount();
    }
  }, [attribute, getEntityFeedCount]);

  const handleUpdateVote = async (data: VotingDataProps, id: string) => {
    try {
      await updateAssetAttributeVotes(id, data);
      await fetchAttribute();
    } catch (error) {
      message.error(t('message.entity-update-error'));
    }
  };

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
    if (!fqn) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAssetAttributeByName(decodeURIComponent(fqn), {
        fields: 'assignableRoles',
      });
      setAttribute(data);
    } catch (err) {
      setError(err as AxiosError);
      showErrorToast(err as AxiosError, t('message.entity-fetch-error'));
    } finally {
      setIsLoading(false);
    }
  }, [fqn, t]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await getRoles('', undefined, undefined, false, 100);
      setRoles(response.data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  }, []);

  useEffect(() => {
    fetchAttribute();
    fetchRoles();
  }, [fetchAttribute, fetchRoles]);

  const handleTabChange = (activeKey: string) => {
    setActiveTab(activeKey);
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
        const response = await patchAssetAttributeByName(
          attribute.name,
          jsonPatch
        );
        setAttribute(response.data || response);
        setIsNameEditing(false);
        // 如果名字改了，重新跳转 URL
        if (name !== attribute.name) {
          history.push(
            ROUTES.ASSET_ATTRIBUTE_DETAILS.replace(':fqn', name || '')
          );
        }
      } catch (err) {
        showErrorToast(err as AxiosError);
      }
    }
  };

  const handleFieldUpdate = async (field: keyof AssetAttribute, value: any) => {
    if (!attribute) {
      return;
    }

    if (isEqual(attribute[field], value)) {
      return;
    }

    const updatedDetails = {
      ...cloneDeep(attribute),
      [field]: typeof value === 'string' ? value.trim() : value,
    };

    const jsonPatch = compare(attribute, updatedDetails);
    try {
      const response = await patchAssetAttributeByName(
        attribute.name,
        jsonPatch
      );
      setAttribute(response.data || response);
      showSuccessToast(
        t('server.entity-updated-successfully', {
          entity: t('label.asset-attribute'),
        })
      );
    } catch (err) {
      showErrorToast(err as AxiosError);
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
    if (!attribute) {
      return [];
    }

    const tableData = [
      {
        key: 'description',
        name: t('label.description'),
        value: attribute.description || '-',
      },
      {
        key: 'attributeCategory',
        name: t('label.asset-attribute-category'),
        value: t(
          ATTRIBUTE_CATEGORIES.find(
            (c) => c.value === attribute.attributeCategory
          )?.label || ''
        ),
      },
      {
        key: 'dataType',
        name: t('label.field-data-type'),
        value: t(
          DATA_TYPES.find((c) => c.value === attribute.dataType)?.label ||
            attribute.dataType
        ),
      },
      {
        key: 'required',
        name: t('label.required'),
        value: attribute.required ? t('label.yes') : t('label.no'),
      },
      {
        key: 'assignableRoles',
        name: t('label.assignable-roles', '填写人员'),
        value:
          attribute.assignableRoles && attribute.assignableRoles.length > 0 ? (
            <div className="d-flex flex-wrap gap-2">
              {attribute.assignableRoles.map((roleName) => {
                const matchedRole = roles.find((r) => r.name === roleName);

                return (
                  <Tag key={roleName}>
                    {matchedRole?.displayName || roleName}
                  </Tag>
                );
              })}
            </div>
          ) : (
            '-'
          ),
      },
    ];

    return [
      {
        label: (
          <TabsLabel
            id={TabSpecificField.OVERVIEW}
            name={t('label.overview')}
          />
        ),
        key: TabSpecificField.OVERVIEW,
        children: (
          <div className="p-t-md p-x-md">
            <Table
              columns={[
                {
                  title: t('label.name'),
                  dataIndex: 'name',
                  key: 'name',
                  width: '30%',
                },
                {
                  title: t('label.value'),
                  dataIndex: 'value',
                  key: 'value',
                  render: (_: any, record: any) =>
                    editingField === record.key ? (
                      record.key === 'description' ? (
                        <Input.TextArea
                          autoSize={{ minRows: 1 }}
                          size="small"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                        />
                      ) : record.key === 'attributeCategory' ? (
                        <Select
                          options={ATTRIBUTE_CATEGORIES.map((c: any) => ({
                            value: c.value,
                            label: t(c.label),
                          }))}
                          size="small"
                          style={{ width: '100%' }}
                          value={editingValue}
                          onChange={setEditingValue}
                        />
                      ) : record.key === 'dataType' ? (
                        <Select
                          options={DATA_TYPES.map((c: any) => ({
                            value: c.value,
                            label: t(c.label),
                          }))}
                          size="small"
                          style={{ width: '100%' }}
                          value={editingValue}
                          onChange={setEditingValue}
                        />
                      ) : record.key === 'required' ? (
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          value={editingValue}
                          onChange={setEditingValue}>
                          <Select.Option value>{t('label.yes')}</Select.Option>
                          <Select.Option value={false}>
                            {t('label.no')}
                          </Select.Option>
                        </Select>
                      ) : record.key === 'assignableRoles' ? (
                        <Select
                          mode="multiple"
                          options={roles.map((r) => ({
                            value: r.name,
                            label: r.displayName || r.name,
                          }))}
                          placeholder={t(
                            'label.select-roles',
                            '请选择填写人员（角色）'
                          )}
                          size="small"
                          style={{ width: '100%' }}
                          value={editingValue || []}
                          onChange={setEditingValue}
                        />
                      ) : null
                    ) : (
                      record.value || '-'
                    ),
                },
                {
                  title: t('label.action-plural'),
                  key: 'action',
                  width: 140,
                  render: (_: any, record: any) =>
                    editingField === record.key ? (
                      <Space size={4}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => {
                            handleFieldUpdate(
                              record.key as keyof AssetAttribute,
                              editingValue
                            );
                            setEditingField(null);
                          }}>
                          {t('label.save')}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setEditingField(null)}>
                          {t('label.cancel')}
                        </Button>
                      </Space>
                    ) : (
                      <Button
                        icon={<EditIcon className="table-action-icon" />}
                        size="small"
                        type="text"
                        onClick={() => {
                          setEditingField(record.key);
                          setEditingValue(
                            attribute[record.key as keyof AssetAttribute]
                          );
                        }}
                      />
                    ),
                },
              ]}
              dataSource={tableData}
              pagination={false}
              rowKey="key"
              size="small"
            />
          </div>
        ),
      },
      {
        label: (
          <TabsLabel
            count={feedCount.totalCount}
            id={TabSpecificField.ACTIVITY_FEED}
            name={t('label.activity-feed-plural')}
          />
        ),
        key: TabSpecificField.ACTIVITY_FEED,
        children: (
          <div className="p-md glossary-term-table-container">
            <ActivityFeedTab
              entityType={'assetAttribute' as any}
              feedCount={feedCount}
              hasGlossaryReviewer={false}
              layoutType={ActivityFeedLayoutType.THREE_PANEL}
              owners={[]}
              onFeedUpdate={getEntityFeedCount}
            />
          </div>
        ),
      },
    ];
  }, [attribute, t, editingField, editingValue]);

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
    <ActivityFeedProvider user={currentUser?.id}>
      <PageLayoutV1 pageTitle={attribute.displayName || attribute.name}>
        <Row gutter={[0, 12]}>
          <Col span={24}>
            <Row className="data-classification" gutter={[0, 12]}>
              <Col className="p-x-md" flex="1">
                <EntityHeader
                  breadcrumb={breadcrumb}
                  entityData={attribute as any}
                  entityType={EntityType.TAG}
                  icon={
                    <IconTag
                      className="h-9"
                      style={{ color: DE_ACTIVE_COLOR }}
                    />
                  }
                  serviceName={attribute.name}
                  titleColor={BLACK_COLOR}
                />
              </Col>
              <Col className="p-x-md">
                <div className="d-flex self-end gap-2">
                  <Voting
                    disabled={false}
                    votes={attribute.votes}
                    onUpdateVote={async (data) =>
                      await handleUpdateVote(data, attribute.id)
                    }
                  />
                  <Tooltip title={t('label.version-plural-history')}>
                    <Button
                      icon={<Icon component={VersionIcon} />}
                      onClick={() =>
                        history.push(
                          ROUTES.ASSET_ATTRIBUTE_VERSION.replace(
                            PLACEHOLDER_ROUTE_FQN,
                            attribute.fullyQualifiedName || attribute.name
                          )
                        )
                      }>
                      <Typography.Text>
                        {attribute.version ?? '0.1'}
                      </Typography.Text>
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
    </ActivityFeedProvider>
  );
};

export default AssetAttributeDetailPage;
