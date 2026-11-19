import { useState } from "react";
import {
  BellIcon,
  CheckIcon,
  DroneIcon,
  ShareNetworkIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "skytrack-ui/empty";
import { PageHeader } from "skytrack-ui/page-header";
import { LibraryPageLayout } from "@/features/library/cards/library-presentation.tsx";

type NotificationCategory = "mission" | "shared" | "workspace";
type NotificationFilter = "all" | "unread" | NotificationCategory;

interface NotificationRecord {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  actor: string;
  time: string;
  period: "Today" | "Yesterday";
  read: boolean;
}

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  mission: "Mission activity",
  shared: "Shared projects",
  workspace: "Workspace updates",
};

const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: "mission-plan-saved",
    category: "mission",
    title: "Mission plan updated",
    description:
      "San Bernardino FWY now covers 17.6 ha with 158 planned photo captures.",
    actor: "Tuan Trinh",
    time: "12m ago",
    period: "Today",
    read: false,
  },
  {
    id: "reconstruction-ready",
    category: "mission",
    title: "3D reconstruction ready",
    description:
      "Harbor orthomosaic is ready to review as a World in your workspace.",
    actor: "SkyTrack",
    time: "48m ago",
    period: "Today",
    read: false,
  },
  {
    id: "project-shared",
    category: "shared",
    title: "Maya Nguyen shared a project",
    description:
      "Coastal mapping is available in Shared with me with view access.",
    actor: "Maya Nguyen",
    time: "3h ago",
    period: "Today",
    read: true,
  },
  {
    id: "model-added",
    category: "workspace",
    title: "New AI model in your workspace",
    description:
      "Olivia Chen added Solar panel detector to the shared model library.",
    actor: "Olivia Chen",
    time: "Yesterday",
    period: "Yesterday",
    read: true,
  },
  {
    id: "cloud-sim-access",
    category: "workspace",
    title: "Cloud SIM access needs approval",
    description:
      "Ask your workspace administrator to enable Cloud SIM for this account.",
    actor: "Workspace access",
    time: "Yesterday",
    period: "Yesterday",
    read: false,
  },
];

function NotificationIcon({ category }: { category: NotificationCategory }) {
  const Icon =
    category === "mission"
      ? DroneIcon
      : category === "shared"
        ? ShareNetworkIcon
        : UsersIcon;
  return <Icon aria-hidden="true" className="size-5" />;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "all") return true;
    return item.category === filter;
  });
  const filters: { id: NotificationFilter; label: string }[] = [
    { id: "all", label: `All (${notifications.length})` },
    { id: "unread", label: `Unread (${unreadCount})` },
    ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
      id: id as NotificationCategory,
      label,
    })),
  ];

  const toggleRead = (id: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: !item.read } : item,
      ),
    );
  };

  const markAllRead = () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  };

  const groups = ["Today", "Yesterday"] as const;

  return (
    <LibraryPageLayout
      titleId="ms-lib-notifications-title"
      header={
        <div
          className="sticky top-0 z-20 border-b border-border bg-card"
          data-testid="ms-lib-page-header-row"
        >
          <PageHeader
            className="ms-lib-page-header flex flex-col gap-2 px-6 pb-0 pt-5 border-b-0"
            title={
              <span id="ms-lib-notifications-title" data-testid="ms-lib-page-header-copy">
                Notifications
              </span>
            }
            toolbar={
              <div className="inline-flex items-center justify-end gap-2 shrink-0" data-testid="ms-lib-page-header-actions">
                <Button
                  size="default"
                  variant="outline"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  data-testid="ms-lib-notifications-mark-all-read"
                >
                  <CheckIcon aria-hidden="true" /> Mark all as read
                </Button>
              </div>
            }
          />
          <div className="px-6 pb-4" data-testid="ms-lib-page-header-description">
            Mission activity, shared projects, and workspace updates.
          </div>
        </div>
      }
    >
      <div
        className="flex flex-col gap-5"
        data-testid="ms-lib-notification-center"
      >
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter notifications"
          data-testid="ms-lib-notification-filters"
        >
          {filters.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={filter === id ? "default" : "outline"}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              data-testid={`ms-lib-notification-filter-${id}`}
            >
              {label}
            </Button>
          ))}
        </div>

        {visibleNotifications.length === 0 ? (
          <Empty data-testid="ms-lib-notifications-empty">
            <EmptyMedia icon={BellIcon} />
            <EmptyTitle
              role="heading"
              aria-level={2}
            >
              You're all caught up
            </EmptyTitle>
            <EmptyDescription>
              New updates will appear here.
            </EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((period) => {
              const groupItems = visibleNotifications.filter(
                (item) => item.period === period,
              );
              if (groupItems.length === 0) return null;

              return (
                <section
                  key={period}
                  aria-label={period}
                  data-testid={`ms-lib-notification-group-${period.toLowerCase()}`}
                >
                  <h2 className="sub-heading mb-2 mt-0 text-xs">
                    {period}
                  </h2>
                  <div className="overflow-hidden rounded-(--radius) border border-(--border) bg-(--card)">
                    {groupItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full items-start gap-3 border-b border-(--border) p-4 text-left last:border-b-0 hover:bg-(--accent)/40 focus-visible:outline-2 focus-visible:outline-(--ring)"
                        aria-label={`${item.read ? "Mark unread" : "Mark read"}: ${item.title}`}
                        aria-pressed={item.read}
                        onClick={() => toggleRead(item.id)}
                        data-testid={`ms-lib-notification-${item.id}`}
                      >
                        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-(--accent) text-(--accent-foreground)">
                          <NotificationIcon category={item.category} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{item.title}</span>
                            {!item.read ? (
                              <span
                                className="size-2 rounded-full bg-(--primary)"
                                aria-label="Unread"
                              />
                            ) : null}
                          </span>
                          <span className="mt-1 block text-sm text-(--muted-foreground)">
                            {item.description}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--muted-foreground)">
                            <span>{item.actor}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.time}</span>
                            <Badge className="rounded-(--radius)"
                              count={CATEGORY_LABELS[item.category]}
                              status="outline"
                            />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="border-t border-(--border) pt-4 text-xs text-(--muted-foreground)">
          <span>
            Workspace alerts include members, resources, and Cloud SIM access.
          </span>
        </div>
      </div>
    </LibraryPageLayout>
  );
}
