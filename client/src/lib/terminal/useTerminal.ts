import { useState, useCallback, useRef, useEffect } from "react";
import { useGame } from "../gameContext";
import { createLiveTestnetAdapter } from "../settlement/testnet";
import { connectWallet } from "../wallet/smartAccount";
import { mintAgentNFT } from "../wallet/agentNFT";
import { initialTerminalState, transition } from "./terminalMachine";
import type { TerminalState } from "./terminalTypes";
import type { RiskPosture } from "../gameData";

export function useTerminal() {
  const { state: game, dispatch, resolveDayAsync, setStellarAdapter, setAiEnabled, setWallet, wallet } = useGame();
  const [term, setTerm] = useState<TerminalState>(initialTerminalState);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRefresh = useRef(false);

  // Process a terminal action
  const processAction = useCallback((action: string, data?: any) => {
    const { state: nextTerm, sideEffect } = transition(term, game, action, data);
    setTerm(nextTerm);

    if (sideEffect) {
      switch (sideEffect.type) {
        case "START_GAME":
          dispatch({ type: "START_GAME", brandName: sideEffect.brandName });
          // Auto-detect AI availability
          fetch("/api/ai/status").then(r => r.json()).then(s => {
            if (s.configured) setAiEnabled(true);
          }).catch(() => {});
          break;
        case "START_PLANNING":
          dispatch({ type: "START_PLANNING" });
          break;
        case "DISPATCH_MISSION": {
          const p = term.pending;
          if (p.districtId && p.missionId && p.agentId && p.budget && p.riskPosture) {
            const district = game.districts.find(d => d.id === p.districtId);
            const template = district?.availableMissions.find(m => m.id === p.missionId);
            if (district && template) {
              dispatch({
                type: "DISPATCH_MISSION",
                template,
                agentId: p.agentId,
                districtId: p.districtId,
                budget: p.budget,
                riskPosture: p.riskPosture as RiskPosture,
              });
              pendingRefresh.current = true;
            } else {
              console.error("[dispatch] District or mission not found:", p.districtId, p.missionId);
            }
          }
          break;
        }
        case "RESOLVE_DAY":
          // Don't handle the result here — the useEffect watching
          // game.dayPhase === "reports" will trigger RESOLVE_COMPLETE
          // with the FRESH game state (not the stale closure).
          resolveDayAsync().catch(err => {
            console.error("[resolve] Day resolution failed:", err);
            setTerm(prev => ({
              ...prev,
              lines: [
                { spans: [{ text: "" }], blank: true },
                { spans: [{ text: "  Resolution failed: " + err.message, color: "red" as any }] },
                { spans: [{ text: "" }], blank: true },
              ],
              choices: [{ key: "enter", label: "Return to planning...", action: "BACK" }],
              screen: "morning_brief" as any,
            }));
          });
          break;
        case "ADVANCE_DAY":
          dispatch({ type: "ADVANCE_DAY" });
          pendingRefresh.current = true;
          break;
        case "CONNECT_STELLAR":
          connectToStellar();
          break;
        case "CONNECT_PASSKEY":
          connectViaPasskey();
          break;
        case "DISCONNECT_STELLAR":
          setStellarAdapter(null);
          setTerm(prev => {
            const { state: next } = transition(prev, game, "STELLAR_DISCONNECTED");
            return next;
          });
          break;
        case "APPLY_EVENT": {
          const choiceIdx = (sideEffect as any).choice;
          const event = game.pendingRandomEvent;
          if (event && event.choices[choiceIdx]) {
            const effects = event.choices[choiceIdx].effects;
            dispatch({ type: "APPLY_EVENT_EFFECTS", effects });
            dispatch({ type: "CLEAR_PENDING_EVENT" });
          }
          break;
        }
        case "PURCHASE_ITEM": {
          const itemId = (sideEffect as any).itemId;
          dispatch({ type: "PURCHASE_ITEM", itemId });
          pendingRefresh.current = true;
          // Small delay for state to flush, then refresh shop
          setTimeout(() => {
            setTerm(prev => {
              const { state: refreshed } = transition(prev, game, "SHOP_REFRESHED");
              return refreshed;
            });
          }, 50);
          break;
        }
        case "APPLY_QUEST_REWARD": {
          const { agentId, questName } = sideEffect as any;
          dispatch({ type: "APPLY_QUEST_REWARD", agentId, questName });
          break;
        }
        case "CHECK_SAVE": {
          checkForSavedGame();
          break;
        }
        case "LOAD_SAVE": {
          loadSavedGame();
          break;
        }
        case "SAVE_GAME": {
          saveCurrentGame();
          break;
        }
        case "GENERATE_AGENTS": {
          const brandName = (sideEffect as any).brandName;
          generateAgentsForGame(brandName);
          break;
        }
        case "MINT_NFT": {
          const agentId = term.pending.agentId;
          const agent = game.agents.find(a => a.id === agentId);
          if (agent) {
            const walletAddr = game.brandName; // Use brand as wallet placeholder if no real wallet
            mintAgentNFT(agent, walletAddr, game.brandName, game.day).then(result => {
              if (result.success) {
                setTerm(prev => {
                  const { state: minted } = transition(prev, game, "NFT_MINTED", {
                    agentName: agent.name,
                    tokenId: result.tokenId,
                    txHash: result.txHash,
                  });
                  return minted;
                });
              } else {
                setTerm(prev => {
                  const { state: failed } = transition(prev, game, "NFT_FAILED", result.error);
                  return failed;
                });
              }
            });
          }
          break;
        }
      }
    }
  }, [term, game, dispatch, resolveDayAsync, setStellarAdapter]);

  // Check for a saved game for the connected wallet
  const checkForSavedGame = useCallback(async () => {
    const addr = wallet?.address;
    if (!addr) {
      setTerm(prev => transition(prev, game, "NO_SAVE").state);
      return;
    }

    try {
      const res = await fetch(`/api/save-summary/${encodeURIComponent(addr)}`);
      const data = await res.json();

      if (data.found && data.summary) {
        setTerm(prev => transition(prev, game, "SAVE_FOUND", data.summary).state);
      } else {
        setTerm(prev => transition(prev, game, "NO_SAVE").state);
      }
    } catch {
      setTerm(prev => transition(prev, game, "NO_SAVE").state);
    }
  }, [game, wallet]);

  // Load a saved game
  const loadSavedGame = useCallback(async () => {
    const addr = wallet?.address;
    if (!addr) return;

    try {
      const res = await fetch(`/api/load/${encodeURIComponent(addr)}`);
      const data = await res.json();

      if (data.found && data.state) {
        dispatch({ type: "LOAD_GAME", savedState: data.state });
        setAiEnabled(true);

        setTimeout(() => {
          setTerm(prev => transition(prev, game, "GAME_LOADED").state);
        }, 50);
      }
    } catch (err: any) {
      console.error("[save] Load failed:", err);
    }
  }, [game, wallet, dispatch, setAiEnabled]);

  // Save the current game
  const saveCurrentGame = useCallback(async () => {
    const addr = wallet?.address;
    if (!addr) return;

    try {
      await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr, state: game }),
      });
      console.log("[save] Game saved for", addr.slice(0, 12));
    } catch (err: any) {
      console.warn("[save] Save failed:", err.message);
    }
  }, [game, wallet]);

  // Auto-save after each day advance
  useEffect(() => {
    if (game.dayPhase === "morning" && game.day > 1 && wallet?.address) {
      saveCurrentGame();
    }
  }, [game.day, game.dayPhase, wallet?.address]);

  // Generate agents via AI, then initialize the game
  const generateAgentsForGame = useCallback(async (brandName: string) => {
    // Always initialize the game first
    dispatch({ type: "START_GAME", brandName });

    // Initialize player's on-chain economy (non-blocking)
    if (wallet?.address) {
      fetch("/api/player/init-economy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerPubkey: wallet.address }),
      }).then(r => r.json()).then(result => {
        if (result.success) {
          console.log(`[economy] Player funded with ${result.amount} RUBY`);
        }
      }).catch(err => {
        console.warn("[economy] Player init failed (non-blocking):", err.message);
      });
    }

    try {
      const res = await fetch("/api/generate-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName }),
      });
      const data = await res.json();

      if (data.agents && data.agents.length >= 2) {
        // Convert generated agents to full Agent objects with all required fields
        const fullAgents = data.agents.map((a: any, i: number) => ({
          id: `gen-${a.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${i}`,
          name: a.name,
          title: a.title,
          emoji: a.emoji || "🎭",
          specialty: a.specialty,
          description: a.description || "",
          quirk: a.quirk || "",
          haggleBonus: a.haggleBonus ?? 0,
          scoutBonus: a.scoutBonus ?? 0,
          charmBonus: a.charmBonus ?? 0,
          riskFactor: a.riskFactor ?? 0.25,
          costPerMission: a.costPerMission ?? 8,
          status: "idle" as const,
          morale: 80,
          missionsCompleted: 0,
          memory: { opinions: [], refusals: [], lastMissionDay: 0, personalityShifts: [] },
        }));

        // Inject generated agents into the game state
        dispatch({ type: "SET_AGENTS", agents: fullAgents });
        setAiEnabled(true);

        console.log("[agents] Generated:", fullAgents.map((a: any) => a.name).join(", "));

        // Small delay so the SET_AGENTS dispatch processes before we transition
        setTimeout(() => {
          setTerm(prev => {
            const { state: next } = transition(prev, game, "AGENTS_GENERATED");
            return next;
          });
        }, 50);
      } else {
        // Fallback to default agents
        console.warn("[agents] Generation failed, using defaults:", data.error);
        setAiEnabled(false);

        setTerm(prev => {
          const { state: next } = transition(prev, game, "AGENTS_FAILED");
          return next;
        });
      }
    } catch (err: any) {
      console.error("[agents] Generation error:", err);

      setTerm(prev => {
        const { state: next } = transition(prev, game, "AGENTS_FAILED");
        return next;
      });
    }
  }, [game, dispatch, setAiEnabled]);

  // Connect wallet via passkey — no fallback
  const connectViaPasskey = useCallback(async () => {
    const result = await connectWallet();

    if (result.success && result.wallet) {
      setWallet(result.wallet);

      // Enable server-side Stellar settlement
      const adapter = createLiveTestnetAdapter();
      setStellarAdapter(adapter);

      // Check AI availability
      try {
        const aiRes = await fetch("/api/ai/status");
        const aiStatus = await aiRes.json();
        if (aiStatus.configured) setAiEnabled(true);
      } catch {}

      // Show connected message, then check for saved game inline
      // (can't rely on wallet state being flushed yet for CHECK_SAVE)
      const walletAddr = result.wallet!.address;
      setTerm(prev => {
        const { state: connected } = transition(prev, game, "STELLAR_CONNECTED", walletAddr);
        return connected;
      });

      // Check for saved game directly with the wallet address we have
      try {
        const saveRes = await fetch(`/api/save-summary/${encodeURIComponent(walletAddr)}`);
        const saveData = await saveRes.json();

        if (saveData.found && saveData.summary) {
          setTerm(prev => transition(prev, game, "SAVE_FOUND", saveData.summary).state);
        } else {
          setTerm(prev => transition(prev, game, "NO_SAVE").state);
        }
      } catch {
        setTerm(prev => transition(prev, game, "NO_SAVE").state);
      }
      return; // skip the failed path below
    } else {
      // Show the real error — no hiding behind prose
      const errorMsg = result.error || "Unknown error";
      console.error("[passkey] Connection failed:", errorMsg);
      setTerm(prev => {
        const { state: failed } = transition(
          prev, game, "STELLAR_FAILED", errorMsg
        );
        return failed;
      });
    }
  }, [game, setWallet, setStellarAdapter, setAiEnabled]);

  // Connect to Stellar testnet via the server API
  const connectToStellar = useCallback(async () => {
    try {
      // 1. Get wallet info
      const infoRes = await fetch("/api/wallet");
      if (!infoRes.ok) throw new Error("Could not reach settlement server");
      const info = await infoRes.json();

      // 2. Fund wallet via friendbot
      const fundRes = await fetch("/api/wallet/fund", { method: "POST" });
      const fundResult = await fundRes.json();

      if (!fundResult.success) {
        throw new Error(fundResult.message || "Funding failed");
      }

      // 3. Create and set the live testnet adapter
      const adapter = createLiveTestnetAdapter();
      setStellarAdapter(adapter);

      // 4. Check if AI is available and auto-enable
      try {
        const aiRes = await fetch("/api/ai/status");
        const aiStatus = await aiRes.json();
        if (aiStatus.configured) {
          setAiEnabled(true);
        }
      } catch {
        // AI not available — that's fine
      }

      // 5. Transition to connected state
      setTerm(prev => {
        const { state: connected } = transition(prev, game, "STELLAR_CONNECTED", info.publicKey);
        return connected;
      });
    } catch (err: any) {
      // Transition to failed state
      setTerm(prev => {
        const { state: failed } = transition(prev, game, "STELLAR_FAILED", err.message);
        return failed;
      });
    }
  }, [game, setStellarAdapter, setAiEnabled]);

  // Handle pending refreshes after game state updates
  useEffect(() => {
    if (pendingRefresh.current) {
      pendingRefresh.current = false;
      if (term.screen === "dispatch_more") {
        setTerm(prev => {
          const { state: refreshed } = transition(prev, game, "REFRESH");
          return refreshed;
        });
      } else if (term.screen === "advance_day") {
        setTerm(prev => {
          const { state: advanced } = transition(prev, game, "DAY_ADVANCED");
          return advanced;
        });
      }
    }
  }, [game, term.screen]);

  // Handle resolve complete with updated game state
  useEffect(() => {
    if (term.screen === "resolving" && game.dayPhase === "reports" && game.dailyReport) {
      setTerm(prev => {
        const { state: resolved } = transition(prev, game, "RESOLVE_COMPLETE");
        return resolved;
      });
    }
  }, [game.dayPhase, game.dailyReport, term.screen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [term.lines.length]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (term.textInput) return;

    const key = e.key.toLowerCase();
    if (key === "enter") {
      const enterChoice = term.choices.find(c => c.key === "enter");
      if (enterChoice) {
        e.preventDefault();
        processAction(enterChoice.action, enterChoice.data);
      }
    } else {
      const choice = term.choices.find(c => c.key === key);
      if (choice && !choice.disabled) {
        e.preventDefault();
        processAction(choice.action, choice.data);
      }
    }
  }, [term.choices, term.textInput, processAction]);

  return { term, processAction, scrollRef, handleKeyDown };
}
