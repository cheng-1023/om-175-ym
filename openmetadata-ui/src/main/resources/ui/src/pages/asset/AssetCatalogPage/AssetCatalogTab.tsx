import Icon from '@ant-design/icons/lib/components/Icon';
import {
  Button,
  Col,
  Row,
  Space,
  Tooltip,
  TableProps,
  Modal,
  Checkbox,
  Card,
} from 'antd';
import { ColumnsType, ExpandableConfig } from 'antd/lib/table/interface';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { compare } from 'fast-json-patch';
import { cloneDeep, isEmpty, isUndefined } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES, PLACEHOLDER_ROUTE_FQN } from '../../../constants/constants';
import { ReactComponent as IconDrag } from '../../../assets/svg/drag.svg';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as IconDown } from '../../../assets/svg/ic-arrow-down.svg';
import { ReactComponent as IconRight } from '../../../assets/svg/ic-arrow-right.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as DownUpArrowIcon } from '../../../assets/svg/ic-down-up-arrow.svg';
import { ReactComponent as UpDownArrowIcon } from '../../../assets/svg/ic-up-down-arrow.svg';
import { ReactComponent as PlusOutlinedIcon } from '../../../assets/svg/plus-outlined.svg';
import { WarningOutlined } from '@ant-design/icons';
import DescriptionV1 from '../../../components/common/EntityDescription/DescriptionV1';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import { DraggableBodyRowProps } from '../../../components/common/Draggable/DraggableBodyRowProps.interface';
import RichTextEditorPreviewerNew from '../../../components/common/RichTextEditor/RichTextEditorPreviewNew';
import Table from '../../../components/common/Table/Table';
import { DE_ACTIVE_COLOR, TEXT_BODY_COLOR } from '../../../constants/constants';
import { TABLE_CONSTANTS } from '../../../constants/Teams.constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { AssetCatalog } from '../../../generated/entity/data/asset/assetCatalog';
import { AssetCategory } from '../../../generated/entity/data/asset/assetCategory';
import { OperationPermission } from '../../../context/PermissionProvider/PermissionProvider.interface';
import { patchAssetCatalog, patchAssetCategory } from '../../../rest/assetAPI';
import { showErrorToast } from '../../../utils/ToastUtils';
import { Transi18next } from '../../../utils/CommonUtils';
import { getEntityName } from '../../../utils/EntityUtils';

export interface AssetCatalogTabProps {
  activeNode: AssetCatalog | AssetCategory;
  catalogs: AssetCatalog[];
  permissions: OperationPermission;
  onEditCatalog?: (catalog: AssetCatalog) => void;
  onDeleteCatalog?: (catalog: AssetCatalog) => void;
  onAddCatalog?: (parentNode?: AssetCatalog) => void;
  refreshNodes?: () => Promise<void>;
}

