/*
 *  Licensed to the Apache Software Foundation (ASF) under one or more
 *  contributor license agreements. See the NOTICE file distributed with
 *  this work for additional information regarding copyright ownership.
 *  The ASF licenses this file to You under the Apache License, Version 2.0
 *  (the "License"); you may not use this file except in compliance with
 *  the License. You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.service.search.indexes.asset;

import java.util.Map;
import org.openmetadata.schema.entity.data.asset.DataAsset;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.indexes.SearchIndex;

public class DataAssetIndex implements SearchIndex {
  final DataAsset dataAsset;

  public DataAssetIndex(DataAsset dataAsset) {
    this.dataAsset = dataAsset;
  }

  @Override
  public Object getEntity() {
    return dataAsset;
  }

  public Map<String, Object> buildSearchIndexDocInternal(Map<String, Object> doc) {
    Map<String, Object> commonAttributes =
        getCommonAttributesMap(dataAsset, Entity.DATA_ASSET);
    doc.putAll(commonAttributes);
    if (dataAsset.getAssetType() != null) {
      doc.put("assetType", dataAsset.getAssetType().getFullyQualifiedName());
    }
    if (dataAsset.getCatalog() != null) {
      doc.put("catalog", dataAsset.getCatalog().getFullyQualifiedName());
    }
    return doc;
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = SearchIndex.getDefaultFields();
    fields.put("assetType", 5.0f);
    fields.put("catalog", 3.0f);
    return fields;
  }
}
