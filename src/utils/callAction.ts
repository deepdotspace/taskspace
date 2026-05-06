import { getAuthToken } from 'deepspace'

export async function callAction(
  name: string,
  params: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const token = await getAuthToken()
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Action ${name} failed: ${res.status}`)
  return res.json()
}
