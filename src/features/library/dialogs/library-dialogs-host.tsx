import type { ComponentProps } from "react";
import { AccountMenuDialogs } from "./account-menu-dialogs.tsx";
import {
  LibraryMissionActionDialogs,
  LibraryMissionSetupDialogs,
  type LibraryMissionActionDialogsProps,
  type LibraryMissionSetupDialogsProps,
} from "./library-mission-dialogs.tsx";
import {
  LibraryResourceDeleteDialogs,
  LibraryResourceEditorDialogs,
  type LibraryResourceDeleteDialogsProps,
  type LibraryResourceEditorDialogsProps,
} from "./library-resource-dialogs-host.tsx";

export interface LibraryDialogsHostProps {
  missionSetup: LibraryMissionSetupDialogsProps;
  resourceEditors: LibraryResourceEditorDialogsProps;
  missionActions: LibraryMissionActionDialogsProps;
  resourceDeletes: LibraryResourceDeleteDialogsProps;
  account: ComponentProps<typeof AccountMenuDialogs>;
}

export default function LibraryDialogsHost({
  missionSetup,
  resourceEditors,
  missionActions,
  resourceDeletes,
  account,
}: LibraryDialogsHostProps) {
  return (
    <>
      <LibraryMissionSetupDialogs {...missionSetup} />
      <LibraryResourceEditorDialogs {...resourceEditors} />
      <LibraryMissionActionDialogs {...missionActions} />
      <LibraryResourceDeleteDialogs {...resourceDeletes} />
      <AccountMenuDialogs {...account} />
    </>
  );
}
