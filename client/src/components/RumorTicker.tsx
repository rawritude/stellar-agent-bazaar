import { useGame } from "@/lib/gameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Info } from "lucide-react";

export function RumorTicker() {
  const { state } = useGame();

  return (
    <div className="space-y-4" data-testid="rumor-ticker">
      <div>
        <h2 className="text-lg font-bold">Rumor Feed</h2>
        <p className="text-sm text-muted-foreground">
          Intelligence gathered from agents, merchants, gossip crows, and that one bartender who knows too much.
        </p>
      </div>

      {/* Stellar Integration Hook Hint */}
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Future: Premium Intel Feed</p>
            <p className="text-xs text-muted-foreground">
              In a future version, premium rumors will be available via Stellar MPP-powered market intelligence services.
              Agents will pay small amounts to access better intel before making trade decisions.
            </p>
            <Badge variant="outline" className="text-[10px] mt-1.5">Stellar Integration Hook</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {state.rumors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Radio className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No Rumors Yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Send scouts and investigators into the districts to gather intel.
              </p>
            </CardContent>
          </Card>
        ) : (
          [...state.rumors].reverse().map((rumor, i) => (
            <Card key={i} className="hover-elevate" data-testid={`rumor-${i}`}>
              <CardContent className="py-2.5 px-4 flex items-start gap-3">
                <span className="text-lg mt-0.5">🐦‍⬛</span>
                <div>
                  <p className="text-sm italic">"{rumor}"</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Reliability: {["Dubious", "Questionable", "Moderate", "Fairly Reliable", "Suspiciously Specific"][Math.floor(Math.random() * 5)]}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
