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

import { AxiosResponse } from 'axios';
import { Operation } from 'fast-json-patch';
import { PagingResponse } from 'Models';
import { CSVExportResponse } from '../components/Entity/EntityExportModalProvider/EntityExportModalProvider.interface';
import { CreateAssetAttribute } from '../generated/api/data/asset/createAssetAttribute';
import { CreateAssetCatalog } from '../generated/api/data/asset/createAssetCatalog';
import { CreateAssetCategory } from '../generated/api/data/asset/createAssetCategory';
import { CreateAssetType } from '../generated/api/data/asset/createAssetType';
import { CreateDataAsset } from '../generated/api/data/asset/createDataAsset';
import { AssetAttribute } from '../generated/entity/data/asset/assetAttribute';
import { AssetCatalog } from '../generated/entity/data/asset/assetCatalog';
import { AssetCategory } from '../generated/entity/data/asset/assetCategory';
import { AssetType } from '../generated/entity/data/asset/assetType';
import { DataAsset } from '../generated/entity/data/asset/dataAsset';
import { getEncodedFqn } from '../utils/StringsUtils';
import APIClient from './index';

// ==================== AssetCategory ====================

const ASSET_CATEGORIES_BASE_URL = '/assetCategories';
const ASSET_CATALOGS_BASE_URL = '/assetCatalogs';
const ASSET_ATTRIBUTES_BASE_URL = '/assetAttributes';
const ASSET_TYPES_BASE_URL = '/assetTypes';
const DATA_ASSETS_BASE_URL = '/dataAssets';

export type AssetCategoryParams = {
  fields?: string;
  limit?: number;
  before?: string;
  after?: string;
  include?: string;
};

export type AssetCatalogParams = AssetCategoryParams;

export type AssetAttributeParams = AssetCategoryParams & {
  attributeCategory?: string;
};

export type AssetTypeParams = AssetCategoryParams;

export type DataAssetParams = AssetCategoryParams & {
  assetType?: string;
  catalog?: string;
};

// ==================== AssetCategory API ====================

export const getAssetCategoriesList = async (params?: AssetCategoryParams) => {
  const response = await APIClient.get<PagingResponse<AssetCategory[]>>(
    ASSET_CATEGORIES_BASE_URL,
    { params }
  );

  return response.data;
};

export const getAssetCategoryByName = async (
  fqn: string,
  params?: AssetCategoryParams
) => {
  const response = await APIClient.get<AssetCategory>(
    `${ASSET_CATEGORIES_BASE_URL}/name/${getEncodedFqn(fqn)}`,
    { params }
  );

  return response.data;
};

export const getAssetCategoryById = async (
  id: string,
  params?: AssetCategoryParams
) => {
  const response = await APIClient.get<AssetCategory>(
    `${ASSET_CATEGORIES_BASE_URL}/${id}`,
    {
      params,
    }
  );

  return response.data;
};

export const createAssetCategory = async (data: CreateAssetCategory) => {
  const response = await APIClient.post<
    CreateAssetCategory,
    AxiosResponse<AssetCategory>
  >(ASSET_CATEGORIES_BASE_URL, data);

  return response.data;
};

export const createOrUpdateAssetCategory = async (
  data: CreateAssetCategory
) => {
  const response = await APIClient.put<
    CreateAssetCategory,
    AxiosResponse<AssetCategory>
  >(ASSET_CATEGORIES_BASE_URL, data);

  return response.data;
};

export const patchAssetCategory = async (id: string, patch: Operation[]) => {
  const response = await APIClient.patch<
    Operation[],
    AxiosResponse<AssetCategory>
  >(`${ASSET_CATEGORIES_BASE_URL}/${id}`, patch);

  return response.data;
};

export const patchAssetCategoryByName = async (
  fqn: string,
  patch: Operation[]
) => {
  const response = await APIClient.patch<
    Operation[],
    AxiosResponse<AssetCategory>
  >(`${ASSET_CATEGORIES_BASE_URL}/name/${getEncodedFqn(fqn)}`, patch);

  return response.data;
};

export const deleteAssetCategory = async (
  id: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(
    `${ASSET_CATEGORIES_BASE_URL}/${id}`,
    {
      params: { recursive, hardDelete },
    }
  );

  return response.data;
};

