export async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await safeErr(res));
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(await safeErr(res));
  return res.status === 204 ? null : res.json();
}

export async function apiPut(path, body) {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(await safeErr(res));
  return res.status === 204 ? null : res.json();
}

export async function apiDelete(path) {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(await safeErr(res));
  return null;
}

async function safeErr(res) {
  try {
    const j = await res.json();
    return j?.error ? j.error : `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
