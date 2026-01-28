type CursorPosition = { x: number; y: number };

enum ParseState {
  Ground = "GROUND",
  Esc = "ESC",
  CsiParam = "CSI_PARAM",
  CsiIntermediate = "CSI_INTERMEDIATE",
  Osc = "OSC",
  Dcs = "DCS",
}

const MAX_BUFFER = 8192;

const isParamByte = (code: number): boolean => code >= 0x30 && code <= 0x3f;
const isIntermediateByte = (code: number): boolean => code >= 0x20 && code <= 0x2f;
const isFinalByte = (code: number): boolean => code >= 0x40 && code <= 0x7e;

const OSC_TERMINATOR_BEL = "\x07";
const OSC_TERMINATOR_ST = "\x1b\\";

export class QueryResponder {
  private state: ParseState = ParseState.Ground;
  private csiParams = "";
  private csiIntermediates = "";
  private oscBuffer = "";
  private dcsBuffer = "";
  private oscEscPending = false;
  private dcsEscPending = false;

  constructor(private getCursorPosition: () => CursorPosition) {}

  scan(data: string): string[] {
    const responses: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const ch = data[i];
      const code = data.charCodeAt(i);

      switch (this.state) {
        case ParseState.Ground:
          if (ch === "\x1b") {
            this.state = ParseState.Esc;
          }
          break;

        case ParseState.Esc:
          if (ch === "[") {
            this.state = ParseState.CsiParam;
            this.csiParams = "";
            this.csiIntermediates = "";
          } else if (ch === "]") {
            this.state = ParseState.Osc;
            this.oscBuffer = "";
            this.oscEscPending = false;
          } else if (ch === "P") {
            this.state = ParseState.Dcs;
            this.dcsBuffer = "";
            this.dcsEscPending = false;
          } else {
            this.state = ParseState.Ground;
          }
          break;

        case ParseState.CsiParam:
          if (isParamByte(code)) {
            this.csiParams += ch;
          } else if (isIntermediateByte(code)) {
            this.csiIntermediates += ch;
            this.state = ParseState.CsiIntermediate;
          } else if (isFinalByte(code)) {
            const response = this.handleCsi(ch, this.csiParams, this.csiIntermediates);
            if (response) {
              responses.push(response);
            }
            this.state = ParseState.Ground;
          } else {
            this.resetCsi();
            this.state = ParseState.Ground;
          }
          break;

        case ParseState.CsiIntermediate:
          if (isIntermediateByte(code)) {
            this.csiIntermediates += ch;
          } else if (isFinalByte(code)) {
            const response = this.handleCsi(ch, this.csiParams, this.csiIntermediates);
            if (response) {
              responses.push(response);
            }
            this.state = ParseState.Ground;
          } else {
            this.resetCsi();
            this.state = ParseState.Ground;
          }
          break;

        case ParseState.Osc:
          if (this.oscEscPending) {
            if (ch === "\\") {
              const response = this.handleOsc(this.oscBuffer);
              if (response) {
                responses.push(response);
              }
              this.oscBuffer = "";
              this.oscEscPending = false;
              this.state = ParseState.Ground;
            } else {
              this.oscBuffer += "\x1b" + ch;
              this.oscEscPending = false;
            }
            break;
          }

          if (ch === "\x1b") {
            this.oscEscPending = true;
          } else if (ch === OSC_TERMINATOR_BEL) {
            const response = this.handleOsc(this.oscBuffer);
            if (response) {
              responses.push(response);
            }
            this.oscBuffer = "";
            this.state = ParseState.Ground;
          } else {
            this.oscBuffer += ch;
          }
          break;

        case ParseState.Dcs:
          if (this.dcsEscPending) {
            if (ch === "\\") {
              this.dcsBuffer = "";
              this.dcsEscPending = false;
              this.state = ParseState.Ground;
            } else {
              this.dcsBuffer += "\x1b" + ch;
              this.dcsEscPending = false;
            }
            break;
          }

          if (ch === "\x1b") {
            this.dcsEscPending = true;
          } else {
            this.dcsBuffer += ch;
          }
          break;
      }

      if (
        this.csiParams.length > MAX_BUFFER ||
        this.csiIntermediates.length > MAX_BUFFER ||
        this.oscBuffer.length > MAX_BUFFER ||
        this.dcsBuffer.length > MAX_BUFFER
      ) {
        this.resetAll();
      }
    }

    return responses;
  }

  private handleCsi(finalByte: string, params: string, intermediates: string): string | null {
    if (finalByte === "n" && intermediates === "" && params === "6") {
      const cursor = this.getCursorPosition();
      const row = cursor.y + 1;
      const col = cursor.x + 1;
      return `\x1b[${row};${col}R`;
    }

    if (finalByte === "c" && intermediates === "") {
      if (params === "" || params === "0") {
        return "\x1b[?62;c";
      }
      if (params === ">" || params === ">0") {
        return "\x1b[>41;354;0c";
      }
      if (params === "=") {
        return "\x1bP!|00000000\x1b\\";
      }
    }

    if (finalByte === "u" && intermediates === "" && params.startsWith("?")) {
      return "\x1b[?0u";
    }

    if (finalByte === "q" && intermediates === "" && params === ">0") {
      return "\x1bP>|TuiVision\x1b\\";
    }

    if (finalByte === "p" && intermediates === "$") {
      const match = params.match(/^\?(\d+)$/);
      if (match) {
        return `\x1b[?${match[1]};2$y`;
      }
    }

    return null;
  }

  private handleOsc(content: string): string | null {
    if (content === "10;?") {
      return "\x1b]10;rgb:ffff/ffff/ffff\x1b\\";
    }
    if (content === "11;?") {
      return "\x1b]11;rgb:0000/0000/0000\x1b\\";
    }
    if (content === "12;?") {
      return "\x1b]12;rgb:ffff/ffff/ffff\x1b\\";
    }
    return null;
  }

  private resetCsi(): void {
    this.csiParams = "";
    this.csiIntermediates = "";
  }

  private resetAll(): void {
    this.state = ParseState.Ground;
    this.resetCsi();
    this.oscBuffer = "";
    this.dcsBuffer = "";
    this.oscEscPending = false;
    this.dcsEscPending = false;
  }
}
