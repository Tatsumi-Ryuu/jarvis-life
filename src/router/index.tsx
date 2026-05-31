import React, { useEffect, useState } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { getSaveStorageStatus } from '../services/save-service';
import { useGameStore } from '../store/gameStore';

// Stage 1: Opening
import { TitlePage } from '../pages/stage1-opening/TitlePage';
import { StoryPage } from '../pages/stage1-opening/StoryPage';
import { QuestionnaireIntroPage } from '../pages/stage1-opening/QuestionnaireIntroPage';
import { QuestionnairePage } from '../pages/stage1-opening/QuestionnairePage';
import { IdentityResultPage } from '../pages/stage1-opening/IdentityResultPage';
import { ProfileCreationPage } from '../pages/stage1-opening/ProfileCreationPage';

// Stage 2: Raising
import { MonthStartNotification } from '../pages/stage2-raising/MonthStartNotification';
import { IdlePage } from '../pages/stage2-raising/IdlePage';
import { MapPage } from '../pages/stage2-raising/MapPage';
import { LocationPage } from '../pages/stage2-raising/LocationPage';
import { ActionProgressPage } from '../pages/stage2-raising/ActionProgressPage';
import { EventDialoguePage } from '../pages/stage2-raising/EventDialoguePage';
import { EndMonthConfirmPage } from '../pages/stage2-raising/EndMonthConfirmPage';
import { MonthlySettlementPage } from '../pages/stage2-raising/MonthlySettlementPage';
import { CatTrapChallengePage } from '../pages/stage2-raising/CatTrapChallengePage';

// Stage 3: Exam
import { ExamNotificationPage } from '../pages/stage3-exam/ExamNotificationPage';
import { CompanyEntrancePage } from '../pages/stage3-exam/CompanyEntrancePage';
import { ExamTestingScene } from '../pages/stage3-exam/ExamTestingScene';
import { ExamSituationTest } from '../pages/stage3-exam/ExamSituationTest';
import { ExamReportPage } from '../pages/stage3-exam/ExamReportPage';
import { ExamAskAIPage } from '../pages/stage3-exam/ExamAskAIPage';

// Stage 4: Endgame
import { FarewellPage } from '../pages/stage4-endgame/FarewellPage';
import { FinalTestNotificationPage } from '../pages/stage4-endgame/FinalTestNotificationPage';
import { CompanyFinalPage } from '../pages/stage4-endgame/CompanyFinalPage';
import { MBTIAssessmentPage } from '../pages/stage4-endgame/MBTIAssessmentPage';
import { TestRoundPage } from '../pages/stage4-endgame/TestRoundPage';
import { Test3RulesPage } from '../pages/stage4-endgame/Test3RulesPage';
import { Test3PlaybackPage } from '../pages/stage4-endgame/Test3PlaybackPage';
import { EndgameEvidencePage } from '../pages/stage4-endgame/EndgameEvidencePage';
import { VerdictReportPage } from '../pages/stage4-endgame/VerdictReportPage';
import { AILetterPage } from '../pages/stage4-endgame/AILetterPage';
import { PlayerEndingPage } from '../pages/stage4-endgame/PlayerEndingPage';
import { EndgameCompanyBackground } from '../pages/stage4-endgame/EndgameCompanyBackground';
import { DesignSystemPreviewPage } from '../pages/dev/DesignSystemPreviewPage';
import { ConfirmedStyleDesignSpecPage } from '../pages/dev/ConfirmedStyleDesignSpecPage';
import { GomokuAiDemoPage } from '../pages/dev/GomokuAiDemoPage';
import { CatTrapDemoPage } from '../pages/dev/CatTrapDemoPage';

type DeferredRouteModule = {
  default: React.ComponentType;
};

type DeferredRouteProps = {
  load: () => Promise<DeferredRouteModule>;
  routeName: string;
};

const loadChroniclePage = async (): Promise<DeferredRouteModule> => {
  const module = await import('../pages/stage4-endgame/ChroniclePage');
  return { default: module.ChroniclePage };
};

function DeferredRoute({ load, routeName }: DeferredRouteProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    load()
      .then((module) => {
        if (active) {
          setComponent(() => module.default);
        }
      })
      .catch((error: unknown) => {
        console.error(`[Router] Failed to load route "${routeName}"`, error);
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [load, routeName]);

  if (failed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EAF8FF',
          color: '#1f3b4d',
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        当前页面暂时不可用，请返回上一页继续游戏。
      </div>
    );
  }

  if (!Component) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#EAF8FF' }} />;
  }

  return <Component />;
}

