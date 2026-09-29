import { api } from "./api";
import type { ApiUser } from "./api/dto";
import { setCurrentUser } from "./api/authState";

interface AvatarUploadSignature {
  upload_url: string;
  cloud_name: string;
  api_key: string;
  public_id: string;
  timestamp: number;
  transformation: string;
  signature: string;
}

export async function uploadProfileAvatar(file: File): Promise<ApiUser> {
  const signed = (await api.request<AvatarUploadSignature>(
    "/users/me/avatar/upload-signature",
    { method: "POST" },
  )).data;
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", signed.api_key);
  body.set("timestamp", String(signed.timestamp));
  body.set("signature", signed.signature);
  body.set("public_id", signed.public_id);
  body.set("transformation", signed.transformation);

  const upload = await fetch(signed.upload_url, { method: "POST", body });
  const result: unknown = await upload.json().catch(() => null);
  if (!upload.ok) {
    const message = isCloudinaryError(result)
      ? result.error.message
      : "The profile photo could not be uploaded.";
    throw new Error(message);
  }
  if (!isCloudinaryUpload(result) || result.public_id !== signed.public_id) {
    throw new Error("Cloudinary returned an unexpected upload response.");
  }

  const user = (await api.request<ApiUser>("/users/me/avatar", {
    method: "PUT",
    body: { public_id: signed.public_id },
  })).data;
  setCurrentUser(user);
  return user;
}

export async function removeProfileAvatar(): Promise<ApiUser> {
  const user = (await api.request<ApiUser>("/users/me/avatar", { method: "DELETE" })).data;
  setCurrentUser(user);
  return user;
}

export async function deleteLiveAccount(): Promise<void> {
  await api.request<{ deleted: boolean }>("/users/me", { method: "DELETE" });
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("campuscoin.") || key === "userName") localStorage.removeItem(key);
  }
  setCurrentUser(null);
  api.authCookiesChanged();
}

function isCloudinaryUpload(value: unknown): value is { public_id: string } {
  return typeof value === "object" && value !== null &&
    typeof (value as { public_id?: unknown }).public_id === "string";
}

function isCloudinaryError(value: unknown): value is { error: { message: string } } {
  if (typeof value !== "object" || value === null) return false;
  const error = (value as { error?: unknown }).error;
  return typeof error === "object" && error !== null &&
    typeof (error as { message?: unknown }).message === "string";
}
