/**
 * v1.10.0: Does a figma_execute script change the document?
 *
 * Used to decide whether an untargeted figma_execute must name its file when
 * several files are connected. Deliberately broad: a false "mutating" only costs
 * one extra round-trip (the call asks for fileKey); a false "read-only" could
 * write to the wrong file.
 */
export declare function looksMutating(code: string): boolean;
//# sourceMappingURL=mutation-detect.d.ts.map