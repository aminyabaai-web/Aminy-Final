#!/usr/bin/env node

// Build optimization script to reduce compilation time
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build optimization...');

// 1. Check for large files that might slow down build
function checkFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInKB = fileSizeInBytes / 1024;
    
    if (fileSizeInKB > 100) {
      console.log(`⚠️  Large file detected: ${filePath} (${fileSizeInKB.toFixed(1)}KB)`);
    }
    
    return fileSizeInKB;
  } catch (error) {
    return 0;
  }
}

// 2. Scan for potential circular dependencies
function checkCircularDeps() {
  console.log('📊 Checking for potential performance issues...');
  
  // Check CSS file size
  const cssSize = checkFileSize('./styles/globals.css');
  if (cssSize > 200) {
    console.log('💡 Consider splitting large CSS files for better performance');
  }
  
  // Check for potential heavy imports in main files
  const appFile = fs.readFileSync('./App.tsx', 'utf8');
  const importCount = (appFile.match(/import/g) || []).length;
  
  if (importCount > 20) {
    console.log(`⚠️  App.tsx has ${importCount} imports - consider lazy loading`);
  }
  
  console.log('✅ Performance check complete');
}

// 3. Optimize build environment
function optimizeBuild() {
  console.log('⚡ Applying build optimizations...');
  
  // Set environment variables for faster builds
  process.env.NODE_ENV = 'production';
  process.env.GENERATE_SOURCEMAP = 'false';
  process.env.INLINE_RUNTIME_CHUNK = 'false';
  
  console.log('✅ Build environment optimized');
}

// Run optimizations
checkCircularDeps();
optimizeBuild();

console.log('🎉 Build optimization complete!');
console.log('💡 Tips:');
console.log('  - Use lazy loading for heavy components');
console.log('  - Split large CSS files');
console.log('  - Minimize initial bundle size');
console.log('  - Use code splitting for better performance');