type CursorPosition = {
    x: number;
    y: number;
};
export declare class QueryResponder {
    private getCursorPosition;
    private state;
    private csiParams;
    private csiIntermediates;
    private oscBuffer;
    private dcsBuffer;
    private oscEscPending;
    private dcsEscPending;
    constructor(getCursorPosition: () => CursorPosition);
    scan(data: string): string[];
    private handleCsi;
    private handleOsc;
    private resetCsi;
    private resetAll;
}
export {};
//# sourceMappingURL=query-responder.d.ts.map