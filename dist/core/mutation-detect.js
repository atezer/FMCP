/**
 * v1.10.0: Does a figma_execute script change the document?
 *
 * Used to decide whether an untargeted figma_execute must name its file when
 * several files are connected. Deliberately broad: a false "mutating" only costs
 * one extra round-trip (the call asks for fileKey); a false "read-only" could
 * write to the wrong file.
 */
const MUTATING_PATTERNS = [
    // figma.createFrame(), figma.createVariable(), createComponentFromNode(), …
    /\.create[A-Z]\w*\s*\(/,
    /\bfigma\.(group|ungroup|flatten|union|subtract|intersect|exclude|combineAsVariants)\s*\(/,
    /\.(remove|clone|resize|resizeWithoutConstraints|rescale|appendChild|insertChild|detachInstance|swapComponent|setProperties|setValueForMode|setBoundVariable|setBoundVariableForPaint|setExplicitVariableModeForCollection|setPluginData|setSharedPluginData|setRelaunchData|insertCharacters|deleteCharacters|setRange\w*)\s*\(/,
    /\.set\w*Async\s*\(/,
    /\bimport\w*ByKeyAsync\s*\(/,
    // Assignments to Figma node properties (node.name = …, frame.fills = […]); excludes ==, ===, =>.
    // Limited to node property names so read scripts building result objects (out.total = 3) don't match.
    new RegExp(`\\.\\s*(${[
        "name", "x", "y", "fills", "strokes", "strokeWeight", "strokeAlign", "characters", "opacity", "visible", "locked",
        "layoutMode", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "itemSpacing", "counterAxisSpacing",
        "cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "effects",
        "fontSize", "fontName", "textStyleId", "fillStyleId", "strokeStyleId", "effectStyleId", "gridStyleId",
        "description", "descriptionMarkdown", "rotation", "constraints", "layoutSizingHorizontal", "layoutSizingVertical",
        "layoutAlign", "layoutGrow", "layoutPositioning", "layoutWrap", "primaryAxisSizingMode", "counterAxisSizingMode",
        "primaryAxisAlignItems", "counterAxisAlignItems", "clipsContent", "reactions", "overflowDirection",
        "textAutoResize", "textAlignHorizontal", "textAlignVertical", "letterSpacing", "lineHeight", "blendMode",
        "isMask", "exportSettings", "minWidth", "maxWidth", "minHeight", "maxHeight", "scopes", "hiddenFromPublishing",
    ].join("|")})\\s*(=(?![=>])|\\+=|-=)`),
];
/** Strip // and /* *\/ comments and string literals so they can't trigger matches. */
function stripCommentsAndStrings(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/[^\n]*/g, " ")
        .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '""')
        .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
        .replace(/'(?:\\.|[^'\\\n])*'/g, '""');
}
export function looksMutating(code) {
    const stripped = stripCommentsAndStrings(code);
    return MUTATING_PATTERNS.some((p) => p.test(stripped));
}
//# sourceMappingURL=mutation-detect.js.map