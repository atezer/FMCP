/**
 * fmcp CLI — `fmcp doctor`: 10 checks, one line of fix per finding. Dependency-free.
 */
export type Level = "ok" | "info" | "warn" | "fail";
export interface Finding {
    /** Stable id, e.g. "node", "ports", "zombies". */
    check: string;
    level: Level;
    title: string;
    detail?: string;
    fix?: string;
    /** When `--fix` is given, doctor runs this and reports the returned text. */
    action?: () => Promise<string>;
}
export interface DoctorContext {
    installRoot: string;
    cwd: string;
    home: string;
    platform: NodeJS.Platform;
    env: NodeJS.ProcessEnv;
    nodeVersion: string;
}
export declare function runDoctor(ctx: DoctorContext): Promise<Finding[]>;
export declare function formatFindings(findings: Finding[], fixResults?: Map<Finding, string>): string;
export declare function exitCodeFor(findings: Finding[]): number;
//# sourceMappingURL=doctor.d.ts.map