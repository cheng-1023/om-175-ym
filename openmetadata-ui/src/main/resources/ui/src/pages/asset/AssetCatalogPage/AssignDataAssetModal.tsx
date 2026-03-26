import React, { useState, useEffect } from 'react';
import { Modal, Form, message, Select, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  patchDataAssetByName,
  getDataAssetByName,
  getDataAssetsList,
} from '../../../rest/assetAPI';

export interface AssignDataAssetModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  catalogId: string;
}

const AssignDataAssetModal: React.FC<AssignDataAssetModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  catalogId,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataAssets, setDataAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoadingAssets(true);
      getDataAssetsList({ limit: 1000 })
        .then((res) => {
          setDataAssets(res.data || []);
        })
        .catch(() => {
          message.error(
            t(
              'message.failed-to-fetch-data-assets',
              'Failed to fetch data assets'
            )
          );
        })
        .finally(() => setLoadingAssets(false));
    } else {
      setDataAssets([]);
    }
  }, [visible, t]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const selectedFqns: string[] = values.assets || [];

      if (selectedFqns.length === 0) {
        message.warning(
          t('message.select-at-least-one-entity', {
            entity: t('label.data-asset'),
          }) || 'Please select at least one data asset.'
        );

        return;
      }

      setIsSubmitting(true);

      const promises = selectedFqns.map(async (assetFqn) => {
        // Fetch current asset to check if catalog exists
        const asset = await getDataAssetByName(assetFqn, { fields: 'catalog' });
        const patch = [
          {
            op: (asset.catalog ? 'replace' : 'add') as 'replace' | 'add',
            path: '/catalog',
            value: { id: catalogId, type: 'assetCatalog' },
          },
        ];

        return patchDataAssetByName(assetFqn, patch);
      });

      await Promise.all(promises);

      message.success(
        t('message.entity-updated-successfully', {
          entity: t('label.data-asset-plural'),
        })
      );
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      console.error(error);
      const errMsg =
        error.response?.data?.message || t('message.submit-failed');
      message.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      confirmLoading={isSubmitting}
      open={visible}
      title={
        t('label.assign-entity', { entity: t('label.data-asset') }) ||
        'Assign Data Assets'
      }
      width={600}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleSubmit}>
      <Form form={form} layout="vertical">
        <Form.Item
          label={t('label.data-asset-plural')}
          name="assets"
          rules={[
            {
              required: true,
              message:
                t('message.field-text-required', {
                  fieldText: t('label.data-asset-plural'),
                }) || 'Please select data assets.',
            },
          ]}>
          <Select
            allowClear
            filterOption={(input, option) => {
              const label = String(option?.label || '').toLowerCase();

              return label.includes(input.toLowerCase());
            }}
            mode="multiple"
            notFoundContent={loadingAssets ? <Spin size="small" /> : null}
            options={dataAssets.map((asset) => ({
              label: asset.displayName || asset.name,
              value: asset.fullyQualifiedName || asset.name,
            }))}
            placeholder={
              t('label.search-entity', {
                entity: t('label.data-asset-plural'),
              }) || 'Search data assets...'
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignDataAssetModal;
