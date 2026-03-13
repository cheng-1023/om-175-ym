package org.openmetadata.service.resources.asset.mappers;

import org.openmetadata.schema.api.data.asset.CreateAssetAttribute;
import org.openmetadata.schema.entity.data.asset.AssetAttribute;
import org.openmetadata.service.mapper.EntityMapper;

public class AssetAttributeMapper implements EntityMapper<AssetAttribute, CreateAssetAttribute> {
  @Override
  public AssetAttribute createToEntity(CreateAssetAttribute create, String user) {
    return copy(new AssetAttribute(), create, user)
        .withAttributeCategory(
            create.getAttributeCategory() != null
                ? AssetAttribute.AttributeCategory.fromValue(create.getAttributeCategory().value())
                : AssetAttribute.AttributeCategory.fromValue("basic"))
        .withDataType(
            create.getDataType() != null
                ? AssetAttribute.DataType.fromValue(create.getDataType().value())
                : AssetAttribute.DataType.fromValue("string"))
        .withRequired(create.getRequired())
        .withAssignableRoles(create.getAssignableRoles());
  }
}
