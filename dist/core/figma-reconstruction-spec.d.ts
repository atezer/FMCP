/**
 * Figma Reconstruction Spec
 *
 * Generates node tree construction specifications compatible with the
 * Figma Component Reconstructor plugin. This format differs from metadata
 * export by providing all properties needed to programmatically recreate
 * components in Figma.
 */
interface FigmaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}
interface SolidPaint {
    type: 'SOLID';
    color: FigmaColor;
    opacity: number;
    visible: boolean;
}
interface GradientStop {
    color: FigmaColor;
    position: number;
}
interface GradientPaint {
    type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
    gradientStops: GradientStop[];
    opacity: number;
    visible: boolean;
}
interface ImagePaint {
    type: 'IMAGE';
    scaleMode: string;
    imageRef?: string;
    opacity: number;
    visible: boolean;
}
type Paint = SolidPaint | GradientPaint | ImagePaint;
interface ShadowEffect {
    type: 'DROP_SHADOW' | 'INNER_SHADOW';
    color: FigmaColor;
    offset: {
        x: number;
        y: number;
    };
    radius: number;
    spread?: number;
    visible: boolean;
}
interface BlurEffect {
    type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    radius: number;
    visible: boolean;
}
type Effect = ShadowEffect | BlurEffect;
interface FontName {
    family: string;
    style: string;
}
interface Constraints {
    horizontal: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH' | 'SCALE';
}
interface BaseNodeSpec {
    name: string;
    type: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
    blendMode?: string;
    visible?: boolean;
    locked?: boolean;
    description?: string;
    constraints?: Constraints;
    children?: NodeSpecification[];
}
interface FrameNodeSpec extends BaseNodeSpec {
    type: 'FRAME' | 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE';
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
    strokeAlign?: string;
    strokeCap?: string;
    strokeJoin?: string;
    strokeMiterLimit?: number;
    cornerRadius?: number;
    rectangleCornerRadii?: [number, number, number, number];
    effects?: Effect[];
    layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    itemSpacing?: number;
    counterAxisSpacing?: number;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    primaryAxisSizingMode?: string;
    layoutWrap?: string;
    clipsContent?: boolean;
    variantProperties?: Record<string, string>;
}
interface ShapeNodeSpec extends BaseNodeSpec {
    type: 'RECTANGLE' | 'ELLIPSE' | 'POLYGON' | 'STAR' | 'VECTOR' | 'LINE';
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
    strokeAlign?: string;
    strokeCap?: string;
    strokeJoin?: string;
    cornerRadius?: number;
    rectangleCornerRadii?: [number, number, number, number];
    effects?: Effect[];
}
interface TextNodeSpec extends BaseNodeSpec {
    type: 'TEXT';
    characters: string;
    fontSize?: number;
    fontName?: FontName;
    fontWeight?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
    textAutoResize?: string;
    lineHeight?: any;
    letterSpacing?: any;
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
    effects?: Effect[];
}
type NodeSpecification = BaseNodeSpec | FrameNodeSpec | ShapeNodeSpec | TextNodeSpec;
/**
 * Convert Figma paint array to reconstruction spec format
 */
export declare function convertFills(fills: any): Paint[];
/**
 * Convert Figma stroke array to reconstruction spec format
 */
export declare function convertStrokes(strokes: any): Paint[];
/**
 * Convert Figma effects array to reconstruction spec format
 */
export declare function convertEffects(effects: any): Effect[];
/**
 * Recursively extract node specification for reconstruction
 */
export declare function extractNodeSpec(node: any): NodeSpecification;
/**
 * Validate that the reconstruction spec has required fields
 */
export declare function validateReconstructionSpec(spec: any): {
    valid: boolean;
    errors: string[];
};
/**
 * Extract a specific variant from a COMPONENT_SET by name
 */
export declare function extractVariant(componentSet: any, variantName: string): NodeSpecification;
/**
 * Get list of available variants in a COMPONENT_SET
 */
export declare function listVariants(componentSet: any): string[];
export {};
//# sourceMappingURL=figma-reconstruction-spec.d.ts.map