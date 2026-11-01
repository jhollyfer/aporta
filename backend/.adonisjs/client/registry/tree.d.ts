/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  healthCheck: typeof routes['health_check']
  documentation: {
    openapi: typeof routes['documentation.openapi']
    reference: typeof routes['documentation.reference']
  }
  storefront: {
    notices: {
      paginate: typeof routes['storefront.notices.paginate']
      show: typeof routes['storefront.notices.show']
    }
    events: {
      paginate: typeof routes['storefront.events.paginate']
      show: typeof routes['storefront.events.show']
    }
    podcasts: {
      paginate: typeof routes['storefront.podcasts.paginate']
      show: typeof routes['storefront.podcasts.show']
    }
    videos: {
      paginate: typeof routes['storefront.videos.paginate']
      show: typeof routes['storefront.videos.show']
    }
    albums: {
      paginate: typeof routes['storefront.albums.paginate']
      show: typeof routes['storefront.albums.show']
    }
    testimonials: {
      paginate: typeof routes['storefront.testimonials.paginate']
      show: typeof routes['storefront.testimonials.show']
    }
  }
  authentication: {
    signIn: typeof routes['authentication.sign_in']
    signOut: typeof routes['authentication.sign_out']
    refresh: typeof routes['authentication.refresh']
  }
  profile: {
    show: typeof routes['profile.show']
    update: typeof routes['profile.update']
  }
  storages: {
    paginate: typeof routes['storages.paginate']
    create: typeof routes['storages.create']
    complete: typeof routes['storages.complete']
    parts: typeof routes['storages.parts']
    show: typeof routes['storages.show']
    delete: typeof routes['storages.delete']
    download: typeof routes['storages.download']
  }
  administrator: {
    dashboard: typeof routes['administrator.dashboard']
    notices: {
      paginate: typeof routes['administrator.notices.paginate']
      create: typeof routes['administrator.notices.create']
      show: typeof routes['administrator.notices.show']
      update: typeof routes['administrator.notices.update']
    }
    events: {
      paginate: typeof routes['administrator.events.paginate']
      create: typeof routes['administrator.events.create']
      show: typeof routes['administrator.events.show']
      update: typeof routes['administrator.events.update']
    }
    podcasts: {
      paginate: typeof routes['administrator.podcasts.paginate']
      create: typeof routes['administrator.podcasts.create']
      show: typeof routes['administrator.podcasts.show']
      update: typeof routes['administrator.podcasts.update']
    }
    videos: {
      paginate: typeof routes['administrator.videos.paginate']
      create: typeof routes['administrator.videos.create']
      show: typeof routes['administrator.videos.show']
      update: typeof routes['administrator.videos.update']
    }
    albums: {
      paginate: typeof routes['administrator.albums.paginate']
      create: typeof routes['administrator.albums.create']
      show: typeof routes['administrator.albums.show']
      update: typeof routes['administrator.albums.update']
    }
    testimonials: {
      paginate: typeof routes['administrator.testimonials.paginate']
      create: typeof routes['administrator.testimonials.create']
      show: typeof routes['administrator.testimonials.show']
      update: typeof routes['administrator.testimonials.update']
    }
    users: {
      paginate: typeof routes['administrator.users.paginate']
      create: typeof routes['administrator.users.create']
      show: typeof routes['administrator.users.show']
      update: typeof routes['administrator.users.update']
    }
    lifecycle: {
      notices: {
        archive: typeof routes['administrator.lifecycle.notices.archive']
        unarchive: typeof routes['administrator.lifecycle.notices.unarchive']
        purge: typeof routes['administrator.lifecycle.notices.purge']
      }
      events: {
        archive: typeof routes['administrator.lifecycle.events.archive']
        unarchive: typeof routes['administrator.lifecycle.events.unarchive']
        purge: typeof routes['administrator.lifecycle.events.purge']
      }
      podcasts: {
        archive: typeof routes['administrator.lifecycle.podcasts.archive']
        unarchive: typeof routes['administrator.lifecycle.podcasts.unarchive']
        purge: typeof routes['administrator.lifecycle.podcasts.purge']
      }
      videos: {
        archive: typeof routes['administrator.lifecycle.videos.archive']
        unarchive: typeof routes['administrator.lifecycle.videos.unarchive']
        purge: typeof routes['administrator.lifecycle.videos.purge']
      }
      albums: {
        archive: typeof routes['administrator.lifecycle.albums.archive']
        unarchive: typeof routes['administrator.lifecycle.albums.unarchive']
        purge: typeof routes['administrator.lifecycle.albums.purge']
      }
      testimonials: {
        archive: typeof routes['administrator.lifecycle.testimonials.archive']
        unarchive: typeof routes['administrator.lifecycle.testimonials.unarchive']
        purge: typeof routes['administrator.lifecycle.testimonials.purge']
      }
      users: {
        archive: typeof routes['administrator.lifecycle.users.archive']
        unarchive: typeof routes['administrator.lifecycle.users.unarchive']
        purge: typeof routes['administrator.lifecycle.users.purge']
      }
    }
  }
}
