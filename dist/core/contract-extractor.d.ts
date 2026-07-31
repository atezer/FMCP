/**
 * Contract Extractor — Component Set → design contract JSON spec (v1.9.14).
 *
 * figma_extract_contract aracının çekirdeği. Üç aşamalı okuma:
 *   1) STRUCTURE  — set metadata + componentPropertyDefinitions + default variant ağacı
 *   2) OVERRIDES  — her variant prop değeri için default'a karşı token diff'i
 *   3) TOKENS     — kullanılan tüm variable'ların mode bazlı alias-chain çözümü
 *
 * Plugin scriptleri HAM veri döndürür (JSON string — safeSerialize bozulmalarını
 * atlamak için); tüm normalizasyon/birleştirme bu modüldeki saf TS fonksiyonlarında
 * yapılır ki Jest ile test edilebilsin. DS-agnostic: hiçbir koleksiyon/font/tema
 * adı hardcode edilmez.
 */
export interface RawPropDef {
    key: string;
    type: "VARIANT" | "BOOLEAN" | "TEXT" | "INSTANCE_SWAP";
    defaultValue: unknown;
    variantOptions: string[] | null;
    defaultComponentName?: string;
    defaultComponentId?: string;
}
export interface RawNode {
    name: string;
    type: string;
    visible: boolean;
    w: number | null;
    h: number | null;
    layoutMode?: string;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    itemSpacing?: number;
    radius?: [number, number, number, number];
    layoutGrow?: number;
    layoutAlign?: string;
    fillHex?: string | null;
    strokeHex?: string | null;
    strokeWeight?: number;
    bound?: Record<string, string>;
    characters?: string;
    textStyleName?: string | null;
    fontFamily?: string | null;
    fontStyle?: string | null;
    fontSize?: number | null;
    lineHeight?: string | number;
    /** Sayısal lineHeight'ta birim (PIXELS | PERCENT) — 150'nin %150 mi 150px mi olduğunu ayırt eder. */
    lineHeightUnit?: string;
    letterSpacing?: number;
    letterSpacingUnit?: string;
    textAlign?: string;
    textAutoResize?: string;
    mainComponent?: {
        id: string;
        name: string;
        parentName?: string | null;
    };
    propRefs?: Record<string, string>;
    children?: RawNode[];
}
export interface RawStructure {
    ok: boolean;
    error?: string;
    kind?: "COMPONENT_SET" | "COMPONENT";
    set?: {
        id: string;
        name: string;
        key: string | null;
    };
    fileKey?: string | null;
    defaultVariant?: {
        id: string;
        name: string;
    };
    props?: RawPropDef[];
    variantGroupProperties?: Record<string, {
        values: string[];
    }>;
    tree?: RawNode;
}
/** Tek bir alan farkı: a = default taraf, b = variant taraf. */
export interface RawOverrideEntry {
    /** Structural index path ('' = root, '0/2' = child yolu). */
    p: string;
    /** Node adları yolu (fallback etiketleme için). */
    n: string;
    /** Node tipi (TEXT → color eşlemesi için). */
    t: string;
    /** Alan adı: fills|strokes|strokeWeight|itemSpacing|padding*|*Radius|fontSize|fontFamily|fontStyle|textStyle */
    f: string;
    a?: {
        id?: string;
        v?: unknown;
        styleName?: string | null;
    } | null;
    b?: {
        id?: string;
        v?: unknown;
        styleName?: string | null;
    } | null;
}
export interface RawOverrides {
    ok: boolean;
    error?: string;
    overrides?: Record<string, Record<string, RawOverrideEntry[]>>;
}
export interface RawTokenEntry {
    name: string;
    collection: string;
    type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
    values: Record<string, unknown>;
    aliasChain: Record<string, string[]>;
}
export interface RawTokens {
    ok: boolean;
    error?: string;
    tokens?: Record<string, RawTokenEntry>;
}
/**
 * Aşama 1 — STRUCTURE. nodeId verilmezse aktif seçimden çözer.
 * COMPONENT_SET | COMPONENT | (INSTANCE → main) hedeflerini destekler.
 */
export declare function buildStructureScript(nodeId?: string): string;
/**
 * Aşama 2 — OVERRIDES. Her variant prop'unun her değeri için "default kombinasyon
 * + sadece o prop değişmiş" variant'ı bulur, default'a karşı token diff'i çıkarır.
 */
export declare function buildOverridesScript(setId: string): string;
/**
 * Aşama 3 — TOKENS. Verilen variable id'lerini tüm mode'larda çözer;
 * alias zincirini isim listesi olarak döndürür (sonsuz döngüye karşı visited set).
 */
