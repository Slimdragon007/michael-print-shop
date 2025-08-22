#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'
import chokidar from 'chokidar'
import { createHash } from 'crypto'
import { PhotoImporter } from './photo-importer'
import { ImageOptimizer } from './image-optimizer'

interface SyncConfig {
  externalDrivePath: string
  csvPath: string
  websiteImagesPath: string
  dataPath: string
  watchMode: boolean
  syncIntervalMinutes: number
}

interface FileState {
  path: string
  hash: string
  size: number
  modified: string
}

interface SyncStats {
  scanned: number
  new: number
  modified: number
  deleted: number
  errors: number
}

export class ExternalDriveSync {
  private config: SyncConfig
  private photoImporter: PhotoImporter
  private imageOptimizer: ImageOptimizer
  private stateFile: string
  private isRunning: boolean = false

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      externalDrivePath: '/Volumes/LaCie/Etsy',
      csvPath: '/Volumes/LaCie/Etsy/photo_inventory copy.csv',
      websiteImagesPath: '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/public/images',
      dataPath: '/Users/michaelhaslim/Documents/Hostinger_Website_Files/print-shop/data',
      watchMode: false,
      syncIntervalMinutes: 30,
      ...config
    }

    this.photoImporter = new PhotoImporter()
    this.imageOptimizer = new ImageOptimizer()
    this.stateFile = path.join(this.config.dataPath, 'sync-state.json')
  }

  async startSync(options: { watch?: boolean; fullSync?: boolean } = {}): Promise<void> {
    if (this.isRunning) {
      console.log('Sync already running')
      return
    }

    this.isRunning = true
    console.log('External Drive Sync System')
    console.log('==========================')

    try {
      // Check if external drive is available
      const driveAvailable = await this.checkDriveAvailability()
      if (!driveAvailable) {
        throw new Error('External drive not available')
      }

      // Ensure directories exist
      await this.ensureDirectories()

      // Perform initial sync
      console.log('Performing initial sync...')
      const stats = await this.performSync(options.fullSync || false)
      this.logSyncStats(stats)

      if (options.watch) {
        console.log('\nStarting file system watcher...')
        await this.startWatcher()
      } else {
        console.log('\nSync complete. Use --watch to monitor for changes.')
      }

    } catch (error) {
      console.error('Sync failed:', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.isRunning = false
    }
  }

  private async performSync(fullSync: boolean = false): Promise<SyncStats> {
    const stats: SyncStats = { scanned: 0, new: 0, modified: 0, deleted: 0, errors: 0 }

    try {
      // Load previous state
      const previousState = await this.loadSyncState()
      const currentState: Record<string, FileState> = {}

      // Check CSV file first
      const csvStats = await fs.stat(this.config.csvPath)
      const csvHash = await this.calculateFileHash(this.config.csvPath)
      const csvKey = 'photo_inventory.csv'

      currentState[csvKey] = {
        path: this.config.csvPath,
        hash: csvHash,
        size: csvStats.size,
        modified: csvStats.mtime.toISOString()
      }

      // Check if CSV changed or full sync requested
      const csvChanged = !previousState[csvKey] || 
                         previousState[csvKey].hash !== csvHash ||
                         fullSync

      if (csvChanged) {
        console.log('CSV file changed, triggering full photo import...')
        
        try {
          const importResult = await this.photoImporter.importFromCSV()
          stats.new = importResult.processed.length
          stats.errors = importResult.errors.length

          if (importResult.errors.length > 0) {
            console.log('Import errors:')
            importResult.errors.forEach(error => console.log(`  - ${error}`))
          }

          // Optimize newly imported images
          console.log('Optimizing imported images...')
          const optimizeResult = await this.imageOptimizer.optimizeAllImages()
          
          console.log(`Optimized ${optimizeResult.processed} images`)
          if (optimizeResult.errors.length > 0) {
            console.log('Optimization errors:')
            optimizeResult.errors.forEach(error => console.log(`  - ${error}`))
            stats.errors += optimizeResult.errors.length
          }

        } catch (error) {
          console.error('Import/optimization failed:', error)
          stats.errors++
        }
      }

      // Scan for individual file changes in organized products
      await this.scanOrganizedProducts(currentState, previousState, stats, fullSync)

      // Save current state
      await this.saveSyncState(currentState)

      return stats

    } catch (error) {
      console.error('Sync operation failed:', error)
      stats.errors++
      return stats
    }
  }

  private async scanOrganizedProducts(
    currentState: Record<string, FileState>,
    previousState: Record<string, FileState>,
    stats: SyncStats,
    fullSync: boolean
  ): Promise<void> {
    const organizedPath = path.join(this.config.externalDrivePath, 'Organized_Products')
    
    try {
      await this.scanDirectory(organizedPath, currentState, previousState, stats, fullSync)
    } catch (error) {
      console.error('Failed to scan organized products:', error)
      stats.errors++
    }
  }

  private async scanDirectory(
    dirPath: string,
    currentState: Record<string, FileState>,
    previousState: Record<string, FileState>,
    stats: SyncStats,
    fullSync: boolean,
    depth: number = 0
  ): Promise<void> {
    if (depth > 10) return // Prevent infinite recursion

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, currentState, previousState, stats, fullSync, depth + 1)
        } else if (entry.isFile() && this.isImageFile(entry.name)) {
          try {
            const relativePath = path.relative(this.config.externalDrivePath, fullPath)
            const fileStats = await fs.stat(fullPath)
            const fileHash = await this.calculateFileHash(fullPath)
            
            currentState[relativePath] = {
              path: fullPath,
              hash: fileHash,
              size: fileStats.size,
              modified: fileStats.mtime.toISOString()
            }

            stats.scanned++

            // Check if file changed
            const previous = previousState[relativePath]
            if (!previous) {
              stats.new++
              console.log(`New file: ${relativePath}`)
              await this.processNewFile(fullPath, relativePath)
            } else if (previous.hash !== fileHash || fullSync) {
              stats.modified++
              console.log(`Modified file: ${relativePath}`)
              await this.processModifiedFile(fullPath, relativePath)
            }

          } catch (error) {
            console.error(`Failed to process ${fullPath}:`, error)
            stats.errors++
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dirPath}:`, error)
      stats.errors++
    }
  }

  private async processNewFile(filePath: string, relativePath: string): Promise<void> {
    // Only process main images to avoid overwhelming the system
    if (!relativePath.includes('Main_Images')) return

    try {
      // Copy to website images directory for optimization
      const filename = path.basename(filePath)
      const destPath = path.join(this.config.websiteImagesPath, 'original', filename)
      
      await fs.mkdir(path.dirname(destPath), { recursive: true })
      await fs.copyFile(filePath, destPath)
      
      // Optimize the new image
      await this.imageOptimizer.optimizeImage(filename)
      
      console.log(`  Processed and optimized: ${filename}`)
    } catch (error) {
      console.error(`  Failed to process new file: ${error}`)
    }
  }

  private async processModifiedFile(filePath: string, relativePath: string): Promise<void> {
    // Handle modified files similar to new files
    await this.processNewFile(filePath, relativePath)
  }

  private async startWatcher(): Promise<void> {
    const watcher = chokidar.watch([
      this.config.csvPath,
      path.join(this.config.externalDrivePath, 'Organized_Products/**/*.{jpg,jpeg,png,webp}')
    ], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    })

    console.log('Watching for file changes...')
    console.log('Press Ctrl+C to stop')

    watcher
      .on('add', async (filePath) => {
        console.log(`File added: ${filePath}`)
        await this.handleFileChange(filePath, 'add')
      })
      .on('change', async (filePath) => {
        console.log(`File changed: ${filePath}`)
        await this.handleFileChange(filePath, 'change')
      })
      .on('unlink', async (filePath) => {
        console.log(`File removed: ${filePath}`)
        await this.handleFileChange(filePath, 'unlink')
      })
      .on('error', error => {
        console.error('Watcher error:', error)
      })

    // Keep the process running
    await new Promise(() => {}) // Run indefinitely
  }

  private async handleFileChange(filePath: string, event: 'add' | 'change' | 'unlink'): Promise<void> {
    try {
      if (filePath === this.config.csvPath) {
        console.log('CSV file changed, triggering sync...')
        await this.performSync(false)
      } else {
        const relativePath = path.relative(this.config.externalDrivePath, filePath)
        
        if (event === 'add' || event === 'change') {
          await this.processNewFile(filePath, relativePath)
        }
        // Note: We don't handle 'unlink' events as they might be temporary
      }
    } catch (error) {
      console.error(`Failed to handle file change: ${error}`)
    }
  }

  private async loadSyncState(): Promise<Record<string, FileState>> {
    try {
      const content = await fs.readFile(this.stateFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      // File doesn't exist or is invalid
      return {}
    }
  }

  private async saveSyncState(state: Record<string, FileState>): Promise<void> {
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2))
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath)
    return createHash('md5').update(content).digest('hex')
  }

  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'].includes(ext)
  }

  private async checkDriveAvailability(): Promise<boolean> {
    try {
      await fs.access(this.config.externalDrivePath)
      await fs.access(this.config.csvPath)
      console.log('✅ External drive available')
      return true
    } catch {
      console.error('❌ External drive not available at', this.config.externalDrivePath)
      return false
    }
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.config.dataPath,
      this.config.websiteImagesPath,
      path.join(this.config.websiteImagesPath, 'original')
    ]

    for (const dir of dirs) {
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
        console.log(`Created directory: ${dir}`)
      }
    }
  }

  private logSyncStats(stats: SyncStats): void {
    console.log(`\nSync Statistics:`)
    console.log(`- Files scanned: ${stats.scanned}`)
    console.log(`- New files: ${stats.new}`)
    console.log(`- Modified files: ${stats.modified}`)
    console.log(`- Deleted files: ${stats.deleted}`)
    console.log(`- Errors: ${stats.errors}`)
  }

  // Manual trigger methods
  async triggerFullSync(): Promise<SyncStats> {
    return await this.performSync(true)
  }

  async checkSyncStatus(): Promise<{
    lastSync: string | null
    driveAvailable: boolean
    totalFiles: number
  }> {
    const state = await this.loadSyncState()
    const driveAvailable = await this.checkDriveAvailability()
    
    let lastSync: string | null = null
    if (Object.keys(state).length > 0) {
      const timestamps = Object.values(state).map(file => file.modified)
      lastSync = new Date(Math.max(...timestamps.map(t => new Date(t).getTime()))).toISOString()
    }

    return {
      lastSync,
      driveAvailable,
      totalFiles: Object.keys(state).length
    }
  }
}

// CLI usage
if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2)
    const command = args[0] || 'sync'
    
    const sync = new ExternalDriveSync()
    
    switch (command) {
      case 'sync':
        await sync.startSync({ fullSync: args.includes('--full') })
        break
        
      case 'watch':
        await sync.startSync({ watch: true, fullSync: args.includes('--full') })
        break
        
      case 'status':
        const status = await sync.checkSyncStatus()
        console.log('Sync Status:')
        console.log(`- Drive available: ${status.driveAvailable ? '✅' : '❌'}`)
        console.log(`- Total tracked files: ${status.totalFiles}`)
        console.log(`- Last sync: ${status.lastSync || 'Never'}`)
        break
        
      case 'full':
        console.log('Performing full sync...')
        const stats = await sync.triggerFullSync()
        console.log('Full sync complete')
        break
        
      default:
        console.log('External Drive Sync System')
        console.log('Usage:')
        console.log('  npm run sync:external sync [--full]  - Perform one-time sync')
        console.log('  npm run sync:external watch [--full] - Start watching for changes')
        console.log('  npm run sync:external status         - Check sync status')
        console.log('  npm run sync:external full           - Force full sync')
        console.log('')
        console.log('Options:')
        console.log('  --full    Perform full sync even if no changes detected')
    }
  }
  
  main().catch(error => {
    console.error('Sync failed:', error)
    process.exit(1)
  })
}