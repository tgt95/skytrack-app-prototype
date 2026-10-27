import { Avatar, AvatarFallback } from "skytrack-ui/avatar";

export function LibraryAvatar({
  name,
  testId,
  initials,
  className = "size-6",
}: {
  name: string;
  testId?: string;
  initials?: string;
  className?: string;
}) {
  const firstName = name.trim().split(/\s+/u)[0];
  const initial = initials ?? firstName?.[0]?.toLocaleUpperCase() ?? "?";
  return (
    <Avatar aria-hidden="true" className={className} data-testid={testId}>
      <AvatarFallback className="text-[0.625rem] font-bold">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