export declare function buildTokensScript(variableIds: string[]): string;
/** "Icon (R)#12:34" → "Icon (R)" — property key'den hash'i düşür. */
export declare function stripPropHash(key: string): string;
export declare function toKebabCase(s: string): string;
export declare function toCamelCase(s: string): string;
export declare function toPascalCase(s: string): string;
/** Variant seçenekleri tam olarak True/False mu? (boolean-like variant tespiti) */
export declare function isBooleanLikeOptions(options: string[] | null | undefined): boolean;
/** Generic Figma adlarını (Frame 1, Group 2…) bağlama göre anlamlı ada çevirir. */
export declare function semanticPartName(node: Pick<RawNode, "name" | "type" | "w" | "h" | "mainComponent">): string;
/** Çakışan part adlarına -2, -3… soneki ekler. */
export declare function dedupeName(base: string, used: Set<string>): string;
/** Bound alan adını CSS property'e çevirir (fills node tipine göre ayrışır). */
export declare function fieldToCss(field: string, nodeType: string): string | null;
/** Variable adını token referansına çevirir: "Spacing/spacing-050" → "{Spacing.spacing-050}" */
export declare function tokenRef(variableName: string): string;
export interface ParsedColor {
    r: number;
    g: number;
    b: number;
    a: number;
}
/** #rgb | #rrggbb | #rrggbbaa hex'i 0-1 aralığında RGBA'ya çevirir. */
export declare function parseHexColor(hex: string): ParsedColor | null;
export declare function relativeLuminance(c: ParsedColor): number;
/**
 * WCAG kontrast oranı. Alpha'lı renkler blend edilir: bg → beyaz üzerine,
 * fg → (blend edilmiş) bg üzerine. 2 ondalık yuvarlanır.
 *
 * Beyaz zemin varsayımı: bileşenin gerçek sayfa zemini contract'tan bilinemez;
 * açık tema en yaygın durum olduğundan yarı saydam bg beyaza blend edilir.
 * Koyu zeminli kullanımlarda gerçek oran bundan sapabilir — bu bilinçli bir
 * yaklaşıklıktır (fg için zemin bellidir: bileşenin kendi bg'si).
 */
export declare function computeContrastRatio(fgHex: string, bgHex: string): number | null;
export declare function inferElement(componentName: string): string;
export interface ContractProp {
    name: string;
    description: string;
    type: string | {
        enum: string[];
    };
    default?: unknown;
    required?: boolean;
    bindings: {
        figma: Record<string, unknown>;
        code: {
            prop: string;
        };
    };
}
export interface AssembleOptions {
    /** anchors.code.importPath şablonu; {Name} bileşen PascalCase adıyla değiştirilir. */
    importPathTemplate?: string;
}
export interface ContractReport {
    propsExtracted: number;
    statesDetected: string[];
    tokensResolved: number;
    a11yPairCount: number;
    a11yFailCount: number;
    orphanProps: string[];
    suggestedFileName: string;
    notes: string[];
}
/** props + states + orphan tespiti. */
export declare function normalizeProps(rawProps: RawPropDef[], referencedKeys: Set<string>, defaultCombo: Record<string, string>): {
    props: ContractProp[];
    states: string[];
    orphans: string[];
};
/**
 * Variant adından ("Style=Custom, Size=Large") kombinasyon objesi çıkarır.
 * Tam olarak "anahtar=değer" olmayan segmentler (combo'suz ad, "a=b=c") atlanır —
 * plugin script'indeki parseCombo ile davranış birebir aynı tutulur.
 */
export declare function parseVariantCombo(name: string): Record<string, string>;
/** structure + overrides içinde geçen tüm variable id'lerini toplar (aşama 3 girdisi). */
export declare function collectVariableIds(structure: RawStructure, overrides: RawOverrides): string[];
/** Üç aşamanın ham çıktısını tam contract + rapora dönüştürür. */
export declare function assembleContract(structure: RawStructure, overrides: RawOverrides, tokens: RawTokens, opts?: AssembleOptions): {
    contract: Record<string, unknown>;
    report: ContractReport;
};
/**
 * executeCodeViaUI sonucundan script JSON string'ini çıkarıp parse eder.
 * Script JSON.stringify döndürür — safeSerialize string'e dokunmaz.
 */
export declare function parseScriptResult<T>(execResult: unknown, stage: string): T;
//# sourceMappingURL=contract-extractor.d.ts.map