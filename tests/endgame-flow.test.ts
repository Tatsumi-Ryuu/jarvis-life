import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('endgame flow', () => {
  it('uses the MBTI report as the post-evidence portrait page and removes the portrait route', () => {
    const router = readSource('src/router/index.tsx');
    const companyFinal = readSource('src/pages/stage4-endgame/CompanyFinalPage.tsx');
    const evidence = readSource('src/pages/stage4-endgame/EndgameEvidencePage.tsx');
    const mbti = readSource('src/pages/stage4-endgame/MBTIAssessmentPage.tsx');
    const verdict = readSource('src/pages/stage4-endgame/VerdictReportPage.tsx');
    const gmPanel = readSource('src/components/dev/GMPanel.tsx');

    expect(router).not.toContain('/endgame/portrait');
    expect(router).not.toContain('CharacterPortraitPage');
    expect(router).not.toContain('/endgame/choice');
    expect(router).not.toContain('PostWarChoicePage');
    expect(companyFinal).toContain("navigate('/endgame/test-round/1')");
    expect(evidence).toContain("navigate('/endgame/mbti')");
    expect(evidence).toContain('继续');
    expect(evidence).not.toContain('查看人格画像');
    expect(evidence).not.toContain('进入最终裁决');
    expect(mbti).toContain("navigate('/endgame/verdict/1')");
    expect(mbti).toContain('继续');
    expect(mbti).toContain('chromePanelStyle');
    expect(mbti).toContain("import { Button }");
    expect(mbti).not.toContain('10px 10px 0 rgba(31,111,152,0.30)');
    expect(verdict).not.toContain("navigate('/endgame/choice')");
    expect(verdict).toContain("navigate('/endgame/chronicle/1')");
    expect(gmPanel).not.toContain('角色肖像');
    expect(gmPanel).not.toContain('战后选择');
  });
});
