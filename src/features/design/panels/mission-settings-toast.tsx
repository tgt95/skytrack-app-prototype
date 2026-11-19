import {
  ToastClose,
  ToastContent,
  ToastPortal,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager,
} from "skytrack-ui/toast";

const missionSettingsToastManager = createToastManager();

function MissionSettingsToastList() {
  const { toasts } = useToastManager();
  return toasts.map((toast) => (
    <ToastRoot key={toast.id} toast={toast}>
      <ToastContent>
        <div className="min-w-0 flex-1">
          <ToastTitle />
        </div>
        <ToastClose size="icon" variant="ghost" aria-label="Dismiss toast" />
      </ToastContent>
    </ToastRoot>
  ));
}

export function MissionSettingsToastHost() {
  return (
    <ToastProvider toastManager={missionSettingsToastManager}>
      <ToastPortal>
        <ToastViewport className="fixed bottom-4 left-4 right-auto mx-0 flex max-w-sm flex-col-reverse">
          <MissionSettingsToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

export function notifyMissionSettingsApplied() {
  missionSettingsToastManager.add({
    title: "Wind environment applied.",
    type: "success",
  });
}

export function notifyAIModelsAlreadyOpen() {
  missionSettingsToastManager.add({
    title: "AI models are already open.",
  });
}
