import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  WIN_CARD_SIZE,
  WIN_CARD_CAPTION,
  getWinCardHeader,
  wrapText,
  drawCompass,
  drawWinCard,
  shareWinCard,
} from '../../lib/share-win-card';

/**
 * jsdom has no real canvas — build a mock CanvasRenderingContext2D that
 * records composition calls so we can assert the card is drawn correctly.
 */
function createMockCtx() {
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    // state
    fillStyle: '' as string | object,
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    // drawing ops
    createLinearGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    // ~10px per character: deterministic wrapping in tests
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, raw: ctx, gradient };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getWinCardHeader', () => {
  it('uses the streak framing only for a real streak (>= 2 days)', () => {
    expect(getWinCardHeader(5)).toBe('5 days of calmer moments');
    expect(getWinCardHeader(2)).toBe('2 days of calmer moments');
  });

  it('falls back to a warm default without a streak — never shames', () => {
    expect(getWinCardHeader(undefined)).toBe('A win worth celebrating');
    expect(getWinCardHeader(0)).toBe('A win worth celebrating');
    expect(getWinCardHeader(1)).toBe('A win worth celebrating');
  });
});

describe('wrapText', () => {
  it('wraps long text into multiple lines within maxWidth', () => {
    const { ctx } = createMockCtx();
    // 10px/char → maxWidth 200 fits ~20 chars per line
    const lines = wrapText(ctx, 'She asked for help instead of getting upset today', 200);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length * 10).toBeLessThanOrEqual(200);
    }
    expect(lines.join(' ')).toBe('She asked for help instead of getting upset today');
  });

  it('keeps a single overlong word on its own line rather than dropping it', () => {
    const { ctx } = createMockCtx();
    const lines = wrapText(ctx, 'supercalifragilisticexpialidocious win', 100);
    expect(lines[0]).toBe('supercalifragilisticexpialidocious');
    expect(lines[1]).toBe('win');
  });
});

describe('drawCompass', () => {
  it('draws the two-tone mark: navy ring, navy + teal needles, white pivot', () => {
    const { ctx, raw } = createMockCtx();
    drawCompass(ctx, 0, 0, 96);

    // Ring + pivot dot = two arcs (r27 ring, r2.1 dot in 64-box coordinates)
    expect(raw.arc).toHaveBeenCalledWith(32, 32, 27, 0, Math.PI * 2);
    expect(raw.arc).toHaveBeenCalledWith(32, 32, 2.1, 0, Math.PI * 2);
    expect(raw.stroke).toHaveBeenCalledTimes(1);
    // Two needle fills + white pivot fill
    expect(raw.fill).toHaveBeenCalledTimes(3);
    // Needle geometry from the brand SVG
    expect(raw.lineTo).toHaveBeenCalledWith(32, 7); // navy north tip
    expect(raw.lineTo).toHaveBeenCalledWith(32, 57); // teal south tip
    expect(raw.save).toHaveBeenCalled();
    expect(raw.restore).toHaveBeenCalled();
  });
});

describe('drawWinCard', () => {
  it('composes mist background, header, wrapped win text, and footer wordmark', () => {
    const { ctx, raw, gradient } = createMockCtx();
    drawWinCard(ctx, { winText: 'He tied his shoes all by himself this morning', streakDays: 4 });

    // Full-bleed 1080×1080 mist gradient background
    expect(raw.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, WIN_CARD_SIZE);
    expect(gradient.addColorStop).toHaveBeenCalledWith(0, '#F6FBFB');
    expect(gradient.addColorStop).toHaveBeenCalledWith(1, '#EDF4F7');
    expect(raw.fillRect).toHaveBeenCalledWith(0, 0, WIN_CARD_SIZE, WIN_CARD_SIZE);

    const drawnText = raw.fillText.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    // Streak header
    expect(drawnText).toContain('4 days of calmer moments');
    // Win text present (possibly wrapped across lines)
    expect(drawnText.replace(/\n/g, ' ')).toContain('tied his shoes');
    // Footer wordmark + url
    expect(drawnText).toContain('aminy');
    expect(drawnText).toContain('aminy.ai');
  });

  it('renders only the win text — no extra names or PII are injected', () => {
    const { ctx, raw } = createMockCtx();
    drawWinCard(ctx, { winText: 'A calm bedtime tonight' });

    const drawn = raw.fillText.mock.calls.map((c: unknown[]) => String(c[0]));
    const allowed = ['A win worth celebrating', 'aminy', 'aminy.ai'];
    const winWords = new Set('A calm bedtime tonight'.split(' '));
    for (const line of drawn) {
      const isKnownChrome = allowed.includes(line);
      const isWinText = line.split(' ').every((w) => winWords.has(w));
      expect(isKnownChrome || isWinText).toBe(true);
    }
  });

  it('caps extremely long wins with an ellipsis instead of overflowing', () => {
    const { ctx, raw } = createMockCtx();
    drawWinCard(ctx, { winText: 'so proud '.repeat(300).trim() });
    const drawn = raw.fillText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(drawn.some((line) => line.endsWith('…'))).toBe(true);
  });
});

describe('shareWinCard', () => {
  function stubCanvas() {
    const { ctx, raw } = createMockCtx();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toBlob: vi.fn((cb: (b: Blob | null) => void) =>
        cb(new Blob(['png'], { type: 'image/png' }))
      ),
    };
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'canvas' ? (fakeCanvas as unknown as HTMLElement) : realCreate(tag)) as typeof document.createElement);
    return { fakeCanvas, raw };
  }

  it('uses the native share sheet with the PNG file when supported', async () => {
    stubCanvas();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.assign(navigator, { share, canShare });

    const result = await shareWinCard({ winText: 'First full school day' });

    expect(result).toBe('shared');
    expect(canShare).toHaveBeenCalled();
    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0][0];
    expect(payload.files).toHaveLength(1);
    expect(payload.files[0].name).toBe('aminy-win.png');
    expect(payload.text).toBe(WIN_CARD_CAPTION);

    // cleanup
    delete (navigator as unknown as Record<string, unknown>).share;
    delete (navigator as unknown as Record<string, unknown>).canShare;
  });

  it('falls back to PNG download + caption copy when share is unavailable', async () => {
    const { fakeCanvas } = stubCanvas();
    // jsdom: no navigator.share by default. Stub clipboard + object URLs.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const createObjectURL = vi.fn(() => 'blob:aminy-win');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    const clicked: string[] = [];
    const origAppend = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation(((node: Node) => {
      const el = node as HTMLAnchorElement;
      if (el.tagName === 'A') {
        el.click = () => clicked.push(el.download);
      }
      return origAppend(node);
    }) as typeof document.body.appendChild);

    const result = await shareWinCard({ winText: 'A calm grocery run', streakDays: 3 });

    expect(result).toBe('downloaded');
    expect(fakeCanvas.toBlob).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked).toEqual(['aminy-win.png']);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:aminy-win');
    expect(writeText).toHaveBeenCalledWith(WIN_CARD_CAPTION);
  });
});
