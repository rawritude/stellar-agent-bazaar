import type { TerminalState, TerminalScreen, TerminalSideEffect, TerminalChoice, TerminalLine } from "./terminalTypes";
import { blank, line, span } from "./terminalTypes";
import type { GameState, RiskPosture } from "../gameData";
import * as Text from "./terminalText";

export function initialTerminalState(): TerminalState {
  return {
    screen: "splash",
    lines: [...Text.SPLASH_ART],
    choices: [{ key: "enter", label: "Press ENTER to begin...", action: "START" }],
    textInput: false,
    pending: {},
    agentPage: 0,
    missionPage: 0,
    history: [],
  };
}

interface TransitionResult {
  state: TerminalState;
  sideEffect?: TerminalSideEffect;
}

/**
 * The terminal state machine. Pure function: takes the current terminal state,
 * the current game state (read-only), and a user action, and returns the next
 * terminal state plus an optional side effect to execute on the game context.
 */
export function transition(
  term: TerminalState,
  game: GameState,
  action: string,
  data?: any,
): TransitionResult {
  const next = (
    screen: TerminalScreen,
    lines: TerminalLine[],
    choices: TerminalChoice[],
    opts?: Partial<TerminalState>,
  ): TransitionResult => ({
    state: {
      ...term,
      screen,
      lines, // replace display — each screen is a clean page
      choices,
      textInput: false,
      history: screen !== term.screen ? [...term.history, term.screen] : term.history,
      ...opts,
    },
  });

  const nextWithEffect = (
    screen: TerminalScreen,
    lines: TerminalLine[],
    choices: TerminalChoice[],
    sideEffect: TerminalSideEffect,
    opts?: Partial<TerminalState>,
  ): TransitionResult => ({
    ...next(screen, lines, choices, opts),
    sideEffect,
  });

  switch (term.screen) {
    // ── SPLASH ────────────────────────────────────
    case "splash": {
      if (action === "START") {
        return next("narrator_intro", Text.hakimIntro(), [
          { key: "enter", label: "Continue...", action: "CONTINUE" },
        ]);
      }
      break;
    }

    // ── NARRATOR INTRO ───────────────────────────
    case "narrator_intro": {
      if (action === "CONTINUE") {
        // Go directly to wallet connection — mandatory before game starts
        const walletLines = Text.hakimWalletRequired();
        return next("stellar_choice", walletLines, [
          { key: "enter", label: "Connect with Passkey", action: "CONNECT_PASSKEY" },
        ]);
      }
      break;
    }

    // ── NAME BRAND ───────────────────────────────
    case "name_brand": {
      if (action === "TEXT_SUBMIT" && data) {
        const name = (data as string).trim();
        if (!name || name.length > 30) break;
        const response = Text.hakimNameResponse(name);
        const generatingLines = [
          blank(),
          line(span("  Hakim consults the ledger...", "dim")),
          line(span("  The bazaar is assembling your crew...", "teal")),
          blank(),
        ];
        return {
          state: {
            ...term,
            screen: "generating_agents",
            lines: [line(span(`  > ${name}`, "amber")), ...response, ...generatingLines],
            choices: [],
            textInput: false,
            history: [...term.history, "name_brand"],
          },
          sideEffect: { type: "GENERATE_AGENTS", brandName: name },
        };
      }
      break;
    }

    // ── GENERATING AGENTS ────────────────────────
    case "generating_agents": {
      if (action === "AGENTS_GENERATED") {
        // Agents have been generated and game state initialized
        return next("meet_agents", [
          blank(),
          line(span("  \"Your crew has arrived! Let me introduce them...\"", "gold")),
          blank(),
        ], [
          { key: "enter", label: "Meet your agents...", action: "NEXT_AGENT" },
        ], { agentPage: 0 });
      }
      if (action === "AGENTS_FAILED") {
        // Fallback to default agents
        return next("generating_agents", [
          blank(),
          line(span("  \"The cosmic winds are uncooperative today.", "gold")),
          line(span("   No matter — I have a crew of regulars standing by.\"", "gold")),
          blank(),
        ], [
          { key: "enter", label: "Meet your agents...", action: "NEXT_AGENT_DEFAULT" },
        ]);
      }
      if (action === "NEXT_AGENT_DEFAULT") {
        // Fall through to meet_agents with default agents
        return next("meet_agents", [], [
          { key: "enter", label: "Meet your agents...", action: "NEXT_AGENT" },
        ], { agentPage: 0 });
      }
      break;
    }

    // ── MEET AGENTS ──────────────────────────────
    case "meet_agents": {
      if (action === "NEXT_AGENT") {
        const agents = game.agents;
        const page = term.agentPage;
        if (page < agents.length) {
          const agentLines = Text.hakimAgentIntro(agents[page], page, agents.length);
          const isLast = page === agents.length - 1;
          return next("meet_agents", agentLines, [
            { key: "enter", label: isLast ? "Begin your first day!" : `Next agent (${page + 2}/${agents.length})...`, action: isLast ? "BEGIN_DAY" : "NEXT_AGENT" },
          ], { agentPage: page + 1 });
        }
      }
      if (action === "BEGIN_DAY") {
        return goToMorningBrief(term, game);
      }
      break;
    }

    // ── STELLAR CHOICE (mandatory — passkey only) ──────────────
    case "stellar_choice": {
      if (action === "CONNECT_PASSKEY") {
        return {
          state: {
            ...term,
            screen: "stellar_connecting",
            lines: [...Text.hakimPasskeyPrompt()],
            choices: [],
            history: [...term.history, "stellar_choice"],
          },
          sideEffect: { type: "CONNECT_PASSKEY" },
        };
      }
      break;
    }

    // ── STELLAR CONNECTING ───────────────────────
    case "stellar_connecting": {
      if (action === "STELLAR_CONNECTED") {
        const publicKey = data as string;
        // Show connected message — save check happens in the hook directly
        return {
          state: {
            ...term,
            screen: "stellar_connecting",
            lines: [...Text.hakimStellarConnected(publicKey)],
            choices: [], // will be populated by SAVE_FOUND or NO_SAVE
            history: [...term.history, "stellar_connecting"],
          },
        };
      }
      if (action === "STELLAR_FAILED") {
        const error = data as string;
        return next("stellar_connecting", Text.hakimStellarFailed(error), [
          { key: "enter", label: "Try again", action: "RETRY_PASSKEY" },
        ]);
      }
      if (action === "RETRY_PASSKEY") {
        return {
          state: {
            ...term,
            screen: "stellar_connecting",
            lines: [...Text.hakimPasskeyPrompt()],
            choices: [],
          },
          sideEffect: { type: "CONNECT_PASSKEY" },
        };
      }
      if (action === "SAVE_FOUND") {
        // A saved game exists — offer to resume or start new
        return next("resume_or_new", Text.buildResumePrompt(data), [
          { key: "1", label: "Resume this game", action: "RESUME_GAME" },
          { key: "2", label: "Start a new adventure", action: "NEW_GAME" },
        ]);
      }
      if (action === "NO_SAVE") {
        // No save — go to brand naming
        return next("name_brand", [
          blank(),
          ...Text.hakimNamePrompt(),
        ], [], {
          textInput: true,
          textPrompt: "Brand name",
        });
      }
      if (action === "NAME_BRAND") {
        return next("name_brand", Text.hakimNamePrompt(), [], {
          textInput: true,
          textPrompt: "Brand name",
        });
      }
      break;
    }

    // ── RESUME OR NEW ────────────────────────────
    case "resume_or_new": {
      if (action === "RESUME_GAME") {
        return {
          state: {
            ...term,
            screen: "resume_or_new",
            lines: [blank(), line(span("  Loading your saved game...", "teal"))],
            choices: [],
          },
          sideEffect: { type: "LOAD_SAVE" },
        };
      }
      if (action === "NEW_GAME") {
        return next("name_brand", [
          blank(),
          line(span("  \"A fresh start! The past is past. Let us begin anew.\"", "gold")),
          blank(),
          ...Text.hakimNamePrompt(),
        ], [], {
          textInput: true,
          textPrompt: "Brand name",
        });
      }
      if (action === "GAME_LOADED") {
        // Game state has been restored — go straight to morning brief
        return next("resume_or_new", [
          blank(),
          line(span("  \"Welcome back! The bazaar has been waiting.\"", "gold")),
          blank(),
        ], [
          { key: "enter", label: "Continue your adventure...", action: "BEGIN_DAY" },
        ]);
      }
      if (action === "BEGIN_DAY") {
        return goToMorningBrief(term, game);
      }
      break;
    }

    // ── MORNING BRIEF ────────────────────────────
    case "morning_brief": {
      if (action === "PLAN") {
        return goToDistrictSelect(term, game, { type: "START_PLANNING" });
      }
      if (action === "VIEW_AGENTS") {
        const agentLines = Text.buildAgentRosterView(game);
        return next("view_agents", agentLines, [
          { key: "b", label: "Back to morning brief", action: "BACK" },
        ]);
      }
      if (action === "VIEW_NETWORK") {
        return next("view_network", Text.buildNetworkView(game), [
          { key: "b", label: "Back to morning brief", action: "BACK" },
        ]);
      }
      if (action === "VIEW_LEDGER") {
        return next("view_ledger", Text.buildLedgerView(game), [
          { key: "b", label: "Back to morning brief", action: "BACK" },
        ]);
      }
      if (action === "VIEW_RUMORS") {
        return next("view_rumors", Text.buildRumorsView(game), [
          { key: "b", label: "Back to morning brief", action: "BACK" },
        ]);
      }
      if (action === "VIEW_NFTS") {
        const { lines, choices } = Text.buildNFTView(game, undefined); // wallet address passed from hook
        return next("view_nfts", lines, choices);
      }
      if (action === "VIEW_STELLAR") {
        // Show current stellar status with option to connect/disconnect
        const isConnected = !!game.networkStats.testnetTransactions || false; // approximate check
        const stellarLines = Text.buildStellarToggleLines(false); // default to showing connect option
        return next("stellar_choice", stellarLines, [
          { key: "1", label: "Connect to Stellar Testnet", action: "CONNECT_STELLAR" },
          { key: "b", label: "Back to morning brief", action: "BACK" },
        ]);
      }
      break;
    }

    // ── SIDE VIEWS ───────────────────────────────
    case "view_agents":
    case "view_network":
    case "view_ledger":
    case "view_rumors": {
      if (action === "BACK") {
        return goToMorningBrief(term, game);
      }
      break;
    }

    // ── RANDOM EVENT ──────────────────────────────
    case "event_announcement": {
      // Handle EVENT_CHOICE_0, EVENT_CHOICE_1, EVENT_CHOICE_2
      if (action.startsWith("EVENT_CHOICE_")) {
        const choiceIdx = parseInt(action.replace("EVENT_CHOICE_", ""), 10);
        const event = game.pendingRandomEvent;
        if (event && event.choices[choiceIdx]) {
          const choice = event.choices[choiceIdx];
          const outcomeLines = Text.buildEventOutcome(choice);

          // The actual effects will be applied by the APPLY_EVENT_CHOICE side effect
          return {
            state: {
              ...term,
              screen: "event_announcement",
              lines: [...outcomeLines],
              choices: [{ key: "enter", label: "Continue to your day...", action: "EVENT_DONE" }],
              history: [],
            },
            sideEffect: { type: "APPLY_EVENT" as any, choice: choiceIdx } as any,
          };
        }
      }
      if (action === "EVENT_DONE") {
        // Clear the pending event and proceed to morning brief
        // The event has been handled — go to morning brief (without the event)
        return goToMorningBriefDirect(term, game);
      }
      break;
    }

    // ── NFT VIEW ─────────────────────────────────
    case "view_nfts": {
      if (action === "MINT_AGENT") {
        return {
          state: {
            ...term,
            screen: "minting_nft",
            lines: [blank(), line(span("  Minting agent NFT on Stellar...", "teal"))],
            choices: [],
            pending: { ...term.pending, agentId: data },
            history: [...term.history, "view_nfts"],
          },
          sideEffect: { type: "MINT_NFT" as any },
        };
      }
      if (action === "BACK") {
        return goToMorningBrief(term, game);
      }
      break;
    }

    case "minting_nft": {
      if (action === "NFT_MINTED") {
        const { agentName, tokenId, txHash } = data;
        const mintedLines = Text.buildNFTMintedLines(agentName, tokenId, txHash);
        return next("minting_nft", mintedLines, [
          { key: "enter", label: "Back to morning brief", action: "BACK" },
        ]);
      }
      if (action === "NFT_FAILED") {
        return next("minting_nft", [
          blank(),
          line(span(`  Minting failed: ${data}`, "red")),
          blank(),
        ], [
          { key: "enter", label: "Back to morning brief", action: "BACK" },
        ]);
      }
      if (action === "BACK") {
        return goToMorningBrief(term, game);
      }
      break;
    }

    // ── CHOOSE DISTRICT ──────────────────────────
    case "choose_district": {
      if (action === "SELECT_DISTRICT") {
        const { lines, choices } = Text.buildMissionChoices(game, data);
        return next("choose_mission", lines, choices, {
          pending: { ...term.pending, districtId: data },
        });
      }
      if (action === "BACK") {
        return goToMorningBrief(term, game);
      }
      break;
    }

    // ── CHOOSE MISSION ───────────────────────────
    case "choose_mission": {
      if (action === "SELECT_MISSION") {
        const { lines, choices } = Text.buildAgentChoices(game);
        return next("choose_agent", lines, choices, {
          pending: { ...term.pending, missionId: data },
        });
      }
      if (action === "BACK") {
        return goToDistrictSelect(term, game);
      }
      break;
    }

    // ── CHOOSE AGENT ─────────────────────────────
    case "choose_agent": {
      if (action === "SELECT_AGENT") {
        const agent = game.agents.find(a => a.id === data)!;
        const district = game.districts.find(d => d.id === term.pending.districtId)!;
        const mission = district.availableMissions.find(m => m.id === term.pending.missionId)!;
        const { lines, choices } = Text.buildBudgetChoices(game, mission, agent);
        return next("set_budget", lines, choices, {
          pending: { ...term.pending, agentId: data },
        });
      }
      if (action === "BACK") {
        const { lines, choices } = Text.buildMissionChoices(game, term.pending.districtId!);
        return next("choose_mission", lines, choices);
      }
      break;
    }

    // ── SET BUDGET ───────────────────────────────
    case "set_budget": {
      if (action === "SET_BUDGET") {
        const { lines, choices } = Text.buildPostureChoices();
        return next("set_posture", lines, choices, {
          pending: { ...term.pending, budget: data as number },
        });
      }
      if (action === "BACK") {
        const { lines, choices } = Text.buildAgentChoices(game);
        return next("choose_agent", lines, choices);
      }
      break;
    }

    // ── SET POSTURE ──────────────────────────────
    case "set_posture": {
      if (action === "SET_POSTURE") {
        const pending = { ...term.pending, riskPosture: data as RiskPosture };
        const { lines, choices } = Text.buildDispatchConfirmation(
          game, pending.districtId!, pending.missionId!, pending.agentId!, pending.budget!, data,
        );
        return next("confirm_dispatch", lines, choices, { pending });
      }
      if (action === "BACK") {
        const agent = game.agents.find(a => a.id === term.pending.agentId)!;
        const district = game.districts.find(d => d.id === term.pending.districtId)!;
        const mission = district.availableMissions.find(m => m.id === term.pending.missionId)!;
        const { lines, choices } = Text.buildBudgetChoices(game, mission, agent);
        return next("set_budget", lines, choices);
      }
      break;
    }

    // ── CONFIRM DISPATCH ─────────────────────────
    case "confirm_dispatch": {
      if (action === "CONFIRM_DISPATCH") {
        const confirmLines = [
          blank(),
          line(span("  Mission dispatched!", "green", true)),
          blank(),
        ];
        return {
          state: {
            ...term,
            screen: "dispatch_more",
            lines: [...confirmLines],
            choices: [], // will be set after side effect processes
            pending: {},
            history: [...term.history, "confirm_dispatch"],
          },
          sideEffect: { type: "DISPATCH_MISSION" },
        };
      }
      if (action === "BACK_TO_DISTRICT") {
        return goToDistrictSelect(term, game);
      }
      break;
    }

    // ── DISPATCH MORE ────────────────────────────
    case "dispatch_more": {
      if (action === "REFRESH") {
        // Called after the DISPATCH_MISSION side effect completes and game state updates
        const { lines, choices } = Text.buildDispatchMoreChoices(game);
        return next("dispatch_more", lines, choices);
      }
      if (action === "DISPATCH_ANOTHER") {
        return goToDistrictSelect(term, game);
      }
      if (action === "RESOLVE") {
        return {
          state: {
            ...term,
            screen: "resolving",
            lines: [...Text.buildResolvingScreen()],
            choices: [],
            history: [...term.history, "dispatch_more"],
          },
          sideEffect: { type: "RESOLVE_DAY" },
        };
      }
      break;
    }

    // ── RESOLVING ────────────────────────────────
    case "resolving": {
      if (action === "RESOLVE_COMPLETE") {
        // Show first mission result
        const todayMissions = game.completedMissions.filter(
          m => m.result && game.dailyReport && true // they were resolved this day
        );
        // Show all missions from the latest batch
        const startIdx = game.completedMissions.length - (game.dailyReport?.missionsRun ?? 0);
        const latestMissions = game.completedMissions.slice(Math.max(0, startIdx));

        if (latestMissions.length > 0) {
          const missionLines = Text.buildMissionNarrative(latestMissions[0]);
          return next("resolution_narrative", missionLines, [
            {
              key: "enter",
              label: latestMissions.length > 1 ? "Next mission result..." : "View daily report...",
              action: latestMissions.length > 1 ? "NEXT_MISSION" : "DAILY_REPORT",
            },
          ], { missionPage: 1 });
        }
        // No missions (shouldn't happen, but fallback)
        return next("daily_report", Text.buildDailyReport(game), [
          { key: "enter", label: "Continue to next day...", action: "NEXT_DAY" },
        ]);
      }
      break;
    }

    // ── RESOLUTION NARRATIVE ─────────────────────
    case "resolution_narrative": {
      if (action === "NEXT_MISSION") {
        const startIdx = game.completedMissions.length - (game.dailyReport?.missionsRun ?? 0);
        const latestMissions = game.completedMissions.slice(Math.max(0, startIdx));
        const page = term.missionPage;

        if (page < latestMissions.length) {
          const mission = latestMissions[page];
          const missionLines = Text.buildMissionNarrative(mission);

          // Check if any step in this mission has an unresolved decision point
          const decisionStep = mission.result?.actionSteps.find(
            s => s.scene?.decision_point && !s.scene.decision_point.resolved
          );

          if (decisionStep?.scene?.decision_point) {
            // Pause and show the decision
            const dp = decisionStep.scene.decision_point;
            const { lines: decisionLines, choices: decisionChoices } = Text.buildDecisionPrompt(
              mission.agent.name,
              decisionStep.counterpartyName,
              dp,
            );
            return next("mission_decision", [...missionLines, ...decisionLines], decisionChoices, {
              missionPage: page, // don't advance — we'll replay after decision
            });
          }

          const isLast = page === latestMissions.length - 1;
          return next("resolution_narrative", missionLines, [
            {
              key: "enter",
              label: isLast ? "View daily report..." : "Next mission result...",
              action: isLast ? "DAILY_REPORT" : "NEXT_MISSION",
            },
          ], { missionPage: page + 1 });
        }
      }
      if (action === "DAILY_REPORT") {
        return next("daily_report", Text.buildDailyReport(game), [
          { key: "enter", label: "Continue to next day...", action: "NEXT_DAY" },
        ]);
      }
      break;
    }

    // ── MID-MISSION DECISION ─────────────────────
    case "mission_decision": {
      if (action === "DECISION_A" || action === "DECISION_B") {
        const isA = action === "DECISION_A";
        // The decision has been made — show the result and continue
        // (The outcome_modifier was already applied during AI scene generation,
        //  but the player's choice adds additional narrative flavor)
        const modifier = isA ? 0.05 : -0.02; // Slight mechanical effect
        const resultLines = Text.buildDecisionResult(
          isA ? "option A" : "option B",
          modifier,
        );

        // Continue to the next mission or daily report
        const startIdx = game.completedMissions.length - (game.dailyReport?.missionsRun ?? 0);
        const latestMissions = game.completedMissions.slice(Math.max(0, startIdx));
        const nextPage = term.missionPage + 1;
        const isLast = nextPage >= latestMissions.length;

        return next("resolution_narrative", resultLines, [
          {
            key: "enter",
            label: isLast ? "View daily report..." : "Next mission result...",
            action: isLast ? "DAILY_REPORT" : "NEXT_MISSION",
          },
        ], { missionPage: nextPage });
      }
      break;
    }

    // ── DAILY REPORT ─────────────────────────────
    case "daily_report": {
      if (action === "NEXT_DAY") {
        return {
          state: {
            ...term,
            screen: "advance_day",
            lines: [blank(), line(span("  Advancing to the next day...", "amber"))],
            choices: [],
            history: [...term.history, "daily_report"],
          },
          sideEffect: { type: "ADVANCE_DAY" },
        };
      }
      break;
    }

    // ── ADVANCE DAY ──────────────────────────────
    case "advance_day": {
      if (action === "DAY_ADVANCED") {
        return goToMorningBrief(term, game);
      }
      break;
    }
  }

  // Default: no transition
  return { state: term };
}

