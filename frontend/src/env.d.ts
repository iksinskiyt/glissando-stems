declare const BUILD_TIMESTAMP: number;
interface ImportMeta {
  env: ImportMetaEnv & {
    VITE_COMMIT_HASH: string;
  };
}