export const deleteAssetCategoryByName = async (
  name: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(
    `${ASSET_CATEGORIES_BASE_URL}/name/${getEncodedFqn(name)}`,
    {
      params: { recursive, hardDelete },
    }
  );

  return response.data;
};

export const exportAssetCategories = async (name: string) => {
  const response = await APIClient.get<string>(
    `${ASSET_CATEGORIES_BASE_URL}/name/${getEncodedFqn(name)}/export`
  );

  return response.data;
};

export const importAssetCategories = async (
  name: string,
  csv: string,
  dryRun = true
) => {
  const response = await APIClient.put<
    string,
    AxiosResponse<CSVExportResponse>
  >(`${ASSET_CATEGORIES_BASE_URL}/name/${getEncodedFqn(name)}/import`, csv, {
    params: { dryRun },
  });

  return response.data;
};

// ==================== AssetCatalog API ====================

export const getAssetCatalogsList = async (params?: AssetCatalogParams) => {
  const response = await APIClient.get<PagingResponse<AssetCatalog[]>>(
    ASSET_CATALOGS_BASE_URL,
    { params }
  );

  return response.data;
};

export const getAssetCatalogByName = async (
  fqn: string,
  params?: AssetCatalogParams
) => {
  const response = await APIClient.get<AssetCatalog>(
    `${ASSET_CATALOGS_BASE_URL}/name/${getEncodedFqn(fqn)}`,
    { params }
  );

  return response.data;
};

export const getAssetCatalogById = async (
  id: string,
  params?: AssetCatalogParams
) => {
  const response = await APIClient.get<AssetCatalog>(
    `${ASSET_CATALOGS_BASE_URL}/${id}`,
    {
      params,
    }
  );

  return response.data;
};

export const createAssetCatalog = async (data: CreateAssetCatalog) => {
  const response = await APIClient.post<
    CreateAssetCatalog,
    AxiosResponse<AssetCatalog>
  >(ASSET_CATALOGS_BASE_URL, data);

  return response.data;
};

export const createOrUpdateAssetCatalog = async (data: CreateAssetCatalog) => {
  const response = await APIClient.put<
    CreateAssetCatalog,
    AxiosResponse<AssetCatalog>
  >(ASSET_CATALOGS_BASE_URL, data);

  return response.data;
};

export const patchAssetCatalog = async (id: string, patch: Operation[]) => {
  const response = await APIClient.patch<
    Operation[],
    AxiosResponse<AssetCatalog>
  >(`${ASSET_CATALOGS_BASE_URL}/${id}`, patch);

  return response.data;
};

export const patchAssetCatalogByName = async (
  fqn: string,
  patch: Operation[]
) => {
  const response = await APIClient.patch<
    Operation[],
    AxiosResponse<AssetCatalog>
  >(`${ASSET_CATALOGS_BASE_URL}/name/${getEncodedFqn(fqn)}`, patch);

  return response.data;
};

export const deleteAssetCatalog = async (
  id: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(`${ASSET_CATALOGS_BASE_URL}/${id}`, {
    params: { recursive, hardDelete },
  });

  return response.data;
};

export const deleteAssetCatalogByName = async (
  name: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(
    `${ASSET_CATALOGS_BASE_URL}/name/${getEncodedFqn(name)}`,
    {
      params: { recursive, hardDelete },
    }
  );

  return response.data;
};

export const exportAssetCatalogs = async (name: string) => {
  const response = await APIClient.get<string>(
    `${ASSET_CATALOGS_BASE_URL}/name/${getEncodedFqn(name)}/export`
  );

  return response.data;
};

export const importAssetCatalogs = async (
  name: string,
  csv: string,
  dryRun = true
) => {
  const response = await APIClient.put<
    string,
    AxiosResponse<CSVExportResponse>
  >(`${ASSET_CATALOGS_BASE_URL}/name/${getEncodedFqn(name)}/import`, csv, {
    params: { dryRun },
  });

  return response.data;
};

// ==================== AssetAttribute API ====================

export const getAssetAttributesList = async (params?: AssetAttributeParams) => {
  const response = await APIClient.get<PagingResponse<AssetAttribute[]>>(
    ASSET_ATTRIBUTES_BASE_URL,
    { params }
  );

  return response.data;
};

