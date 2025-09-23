// Type references for external dependencies from @gesslar/toolkit
// This ensures TypeScript can resolve these types during declaration generation

/// <reference types="@gesslar/toolkit" />

import type { FileObject, DirectoryObject, Cache } from '@gesslar/toolkit'

// Make these types available globally for JSDoc type resolution
declare global {
  // Global type aliases for JSDoc type resolution
  type FileObject = import('@gesslar/toolkit').FileObject
  type DirectoryObject = import('@gesslar/toolkit').DirectoryObject
  type Cache = import('@gesslar/toolkit').Cache
}

export type { FileObject, DirectoryObject, Cache }