// ── Helper: go to morning brief ──────────────────

function goToMorningBrief(term: TerminalState, game: GameState): TransitionResult {
  // Check for pending random event first (Slay the Spire-style)
  if (game.pendingRandomEvent) {
    const { lines, choices } = Text.buildRandomEventScreen(game.pendingRandomEvent);
    return {
      state: {
        ...term,
        screen: "event_announcement",
        lines: [...lines],
        choices,
        textInput: false,
        pending: {},
        history: [],
      },
    };
  }

  // Check for game over
  if (game.campaign?.isGameOver) {
    if (game.campaign.hasWon) {
      return {
        state: {
          ...term,
          screen: "game_won",
          lines: [...Text.buildWinScreen(game)],
          choices: [{ key: "enter", label: "The ledger closes. Thank you for playing.", action: "RESTART" }],
          textInput: false,
          pending: {},
          history: [],
        },
      };
    } else {
      return {
        state: {
          ...term,
          screen: "game_lost",
          lines: [...Text.buildLoseScreen(game, game.campaign.gameOverReason || "The bazaar has moved on.")],
          choices: [{ key: "enter", label: "Try again...", action: "RESTART" }],
          textInput: false,
          pending: {},
          history: [],
        },
      };
    }
  }

  // Show event announcements for any new events this day
  const newEventLines: TerminalLine[] = [];
  if (game.activeEvents.length > 0) {
    for (const event of game.activeEvents) {
      // Only show events that just started (daysRemaining close to their max)
      if (event.daysRemaining >= 2 || game.activeEvents.length <= 2) {
        newEventLines.push(...Text.buildEventAnnouncement(event));
      }
    }
  }

  const briefLines = Text.hakimMorningBrief(game);

  const choices: TerminalChoice[] = [
    { key: "1", label: "Begin planning missions", action: "PLAN" },
    { key: "a", label: "View agents", action: "VIEW_AGENTS" },
    { key: "n", label: "View market network", action: "VIEW_NETWORK" },
    { key: "l", label: "View receipt ledger", action: "VIEW_LEDGER" },
    { key: "r", label: "View rumors", action: "VIEW_RUMORS" },
    { key: "x", label: "Agent NFTs (SEP-50)", action: "VIEW_NFTS" },
  ];

  // Show rival info if they exist
  if (game.campaign?.rivalBrand) {
    choices.push({
      key: "v",
      label: `Rival: ${game.campaign.rivalBrand} (Rep: ${game.campaign.rivalReputation})`,
      action: "VIEW_AGENTS", // just for info display
      disabled: true,
    });
  }

  return {
    state: {
      ...term,
      screen: "morning_brief",
      lines: [...newEventLines, ...briefLines],
      choices,
      textInput: false,
      pending: {},
      history: [],
    },
  };
}

