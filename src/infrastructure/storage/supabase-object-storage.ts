import { createClient } from "@supabase/supabase-js";

import type {
  ObjectStorage,
  SignedDownloadAuthorization,
  SignedUploadAuthorization,
  StoredObjectInfo,
} from "./object-storage.js";

export interface SupabaseObjectStorageOptions {
  secretKey: string;
  url: string;
}

function storageOperationError(
  operation: string,
  cause: unknown,
): Error {
  return new Error(`Supabase Storage failed to ${operation}.`, {
    cause,
  });
}

export function createSupabaseObjectStorage({
  secretKey,
  url,
}: SupabaseObjectStorageOptions): ObjectStorage {
  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return Object.freeze({
    async createSignedUploadAuthorization(
      bucket: string,
      path: string,
    ): Promise<SignedUploadAuthorization> {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path, { upsert: false });

      if (error) {
        throw storageOperationError("authorize an upload", error);
      }

      return {
        path: data.path,
        token: data.token,
      };
    },

    async createSignedDownloadAuthorization(
      bucket: string,
      path: string,
      expiresInSeconds: number,
    ): Promise<SignedDownloadAuthorization> {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds, {
          download: false,
        });

      if (error) {
        throw storageOperationError("authorize a download", error);
      }

      return { signedUrl: data.signedUrl };
    },

    async getObjectInfo(
      bucket: string,
      path: string,
    ): Promise<StoredObjectInfo> {
      const { data, error } = await supabase.storage
        .from(bucket)
        .info(path);

      if (error) {
        throw storageOperationError("read object metadata", error);
      }

      if (data.size === undefined) {
        throw storageOperationError(
          "read object size metadata",
          new Error("Supabase Storage returned no object size."),
        );
      }

      return {
        contentType: data.contentType ?? null,
        sizeBytes: data.size,
      };
    },

    async downloadObject(
      bucket: string,
      path: string,
    ): Promise<Uint8Array> {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        throw storageOperationError("download an object", error);
      }

      return new Uint8Array(await data.arrayBuffer());
    },

    async objectExists(bucket: string, path: string): Promise<boolean> {
      const { data, error } = await supabase.storage
        .from(bucket)
        .exists(path);

      if (error) {
        throw storageOperationError("check whether an object exists", error);
      }

      return data;
    },

    async removeObject(bucket: string, path: string): Promise<void> {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw storageOperationError("remove an object", error);
      }
    },
  });
}
