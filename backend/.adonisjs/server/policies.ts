export const policies = {
  ListingPolicy: () => import('#policies/listing.policy'),
  StoragePolicy: () => import('#policies/storage.policy'),
  UserPolicy: () => import('#policies/user.policy'),
}

