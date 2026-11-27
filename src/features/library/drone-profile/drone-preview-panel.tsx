import { Button } from "skytrack-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "skytrack-ui/card";
import { Tabs, TabsList, TabsTab } from "skytrack-ui/tabs";
import type { DroneGeometry } from "@/domain/drone-geometry";
import { DronePreview } from "./preview/drone-preview";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card as="div" size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground">{label}</span>
        <strong>{value}</strong>
      </CardContent>
    </Card>
  );
}

export function DronePreviewPanel({
  geometry,
  geometryValid,
  massKg,
  payloadMassKg,
  thrustRatio,
  view,
  setView,
  resetKey,
  setResetKey,
}: {
  geometry: DroneGeometry;
  geometryValid: boolean;
  massKg: number;
  payloadMassKg: number;
  thrustRatio: number;
  view: "isometric" | "top" | "front";
  setView: (view: "isometric" | "top" | "front") => void;
  resetKey: number;
  setResetKey: (update: (key: number) => number) => void;
}) {
  return (
    <aside
      className="order-first min-w-0 xl:order-none xl:col-start-2 xl:row-start-1 xl:sticky xl:top-32 xl:self-start"
      aria-label="Live drone preview"
    >
      <Card as="section">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle as="h2">3D preview</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setView("isometric");
              setResetKey((key) => key + 1);
            }}
          >
            Reset view
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative aspect-video min-h-72 overflow-hidden rounded-(--radius) border border-border bg-muted">
            <DronePreview
              profile={geometry}
              viewMode={view}
              resetKey={resetKey}
            />
            {!geometryValid && (
              <div
                className="absolute bottom-14 right-4 rounded-(--radius) border border-warning bg-background/90 px-2 py-1 text-sm text-warning"
                role="status"
              >
                Preview shows last valid geometry
              </div>
            )}
            <Tabs
              value={view}
              onValueChange={(value) => setView(String(value) as typeof view)}
              className="absolute bottom-2 left-2 w-fit gap-0"
            >
              <TabsList variant="filled" aria-label="Preview view">
                <TabsTab value="isometric">Isometric</TabsTab>
                <TabsTab value="top">Top</TabsTab>
                <TabsTab value="front">Front</TabsTab>
              </TabsList>
            </Tabs>
          </div>
          <p className="m-0 text-muted-foreground">
            Drag to orbit · Shift/Command/Control-drag to pan · Alt-drag to
            adjust pitch · Scroll to zoom
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total mass" value={`${massKg.toFixed(2)} kg`} />
            <StatTile
              label="Payload mass"
              value={`${payloadMassKg.toFixed(2)} kg`}
            />
            <StatTile
              label="Thrust / weight"
              value={`${thrustRatio.toFixed(2)}×`}
            />
            <StatTile
              label="Thrust reserve"
              value={`${Math.max(0, Math.min(100, (1 - 1 / thrustRatio) * 100)).toFixed(0)}%`}
            />
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
