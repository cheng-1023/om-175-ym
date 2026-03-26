import React, { useCallback, useEffect, useState } from 'react';
import { Button, Popconfirm, Space, Table, Tag, Tooltip, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AssetCatalog } from '../../../generated/entity/data/asset/assetCatalog';
import { DataAsset } from '../../../generated/entity/data/asset/dataAsset';
import {
  getDataAssetsList,
  patchDataAssetByName,
} from '../../../rest/assetAPI';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';

interface DataAssetTabProps {
  activeNode: AssetCatalog;
  refreshFlag?: number;
}

const DataAssetTab: React.FC<DataAssetTabProps> = ({
  activeNode,
  refreshFlag,
}) => {
  const { t } = useTranslation();
  const [dataAssets, setDataAssets] = useState<DataAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!activeNode?.id) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      // 后端 getCatalogCondition() 按 catalog ID（UUID）在 entity_relationship 表做子查询
      const res = await getDataAssetsList({
        catalog: activeNode.id as string,
        limit: 1000,
        fields: 'catalog',
      });
      setDataAssets(res.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeNode?.id]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, refreshFlag]);

  // 移除数据资产与当前目录的关联
  const handleRemove = async (record: DataAsset) => {
    try {
      setRemovingId(record.id as string);
      const patch = [{ op: 'remove' as const, path: '/catalog' }];
      await patchDataAssetByName(
        record.fullyQualifiedName || record.name,
        patch
      );
      message.success(
        t('message.entity-updated-successfully', {
          entity: t('label.data-asset'),
        })
      );
      await fetchAssets();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || t('message.submit-failed'));
    } finally {
      setRemovingId(null);
    }
  };

  const columns = [
    {
      title: t('label.name'),
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string, record: DataAsset) => (
        <Space direction="vertical" size={0}>
          <Link
            className="font-bold text-primary"
            to={`/dataAsset/${record.fullyQualifiedName ?? text}`}>
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
      title: t('label.asset-type'),
      dataIndex: 'assetType',
      key: 'assetType',
      width: 150,
      render: (assetType: DataAsset['assetType']) => (
        <Tag color="geekblue">
          {assetType?.displayName || assetType?.name || '-'}
        </Tag>
      ),
    },
    {
      title: t('label.action'),
      key: 'action',
      width: 80,
      render: (_: unknown, record: DataAsset) => (
        <Popconfirm
          title={t('message.are-you-sure')}
          onConfirm={() => handleRemove(record)}>
          <Tooltip title={t('label.remove')}>
            <Button
              danger
              icon={<DeleteIcon height={16} width={16} />}
              loading={removingId === record.id}
              size="small"
              type="text"
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorPlaceHolder className="m-t-lg" />;
  }

  return (
    <div className="p-md glossary-term-table-container">
      <Table
        bordered
        columns={columns}
        dataSource={dataAssets}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        rowKey="id"
        size="small"
      />
    </div>
  );
};

export default DataAssetTab;