// Tree Builder
const buildAssetCatalogTree = (
  catalogs: AssetCatalog[],
  parentId?: string,
  categoryId?: string
): (AssetCatalog & { children?: AssetCatalog[] })[] => {
  return catalogs
    .filter((c) => {
      if (parentId) {
        return c.parent?.id === parentId;
      }

      return (!c.parent || !c.parent.id) && c.category?.id === categoryId;
    })
    .map((c) => {
      const children = buildAssetCatalogTree(catalogs, c.id, categoryId);

      return {
        ...c,
        children: children.length > 0 ? children : undefined,
      } as any;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

// Extract Expandable Keys
const findExpandableKeys = (nodes: any[]): string[] => {
  let keys: string[] = [];
  nodes.forEach((node) => {
    if (node.children?.length) {
      keys.push(node.fullyQualifiedName || node.name);
      keys = keys.concat(findExpandableKeys(node.children));
    }
  });

  return keys;
};

const AssetCatalogTab: React.FC<AssetCatalogTabProps> = ({
  activeNode,
  catalogs,
  permissions,
  onEditCatalog,
  onDeleteCatalog,
  onAddCatalog,
  refreshNodes,
}) => {
  const { t } = useTranslation();
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [isTableHovered, setIsTableHovered] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Drag and Drop state
  const [movedCatalog, setMovedCatalog] =
    useState<{ from: AssetCatalog; to?: AssetCatalog }>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 描述组件的编辑态控制
  const [isDescriptionEditable, setIsDescriptionEditable] = useState(false);
  const onDescriptionEdit = () => setIsDescriptionEditable(true);
  const onDescriptionCancel = () => setIsDescriptionEditable(false);

  // Identify whether active node is category or catalog
  const isCategory = !('category' in activeNode);
  const categoryId = isCategory
    ? activeNode.id
    : (activeNode as AssetCatalog).category?.id;

  const treeData = useMemo(() => {
    const parentId = isCategory ? undefined : activeNode.id;

    return buildAssetCatalogTree(catalogs, parentId, categoryId);
  }, [catalogs, activeNode, isCategory, categoryId]);

  const expandableKeys = useMemo(
    () => findExpandableKeys(treeData),
    [treeData]
  );
  const isAllExpanded = expandedRowKeys.length === expandableKeys.length;

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedRowKeys([]);
    } else {
      setExpandedRowKeys(expandableKeys);
    }
  };

  const hasEditAccess = permissions.EditAll || permissions.EditDescription;

  const handleDescriptionUpdate = async (updatedHTML: string) => {
    try {
      if (isCategory) {
        const patch = compare(activeNode, {
          ...activeNode,
          description: updatedHTML,
        });
        await patchAssetCategory(activeNode.id || '', patch);
      } else {
        const patch = compare(activeNode, {
          ...activeNode,
          description: updatedHTML,
        });
        await patchAssetCatalog(activeNode.id || '', patch);
      }
      if (refreshNodes) {
        await refreshNodes();
      }
      setIsDescriptionEditable(false);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleMoveRow = useCallback(
    async (dragRecord: AssetCatalog, dropRecord?: AssetCatalog) => {
      if (dragRecord.id === dropRecord?.id) {
        return;
      }

      // Prevent dropping inside its own children
      let isDropTargetChild = false;
      const scanChildren = (node: any) => {
        if (node.id === dropRecord?.id) {
          isDropTargetChild = true;
        }
        if (node.children) {
          node.children.forEach(scanChildren);
        }
      };
      if (dragRecord.children) {
        dragRecord.children.forEach(scanChildren);
      }

      if (isDropTargetChild) {
        showErrorToast(t('message.cannot-move-catalog-to-child'));

        return;
      }

      setMovedCatalog({ from: dragRecord, to: dropRecord });
      setIsModalOpen(true);
    },
    [t]
  );

  const executeMove = async () => {
    if (!movedCatalog) {
      return;
    }
    setIsTableLoading(true);
    try {
      const { from, to } = movedCatalog;
      const newCatalogData = {
        ...from,
        parent: to ? { id: to.id, type: 'assetCatalog' } : null,
      };
      // Keep category same as drag target if it drops to root, else inherit category.
      // But actually they are all in same category inside this tab view.

      const jsonPatch = compare(from, newCatalogData);
      await patchAssetCatalog(from.id || '', jsonPatch);
      if (refreshNodes) {
        await refreshNodes();
      }
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsTableLoading(false);
      setIsModalOpen(false);
      setMovedCatalog(undefined);
    }
  };

  const handleTableHover = (value: boolean) => setIsTableHovered(value);

  const onTableRow: TableProps<any>['onRow'] = (record, index) =>
    ({
      index,
      handleMoveRow,
      handleTableHover,
      record,
    } as DraggableBodyRowProps<any>);

  const onTableHeader: TableProps<any>['onHeaderRow'] = () =>
    ({
      handleMoveRow,
      handleTableHover,
    } as DraggableBodyRowProps<any>);

  const columns: ColumnsType<any> = [
    {
      title: t('label.asset-catalog-plural'),
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (_, record: AssetCatalog) => {
        return (
          <Link
            className="font-bold text-blue-600 hover:text-blue-800"
            to={ROUTES.ASSET_CATALOG_DETAILS.replace(
              PLACEHOLDER_ROUTE_FQN,
              encodeURIComponent(record.fullyQualifiedName || record.name)
            )}>
            {record.displayName || record.name}
          </Link>
        );
      },
    },
    {
      title: t('label.description'),
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      render: (description: string) =>
        description?.trim() ? (
          <RichTextEditorPreviewerNew
            enableSeeMoreVariant
            markdown={description}
            maxLength={120}
          />
        ) : (
          <span className="text-grey-muted">{t('label.no-description')}</span>
        ),
    },

    {
      title: t('label.action'),
      key: 'action',
      width: '15%',
      render: (_, record: AssetCatalog) => (
        <Space size="small">
          <Tooltip
            title={t('label.add-entity', { entity: t('label.asset-catalog') })}>
            <Button
              className="add-new-term-btn text-grey-muted flex-center"
              icon={<PlusOutlinedIcon color={DE_ACTIVE_COLOR} width="14px" />}
              size="small"
              type="text"
              onClick={() => onAddCatalog && onAddCatalog(record)}
            />
          </Tooltip>
          <Tooltip
            title={t('label.edit-entity', {
              entity: t('label.asset-catalog'),
            })}>
            <Button
              icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
              size="small"
              type="text"
              onClick={() => onEditCatalog && onEditCatalog(record)}
            />
          </Tooltip>
          <Tooltip
            title={t('label.delete-entity', {
              entity: t('label.asset-catalog'),
            })}>
            <Button
              icon={<DeleteIcon height={16} width={16} />}
              size="small"
              type="text"
              onClick={() => onDeleteCatalog && onDeleteCatalog(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const expandableConfig: ExpandableConfig<any> = {
    expandIcon: ({ expanded, onExpand, record }) => {
      const hasChildren = record.children && record.children.length > 0;

      return hasChildren ? (
        <>
          <IconDrag className="m-r-xs drag-icon" height={12} width={8} />
          <Icon
            className="m-r-xs vertical-baseline cursor-pointer"
            component={expanded ? IconDown : IconRight}
            style={{ fontSize: '10px', color: TEXT_BODY_COLOR }}
            onClick={(e) => onExpand(record, e)}
          />
        </>
      ) : (
        <>
          <IconDrag className="m-r-xs drag-icon" height={12} width={8} />
          <span className="expand-cell-empty-icon-container" />
        </>
      );
    },
    expandedRowKeys,
    onExpand: (expanded, record) => {
      const key = record.fullyQualifiedName || record.name;
      if (expanded) {
        setExpandedRowKeys([...expandedRowKeys, key]);
      } else {
        setExpandedRowKeys(expandedRowKeys.filter((k) => k !== key));
      }
    },
  };

  return (
    <Row className="p-md" gutter={[0, 16]}>
      {/* 描述区域 */}
      <Col span={24}>
        <Card className="asset-catalog-description-card border-radius-md border-grey-200">
          <DescriptionV1
            removeBlur
            showActions
            showCommentsIcon
            description={activeNode.description}
            entityName={getEntityName(activeNode) || activeNode.name}
            entityType={'assetCatalog' as any}
            hasEditAccess={hasEditAccess}
            isEdit={isDescriptionEditable}
            onCancel={onDescriptionCancel}
            onDescriptionEdit={onDescriptionEdit}
            onDescriptionUpdate={handleDescriptionUpdate}
          />
        </Card>
      </Col>

      {/* 资产目录表格与控制区 */}
      <Col span={24}>
        <Card className="asset-catalog-table-card border-radius-md border-grey-200">
          <div className="flex justify-end p-b-sm">
            <Button
              className="text-primary remove-button-background-hover"
              size="small"
              type="text"
              onClick={toggleExpandAll}>
              <Space align="center" size={4}>
                <Icon
                  className="text-primary"
                  component={isAllExpanded ? DownUpArrowIcon : UpDownArrowIcon}
                  height="14px"
                />
                {isAllExpanded
                  ? t('label.collapse-all')
                  : t('label.expand-all')}
              </Space>
            </Button>
          </div>

          {treeData.length > 0 ? (
            <DndProvider backend={HTML5Backend}>
              <Table
                resizableColumns
                className={classNames('drop-over-background', {
                  'drop-over-table': isTableHovered,
                })}
                columns={columns}
                components={TABLE_CONSTANTS}
                dataSource={treeData}
                expandable={expandableConfig}
                loading={isTableLoading}
                pagination={false}
                rowKey={(record) => record.fullyQualifiedName || record.name}
                scroll={{ y: 500, x: true }}
                size="small"
                onHeaderRow={onTableHeader}
                onRow={onTableRow}
              />
            </DndProvider>
          ) : (
            <ErrorPlaceHolder
              permission
              className="border-none"
              type={ERROR_PLACEHOLDER_TYPE.NO_DATA}
              onClick={() => onAddCatalog && onAddCatalog()}
            />
          )}
        </Card>
      </Col>

      {/* 拖动确认 Modal */}
      <Modal
        centered
        destroyOnClose
        closable={false}
        confirmLoading={isTableLoading}
        maskClosable={false}
        okText={t('label.move')}
        open={isModalOpen}
        title={
          <>
            <WarningOutlined className="m-r-xs warning-icon text-warning" />
            {t('label.move-the-entity', {
              entity: t('label.asset-catalog'),
            })}
          </>
        }
        onCancel={() => {
          setIsModalOpen(false);
          setMovedCatalog(undefined);
        }}
        onOk={executeMove}>
        <Transi18next
          i18nKey="message.entity-transfer-message"
          renderElement={<strong />}
          values={{
            from: movedCatalog?.from?.name,
            to: movedCatalog?.to?.name ?? getEntityName(activeNode),
            entity: isUndefined(movedCatalog?.to)
              ? ''
              : t('label.asset-catalog'),
          }}
        />
      </Modal>
    </Row>
  );
};

export default AssetCatalogTab;