export const getAssetAttributeByName = async (
  fqn: string,
  params?: AssetAttributeParams
) => {
  const response = await APIClient.get<AssetAttribute>(
    `${ASSET_ATTRIBUTES_BASE_URL}/name/${getEncodedFqn(fqn)}`,
    { params }
  );

  return response.data;
};

export const getAssetAttributeById = async (
  id: string,
  params?: AssetAttributeParams
) => {
  const response = await APIClient.get<AssetAttribute>(
    `${ASSET_ATTRIBUTES_BASE_URL}/${id}`,
    {
      params,
    }
  );

  return response.data;
};

export const createAssetAttribute = async (data: CreateAssetAttribute) => {
  const response = await APIClient.post<
    CreateAssetAttribute,
    AxiosResponse<AssetAttribute>
  >(ASSET_ATTRIBUTES_BASE_URL, data);

  return response.data;
};

export const createOrUpdateAssetAttribute = async (
  data: CreateAssetAttribute
) => {
  const response = await APIClient.put<
    CreateAssetAttribute,
    AxiosResponse<AssetAttribute>
  >(ASSET_ATTRIBUTES_BASE_URL, data);

  return response.data;
};

export const patchAssetAttribute = async (id: string, patch: Operation[]) => {
  const response = await APIClient.patch<
    Operation[],
    AxiosResponse<AssetAttribute>
  >(`${ASSET_ATTRIBUTES_BASE_URL}/${id}`, patch);

  return response.data;
};

export const patchAssetAttributeByName = async (
  fqn: string,
  patch: Operation[]
) => {
  const response = await APIClient.patch<
    Operation[],
    AxiosResponse<AssetAttribute>
  >(`${ASSET_ATTRIBUTES_BASE_URL}/name/${getEncodedFqn(fqn)}`, patch);

  return response.data;
};

export const deleteAssetAttribute = async (
  id: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(
    `${ASSET_ATTRIBUTES_BASE_URL}/${id}`,
    {
      params: { recursive, hardDelete },
    }
  );

  return response.data;
};

export const deleteAssetAttributeByName = async (
  name: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(
    `${ASSET_ATTRIBUTES_BASE_URL}/name/${getEncodedFqn(name)}`,
    {
      params: { recursive, hardDelete },
    }
  );

  return response.data;
};

export const exportAssetAttributes = async (name: string) => {
  const response = await APIClient.get<string>(
    `${ASSET_ATTRIBUTES_BASE_URL}/name/${getEncodedFqn(name)}/export`
  );

  return response.data;
};

export const importAssetAttributes = async (
  name: string,
  csv: string,
  dryRun = true
) => {
  const response = await APIClient.put<
    string,
    AxiosResponse<CSVExportResponse>
  >(`${ASSET_ATTRIBUTES_BASE_URL}/name/${getEncodedFqn(name)}/import`, csv, {
    params: { dryRun },
  });

  return response.data;
};

// ==================== AssetType API ====================

export const getAssetTypesList = async (params?: AssetTypeParams) => {
  const response = await APIClient.get<PagingResponse<AssetType[]>>(
    ASSET_TYPES_BASE_URL,
    { params }
  );

  return response.data;
};

export const getAssetTypeByName = async (
  fqn: string,
  params?: AssetTypeParams
) => {
  const response = await APIClient.get<AssetType>(
    `${ASSET_TYPES_BASE_URL}/name/${getEncodedFqn(fqn)}`,
    { params }
  );

  return response.data;
};

export const getAssetTypeById = async (
  id: string,
  params?: AssetTypeParams
) => {
  const response = await APIClient.get<AssetType>(
    `${ASSET_TYPES_BASE_URL}/${id}`,
    {
      params,
    }
  );

  return response.data;
};

export const createAssetType = async (data: CreateAssetType) => {
  const response = await APIClient.post<
    CreateAssetType,
    AxiosResponse<AssetType>
  >(ASSET_TYPES_BASE_URL, data);

  return response.data;
};

export const createOrUpdateAssetType = async (data: CreateAssetType) => {
  const response = await APIClient.put<
    CreateAssetType,
    AxiosResponse<AssetType>
  >(ASSET_TYPES_BASE_URL, data);

  return response.data;
};

export const patchAssetType = async (id: string, patch: Operation[]) => {
  const response = await APIClient.patch<Operation[], AxiosResponse<AssetType>>(
    `${ASSET_TYPES_BASE_URL}/${id}`,
    patch
  );

  return response.data;
};

