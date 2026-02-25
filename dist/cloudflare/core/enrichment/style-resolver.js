/**
 * Style Value Resolver
 * Resolves style values from variable references and provides formatted outputs
 */
export class StyleValueResolver {
    constructor(logger) {
        this.cache = new Map();
        this.variableCache = new Map();
        this.logger = logger;
    }
    /**
     * Resolve a style's value, handling variable references
     */
    async resolveStyleValue(style, variables, maxDepth = 10) {
        const cacheKey = `style:${style.key || style.node_id}`;
        // Check cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            // Get the actual style node data
            const styleData = await this.getStyleData(style);
            if (!styleData) {
                return { value: null };
            }
            // Check if this style uses a variable
            const variableRef = this.findVariableReference(styleData);
            if (variableRef && variables.has(variableRef.id)) {
                // Resolve the variable value
                const variable = variables.get(variableRef.id);
                const resolvedValue = await this.resolveVariableValue(variable, variables, maxDepth);
                const result = {
                    value: resolvedValue,
                    variableRef: {
                        id: variableRef.id,
                        name: variable.name,
                        collection: variable.variableCollectionId,
                        resolvedType: variable.resolvedType,
                    },
                };
                this.cache.set(cacheKey, result);
                return result;
            }
            // No variable reference, return direct value
            const directValue = this.extractDirectValue(styleData, style.style_type);
            const result = { value: directValue };
            this.cache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            this.logger.error({
                error,
                style: style.name,
            }, "Error resolving style value");
            return { value: null };
        }
    }
    /**
     * Resolve a variable's value, handling alias chains
     */
    async resolveVariableValue(variable, allVariables, maxDepth = 10, currentDepth = 0) {
        if (currentDepth >= maxDepth) {
            this.logger.warn({
                variable: variable.name,
            }, "Max resolution depth reached");
            return null;
        }
        const cacheKey = `var:${variable.id}`;
        if (this.variableCache.has(cacheKey)) {
            return this.variableCache.get(cacheKey);
        }
        try {
            // Get the value for the default mode (or first available mode)
            const modes = Object.keys(variable.valuesByMode || {});
            if (modes.length === 0) {
                return null;
            }
            const defaultMode = modes[0]; // TODO: Support mode selection
            const value = variable.valuesByMode[defaultMode];
            // Check if this is an alias (reference to another variable)
            if (typeof value === "object" && value.type === "VARIABLE_ALIAS") {
                const targetVariable = allVariables.get(value.id);
                if (!targetVariable) {
                    this.logger.warn({
                        source: variable.name,
                        targetId: value.id,
                    }, "Variable alias target not found");
                    return null;
                }
                // Recursively resolve the alias
                const resolvedValue = await this.resolveVariableValue(targetVariable, allVariables, maxDepth, currentDepth + 1);
                this.variableCache.set(cacheKey, resolvedValue);
                return resolvedValue;
            }
            // Direct value - format based on type
            const formattedValue = this.formatVariableValue(value, variable.resolvedType);
            this.variableCache.set(cacheKey, formattedValue);
            return formattedValue;
        }
        catch (error) {
            this.logger.error({
                error,
                variable: variable.name,
            }, "Error resolving variable value");
            return null;
        }
    }
    /**
     * Format a variable value based on its type
     */
    formatVariableValue(value, type) {
        if (!value)
            return null;
        switch (type) {
            case "COLOR":
                return this.formatColor(value);
            case "FLOAT":
            case "NUMBER":
                return value;
            case "STRING":
                return value;
            case "BOOLEAN":
                return Boolean(value);
            default:
                return value;
        }
    }
    /**
     * Format a color value to hex string
     */
    formatColor(color) {
        if (typeof color === "string") {
            return color;
        }
        if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
            const r = Math.round(color.r * 255);
            const g = Math.round(color.g * 255);
            const b = Math.round(color.b * 255);
            return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
        }
        return null;
    }
    /**
     * Generate export formats for a resolved value
     */
    generateExportFormats(name, value, type, formats = ["css", "sass", "tailwind", "typescript", "json"]) {
        const result = {};
        // Sanitize name for different formats
        const cssName = this.toCSSVariableName(name);
        const sassName = this.toSassVariableName(name);
        const tailwindName = this.toTailwindClassName(name);
        const tsName = this.toTypeScriptPath(name);
        const jsonPath = this.toJSONPath(name);
        for (const format of formats) {
            switch (format) {
                case "css":
                    result.css = `var(${cssName})`;
                    break;
                case "sass":
                    result.sass = sassName;
                    break;
                case "tailwind":
                    result.tailwind = tailwindName;
                    break;
                case "typescript":
                    result.typescript = tsName;
                    break;
                case "json":
                    result.json = jsonPath;
                    break;
            }
        }
        return result;
    }
    /**
     * Convert token name to CSS variable format
     * Example: "color/background/primary-default" -> "--color-background-primary-default"
     */
    toCSSVariableName(name) {
        return `--${name.replace(/\//g, "-").toLowerCase()}`;
    }
    /**
     * Convert token name to Sass variable format
     * Example: "color/background/primary-default" -> "$color-background-primary-default"
     */
    toSassVariableName(name) {
        return `$${name.replace(/\//g, "-").toLowerCase()}`;
    }
    /**
     * Convert token name to Tailwind class format
     * Example: "color/background/primary-default" -> "bg-primary"
     */
    toTailwindClassName(name) {
        const parts = name.split("/");
        // Try to infer Tailwind utility class
        if (parts[0] === "color") {
            if (parts[1] === "background") {
                return `bg-${parts[parts.length - 1].toLowerCase()}`;
            }
            if (parts[1] === "text") {
                return `text-${parts[parts.length - 1].toLowerCase()}`;
            }
            if (parts[1] === "border") {
                return `border-${parts[parts.length - 1].toLowerCase()}`;
            }
        }
        if (parts[0] === "spacing") {
            return `space-${parts[parts.length - 1].toLowerCase()}`;
        }
        // Fallback: use last part
        return parts[parts.length - 1].toLowerCase();
    }
    /**
     * Convert token name to TypeScript path format
     * Example: "color/background/primary-default" -> "tokens.color.background.primaryDefault"
     */
    toTypeScriptPath(name) {
        const parts = name.split("/");
        const camelCaseParts = parts.map((part, index) => {
            if (index === 0)
                return part.toLowerCase();
            return part
                .split("-")
                .map((word, i) => i === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join("");
        });
        return `tokens.${camelCaseParts.join(".")}`;
    }
    /**
     * Convert token name to nested JSON path
     * Example: "color/background/primary-default" -> { color: { background: { primaryDefault: value } } }
     */
    toJSONPath(name) {
        const parts = name.split("/");
        const result = {};
        let current = result;
        for (let i = 0; i < parts.length; i++) {
            const key = parts[i]
                .split("-")
                .map((word, j) => j === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join("");
            if (i === parts.length - 1) {
                current[key] = "[VALUE]"; // Placeholder
            }
            else {
                current[key] = {};
                current = current[key];
            }
        }
        return result;
    }
    /**
     * Get style data from Figma API
     * This would be called via the Figma API client
     */
    async getStyleData(style) {
        // TODO: Implement actual Figma API call
        // For now, return the style object itself
        return style;
    }
    /**
     * Find variable reference in style data
     */
    findVariableReference(styleData) {
        // Check for boundVariables (new variables API)
        if (styleData.boundVariables) {
            // Check common properties that can be bound to variables
            const props = ["fills", "strokes", "effects", "text"];
            for (const prop of props) {
                if (styleData.boundVariables[prop]) {
                    const binding = styleData.boundVariables[prop];
                    if (Array.isArray(binding) && binding.length > 0) {
                        return { id: binding[0].id };
                    }
                    if (binding.id) {
                        return { id: binding.id };
                    }
                }
            }
        }
        return null;
    }
    /**
     * Extract direct value from style (no variable)
     */
    extractDirectValue(styleData, styleType) {
        switch (styleType) {
            case "FILL":
                if (styleData.fills && styleData.fills.length > 0) {
                    const fill = styleData.fills[0];
                    if (fill.type === "SOLID") {
                        return this.formatColor(fill.color);
                    }
                }
                return null;
            case "TEXT":
                if (styleData.fontFamily) {
                    return {
                        fontFamily: styleData.fontFamily,
                        fontSize: styleData.fontSize,
                        fontWeight: styleData.fontWeight,
                        lineHeight: styleData.lineHeight,
                    };
                }
                return null;
            case "EFFECT":
                if (styleData.effects && styleData.effects.length > 0) {
                    return styleData.effects;
                }
                return null;
            default:
                return null;
        }
    }
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
        this.variableCache.clear();
    }
}
