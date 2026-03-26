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

import { Card, Empty, Table, Tooltip, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import { DataAsset } from '../../../generated/entity/data/asset/dataAsset';
import {
  getAssetAttributesList,
  getAssetTypeByName,
} from '../../../rest/assetAPI';
import Loader from '../../../components/common/Loader/Loader';

// 属性分类常量（同主页面保持一致）
const ATTRIBUTE_CATEGORIES = [
  { value: 'basic', label: 'label.asset-attribute-category-basic' },
  { value: 'technical', label: 'label.asset-attribute-category-technical' },
  { value: 'business', label: 'label.asset-attribute-category-business' },
  { value: 'quality', label: 'label.asset-attribute-category-quality' },
  { value: 'security', label: 'label.asset-attribute-category-security' },
];

// 自定义字段值截断阈值（字符数）
const VALUE_TRUNCATE_LENGTH = 50;

interface DataAssetDetailPanelProps {
  /** 当前选中的数据资产 */
  selectedAsset: DataAsset;
}

/**
 * 数据资产概览页右侧详情面板。
 * 展示基本信息 + 按分类排列的动态属性值。
 */
const DataAssetDetailPanel: React.FC<DataAssetDetailPanelProps> = ({
  selectedAsset,
}) => {
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [dynamicAttributes, setDynamicAttributes] = useState<AssetAttribute[]>(
    []
  );

  // 加载该资产类型所关联的动态属性定义
  const fetchDynamicAttributes = useCallback(async () => {
    // assetType 可能是 EntityReference 对象或纯字符串（来自 ES）
    const assetTypeName =
      typeof selectedAsset.assetType === 'string'
        ? selectedAsset.assetType
        : selectedAsset.assetType?.name ||
          selectedAsset.assetType?.fullyQualifiedName;

    if (!assetTypeName) {
      setDynamicAttributes([]);

      return;
    }

    setIsLoading(true);
    try {
      // 1. 获取该 assetType 下的属性名列表
      const typeDetail = await getAssetTypeByName(assetTypeName, {
        fields: 'attributes',
      });
      const attrNames = (typeDetail.attributes || []).map(
        (a: any) => a.name || a
      );

      if (attrNames.length === 0) {
        setDynamicAttributes([]);

        return;
      }

      // 2. 获取所有属性的完整定义
      const allAttrs = await getAssetAttributesList({ limit: 1000 });
      const matched = (allAttrs.data || []).filter((a: AssetAttribute) =>
        attrNames.includes(a.name)
      );
      setDynamicAttributes(matched);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('加载动态属性失败:', e);
      setDynamicAttributes([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAsset]);

  useEffect(() => {
    fetchDynamicAttributes();
  }, [fetchDynamicAttributes]);

  // 获取属性值的辅助函数
  const getAttributeValue = useCallback(
    (attrName: string): string => {
      // 先从 attributeValues 数组中查找
      if (selectedAsset.attributeValues) {
        const found = selectedAsset.attributeValues.find(
          (v) => v.name === attrName
        );
        if (found && found.value !== undefined && found.value !== null) {
          return String(found.value);
        }
      }
      // 再从 extension 对象中查找
      if (
        selectedAsset.extension &&
        selectedAsset.extension[attrName] !== undefined
      ) {
        return String(selectedAsset.extension[attrName]);
      }

      return '-';
    },
    [selectedAsset]
  );

  // 按分类分组动态属性
  const categorizedAttributes = useMemo(() => {
    return ATTRIBUTE_CATEGORIES.map((category) => {
      const attrs = dynamicAttributes.filter(
        (a) => a.attributeCategory === category.value
      );

      return {
        ...category,
        attrs,
      };
    }).filter((c) => c.attrs.length > 0);
  }, [dynamicAttributes]);

  return (
    <Card
      className="summary-panel-container h-full"
      title={
        <Link
          className="no-underline"
          to={`/dataAsset/${
            selectedAsset.fullyQualifiedName ?? selectedAsset.name
          }`}>
          <Typography.Text
            className="m-b-0 d-block summary-panel-title"
            ellipsis={{ tooltip: true }}
            style={{ color: '#1890ff', fontWeight: 600, fontSize: 16 }}>
            {selectedAsset.displayName || selectedAsset.name}
          </Typography.Text>
        </Link>
      }>
      {/* 动态属性区域 */}
      <div className="p-sm">
        <Typography.Text strong className="d-block m-b-sm">
          {t('label.asset-attributes')}
        </Typography.Text>

        {isLoading ? (
          <Loader />
        ) : categorizedAttributes.length === 0 ? (
          <Empty
            description={t('label.no-data-found')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          categorizedAttributes.map((category) => (
            <div className="m-b-md" key={category.value}>
              <Typography.Text
                className="d-block m-b-xs"
                style={{ color: '#595959', fontWeight: 500 }}>
                {t(category.label)}
              </Typography.Text>
              <Table
                columns={[
                  {
                    title: t('label.name'),
                    dataIndex: 'name',
                    key: 'name',
                    width: '45%',
                    render: (_: unknown, record: AssetAttribute) =>
                      record.displayName || record.name,
                  },
                  {
                    title: t('label.value'),
                    dataIndex: 'value',
                    key: 'value',
                    render: (_: unknown, record: AssetAttribute) => {
                      const val = getAttributeValue(record.name);

                      if (val === '-') {
                        return (
                          <Typography.Text type="secondary">-</Typography.Text>
                        );
                      }

                      // 超过阈值长度时截断并悬浮显示完整内容
                      if (val.length > VALUE_TRUNCATE_LENGTH) {
                        return (
                          <Tooltip
                            title={val}
                            overlayStyle={{ maxWidth: 400 }}>
                            <Typography.Text
                              style={{ maxWidth: '100%', display: 'inline-block' }}>
                              {val.slice(0, VALUE_TRUNCATE_LENGTH)}...
                            </Typography.Text>
                          </Tooltip>
                        );
                      }

                      return val;
                    },
                  },
                ]}
                dataSource={category.attrs}
                pagination={false}
                rowKey="name"
                showHeader={false}
                size="small"
              />
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default DataAssetDetailPanel;