export const patchAssetTypeByName = async (fqn: string, patch: Operation[]) => {
  const response = await APIClient.patch<Operation[], AxiosResponse<AssetType>>(
    `${ASSET_TYPES_BASE_URL}/name/${getEncodedFqn(fqn)}`,
    patch
  );

  return response.data;
};

export const deleteAssetType = async (
  id: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(`${ASSET_TYPES_BASE_URL}/${id}`, {
    params: { recursive, hardDelete },
  });

  return response.data;
};

export const deleteAssetTypeByName = async (
  name: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(
    `${ASSET_TYPES_BASE_URL}/name/${getEncodedFqn(name)}`,
    {
      params: { recursive, hardDelete },
    }
  );

  return response.data;
};

export const exportAssetTypes = async (name: string) => {
  const response = await APIClient.get<string>(
    `${ASSET_TYPES_BASE_URL}/name/${getEncodedFqn(name)}/export`
  );

  return response.data;
};

export const importAssetTypes = async (
  name: string,
  csv: string,
  dryRun = true
) => {
  const response = await APIClient.put<
    string,
    AxiosResponse<CSVExportResponse>
  >(`${ASSET_TYPES_BASE_URL}/name/${getEncodedFqn(name)}/import`, csv, {
    params: { dryRun },
  });

  return response.data;
};

// ==================== DataAsset API ====================

export const getDataAssetsList = async (params?: DataAssetParams) => {
  const response = await APIClient.get<PagingResponse<DataAsset[]>>(
    DATA_ASSETS_BASE_URL,
    { params }
  );

  return response.data;
};

export const getDataAssetByName = async (
  fqn: string,
  params?: DataAssetParams
) => {
  const response = await APIClient.get<DataAsset>(
    `${DATA_ASSETS_BASE_URL}/name/${getEncodedFqn(fqn)}`,
    { params }
  );

  return response.data;
};

export const getDataAssetById = async (
  id: string,
  params?: DataAssetParams
) => {
  const response = await APIClient.get<DataAsset>(
    `${DATA_ASSETS_BASE_URL}/${id}`,
    {
      params,
    }
  );

  return response.data;
};

export const createDataAsset = async (data: CreateDataAsset) => {
  const response = await APIClient.post<
    CreateDataAsset,
    AxiosResponse<DataAsset>
  >(DATA_ASSETS_BASE_URL, data);

  return response.data;
};

export const createOrUpdateDataAsset = async (data: CreateDataAsset) => {
  const response = await APIClient.put<
    CreateDataAsset,
    AxiosResponse<DataAsset>
  >(DATA_ASSETS_BASE_URL, data);

  return response.data;
};

export const patchDataAsset = async (id: string, patch: Operation[]) => {
  const response = await APIClient.patch<Operation[], AxiosResponse<DataAsset>>(
    `${DATA_ASSETS_BASE_URL}/${id}`,
    patch
  );

  return response.data;
};

export const patchDataAssetByName = async (fqn: string, patch: Operation[]) => {
  const response = await APIClient.patch<Operation[], AxiosResponse<DataAsset>>(
    `${DATA_ASSETS_BASE_URL}/name/${getEncodedFqn(fqn)}`,
    patch
  );

  return response.data;
};

export const deleteDataAsset = async (
  id: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(`${DATA_ASSETS_BASE_URL}/${id}`, {
    params: { recursive, hardDelete },
  });

  return response.data;
};

export const deleteDataAssetByName = async (
  name: string,
  recursive?: boolean,
  hardDelete?: boolean
) => {
  const response = await APIClient.delete(
    `${DATA_ASSETS_BASE_URL}/name/${getEncodedFqn(name)}`,
    {
      params: { recursive, hardDelete },
    }
  );

  return response.data;
};

export const exportDataAssets = async (name: string) => {
  const response = await APIClient.get<string>(
    `${DATA_ASSETS_BASE_URL}/name/${getEncodedFqn(name)}/export`
  );

  return response.data;
};

export const importDataAssets = async (
  name: string,
  csv: string,
  dryRun = true
) => {
  const response = await APIClient.put<
    string,
    AxiosResponse<CSVExportResponse>
  >(`${DATA_ASSETS_BASE_URL}/name/${getEncodedFqn(name)}/import`, csv, {
    params: { dryRun },
  });

  return response.data;
};
