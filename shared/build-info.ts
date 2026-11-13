/** What a build leaves next to the files it deploys, read by the CMS's Monitoring page. */
export interface BuildInfo {
  builtAt: string
  files: number
  bytes: number
  largest: { path: string; bytes: number }
}

export const BUILD_INFO_FILE = 'build-info.json'

