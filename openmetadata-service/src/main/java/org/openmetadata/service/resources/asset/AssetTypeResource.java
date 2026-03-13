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

package org.openmetadata.service.resources.asset;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import javax.json.JsonPatch;
import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.PATCH;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import org.openmetadata.schema.api.data.asset.CreateAssetType;
import org.openmetadata.schema.entity.data.asset.AssetType;
import org.openmetadata.schema.type.EntityHistory;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.schema.type.csv.CsvImportResult;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.asset.AssetTypeRepository;
import org.openmetadata.service.limits.Limits;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.resources.EntityResource;
import org.openmetadata.service.resources.asset.mappers.AssetTypeMapper;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.util.ResultList;

@Path("/v1/assetTypes")
@Tag(name = "AssetTypes", description = "资产类型管理 API")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "assetTypes", order = 9)
public class AssetTypeResource extends EntityResource<AssetType, AssetTypeRepository> {
  public static final String COLLECTION_PATH = "v1/assetTypes/";
  static final String FIELDS = "owners,tags,reviewers,attributes,assetCount,domain,extension";
  private final AssetTypeMapper mapper = new AssetTypeMapper();

  public AssetTypeResource(Authorizer authorizer, Limits limits) {
    super(Entity.ASSET_TYPE, authorizer, limits);
  }

  @Override
  protected List<MetadataOperation> getEntitySpecificOperations() {
    addViewOperation("reviewers,attributes,assetCount", MetadataOperation.VIEW_BASIC);
    return Collections.emptyList();
  }

  public static class AssetTypeList extends ResultList<AssetType> {
    /* Required for serde */
  }

  @GET
  @Valid
  @Operation(operationId = "listAssetTypes", summary = "列出所有资产类型")
  public ResultList<AssetType> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @QueryParam("fields") String fieldsParam,
      @DefaultValue("10") @Min(0) @Max(1000000) @QueryParam("limit") int limitParam,
      @QueryParam("before") String before,
      @QueryParam("after") String after,
      @QueryParam("include") Include include) {
    ListFilter filter = new ListFilter(include);
    return super.listInternal(
            uriInfo, securityContext, fieldsParam, filter, limitParam, before, after);
  }

  @GET
  @Path("/{id}")
  @Valid
  @Operation(operationId = "getAssetTypeByID", summary = "通过 ID 获取资产类型")
  public AssetType get(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @QueryParam("fields") String fieldsParam,
      @QueryParam("include") Include include) {
    return getInternal(uriInfo, securityContext, id, fieldsParam, include);
  }

  @GET
  @Path("/name/{name}")
  @Valid
  @Operation(operationId = "getAssetTypeByFQN", summary = "通过名称获取资产类型")
  public AssetType getByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("name") String name,
      @QueryParam("fields") String fieldsParam,
      @QueryParam("include") Include include) {
    return getByNameInternal(uriInfo, securityContext, name, fieldsParam, include);
  }

  @GET
  @Path("/{id}/versions")
  @Valid
  @Operation(operationId = "listAssetTypeVersions", summary = "获取资产类型版本历史")
  public EntityHistory listVersions(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @PathParam("id") UUID id) {
    return super.listVersionsInternal(securityContext, id);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Valid
  @Operation(operationId = "getAssetTypeVersion", summary = "获取特定版本的资产类型")
  public AssetType getVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @PathParam("version") String version) {
    return super.getVersionInternal(securityContext, id, version);
  }

  @POST
  @Operation(operationId = "createAssetType", summary = "创建资产类型")
  public Response create(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Valid CreateAssetType create) {
    AssetType assetType = mapper.createToEntity(create, securityContext.getUserPrincipal().getName());
    return create(uriInfo, securityContext, assetType);
  }

  @PUT
  @Operation(operationId = "createOrUpdateAssetType", summary = "创建或更新资产类型")
  public Response createOrUpdate(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Valid CreateAssetType create) {
    AssetType assetType = mapper.createToEntity(create, securityContext.getUserPrincipal().getName());
    return createOrUpdate(uriInfo, securityContext, assetType);
  }

  @PATCH
  @Path("/{id}")
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  @Operation(operationId = "patchAssetType", summary = "部分更新资产类型")
  public Response patch(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @Valid JsonPatch patch) {
    return patchInternal(uriInfo, securityContext, id, patch);
  }

  @PATCH
  @Path("/name/{fqn}")
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  @Operation(operationId = "patchAssetTypeByFQN", summary = "通过名称部分更新资产类型")
  public Response patchByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("fqn") String fqn,
      @Valid JsonPatch patch) {
    return patchInternal(uriInfo, securityContext, fqn, patch);
  }

  @DELETE
  @Path("/{id}")
  @Operation(operationId = "deleteAssetType", summary = "删除资产类型")
  public Response delete(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @QueryParam("recursive") boolean recursive,
      @QueryParam("hardDelete") boolean hardDelete) {
    return super.delete(uriInfo, securityContext, id, recursive, hardDelete);
  }

  @DELETE
  @Path("/name/{name}")
  @Operation(operationId = "deleteAssetTypeByName", summary = "通过名称删除资产类型")
  public Response deleteByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("name") String name,
      @QueryParam("recursive") boolean recursive,
      @QueryParam("hardDelete") boolean hardDelete) {
    return super.deleteByName(uriInfo, securityContext, name, recursive, hardDelete);
  }

  // ==================== CSV 导入导出 ====================

  @GET
  @Path("/name/{name}/export")
  @Produces(MediaType.TEXT_PLAIN)
  @Valid
  @Operation(
      operationId = "exportAssetTypes",
      summary = "导出资产类型为 CSV",
      description = "将所有资产类型导出为 CSV 格式。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "导出的 CSV 数据",
            content = @Content(mediaType = "text/plain"))
      })
  public String exportCsv(
      @Context SecurityContext securityContext,
      @Parameter(description = "资产类型名称", schema = @Schema(type = "string"))
          @PathParam("name")
          String name)
      throws IOException {
    return exportCsvInternal(securityContext, name, false);
  }

  @PUT
  @Path("/name/{name}/import")
  @Consumes(MediaType.TEXT_PLAIN)
  @Valid
  @Operation(
      operationId = "importAssetTypes",
      summary = "从 CSV 导入资产类型",
      description = "从 CSV 数据创建或更新资产类型。",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "导入结果",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = CsvImportResult.class)))
      })
  public CsvImportResult importCsv(
      @Context SecurityContext securityContext,
      @Parameter(description = "资产类型名称", schema = @Schema(type = "string"))
          @PathParam("name")
          String name,
      @Parameter(description = "预演模式（默认 true）", schema = @Schema(type = "boolean"))
          @DefaultValue("true")
          @QueryParam("dryRun")
          boolean dryRun,
      String csv)
      throws IOException {
    return importCsvInternal(securityContext, name, csv, dryRun, false);
  }

  @GET
  @Path("/documentation/csv")
  @Valid
  @Operation(operationId = "getAssetTypeCsvDocumentation", summary = "获取资产类型 CSV 文档")
  public String getCsvDocumentation(@Context SecurityContext securityContext) {
    return JsonUtils.pojoToJson(AssetTypeRepository.AssetTypeCsv.DOCUMENTATION);
  }
}
