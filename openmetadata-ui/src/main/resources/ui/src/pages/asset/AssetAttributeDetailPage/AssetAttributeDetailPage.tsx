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
  Breadcrumb,
  Card,
  Col,
  Descriptions,
  message,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { AxiosError } from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../../components/common/Loader/Loader';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { ROUTES } from '../../../constants/constants';
import { AssetAttribute } from '../../../generated/entity/data/asset/assetAttribute';
import { getAssetAttributeByName } from '../../../rest/assetAPI';

const { Title, Text } = Typography;

// 属性分类常量（与 AssetAttributePage 保持一致）
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

const AssetAttributeDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { fqn } = useParams<{ fqn: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [attribute, setAttribute] = useState<AssetAttribute | null>(null);
  const [error, setError] = useState<AxiosError | null>(null);

  const fetchAttribute = useCallback(async () => {
    if (!fqn) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAssetAttributeByName(decodeURIComponent(fqn));
      setAttribute(data);
    } catch (err) {
      setError(err as AxiosError);
      message.error(t('message.entity-fetch-error'));
    } finally {
      setIsLoading(false);
    }
  }, [fqn, t]);

  useEffect(() => {
    fetchAttribute();
  }, [fetchAttribute]);

  // 获取分类显示名称
  const getCategoryLabel = (category: string) => {
    const info = ATTRIBUTE_CATEGORIES.find((c) => c.value === category);

    return info ? t(info.label) : category;
  };

  // 获取数据类型显示名称
  const getDataTypeLabel = (dataType: string) => {
    const info = DATA_TYPES.find((d) => d.value === dataType);

    return info ? t(info.label) : dataType;
  };

  return (
    <PageLayoutV1
      className="asset-attribute-detail-page"
      pageTitle={
        attribute?.displayName || attribute?.name || t('label.asset-attribute')
      }>
      <div className="p-lg">
        {/* 面包屑导航 */}
        <Breadcrumb className="m-b-md">
          <Breadcrumb.Item>
            <Link to={ROUTES.ASSET_ATTRIBUTES}>
              {t('label.asset-attribute-management')}
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            {attribute?.displayName || attribute?.name || '...'}
          </Breadcrumb.Item>
        </Breadcrumb>

        {isLoading ? (
          <Loader />
        ) : error ? (
          <ErrorPlaceHolder
            type={ERROR_PLACEHOLDER_TYPE.CUSTOM}
            onClick={fetchAttribute}
          />
        ) : attribute ? (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <Space className="w-full" direction="vertical" size="small">
                  <Title className="m-0" level={4}>
                    {attribute.displayName || attribute.name}
                  </Title>
                  <Text className="text-sm" type="secondary">
                    {attribute.name}
                  </Text>
                </Space>
              </Card>
            </Col>

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
                  <Descriptions.Item
                    label={t('label.asset-attribute-category')}>
                    <Tag>{getCategoryLabel(attribute.attributeCategory)}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('label.field-data-type')}>
                    <Tag color="blue">
                      {getDataTypeLabel(attribute.dataType)}
                    </Tag>
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
        ) : null}
      </div>
    </PageLayoutV1>
  );
};

export default AssetAttributeDetailPage;
