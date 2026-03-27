/**
 * TypeScript types for enriched Figma data responses
 * Phase 5: Enriched Data Extraction & Design System Auditing
 */
export type ExportFormat = "css" | "sass" | "tailwind" | "typescript" | "json";
export interface ExportFormats {
    css?: string;
    sass?: string;
    tailwind?: string;
    typescript?: string;
    json?: object;
}
export interface VariableReference {
    id: string;
    name: string;
    collection: string;
    resolvedType: string;
}
export interface ComponentUsage {
    id: string;
    name: string;
    type: string;
    variant?: string;
    page?: string;
}
export interface StyleUsage {
    id: string;
    name: string;
    type: string;
    node_id: string;
}
export interface VariableDependency {
    id: string;
    name: string;
    type: "alias" | "reference";
    depth: number;
}
export interface HardcodedValue {
    property: string;
    value: string | number;
    type: "color" | "spacing" | "typography" | "other";
    location: string;
    suggested_token?: string;
}
export interface AuditIssue {
    severity: "error" | "warning" | "info";
    type: string;
    message: string;
    node_id?: string;
    suggestion?: string;
}
export interface EnrichedStyle {
    node_id: string;
    name: string;
    key: string;
    style_type: string;
    description?: string;
    resolved_value?: string | object;
    variable_reference?: VariableReference;
    used_in_components?: ComponentUsage[];
    usage_count?: number;
    export_formats?: ExportFormats;
    last_modified?: string;
    created_by?: string;
}
export interface EnrichedVariable {
    id: string;
    name: string;
    key: string;
    variableCollectionId: string;
    resolvedType: string;
    resolved_values?: Record<string, any>;
    used_in_styles?: StyleUsage[];
    used_in_components?: ComponentUsage[];
    usage_count?: number;
    dependencies?: VariableDependency[];
    export_formats?: ExportFormats;
    aliases?: string[];
}
export interface EnrichedComponent {
    id: string;
    name: string;
    type: string;
    description?: string;
    styles_used?: StyleReference[];
    variables_used?: VariableReference[];
    hardcoded_values?: HardcodedValue[];
    token_coverage?: number;
    audit_issues?: AuditIssue[];
}
export interface StyleReference {
    style_id: string;
    style_name: string;
    style_type: string;
    property: string;
    resolved_value?: string | object;
}
export interface EnrichedFileData {
    fileKey: string;
    name: string;
    lastModified: string;
    version: string;
    statistics?: {
        total_variables: number;
        total_styles: number;
        total_components: number;
        unused_variables: number;
        unused_styles: number;
        average_token_coverage: number;
        total_hardcoded_values: number;
        audit_issues_count: number;
    };
    health_score?: number;
    audit_summary?: {
        errors: number;
        warnings: number;
        info: number;
        top_issues: AuditIssue[];
    };
}
export interface EnrichmentOptions {
    enrich?: boolean;
    include_usage?: boolean;
    include_exports?: boolean;
    include_dependencies?: boolean;
    include_audit?: boolean;
    export_formats?: ExportFormat[];
    use_cache?: boolean;
    max_depth?: number;
}
export interface TokenCoverageResult {
    node_id: string;
    node_name: string;
    node_type: string;
    coverage_percentage: number;
    total_properties: number;
    properties_using_tokens: number;
    properties_hardcoded: number;
    breakdown: {
        colors: {
            total: number;
            using_tokens: number;
        };
        spacing: {
            total: number;
            using_tokens: number;
        };
        typography: {
            total: number;
            using_tokens: number;
        };
        effects: {
            total: number;
            using_tokens: number;
        };
    };
    children_coverage?: TokenCoverageResult[];
}
export interface DesignSystemAuditResult {
    file_key: string;
    file_name: string;
    audit_timestamp: string;
    health_score: number;
    unused_variables: VariableReference[];
    unused_styles: StyleUsage[];
    duplicate_values: Array<{
        value: string;
        tokens: string[];
    }>;
    inconsistent_naming: Array<{
        token: string;
        issue: string;
        suggestion: string;
    }>;
    components_with_hardcoded_values: Array<{
        component: ComponentUsage;
        hardcoded_count: number;
        coverage_percentage: number;
    }>;
    circular_references: Array<{
        chain: string[];
    }>;
    orphaned_variables: VariableReference[];
    broken_references: Array<{
        source: string;
        target: string;
        issue: string;
    }>;
    recommendations: Array<{
        priority: "high" | "medium" | "low";
        category: string;
        message: string;
        affected_count: number;
    }>;
}
export interface ExportTokensResult {
    format: ExportFormat;
    output: string;
    metadata: {
        total_tokens: number;
        export_timestamp: string;
        file_name: string;
        includes_usage_comments: boolean;
    };
}
export interface EnrichmentCache {
    resolved_values: Map<string, any>;
    relationships: Map<string, ComponentUsage[]>;
    dependencies: Map<string, VariableDependency[]>;
    last_updated: number;
    file_version: string;
}
//# sourceMappingURL=enriched.d.ts.map