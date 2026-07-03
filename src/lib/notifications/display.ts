import { AppNotification } from "@/lib/types";

export function notificationHref(notification: AppNotification): string {
  if (notification.type === "user_signup_pending") return "/admin";
  if (notification.type === "shared_resource_note" && notification.resourceId) {
    return `/script-writer/${notification.resourceId}`;
  }
  if (notification.agreementId) return `/agreements/${notification.agreementId}`;
  return "/";
}

export function notificationTitle(notification: AppNotification): string {
  if (notification.type === "user_signup_pending") return "New signup pending approval";
  if (notification.type === "shared_resource_note") {
    return "New note on your script";
  }
  return "Client signed agreement";
}

export function notificationBody(notification: AppNotification): string {
  if (notification.type === "user_signup_pending") {
    return `${notification.pendingUserName || notification.pendingUserEmail || "Someone"} is waiting for access`;
  }
  if (notification.type === "shared_resource_note") {
    const who = notification.noteAuthorInitials || notification.noteAuthorName || "Someone";
    const preview = notification.notePreview || notification.resourceTitle || "New feedback";
    return `${who}: ${preview}`;
  }
  return `${notification.signerName} signed${notification.projectName ? ` — ${notification.projectName}` : ""}`;
}
