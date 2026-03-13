/**
 * 全局设置实体定义。
 * 该接口用于描述平台级的全局配置项。
 */
export interface GlobalSettings {
    authorizerConfig?: Record<string, unknown>;
    authenticationMechanism?: string;
    baseUrl?: string;
    bot?: Record<string, unknown>;
    emailConfiguration?: Record<string, unknown>;
    anomalyChecker?: Record<string, unknown>;
    eventFilterType?: Record<string, unknown>;
    glossaryConfig?: Record<string, unknown>;
    ingestion?: Record<string, unknown>;
    logoUrl?: Record<string, unknown>;
    oAuthConfig?: Record<string, unknown>;
    organization?: Record<string, unknown>;
    publicDisplayRotation?: Record<string, unknown>;
    ssoConfiguration?: Record<string, unknown>;
    intercomText?: string;
    enableBasicAuth?: boolean;
    queryMaxSeconds?: number;
    totalQueryLimit?: number;
    dataProductConfig?: Record<string, unknown>;
    version?: string;
    personalizedDisplayName?: string;
}
