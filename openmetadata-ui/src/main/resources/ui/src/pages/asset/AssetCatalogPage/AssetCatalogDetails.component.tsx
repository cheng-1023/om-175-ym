import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  Dropdown,
  Space,
  Tabs,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { DownOutlined, LikeOutlined, DislikeOutlined } from '@ant-design/icons';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as ExportIcon } from '../../../assets/svg/ic-export.svg';
import { ReactComponent as ImportIcon } from '../../../assets/svg/ic-import.svg';
import { ReactComponent as VersionIcon } from '../../../assets/svg/ic-version.svg';
import { ReactComponent as IconDropdown } from '../../../assets/svg/menu.svg';
import Icon from '@ant-design/icons';
import ButtonGroup from 'antd/lib/button/button-group';
import { Row, Col, Card } from 'antd';
import { ManageButtonItemLabel } from '../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
import TabsLabel from '../../../components/common/TabsLabel/TabsLabel.component';
import { ActivityFeedTab } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import { ActivityFeedLayoutType } from '../../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.interface';
import { FEED_COUNT_INITIAL_DATA } from '../../../constants/entity.constants';
import { PLACEHOLDER_ROUTE_FQN, ROUTES } from '../../../constants/constants';
import { AssetCatalog } from '../../../generated/entity/data/asset/assetCatalog';
import { AssetCategory } from '../../../generated/entity/data/asset/assetCategory';
import AssetCatalogTab from './AssetCatalogTab';
import AssignDataAssetModal from './AssignDataAssetModal';
import DataAssetTab from './DataAssetTab';
import Voting from '../../../components/Entity/Voting/Voting.component';
import { VotingDataProps } from '../../../components/Entity/Voting/voting.interface';
import {
  updateAssetCatalogVotes,
  updateAssetCategoryVotes,
} from '../../../rest/assetAPI';

const { Title, Text } = Typography;

interface AssetCatalogDetailsProps {
  activeNode: AssetCatalog | AssetCategory;
  categories: AssetCategory[];
  catalogs: AssetCatalog[];
  activeTab: string;
  setActiveTab: (key: string) => void;
  // actions
  onBreadcrumbRootClick: () => void;
  onBreadcrumbNodeClick: (fqn: string) => void;
  onAddCatalog: (parentCatalog?: AssetCatalog) => void;
  onEditCatalog: (catalog: AssetCatalog) => void;
  onEditCategory: () => void;
  onDeleteCatalog: (catalog: AssetCatalog) => void;
  onDeleteCategory: () => void;
  onMoveCatalog: () => void;
  onExportCatalogs: () => void;
  onImportCatalogs: () => void;
  fetchCatalogs: () => Promise<any>;
}

