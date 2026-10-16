export interface StoredObjectInfo {
  contentType: string | null;
  sizeBytes: number;
}

export interface SignedUploadAuthorization {
  path: string;
  token: string;
}

export interface SignedDownloadAuthorization {
  signedUrl: string;
}

export interface ObjectStorage {
  createSignedUploadAuthorization(
    bucket: string,
    path: string,
  ): Promise<SignedUploadAuthorization>;
  createSignedDownloadAuthorization(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<SignedDownloadAuthorization>;
  getObjectInfo(bucket: string, path: string): Promise<StoredObjectInfo>;
  objectExists(bucket: string, path: string): Promise<boolean>;
  downloadObject(bucket: string, path: string): Promise<Uint8Array>;
  removeObject(bucket: string, path: string): Promise<void>;
}
