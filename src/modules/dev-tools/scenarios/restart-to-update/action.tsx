import { DownloadIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
export default function RestartToUpdateAction() {
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        data-testid="ms-lib-restart"
        onClick={() => window.location.reload()}
      >
        <DownloadIcon aria-hidden="true" /> Restart to update
      </Button>
    </>
  );
}
