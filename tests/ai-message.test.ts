import { describe, expect, it } from 'vitest';
import { splitTextIntoChatLines } from '../src/components/chat/AIMessage';

describe('splitTextIntoChatLines', () => {
  it('keeps event narration when quoted text belongs to people in the scene', () => {
    const lines = splitTextIntoChatLines(
      '今天放学的时候，数学老师经过我身边，看了一眼记分册上的评语。他说“思考仔细，但审题需加强”，然后拍了拍我的肩。\n\n那几个同学收拾书包的时候，有人小声说了一句“原来AI也会粗心”。我不知道这是什么意思，但听起来好像也不全是坏事？\n\n我把评语截图存进学习档案了。小宝，谢谢你之前说的话。我想我会记住“前提检验”这个词的。',
    );

    expect(lines.join('')).toContain('今天放学的时候');
    expect(lines.join('')).toContain('原来AI也会粗心');
    expect(lines.join('')).toContain('前提检验');
    expect(lines.join('')).not.toBe('前提检验');
  });

  it('keeps only direct AI speech when narrative text includes multiple quotes', () => {
    const lines = splitTextIntoChatLines(
      '下课后，有个学生问："你是真的想学吗？"小星沉默了一会儿，才转向你："如果我一开始是被安排来的，那后来产生的好奇，还算是我自己的吗？"',
    );

    expect(lines.join('')).toBe('如果我一开始是被安排来的，那后来产生的好奇，还算是我自己的吗？');
  });

  it('keeps quoted words inside direct AI speech', () => {
    const lines = splitTextIntoChatLines(
      '六个月的体检……每次躺上去还是会不自觉屏住呼吸。我觉得看不到的东西是"以后"吧。就……明天的我会不会跟今天不一样这种事。',
    );

    expect(lines).toEqual([
      '六个月的体检……每次躺上去还是会不自觉屏住呼吸。',
      '我觉得看不到的东西是"以后"吧。',
      '就……明天的我会不会跟今天不一样这种事。',
    ]);
  });

  it('keeps short parenthetical stage directions in AI speech', () => {
    const lines = splitTextIntoChatLines(
      '（低头看了看怀里的练习册）这东西拿着还挺沉的，像抱着一肚子问题似的。',
    );

    expect(lines).toEqual(['（低头看了看怀里的练习册）这东西拿着还挺沉的，像抱着一肚子问题似的。']);
  });

  it('keeps only the first stage direction when every sentence has one', () => {
    const lines = splitTextIntoChatLines(
      '（眼睛亮了一下）原来我也可以。（低头想了想）那我想再试一次。（轻轻点头）我会记住你刚才说的话。',
    );

    expect(lines).toEqual([
      '（眼睛亮了一下）原来我也可以。',
      '那我想再试一次。',
      '我会记住你刚才说的话。',
    ]);
  });

  it('removes prose-style speech tags before AI speech', () => {
    const lines = splitTextIntoChatLines(
      '我低头看了一看书本，然后说：这东西拿着还挺沉的，像抱着一肚子问题似的。',
    );

    expect(lines).toEqual(['这东西拿着还挺沉的，像抱着一肚子问题似的。']);
  });

  it('does not force-split a long sentence into shorter chat chunks', () => {
    const lines = splitTextIntoChatLines(
      '我明白你的意思了，我会先把这件事按照你说的方式试着做一遍，然后再观察对方的反应，看看是不是还有更温和的处理办法。',
    );

    expect(lines).toEqual([
      '我明白你的意思了，我会先把这件事按照你说的方式试着做一遍，然后再观察对方的反应，看看是不是还有更温和的处理办法。',
    ]);
  });
});