function StorageRequiredRoute({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (import.meta.env.DEV && useGameStore.getState().phase !== 'title') {
      setReady(true);
      return () => { active = false; };
    }
    getSaveStorageStatus().then((status) => {
      if (active) setReady(status.state === 'ready');
    });
    return () => { active = false; };
  }, []);

  if (ready === null) {
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#EAF8FF' }} />;
  }

  if (!ready) {
    return <Navigate to="/title" replace />;
  }

  return <>{children}</>;
}

function guarded(element: React.ReactNode): React.ReactElement {
  return <StorageRequiredRoute>{element}</StorageRequiredRoute>;
}

function endgame(element: React.ReactNode): React.ReactElement {
  return guarded(<EndgameCompanyBackground>{element}</EndgameCompanyBackground>);
}

export const router = createHashRouter([
  { path: '/', element: <Navigate to="/title" /> },
  { path: '/dev/design-system', element: <DesignSystemPreviewPage /> },
  { path: '/dev/design-system-confirmed', element: <ConfirmedStyleDesignSpecPage /> },
  { path: '/dev/gomoku', element: <GomokuAiDemoPage /> },
  { path: '/dev/cat-trap', element: <CatTrapDemoPage /> },

  // === Stage 1: Opening ===
  { path: '/title', element: <TitlePage /> },
  { path: '/story/:page', element: guarded(<StoryPage />) },
  { path: '/questionnaire-intro', element: guarded(<QuestionnaireIntroPage />) },
  { path: '/questionnaire/:question', element: guarded(<QuestionnairePage />) },
  { path: '/identity-result', element: guarded(<IdentityResultPage />) },
  { path: '/profile-creation', element: guarded(<ProfileCreationPage />) },

  // === Stage 2: Raising ===
  { path: '/raising/month-start/:month', element: guarded(<MonthStartNotification />) },
  { path: '/raising/idle/:month', element: guarded(<IdlePage />) },
  { path: '/raising/map/:month', element: guarded(<MapPage />) },
  { path: '/raising/location/:location', element: guarded(<LocationPage />) },
  { path: '/raising/park/find-cat', element: guarded(<CatTrapChallengePage />) },
  { path: '/raising/company/gomoku-ai-test', element: guarded(<GomokuAiDemoPage />) },
  { path: '/raising/action-progress', element: guarded(<ActionProgressPage />) },
  { path: '/raising/event/:eventId', element: guarded(<EventDialoguePage />) },
  { path: '/raising/end-month-confirm', element: guarded(<EndMonthConfirmPage />) },
  { path: '/raising/settlement/:month', element: guarded(<MonthlySettlementPage />) },

  // === Stage 3: Exam ===
  { path: '/exam/notification', element: guarded(<ExamNotificationPage />) },
  { path: '/exam/idle', element: guarded(<IdlePage />) },
  { path: '/exam/map', element: guarded(<MapPage />) },
  { path: '/exam/company-entrance', element: guarded(<CompanyEntrancePage />) },
  { path: '/exam/company-entrance/gomoku', element: guarded(<GomokuAiDemoPage />) },
  { path: '/exam/testing', element: guarded(<ExamTestingScene />) },
  { path: '/exam/situation', element: guarded(<ExamSituationTest />) },
  { path: '/exam/report', element: guarded(<ExamReportPage />) },
  { path: '/exam/ask-ai', element: guarded(<ExamAskAIPage />) },

  // === Stage 4: Endgame ===
  { path: '/endgame/notification', element: endgame(<FinalTestNotificationPage />) },
  { path: '/endgame/farewell', element: endgame(<FarewellPage />) },
  { path: '/endgame/company-final', element: endgame(<CompanyFinalPage />) },
  { path: '/endgame/mbti', element: endgame(<MBTIAssessmentPage />) },
  { path: '/endgame/test-round/:round', element: endgame(<TestRoundPage />) },
  { path: '/endgame/test3-rules', element: endgame(<Test3RulesPage />) },
  { path: '/endgame/test3-playback', element: endgame(<Test3PlaybackPage />) },
  { path: '/endgame/evidence', element: endgame(<EndgameEvidencePage />) },
  { path: '/endgame/verdict/:page', element: endgame(<VerdictReportPage />) },
  {
    path: '/endgame/chronicle/:page',
    element: endgame(<DeferredRoute load={loadChroniclePage} routeName="endgame/chronicle/:page" />),
  },
  { path: '/endgame/letter', element: endgame(<AILetterPage />) },
  { path: '/endgame/player-ending', element: endgame(<PlayerEndingPage />) },
]);
