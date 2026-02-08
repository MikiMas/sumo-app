type UploadResult = {
  ok: boolean;
  file: {
    bucket: string;
    path: string;
    url: string;
    mime: string;
  };
};

function guessMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  return "image/jpeg";
}

export async function uploadImageFromUriRaw(
  uri: string,
  folder: "bike-main" | "bike-media" | "route-media" | "profile-avatar" | "post-media",
  token: string
) {
  const mime = guessMimeFromUri(uri);
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("quicktime")
        ? "mov"
        : mime.includes("mp4")
          ? "mp4"
          : "jpg";
  const filename = `upload-${Date.now()}.${ext}`;
  const form = new FormData();
  form.append("folder", folder);
  form.append("file", { uri, name: filename, type: mime } as any);

  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Falta EXPO_PUBLIC_API_URL");

  const res = await fetch(`${base}/api/sumo/storage/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  const json = (await res.json().catch(() => null)) as UploadResult | null;
  if (!res.ok || !json?.file?.url) {
    throw new Error(json && "error" in json ? String((json as any).error) : `UPLOAD_HTTP_${res.status}`);
  }
  return json.file.url;
}
