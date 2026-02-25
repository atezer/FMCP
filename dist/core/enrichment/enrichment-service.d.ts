/**
 * Enrichment Service
 * Coordinates enrichment of Figma API responses
 */
import type pino from "pino";
import type { EnrichedStyle, EnrichedVariable, EnrichedComponent, EnrichedFileData, EnrichmentOptions } from "../types/enriched.js";
type Logger = pino.Logger;
export declare class EnrichmentService {
    private logger;
    private styleResolver;
    private relationshipMapper;
    private fileDataCache;
    private lastEnrichmentTime;
    private CACHE_TTL_MS;
    constructor(logger: Logger);
    /**
     * Enrich styles response
     */
    enrichStyles(styles: any[], fileKey: string, options?: EnrichmentOptions, fileData?: any): Promise<EnrichedStyle[]>;
    /**
     * Enrich variables response
     */
    enrichVariables(variables: any[], fileKey: string, options?: EnrichmentOptions, fileData?: any): Promise<EnrichedVariable[]>;
    /**
     * Enrich component response
     */
    enrichComponent(component: any, fileKey: string, options?: EnrichmentOptions, fileData?: any): Promise<EnrichedComponent>;
    /**
     * Enrich file data response
     */
    enrichFileData(fileData: any, options?: EnrichmentOptions): Promise<EnrichedFileData>;
    /**
     * Get file data for enrichment (with caching)
     * NOTE: This is a placeholder that returns the data passed in
     * In a full implementation, this would fetch fresh data from Figma API
     */
    private getFileDataForEnrichment;
    /**
     * Set file data in cache (called by tools that already have the data)
     */
    setFileDataCache(fileKey: string, fileData: any): void;
    /**
     * Extract variables as a Map for efficient lookup
     */
    private extractVariablesMap;
    /**
     * Clear all caches
     */
    clearCache(): void;
}
export {};
//# sourceMappingURL=enrichment-service.d.ts.map