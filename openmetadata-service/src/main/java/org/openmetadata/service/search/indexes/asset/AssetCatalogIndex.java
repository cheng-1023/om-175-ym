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
import org.openmetadata.schema.entity.data.asset.AssetCatalog;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.indexes.SearchIndex;

public class AssetCatalogIndex implements SearchIndex {
  final AssetCatalog assetCatalog;

  public AssetCatalogIndex(AssetCatalog assetCatalog) {
    this.assetCatalog = assetCatalog;
  }

  @Override
  public Object getEntity() {
    return assetCatalog;
  }

  public Map<String, Object> buildSearchIndexDocInternal(Map<String, Object> doc) {
    Map<String, Object> commonAttributes =
        getCommonAttributesMap(assetCatalog, Entity.ASSET_CATALOG);
    doc.putAll(commonAttributes);
    if (assetCatalog.getCategory() != null) {
      doc.put("category", assetCatalog.getCategory().getFullyQualifiedName());
    }
    if (assetCatalog.getParent() != null) {
      doc.put("parent", assetCatalog.getParent().getFullyQualifiedName());
    }
    if (assetCatalog.getLevel() != null) {
      doc.put("level", assetCatalog.getLevel());
    }
    return doc;
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = SearchIndex.getDefaultFields();
    fields.put("category", 5.0f);
    fields.put("parent", 3.0f);
    return fields;
  }
}
