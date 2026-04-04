import { useGame } from "@/lib/gameContext";
import { TERMINAL_COLORS } from "@/lib/terminal/terminalColors";
import { ACTION_TYPE_INFO } from "@/lib/gameData";
import { getReputationTier, getCashTier } from "@/lib/gameEngine";
import { TerminalPanel, PanelGrid, PanelText, PanelLine, PanelSpacer, StatBar } from "./TerminalPanel";
import type { TerminalState } from "@/lib/terminal/terminalTypes";
import { getHakimGreeting, getAgentRarity, cash, hakimDailyComment } from "@/lib/terminal/uiHelpers";

// ═══════════════════════════════════════════════════════════════
// MORNING BRIEF — Dashboard layout
// ═══════════════════════════════════════════════════════════════

export function MorningBriefLayout({ term }: { term: TerminalState }) {
  const { state, stellarAdapter, aiEnabled } = useGame();
  const rep = getReputationTier(state.reputation);
  const cashTier = getCashTier(state.cash);
  const idle = state.agents.filter(a => a.status === "idle");

  const greeting = getHakimGreeting(state);

  const week = state.campaign?.week ?? 1;

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", height: "100%" }}>
      {/* Active events banner */}
      {state.activeEvents.length > 0 && (
        <TerminalPanel title="Active Events" titleColor="orange">
          {state.activeEvents.map((evt, i) => (
            <PanelLine key={i}>
              <PanelText color="orange">{evt.name}</PanelText>
              <PanelText dim> — {evt.daysRemaining}d remaining</PanelText>
            </PanelLine>
          ))}
        </TerminalPanel>
      )}

      {/* Top row: Hakim + Treasury */}
      <PanelGrid columns="1fr 280px">
        <TerminalPanel title="Hakim Says" titleColor="gold">
          <PanelLine>
            <PanelText color="gold">"{greeting}"</PanelText>
          </PanelLine>
          <PanelSpacer />
          <PanelLine>
            <PanelText dim>Day {state.day} — Week {week} — {state.brandName}</PanelText>
          </PanelLine>
        </TerminalPanel>

        <TerminalPanel title="Treasury" titleColor="gold">
          <PanelLine>
            <PanelText dim>Cash: </PanelText>
            <PanelText color="gold" bold>{cashTier.emoji} {cash(state.cash)}</PanelText>
            <PanelText dim> ({cashTier.name})</PanelText>
          </PanelLine>
          <PanelLine>
            <PanelText dim>Reputation: </PanelText>
            <PanelText color="purple" bold>{rep.emoji} {state.reputation}/100</PanelText>
            <PanelText dim> ({rep.name})</PanelText>
          </PanelLine>
          <PanelLine>
            <PanelText dim>Missions: </PanelText>
            <PanelText color="white">{state.completedMissions.length}</PanelText>
            <PanelText dim> completed</PanelText>
          </PanelLine>
          <PanelLine>
            <PanelText dim>Settlement: </PanelText>
            <PanelText color={stellarAdapter ? "teal" : "dim"}>
              {stellarAdapter ? "Stellar Testnet" : "Simulated"}
            </PanelText>
            {aiEnabled && <PanelText color="purple"> + AI</PanelText>}
          </PanelLine>
        </TerminalPanel>
      </PanelGrid>

      {/* Bottom row: Agents + Sidebar */}
      <PanelGrid columns="1fr 280px" style={{ flex: 1 }}>
        <TerminalPanel title="Agents" titleColor="cyan">
          {state.agents.map(a => {
            const rarity = getAgentRarity(a);
            const quest = (state.campaign?.agentQuests ?? []).find(q => q.agentId === a.id);
            return (
              <div key={a.id} style={{ marginBottom: "4px" }}>
                <PanelLine>
                  <PanelText color="white">{a.emoji} </PanelText>
                  <PanelText color="cyan" bold>{a.name.padEnd(20)}</PanelText>
                  <PanelText color={a.status === "idle" ? "green" : "orange"}>
                    {a.status.padEnd(8)}
                  </PanelText>
                  <PanelText dim>Morale: </PanelText>
                  <PanelText color={a.morale > 50 ? "green" : "red"}>{a.morale}%</PanelText>
                  {rarity.label !== "COMMON" && (
                    <PanelText color={rarity.color} bold> [{rarity.label}]</PanelText>
                  )}
                </PanelLine>
                {quest && !quest.completed && (
                  <PanelLine>
                    <PanelText dim>  Quest: {quest.name} — {quest.requirement.current}/{quest.requirement.target}</PanelText>
                  </PanelLine>
                )}
                {quest?.completed && (
                  <PanelLine>
                    <PanelText color="green">  ✓ {quest.name} — {quest.reward.description}</PanelText>
                  </PanelLine>
                )}
              </div>
            );
          })}
        </TerminalPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Rival card */}
          {state.campaign?.rivalBrand && (
            <TerminalPanel title="Rival" titleColor="purple">
              <PanelLine>
                <PanelText color="purple" bold>{state.campaign.rivalBrand}</PanelText>
              </PanelLine>
              {state.campaign.rival && (
                <>
                  <PanelLine>
                    <PanelText dim>{state.campaign.rival.title}</PanelText>
                  </PanelLine>
                  <PanelLine>
                    <PanelText color="purple">"{state.campaign.rival.catchphrase}"</PanelText>
                  </PanelLine>
                </>
              )}
              <PanelSpacer />
              <PanelLine>
                <PanelText dim>Rep: </PanelText>
                <PanelText color="purple">{state.campaign.rivalReputation}/100</PanelText>
              </PanelLine>
              <PanelLine>
                <PanelText dim>
                  {state.reputation > state.campaign.rivalReputation
                    ? "You're ahead!"
                    : state.reputation === state.campaign.rivalReputation
                    ? "Tied!"
                    : "They're ahead..."}
                </PanelText>
              </PanelLine>
              {state.campaign.rival?.walletAddress && (
                <PanelLine>
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${state.campaign.rival.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#a87cc4", fontSize: "0.8em", textDecoration: "underline" }}
                  >
                    View rival on Stellar
                  </a>
                </PanelLine>
              )}
            </TerminalPanel>
          )}

          {/* Rumor card */}
          <TerminalPanel title="Latest Rumor" titleColor="orange">
            {state.rumors.length > 0 ? (
              <PanelLine>
                <PanelText dim>
                  "{state.rumors[state.rumors.length - 1]}"
                </PanelText>
              </PanelLine>
            ) : (
              <PanelLine><PanelText dim>No rumors yet.</PanelText></PanelLine>
            )}
          </TerminalPanel>
        </div>
      </PanelGrid>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT SELECTION — Cards beside mission info
// ═══════════════════════════════════════════════════════════════

export function AgentSelectLayout({ term }: { term: TerminalState }) {
  const { state } = useGame();
  const idle = state.agents.filter(a => a.status === "idle");
  const district = state.districts.find(d => d.id === term.pending.districtId);
  const mission = district?.availableMissions.find(m => m.id === term.pending.missionId);

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", height: "100%" }}>
      <PanelGrid columns="1fr 260px" style={{ flex: 1 }}>
        <TerminalPanel title="Choose Agent" titleColor="cyan" scroll>
          <PanelLine>
            <PanelText color="gold">"Who shall carry our hopes and our money?"</PanelText>
          </PanelLine>
          <PanelSpacer />
          {idle.length === 0 ? (
            <PanelLine><PanelText color="red">No agents available. All deployed.</PanelText></PanelLine>
          ) : (
            idle.map((a, i) => (
              <div key={a.id} style={{ marginBottom: "8px" }}>
                <PanelLine>
                  <PanelText color="amber">[{i + 1}] </PanelText>
                  <PanelText color="white">{a.emoji} </PanelText>
                  <PanelText color="cyan" bold>{a.name}</PanelText>
                  <PanelText dim> — {a.title}</PanelText>
                </PanelLine>
                <PanelLine>
                  <PanelText dim>    Haggle:</PanelText>
                  <PanelText color={a.haggleBonus > 0 ? "green" : "red"}>{a.haggleBonus > 0 ? "+" : ""}{a.haggleBonus}</PanelText>
                  <PanelText dim> Scout:</PanelText>
                  <PanelText color={a.scoutBonus > 0 ? "green" : "red"}>{a.scoutBonus > 0 ? "+" : ""}{a.scoutBonus}</PanelText>
                  <PanelText dim> Charm:</PanelText>
                  <PanelText color={a.charmBonus > 0 ? "green" : "red"}>{a.charmBonus > 0 ? "+" : ""}{a.charmBonus}</PanelText>
                </PanelLine>
                <PanelLine>
                  <PanelText dim>    Fee: </PanelText>
                  <PanelText color="gold">{cash(a.costPerMission)}</PanelText>
                  <PanelText dim>  Morale: </PanelText>
                  <PanelText color={a.morale > 50 ? "green" : "red"}>{a.morale}%</PanelText>
                </PanelLine>
              </div>
            ))
          )}
        </TerminalPanel>

        <TerminalPanel title="Mission" titleColor="gold">
          {mission && district ? (
            <>
              <PanelLine>
                <PanelText color="white" bold>{mission.name}</PanelText>
              </PanelLine>
              <PanelSpacer />
              <PanelLine>
                <PanelText dim>District:</PanelText>
              </PanelLine>
              <PanelLine>
                <PanelText color="gold">{district.emoji} {district.name}</PanelText>
              </PanelLine>
              <PanelSpacer />
              <PanelLine>
                <PanelText dim>Route:</PanelText>
              </PanelLine>
              {mission.actionSequence.map((a, i) => {
                const info = ACTION_TYPE_INFO[a];
                return (
                  <PanelLine key={i}>
                    <PanelText color="teal"> {info.emoji} {info.label}</PanelText>
                  </PanelLine>
                );
              })}
              <PanelSpacer />
              <PanelLine>
                <PanelText dim>Budget: </PanelText>
                <PanelText color="gold">{cash(mission.baseBudget)}</PanelText>
              </PanelLine>
              <PanelLine>
                <PanelText dim>Reward: </PanelText>
                <PanelText color="green">~{cash(mission.baseReward)}</PanelText>
              </PanelLine>
              <PanelLine>
                <PanelText dim>Risk:   </PanelText>
                <PanelText color="red">{"!".repeat(mission.riskLevel)}</PanelText>
              </PanelLine>
            </>
          ) : (
            <PanelLine><PanelText dim>No mission selected</PanelText></PanelLine>
          )}
        </TerminalPanel>
      </PanelGrid>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MISSION RESOLUTION — Log + sidebars
// ═══════════════════════════════════════════════════════════════

export function ResolutionLayout({ term }: { term: TerminalState }) {
  const { state } = useGame();
  const startIdx = state.completedMissions.length - (state.dailyReport?.missionsRun ?? 0);
  const latestMissions = state.completedMissions.slice(Math.max(0, startIdx));
  const currentMission = latestMissions[Math.min(term.missionPage - 1, latestMissions.length - 1)];
  const result = currentMission?.result;

  if (!result) return null;

  const currentStep = result.actionSteps[result.actionSteps.length - 1];

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", height: "100%" }}>
      <PanelGrid columns="1fr 240px" style={{ flex: 1 }}>
        <TerminalPanel title="Mission Log" titleColor="amber" scroll>
          <PanelLine>
            <PanelText color="cyan" bold>{currentMission.agent.emoji} {currentMission.agent.name}</PanelText>
            <PanelText dim> — {currentMission.template.name}</PanelText>
          </PanelLine>
          <PanelLine>
            <PanelText dim>{currentMission.district.emoji} {currentMission.district.name} | {currentMission.riskPosture}</PanelText>
          </PanelLine>
          <PanelSpacer />

          {result.actionSteps.map((step, i) => {
            const info = ACTION_TYPE_INFO[step.actionType];
            return (
              <div key={i} style={{ marginBottom: "8px" }}>
                <PanelLine>
                  <PanelText dim>{i + 1}. </PanelText>
                  <PanelText color="white">{step.counterpartyEmoji} {step.counterpartyName}</PanelText>
                  <PanelText color="teal"> [{info.label}]</PanelText>
                  <PanelText color={step.success ? "green" : "red"}> {step.success ? "✓" : "✗"}</PanelText>
                </PanelLine>

                {/* AI-generated dialogue */}
                {step.scene?.dialogue?.map((d, di) => (
                  <PanelLine key={di}>
                    <PanelText color="cyan">  {d.speaker}: </PanelText>
                    <PanelText color="white">"{d.line}"</PanelText>
                  </PanelLine>
                ))}

                {step.scene?.agent_reasoning && (
                  <PanelLine>
                    <PanelText dim>  [Agent: {step.scene.agent_reasoning}]</PanelText>
                  </PanelLine>
                )}

                {!step.scene && (
                  <PanelLine>
                    <PanelText dim>  {step.description}</PanelText>
                  </PanelLine>
                )}

                {/* x402/MPP Protocol Exchange */}
                {step.receipt?.x402Flow && step.receipt.x402Flow.length > 0 && (
                  <div style={{
                    margin: "4px 0 4px 12px",
                    padding: "4px 8px",
                    borderLeft: `2px solid ${TERMINAL_COLORS.teal}40`,
                    fontSize: "0.85em",
                  }}>
                    <PanelLine>
                      <PanelText color="teal" bold>x402/MPP Protocol:</PanelText>
                    </PanelLine>
                    {step.receipt.x402Flow.map((x, xi) => (
                      <PanelLine key={xi}>
                        <PanelText color={
                          x.type === "response_402" ? "orange" :
                          x.type === "mpp_verify" ? "green" :
                          x.type === "response_200" ? "green" :
                          x.type === "payment" ? "teal" :
                          "dim"
                        }>
                          {x.label}
                        </PanelText>
                      </PanelLine>
                    ))}
                  </div>
                )}

                <PanelLine>
                  <PanelText dim>  Cost: </PanelText>
                  <PanelText color="gold">{cash(step.cost)}</PanelText>
                  {step.receipt && (
                    <PanelText dim> | {step.receipt.receiptId}</PanelText>
                  )}
                </PanelLine>
              </div>
            );
          })}

          <PanelSpacer />
          <PanelLine>
            <PanelText color={result.success ? "green" : "red"} bold>
              {result.success ? "✓ MISSION SUCCESS" : "✗ MISSION FAILED"}
            </PanelText>
          </PanelLine>
          <PanelLine>
            <PanelText color="gold" bold>"{result.headline}"</PanelText>
          </PanelLine>
        </TerminalPanel>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <TerminalPanel title="Agent" titleColor="cyan">
            <PanelLine>
              <PanelText color="white">{currentMission.agent.emoji} {currentMission.agent.name}</PanelText>
            </PanelLine>
            <PanelLine>
              <PanelText dim>{currentMission.agent.title}</PanelText>
            </PanelLine>
            <StatBar label="Morale" value={currentMission.agent.morale} color="green" />
          </TerminalPanel>

          <TerminalPanel title="Financials" titleColor="gold">
            <PanelLine>
              <PanelText dim>Spent: </PanelText>
              <PanelText color="red">{cash(result.moneySpent)}</PanelText>
            </PanelLine>
            <PanelLine>
              <PanelText dim>Earned: </PanelText>
              <PanelText color="green">{cash(result.moneyEarned)}</PanelText>
            </PanelLine>
            <PanelLine>
              <PanelText dim>Net: </PanelText>
              <PanelText color={result.netProfit >= 0 ? "green" : "red"} bold>
                {result.netProfit >= 0 ? "+" : ""}{cash(result.netProfit)}
              </PanelText>
            </PanelLine>
            {result.reputationChange !== 0 && (
              <PanelLine>
                <PanelText dim>Rep: </PanelText>
                <PanelText color={result.reputationChange > 0 ? "purple" : "orange"}>
                  {result.reputationChange > 0 ? "+" : ""}{result.reputationChange}
                </PanelText>
              </PanelLine>
            )}
          </TerminalPanel>

          {currentStep && (
            <TerminalPanel title="Settlement" titleColor="teal">
              <PanelLine>
                <PanelText dim>Mode: </PanelText>
                <PanelText color={currentStep.settlementMode === "testnet" ? "teal" : "dim"}>
                  {currentStep.settlementMode}
                </PanelText>
              </PanelLine>
              {currentStep.stellarTxId && (
                <>
                  <PanelLine>
                    <PanelText dim>TX: </PanelText>
                    <PanelText color="teal">{currentStep.stellarTxId.slice(0, 16)}...</PanelText>
                  </PanelLine>
                  <PanelLine>
                    <a
                      href={currentStep.receipt?.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${currentStep.stellarTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#5cb8a5", fontSize: "0.85em", textDecoration: "underline" }}
                    >
                      View on Stellar Expert
                    </a>
                  </PanelLine>
                </>
              )}
            </TerminalPanel>
          )}
        </div>
      </PanelGrid>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DAILY REPORT — Summary layout
// ═══════════════════════════════════════════════════════════════

export function DailyReportLayout({ term }: { term: TerminalState }) {
  const { state } = useGame();
  const report = state.dailyReport;
  if (!report) return null;

  const rep = getReputationTier(state.reputation);

  const hakimComment = hakimDailyComment(report.netChange);

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", height: "100%" }}>
      <PanelGrid columns="1fr 1fr 1fr">
        <TerminalPanel title="Earned" titleColor="green">
          <PanelLine>
            <PanelText color="green" bold>{cash(report.totalEarned)}</PanelText>
          </PanelLine>
        </TerminalPanel>
        <TerminalPanel title="Spent" titleColor="red">
          <PanelLine>
            <PanelText color="red" bold>{cash(report.totalSpent)}</PanelText>
          </PanelLine>
        </TerminalPanel>
        <TerminalPanel title="Net P&L" titleColor={report.netChange >= 0 ? "green" : "red"}>
          <PanelLine>
            <PanelText color={report.netChange >= 0 ? "green" : "red"} bold>
              {report.netChange >= 0 ? "+" : ""}{cash(report.netChange)}
            </PanelText>
          </PanelLine>
        </TerminalPanel>
      </PanelGrid>

      <PanelGrid columns="1fr 280px" style={{ flex: 1 }}>
        <TerminalPanel title={`Day ${report.day} Report`} titleColor="amber" scroll>
          <PanelLine>
            <PanelText color="gold">"{hakimComment}"</PanelText>
          </PanelLine>
          <PanelSpacer />
          <PanelLine>
            <PanelText dim>Missions run: </PanelText>
            <PanelText color="white">{report.missionsRun}</PanelText>
          </PanelLine>
          <PanelLine>
            <PanelText dim>Reputation: </PanelText>
            <PanelText color={report.reputationChange >= 0 ? "purple" : "orange"}>
              {report.reputationChange >= 0 ? "+" : ""}{report.reputationChange}
            </PanelText>
          </PanelLine>
          <PanelSpacer />

          {report.headlines.map((h, i) => (
            <PanelLine key={i}>
              <PanelText dim>• {h}</PanelText>
            </PanelLine>
          ))}

          {report.counterpartiesEngaged.length > 0 && (
            <>
              <PanelSpacer />
              <PanelLine>
                <PanelText dim>Counterparties: </PanelText>
                <PanelText color="white">{report.counterpartiesEngaged.join(", ")}</PanelText>
              </PanelLine>
            </>
          )}
        </TerminalPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <TerminalPanel title="Standing" titleColor="purple">
            <PanelLine>
              <PanelText dim>Cash: </PanelText>
              <PanelText color="gold" bold>{cash(state.cash)}</PanelText>
            </PanelLine>
            <PanelLine>
              <PanelText dim>Rep: </PanelText>
              <PanelText color="purple">{rep.emoji} {state.reputation}/100 ({rep.name})</PanelText>
            </PanelLine>
          </TerminalPanel>

          {report.rumors.length > 0 && (
            <TerminalPanel title="Intel Gathered" titleColor="orange">
              {report.rumors.map((r, i) => (
                <PanelLine key={i}>
                  <PanelText dim>"{r}"</PanelText>
                </PanelLine>
              ))}
            </TerminalPanel>
          )}
        </div>
      </PanelGrid>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT ROUTER — decides which layout to use for each screen
// ═══════════════════════════════════════════════════════════════

/**
 * Panel screens use CSS panel layouts with TerminalPanel components.
 * These are data-heavy management/dashboard screens.
 *
 * All other screens use text-mode rendering (TerminalLine[] arrays)
 * and are story/narrative-driven with braille art and typewriter effects.
 *
 * RULE: If a screen primarily shows stats, tables, or structured data → panel.
 *       If a screen tells a story or shows art → text.
 */
export type PanelScreen = "morning_brief" | "choose_agent" | "resolution_narrative" | "daily_report";

export const PANEL_SCREENS = new Set<string>([
  "morning_brief",       // Dashboard: greeting + treasury + agents + rumors
  "choose_agent",        // Selection: agent cards + mission sidebar
  "resolution_narrative", // Log: step-by-step results + financials sidebar
  "daily_report",        // Summary: earned/spent/net + report + standing
]);

export function ScreenLayout({ term }: { term: TerminalState }) {
  switch (term.screen) {
    case "morning_brief":
      return <MorningBriefLayout term={term} />;
    case "choose_agent":
      return <AgentSelectLayout term={term} />;
    case "resolution_narrative":
      return <ResolutionLayout term={term} />;
    case "daily_report":
      return <DailyReportLayout term={term} />;
    default:
      return null;
  }
}
