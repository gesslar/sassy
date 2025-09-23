#!/usr/bin/env node

/**
 * Post-process generated TypeScript declaration files to add missing imports
 * for external types from @gesslar/toolkit
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const TYPES_DIR = './types'
const IMPORT_STATEMENT = "import type { FileObject, DirectoryObject, Cache } from '@gesslar/toolkit';\n"

// Types that require the import
const EXTERNAL_TYPES = ['FileObject', 'DirectoryObject', 'Cache']

async function fixTypeImports() {
  try {
    const files = await fs.readdir(TYPES_DIR)
    const dtsFiles = files.filter(file => file.endsWith('.d.ts'))
    
    for (const file of dtsFiles) {
      const filePath = path.join(TYPES_DIR, file)
      let content = await fs.readFile(filePath, 'utf8')
      
      // Check if this file uses any of the external types
      const needsImport = EXTERNAL_TYPES.some(type => content.includes(type))
      
      // Skip if no external types used or import already exists
      if (!needsImport || content.includes("import type { FileObject, DirectoryObject, Cache }")) {
        continue
      }
      
      // Add the import statement at the beginning
      content = IMPORT_STATEMENT + content
      
      // Write the updated content back
      await fs.writeFile(filePath, content, 'utf8')
      console.log(`Added imports to ${file}`)
    }
    
    console.log('✅ Type imports fixed successfully')
  } catch (error) {
    console.error('❌ Error fixing type imports:', error)
    process.exit(1)
  }
}

fixTypeImports()