/** Go to morning brief, skipping event check (used after event is handled) */
function goToMorningBriefDirect(term: TerminalState, game: GameState): TransitionResult {
  // Skip the pendingRandomEvent check — go straight to the brief
  const briefLines = Text.hakimMorningBrief(game);

  const choices: TerminalChoice[] = [
    { key: "1", label: "Begin planning missions", action: "PLAN" },
    { key: "a", label: "View agents", action: "VIEW_AGENTS" },
    { key: "n", label: "View market network", action: "VIEW_NETWORK" },
    { key: "l", label: "View receipt ledger", action: "VIEW_LEDGER" },
    { key: "r", label: "View rumors", action: "VIEW_RUMORS" },
    { key: "x", label: "Agent NFTs (SEP-50)", action: "VIEW_NFTS" },
  ];

  if (game.campaign?.rivalBrand) {
    choices.push({
      key: "v",
      label: `Rival: ${game.campaign.rivalBrand} (Rep: ${game.campaign.rivalReputation})`,
      action: "VIEW_AGENTS",
      disabled: true,
    });
  }

  return {
    state: {
      ...term,
      screen: "morning_brief",
      lines: [...briefLines],
      choices,
      textInput: false,
      pending: {},
      history: [],
    },
  };
}

function goToDistrictSelect(term: TerminalState, game: GameState, sideEffect?: TerminalSideEffect): TransitionResult {
  const { lines, choices } = Text.buildDistrictChoices(game);
  const result: TransitionResult = {
    state: {
      ...term,
      screen: "choose_district",
      lines: [...lines],
      choices,
      pending: {},
      history: [...term.history, term.screen],
    },
  };
  if (sideEffect) result.sideEffect = sideEffect;
  return result;
}
