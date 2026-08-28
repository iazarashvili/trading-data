/** სქრინშოტების შენახვა R2-ში (SPEC სექცია 5) */

export class UploadError extends Error {}

/** დაშვებული გაფართოებები; `jpeg` ინახება როგორც `jpg` */
const EXTENSIONS: Record<string, string> = {
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  gif: 'gif',
  webp: 'webp',
}

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}

export const MAX_SIZE_BYTES = 5 * 1024 * 1024
export const ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/gif,image/webp'

function randomHex(byteLength = 8): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** ფორმიდან რეალურად ატვირთული ფაილია? (ცარიელი input-იც `File`-ია) */
export function isUploadedFile(value: unknown): value is File {
  return value instanceof File && value.size > 0 && value.name !== ''
}

export async function saveScreenshot(
  bucket: R2Bucket,
  file: File,
  tradeId: number,
): Promise<string> {
  const parts = file.name.split('.')
  const extension = parts.length > 1 ? EXTENSIONS[parts.pop()!.toLowerCase()] : undefined

  if (!extension) {
    throw new UploadError('დაშვებულია მხოლოდ სურათები: PNG, JPG, GIF, WEBP')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError('ფაილი ძალიან დიდია (მაქს. 5 MB)')
  }

  const key = `trade_${tradeId}_${randomHex()}.${extension}`
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: CONTENT_TYPES[extension] },
  })
  return key
}

export async function deleteScreenshot(
  bucket: R2Bucket,
  key: string | null | undefined,
): Promise<void> {
  if (!key) return
  await bucket.delete(key)
}

export async function deleteScreenshots(
  bucket: R2Bucket,
  ...keys: (string | null | undefined)[]
): Promise<void> {
  await Promise.all(keys.map((key) => deleteScreenshot(bucket, key)))
}

/**
 * რედაქტირებისას ერთი სლოტის განახლება:
 * მონიშნული „წაშლა" ან ახალი ფაილი შლის ძველს.
 */
export async function updateScreenshotSlot(
  bucket: R2Bucket,
  tradeId: number,
  current: string | null,
  file: unknown,
  remove: boolean,
): Promise<string | null> {
  let key = current

  if (remove && key) {
    await deleteScreenshot(bucket, key)
    key = null
  }

  if (isUploadedFile(file)) {
    const uploaded = await saveScreenshot(bucket, file, tradeId)
    if (key) await deleteScreenshot(bucket, key)
    key = uploaded
  }

  return key
}
