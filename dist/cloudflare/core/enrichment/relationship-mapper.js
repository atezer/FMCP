/**
 * Relationship Mapper
 * Maps relationships between styles, variables, and components
 * Tracks usage counts and builds reverse lookup indexes
 */
export class RelationshipMapper {
    constructor(logger) {
        // Relationship indexes
        this.componentsByStyle = new Map();
        this.componentsByVariable = new Map();
        this.stylesByVariable = new Map();
        this.variableDependencies = new Map();
        // Usage counters
        this.styleUsageCount = new Map();
        this.variableUsageCount = new Map();
        this.logger = logger;
    }
    /**
     * Build all relationship indexes from file data
     */
    async buildRelationships(fileData) {
        this.logger.info("Building relationship indexes");
        try {
            // Clear existing indexes
            this.clear();
            // Build variable dependencies first
            if (fileData.variables) {
                await this.buildVariableDependencies(fileData.variables);
            }
            // Build style-variable relationships
            if (fileData.styles && fileData.variables) {
                await this.buildStyleVariableRelationships(fileData.styles, fileData.variables);
            }
            // Build component relationships
            if (fileData.document) {
                await this.buildComponentRelationships(fileData.document);
            }
            this.logger.info({
                styles: this.componentsByStyle.size,
                variables: this.componentsByVariable.size,
            }, "Relationship indexes built successfully");
        }
        catch (error) {
            this.logger.error({ error }, "Error building relationships");
            throw error;
        }
    }
    /**
     * Get components that use a specific style
     */
    getComponentsByStyle(styleId) {
        return this.componentsByStyle.get(styleId) || [];
    }
    /**
     * Get components that use a specific variable
     */
    getComponentsByVariable(variableId) {
        return this.componentsByVariable.get(variableId) || [];
    }
    /**
     * Get styles that use a specific variable
     */
    getStylesByVariable(variableId) {
        return this.stylesByVariable.get(variableId) || [];
    }
    /**
     * Get variable dependencies (what variables this variable references)
     */
    getVariableDependencies(variableId) {
        return this.variableDependencies.get(variableId) || [];
    }
    /**
     * Get usage count for a style
     */
    getStyleUsageCount(styleId) {
        return this.styleUsageCount.get(styleId) || 0;
    }
    /**
     * Get usage count for a variable
     */
    getVariableUsageCount(variableId) {
        return this.variableUsageCount.get(variableId) || 0;
    }
    /**
     * Find unused styles (styles with zero usage)
     */
    getUnusedStyles(allStyles) {
        const unused = [];
        for (const style of allStyles) {
            const usageCount = this.getStyleUsageCount(style.node_id || style.key || style.id);
            if (usageCount === 0) {
                unused.push({
                    id: style.id || style.key,
                    name: style.name,
                    type: style.style_type || style.styleType,
                    node_id: style.node_id || style.key,
                });
            }
        }
        return unused;
    }
    /**
     * Find unused variables (variables with zero usage)
     */
    getUnusedVariables(allVariables) {
        const unused = [];
        for (const variable of allVariables) {
            const usageCount = this.getVariableUsageCount(variable.id);
            if (usageCount === 0) {
                unused.push({
                    id: variable.id,
                    name: variable.name,
                    collection: variable.variableCollectionId,
                    resolvedType: variable.resolvedType,
                });
            }
        }
        return unused;
    }
    /**
     * Build variable dependency graph (which variables reference which)
     */
    async buildVariableDependencies(variables) {
        for (const [variableId, variable] of variables.entries()) {
            const dependencies = this.extractVariableDependencies(variable, variables);
            if (dependencies.length > 0) {
                this.variableDependencies.set(variableId, dependencies);
            }
        }
    }
    /**
     * Extract dependencies from a single variable
     */
    extractVariableDependencies(variable, allVariables, depth = 0) {
        const dependencies = [];
        // Check all modes for variable aliases
        for (const [modeId, value] of Object.entries(variable.valuesByMode || {})) {
            if (typeof value === "object" &&
                value !== null &&
                value.type === "VARIABLE_ALIAS") {
                const targetId = value.id;
                const targetVariable = allVariables.get(targetId);
                if (targetVariable) {
                    dependencies.push({
                        id: targetId,
                        name: targetVariable.name,
                        type: "alias",
                        depth,
                    });
                    // Increment usage count for the referenced variable
                    const currentCount = this.variableUsageCount.get(targetId) || 0;
                    this.variableUsageCount.set(targetId, currentCount + 1);
                }
            }
        }
        return dependencies;
    }
    /**
     * Build relationships between styles and variables
     */
    async buildStyleVariableRelationships(styles, variables) {
        for (const style of styles) {
            const variableRefs = this.extractStyleVariableReferences(style);
            for (const varRef of variableRefs) {
                // Track which styles use this variable
                if (!this.stylesByVariable.has(varRef)) {
                    this.stylesByVariable.set(varRef, []);
                }
                this.stylesByVariable.get(varRef)?.push({
                    id: style.id || style.key,
                    name: style.name,
                    type: style.style_type || style.styleType,
                    node_id: style.node_id || style.key,
                });
                // Increment variable usage count
                const currentCount = this.variableUsageCount.get(varRef) || 0;
                this.variableUsageCount.set(varRef, currentCount + 1);
            }
        }
    }
    /**
     * Extract variable references from a style
     */
    extractStyleVariableReferences(style) {
        const refs = [];
        // Check boundVariables
        if (style.boundVariables) {
            const props = ["fills", "strokes", "effects", "text"];
            for (const prop of props) {
                if (style.boundVariables[prop]) {
                    const binding = style.boundVariables[prop];
                    if (Array.isArray(binding)) {
                        for (const b of binding) {
                            if (b.id)
                                refs.push(b.id);
                        }
                    }
                    else if (binding.id) {
                        refs.push(binding.id);
                    }
                }
            }
        }
        return refs;
    }
    /**
     * Build component relationships by traversing the document tree
     */
    async buildComponentRelationships(document) {
        // Traverse all pages
        if (document.children) {
            for (const page of document.children) {
                await this.traverseNode(page, page.name);
            }
        }
    }
    /**
     * Recursively traverse nodes to find component instances and their style/variable usage
     */
    async traverseNode(node, pageName, path = []) {
        const currentPath = [...path, node.name];
        // Check if this node uses any styles
        if (node.styles) {
            this.trackNodeStyleUsage(node, pageName, currentPath);
        }
        // Check if this node uses any variables (via boundVariables)
        if (node.boundVariables) {
            this.trackNodeVariableUsage(node, pageName, currentPath);
        }
        // Recurse into children
        if (node.children) {
            for (const child of node.children) {
                await this.traverseNode(child, pageName, currentPath);
            }
        }
    }
    /**
     * Track which styles a node uses
     */
    trackNodeStyleUsage(node, pageName, path) {
        const componentUsage = {
            id: node.id,
            name: node.name,
            type: node.type,
            page: pageName,
        };
        // Check all style properties (fill, stroke, text, effect, grid)
        const styleProps = ["fill", "stroke", "text", "effect", "grid"];
        for (const prop of styleProps) {
            const styleId = node.styles?.[prop];
            if (styleId) {
                // Add to componentsByStyle index
                if (!this.componentsByStyle.has(styleId)) {
                    this.componentsByStyle.set(styleId, []);
                }
                this.componentsByStyle.get(styleId)?.push(componentUsage);
                // Increment style usage count
                const currentCount = this.styleUsageCount.get(styleId) || 0;
                this.styleUsageCount.set(styleId, currentCount + 1);
            }
        }
    }
    /**
     * Track which variables a node uses
     */
    trackNodeVariableUsage(node, pageName, path) {
        const componentUsage = {
            id: node.id,
            name: node.name,
            type: node.type,
            page: pageName,
        };
        // Extract all variable IDs from boundVariables
        const variableIds = this.extractNodeVariableReferences(node);
        for (const varId of variableIds) {
            // Add to componentsByVariable index
            if (!this.componentsByVariable.has(varId)) {
                this.componentsByVariable.set(varId, []);
            }
            this.componentsByVariable.get(varId)?.push(componentUsage);
            // Increment variable usage count
            const currentCount = this.variableUsageCount.get(varId) || 0;
            this.variableUsageCount.set(varId, currentCount + 1);
        }
    }
    /**
     * Extract all variable references from a node's boundVariables
     */
    extractNodeVariableReferences(node) {
        const refs = [];
        if (!node.boundVariables)
            return refs;
        // boundVariables can have many properties (fills, strokes, etc.)
        for (const [prop, binding] of Object.entries(node.boundVariables)) {
            if (Array.isArray(binding)) {
                for (const b of binding) {
                    if (b.id)
                        refs.push(b.id);
                }
            }
            else if (binding && typeof binding === "object" && binding.id) {
                refs.push(binding.id);
            }
        }
        return refs;
    }
    /**
     * Detect circular variable references
     */
    detectCircularReferences() {
        const circular = [];
        const visited = new Set();
        const currentPath = [];
        for (const [variableId] of this.variableDependencies) {
            this.detectCircularDFS(variableId, visited, currentPath, circular);
        }
        return circular;
    }
    /**
     * DFS helper for detecting circular references
     */
    detectCircularDFS(variableId, visited, currentPath, circular) {
        if (currentPath.includes(variableId)) {
            // Found a cycle
            const cycleStart = currentPath.indexOf(variableId);
            const cycle = currentPath.slice(cycleStart).concat(variableId);
            circular.push({ chain: cycle });
            return;
        }
        if (visited.has(variableId))
            return;
        visited.add(variableId);
        currentPath.push(variableId);
        const dependencies = this.variableDependencies.get(variableId) || [];
        for (const dep of dependencies) {
            this.detectCircularDFS(dep.id, visited, currentPath, circular);
        }
        currentPath.pop();
    }
    /**
     * Clear all indexes and caches
     */
    clear() {
        this.componentsByStyle.clear();
        this.componentsByVariable.clear();
        this.stylesByVariable.clear();
        this.variableDependencies.clear();
        this.styleUsageCount.clear();
        this.variableUsageCount.clear();
    }
}
