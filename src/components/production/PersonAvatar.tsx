import { Camera, UserRound, Users, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ProductionPerson, ProductionPersonGroup } from "@/lib/production/types";

function personPlaceholderIcon(group: ProductionPersonGroup): LucideIcon {
  switch (group) {
    case "camera_department":
      return Camera;
    case "cast":
      return UserRound;
    default:
      return Users;
  }
}

export function PersonAvatar({
  person,
  group,
  size = "sm",
  className,
}: {
  person: ProductionPerson;
  group: ProductionPersonGroup;
  size?: "sm" | "lg";
  className?: string;
}) {
  const sizeClass = size === "lg" ? "h-20 w-20" : "h-9 w-9";
  const iconClass = size === "lg" ? "h-7 w-7" : "h-4 w-4";
  const initialClass = size === "lg" ? "text-2xl font-bold" : "text-xs font-semibold";
  const initial = person.name?.trim()?.charAt(0)?.toUpperCase();
  const PlaceholderIcon = personPlaceholderIcon(group);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-violet-100 text-violet-700",
        sizeClass,
        className
      )}
    >
      {person.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : initial ? (
        <span className={cn("flex h-full w-full items-center justify-center", initialClass)}>
          {initial}
        </span>
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <PlaceholderIcon className={iconClass} />
        </span>
      )}
    </div>
  );
}
