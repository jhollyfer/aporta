import { GalleryMain } from './gallery-main'
import { GalleryRoot } from './gallery'
import { GalleryTabs } from './gallery-tabs'
import { GalleryThumbs } from './gallery-thumbs'

export const Gallery = Object.assign(GalleryRoot, {
  Tabs: GalleryTabs,
  Main: GalleryMain,
  Thumbs: GalleryThumbs,
})
