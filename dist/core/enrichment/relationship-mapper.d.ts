/**
 * Relationship Mapper
 * Maps relationships between styles, variables, and components
 * Tracks usage counts and builds reverse lookup indexes
 */
import type { ComponentUsage, StyleUsage, VariableDependency } from "../types/enriched.js";
import type pino from "pino";
type Logger = pino.Logger;
export declare class RelationshipMapper {
    private logger;
    private componentsByStyle;
    private componentsByVariable;
    private stylesByVariable;
    private variableDependencies;
    private styleUsageCount;
    private variableUsageCount;
    constructor(logger: Logger);
    /**
     * Build all relationship indexes from file data
     */
    buildRelationships(fileData: any): Promise<void>;
    /**
     * Get components that use a specific style
     */
    getComponentsByStyle(styleId: string): ComponentUsage[];
    /**
     * Get components that use a specific variable
     */
    getComponentsByVariable(variableId: string): ComponentUsage[];
    /**
     * Get styles that use a specific variable
     */
    getStylesByVariable(variableId: string): StyleUsage[];
    /**
     * Get variable dependencies (what variables this variable references)
     */
    getVariableDependencies(variableId: string): VariableDependency[];
    /**
     * Get usage count for a style
     */
    getStyleUsageCount(styleId: string): number;
    /**
     * Get usage count for a variable
     */
    getVariableUsageCount(variableId: string): number;
    /**
     * Find unused styles (styles with zero usage)
     */
    getUnusedStyles(allStyles: any[]): StyleUsage[];
    /**
     * Find unused variables (variables with zero usage)
     */
    getUnusedVariables(allVariables: any[]): any[];
    /**
     * Build variable dependency graph (which variables reference which)
     */
    private buildVariableDependencies;
    /**
     * Extract dependencies from a single variable
     */
    private extractVariableDependencies;
    /**
     * Build relationships between styles and variables
     */
    private buildStyleVariableRelationships;
    /**
     * Extract variable references from a style
     */
    private extractStyleVariableReferences;
    /**
     * Build component relationships by traversing the document tree
     */
    private buildComponentRelationships;
    /**
     * Recursively traverse nodes to find component instances and their style/variable usage
     */
    private traverseNode;
    /**
     * Track which styles a node uses
     */
    private trackNodeStyleUsage;
    /**
     * Track which variables a node uses
     */
    private trackNodeVariableUsage;
    /**
     * Extract all variable references from a node's boundVariables
     */
    private extractNodeVariableReferences;
    /**
     * Detect circular variable references
     */
    detectCircularReferences(): Array<{
        chain: string[];
    }>;
    /**
     * DFS helper for detecting circular references
     */
    private detectCircularDFS;
    /**
     * Clear all indexes and caches
     */
    clear(): void;
}
export {};
//# sourceMappingURL=relationship-mapper.d.ts.map