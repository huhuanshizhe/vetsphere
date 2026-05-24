import { describe, expect, it } from 'vitest';
import { splitTextIntoChunks } from '../src/lib/content-rag';

describe('splitTextIntoChunks', () => {
  it('returns no chunks for empty text', () => {
    expect(splitTextIntoChunks('   ')).toEqual([]);
  });

  it('returns a single chunk for short text', () => {
    expect(splitTextIntoChunks('Short evidence paragraph.')).toEqual(['Short evidence paragraph.']);
  });

  it('splits long text by paragraph and preserves overlap in the next chunk', () => {
    const firstParagraph = 'A'.repeat(700);
    const secondParagraph = 'B'.repeat(700);
    const thirdParagraph = 'C'.repeat(700);

    const chunks = splitTextIntoChunks(
      `${firstParagraph}\n\n${secondParagraph}\n\n${thirdParagraph}`,
      800,
      50,
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain(firstParagraph);
    expect(chunks[1].startsWith('A'.repeat(50))).toBe(true);
    expect(chunks[1]).toContain(secondParagraph);
  });
});