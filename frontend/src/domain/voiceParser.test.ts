import { parseVoiceTranscript } from './voiceParser';

describe('Voice Parser', () => {
  it('parses total sold and expenses from simple speech', () => {
    const input = 'Today I sold 25000 naira and my expenses was 4000 naira';
    const res = parseVoiceTranscript(input);
    expect(res.totalSold).toBe(25000);
    expect(res.expenses).toBe(4000);
  });

  it('parses "k" notation for thousands', () => {
    const input = 'Sold 15k, spent 3k on transport';
    const res = parseVoiceTranscript(input);
    expect(res.totalSold).toBe(15000);
    expect(res.expenses).toBe(3000);
  });

  it('parses credit debtors', () => {
    const input = 'I sold 50000, spent 5000 for fuel, and Chidi took 10000 on credit';
    const res = parseVoiceTranscript(input);
    expect(res.totalSold).toBe(50000);
    expect(res.expenses).toBe(5000);
    expect(res.creditLines).toEqual([
      { customerName: 'Chidi', amount: 10000 },
    ]);
  });

  it('parses Pidgin phrased tally', () => {
    const input = 'I sell 35000 today, spend 2500 for food, and Bola carry 5000 credit';
    const res = parseVoiceTranscript(input);
    expect(res.totalSold).toBe(35000);
    expect(res.expenses).toBe(2500);
    expect(res.creditLines).toEqual([
      { customerName: 'Bola', amount: 5000 },
    ]);
  });
});
