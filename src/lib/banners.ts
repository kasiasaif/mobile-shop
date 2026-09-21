import { useCallback } from 'react'
import { type Banner } from '../data/banner'
import { readCatalogJson, useCatalogLive } from './catalogApi'

function withImageUrl(banner: Banner): Banner | null {
  const id = Number(banner.id)
  if (!Number.isInteger(id) || id < 1) return null
  const base = import.meta.env.BASE_URL
  return {
    ...banner,
    id,
    image: `${base}${banner.image.replace(/^\//, '')}`,
  }
}

export async function loadBanners(): Promise<Banner[]> {
  const items = await readCatalogJson<Banner[]>('/api/banners', `${import.meta.env.BASE_URL}banners.json`)
  return items.map(withImageUrl).filter((item): item is Banner => item !== null)
}

export function useBanners() {
  const load = useCallback(async () => {
    const items = await loadBanners()
    return items.filter((item) => item.active === true).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [])
  const { data, status } = useCatalogLive(load, [] as Banner[])
  return { banners: data, status }
}
