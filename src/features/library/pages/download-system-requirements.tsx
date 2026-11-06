import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "skytrack-ui/accordion";
import {
  ANDROID_SYSTEM_REQUIREMENTS,
  DESKTOP_SYSTEM_REQUIREMENTS,
  type DesktopHost,
} from "./download-page-data";

export default function DownloadSystemRequirements({
  platformId,
  hostOs,
  compatibility,
}: {
  platformId: string;
  hostOs: DesktopHost;
  compatibility: string | null;
}) {
  const systemRequirements = DESKTOP_SYSTEM_REQUIREMENTS[hostOs];
  return (
    <AccordionItem value="requirements">
      <AccordionTrigger className="text-lg font-semibold">
        {platformId === "desktop"
          ? "System requirements"
          : platformId === "field"
            ? "Android system requirements"
            : "Compatibility"}
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-4 pb-4">
          {platformId === "desktop" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] table-fixed border-collapse text-left">
                <caption className="sr-only">
                  Desktop system requirements for {hostOs}
                </caption>
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[70%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th
                      scope="col"
                      className="px-3 py-3 pl-0 text-base font-semibold text-foreground"
                    >
                      Component
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-base font-semibold text-foreground"
                    >
                      Requirement
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {systemRequirements.map(({ label, value }) => (
                    <tr
                      key={label}
                      className="border-b border-border last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="px-3 py-3 pl-0 text-left text-base font-medium text-foreground"
                      >
                        {label}
                      </th>
                      <td className="px-3 py-3 align-top text-base text-foreground">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {platformId === "field" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] table-fixed border-collapse text-left">
                <caption className="sr-only">
                  Android device requirements: proposed minimum and recommended
                  specifications
                </caption>
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[35%]" />
                  <col className="w-[45%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th
                      scope="col"
                      className="px-3 py-3 pl-0 text-base font-semibold text-foreground"
                    >
                      Component
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-base font-semibold text-foreground"
                    >
                      Proposed minimum
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-base font-semibold text-foreground"
                    >
                      Recommended
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ANDROID_SYSTEM_REQUIREMENTS.map(
                    ({ component, minimum, recommended }) => (
                      <tr
                        key={component}
                        className="border-b border-border last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="px-3 py-3 pl-0 text-left text-base font-medium text-foreground"
                        >
                          {component}
                        </th>
                        <td className="px-3 py-3 align-top text-base text-foreground">
                          {minimum}
                        </td>
                        <td className="px-3 py-3 align-top text-base text-foreground">
                          {recommended}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
          {compatibility && (
            <p className="text-base text-muted-foreground">{compatibility}</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
