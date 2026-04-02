import { useGame } from "@/lib/gameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Coins, Star, Lock } from "lucide-react";

export function DistrictMap() {
  const { state } = useGame();

  return (
    <div className="space-y-4" data-testid="district-map">
      <div>
        <h2 className="text-lg font-bold">District Map</h2>
        <p className="text-sm text-muted-foreground">
          The bazaar city's commercial zones. Each has its own rules, merchants, margins, and methods of making your life difficult.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {state.districts.map(district => (
          <Card
            key={district.id}
            className={`transition-all ${district.isUnlocked ? "hover-elevate" : "opacity-50"}`}
            data-testid={`card-district-${district.id}`}
          >
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{district.emoji}</span>
                  <div>
                    <CardTitle className="text-sm font-bold">{district.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{district.flavor}</p>
                  </div>
                </div>
                {!district.isUnlocked && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{district.description}</p>

              {/* District Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1" title="Danger Level">
                  <Shield className="h-3.5 w-3.5 text-red-500" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i < district.dangerLevel ? "bg-red-500/80" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1" title="Wealth Level">
                  <Coins className="h-3.5 w-3.5 text-yellow-500" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i < district.wealthLevel ? "bg-yellow-500/80" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1" title="Reputation Modifier">
                  <Star className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium tabular-nums">×{district.reputationModifier.toFixed(1)}</span>
                </div>
              </div>

              {/* Available Missions */}
              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-1.5">Available Missions ({district.availableMissions.length})</p>
                <div className="space-y-1">
                  {district.availableMissions.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs" data-testid={`mission-preview-${m.id}`}>
                      <span className="text-muted-foreground truncate mr-2">{m.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] py-0 px-1">{m.type}</Badge>
                        <span className="tabular-nums">{m.baseBudget}¤</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rumors */}
              {district.rumors.length > 0 && (
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-xs font-medium mb-1">District Rumors</p>
                  {district.rumors.map((r, i) => (
                    <p key={i} className="text-xs italic text-muted-foreground">🐦‍⬛ {r}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