const AssetCatalogDetails: React.FC<AssetCatalogDetailsProps> = ({
  activeNode,
  categories,
  catalogs,
  activeTab,
  setActiveTab,
  onBreadcrumbRootClick,
  onBreadcrumbNodeClick,
  onAddCatalog,
  onEditCatalog,
  onEditCategory,
  onDeleteCatalog,
  onDeleteCategory,
  onMoveCatalog,
  onExportCatalogs,
  onImportCatalogs,
  fetchCatalogs,
}) => {
  const { t } = useTranslation();
  const history = useHistory();

  const isCatalog = 'category' in activeNode;
  const [isAssignDataAssetModalVisible, setIsAssignDataAssetModalVisible] =
    React.useState(false);
  const [refreshAssetsFlag, setRefreshAssetsFlag] = React.useState(0);

  // 当从 Catalog 切换到 Category 时，若当前 Tab 为 assets（仅 Catalog 有），自动回退到 catalogs
  React.useEffect(() => {
    if (!isCatalog && activeTab === 'assets') {
      setActiveTab('catalogs');
    }
  }, [isCatalog, activeTab, setActiveTab]);

  const handleUpdateVote = async (data: VotingDataProps, id: string) => {
    try {
      if (isCatalog) {
        await updateAssetCatalogVotes(id, data);
        await fetchCatalogs();
      } else {
        await updateAssetCategoryVotes(id, data);
        // category 的列表可能没取 vote，但暂且刷新数据列表
        // 或者可以局部更新 vote 状态.
      }
    } catch (error) {
      message.error(t('message.entity-update-error'));
    }
  };

  const detailBreadcrumbs = useMemo(() => {
    if (!activeNode) {
      return null;
    }

    const list = [];
    // 1. Root link
    list.push(
      <Breadcrumb.Item key="root">
        <a onClick={onBreadcrumbRootClick}>{t('label.asset-catalog-plural')}</a>
      </Breadcrumb.Item>
    );

    // 2. 向上追溯完整路径
    const pathNodes = [];
    if ('category' in activeNode) {
      let current = activeNode as any;
      pathNodes.unshift(current);
      while (current.parent) {
        const parentNode = catalogs.find((c) => c.id === current.parent.id);
        if (parentNode) {
          pathNodes.unshift(parentNode);
          current = parentNode;
        } else {
          break;
        }
      }
      const categoryNode = categories.find(
        (c) => c.id === current.category?.id
      );
      if (categoryNode) {
        pathNodes.unshift(categoryNode);
      }
    } else {
      pathNodes.unshift(activeNode);
    }

    // 3. 渲染为 Breadcrumb.Item
    pathNodes.forEach((node, index) => {
      const isLast = index === pathNodes.length - 1;
      if (isLast) {
        return; // 要求：不到当前级别
      }

      const name = node.displayName || node.name;
      list.push(
        <Breadcrumb.Item key={node.id}>
          <a
            onClick={() =>
              onBreadcrumbNodeClick(node.fullyQualifiedName || node.name)
            }>
            {name}
          </a>
        </Breadcrumb.Item>
      );
    });

    return list;
  }, [
    activeNode,
    categories,
    catalogs,
    t,
    onBreadcrumbRootClick,
    onBreadcrumbNodeClick,
  ]);

  return (
    <div
      className="glossary-page-tabs h-full"
      style={{ backgroundColor: '#f9f9f9' }}>
      <div>
        <Breadcrumb className="m-b-md p-x-md p-t-md">
          {detailBreadcrumbs}
        </Breadcrumb>
        <div className="glossary-header flex gap-4 justify-between no-wrap p-b-md p-x-md">
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
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'add-catalog',
                      label: t('label.asset-catalog'),
                      onClick: () =>
                        onAddCatalog(
                          isCatalog ? (activeNode as AssetCatalog) : undefined
                        ),
                    },
                    ...(isCatalog
                      ? [
                          {
                            key: 'add-data-asset',
                            label: t('label.data-asset'),
                            onClick: () =>
                              setIsAssignDataAssetModalVisible(true),
                          },
                        ]
                      : []),
                  ],
                }}
                trigger={['click']}>
                <Button className="m-l-xs" type="primary">
                  {t('label.add')} <DownOutlined />
                </Button>
              </Dropdown>

              <ButtonGroup className="spaced" size="small">
                <Voting
                  disabled={false}
                  votes={activeNode.votes}
                  onUpdateVote={async (data) => {
                    await handleUpdateVote(data, activeNode.id);
                  }}
                />
                <Tooltip title={t('label.version-plural-history')}>
                  <Button
                    icon={<Icon component={VersionIcon} />}
                    onClick={() =>
                      message.info(t('message.feature-coming-soon'))
                    }>
                    <Typography.Text>
                      {activeNode.version || '0.1'}
                    </Typography.Text>
                  </Button>
                </Tooltip>

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
                          onExportCatalogs();
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
                          onImportCatalogs();
                        },
                      },
                      {
                        label: (
                          <ManageButtonItemLabel
                            description={t('message.rename-entity', {
                              entity: t(
                                isCatalog
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
                          isCatalog
                            ? onEditCatalog(activeNode as AssetCatalog)
                            : onEditCategory();
                        },
                      },
                      ...(isCatalog
                        ? [
                            {
                              label: (
                                <ManageButtonItemLabel
                                  description={t('message.modify-hierarchy-entity-description', {
                                    entity: t('label.asset-catalog'),
                                  })}
                                  icon={EditIcon}
                                  id="move-button"
                                  name={t('label.change-parent-entity', {
                                    entity: t('label.asset-catalog'),
                                  })}
                                />
                              ),
                              key: 'move-button',
                              onClick: (e: any) => {
                                e.domEvent.stopPropagation();
                                onMoveCatalog();
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
                                  isCatalog
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
                          isCatalog
                            ? onDeleteCatalog(activeNode as AssetCatalog)
                            : onDeleteCategory();
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
      </div>

      <div className="p-x-md p-b-md">
        <Tabs
          activeKey={activeTab}
          className="tabs-new"
          items={[
            {
              key: 'catalogs',
              label: (
                <TabsLabel id="catalogs" name={t('label.asset-catalog')} />
              ),
              children: (
                <Row
                  className="p-md glossary-term-table-container"
                  gutter={[16, 16]}>
                  <Col span={24}>
                    <AssetCatalogTab
                      activeNode={activeNode}
                      catalogs={catalogs}
                      permissions={
                        { EditAll: true, EditDescription: true } as any
                      }
                      refreshNodes={async () => {
                        await fetchCatalogs();
                      }}
                      onAddCatalog={(parent) => {
                        onAddCatalog(parent);
                      }}
                      onDeleteCatalog={onDeleteCatalog}
                      onEditCatalog={onEditCatalog}
                    />
                  </Col>
                </Row>
              ),
            },
            ...(isCatalog
              ? [
                  {
                    key: 'assets',
                    label: (
                      <TabsLabel
                        id="assets"
                        name={t('label.data-asset-plural')}
                      />
                    ),
                    children: (
                      <DataAssetTab
                        activeNode={activeNode}
                        refreshFlag={refreshAssetsFlag}
                      />
                    ),
                  },
                ]
              : []),
            {
              key: 'activity_feed',
              label: (
                <TabsLabel
                  id="activity_feed"
                  name={t('label.activity-feed-and-task-plural')}
                />
              ),
              children: (
                <div className="p-md glossary-term-table-container">
                  <ActivityFeedTab
                    entityType={
                      (isCatalog ? 'assetCatalog' : 'assetCategory') as any
                    }
                    feedCount={FEED_COUNT_INITIAL_DATA}
                    hasGlossaryReviewer={false}
                    layoutType={ActivityFeedLayoutType.THREE_PANEL}
                    owners={[]}
                    onFeedUpdate={() => {}}
                  />
                </div>
              ),
            },
          ]}
          onChange={(k) => setActiveTab(k)}
        />
      </div>

      <AssignDataAssetModal
        catalogId={activeNode.id as string}
        visible={isAssignDataAssetModalVisible}
        onCancel={() => setIsAssignDataAssetModalVisible(false)}
        onSuccess={() => {
          setIsAssignDataAssetModalVisible(false);
          // 刷新列表数据
          fetchCatalogs();
          setRefreshAssetsFlag((prev) => prev + 1);
        }}
      />
    </div>
  );
};

export default AssetCatalogDetails;
