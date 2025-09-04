#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Simple script to view invoice calculation logs
 * Usage: node scripts/view-invoice-logs.js [filename]
 */

const logsDir = path.join(process.cwd(), 'logs', 'invoice-calculations');

function listLogFiles() {
  if (!fs.existsSync(logsDir)) {
    console.log('❌ No logs directory found. Create a UAD first to generate logs.');
    return;
  }

  const files = fs.readdirSync(logsDir)
    .filter(file => file.endsWith('.log'))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    console.log('📁 No invoice calculation logs found.');
    return;
  }

  console.log('📁 Available Invoice Calculation Logs:');
  console.log('=====================================');
  files.forEach((file, index) => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`${index + 1}. ${file}`);
    console.log(`   Size: ${size} KB`);
    console.log(`   Created: ${stats.birthtime.toLocaleString()}`);
    console.log('');
  });

  console.log('💡 Usage:');
  console.log('   node scripts/view-invoice-logs.js [filename]');
  console.log('   node scripts/view-invoice-logs.js [number]');
  console.log('');
  console.log('Examples:');
  console.log('   node scripts/view-invoice-logs.js 1                    # View most recent log');
  console.log('   node scripts/view-invoice-logs.js invoice-calc-...log  # View specific file');
}

function viewLogFile(filename) {
  let filePath;
  
  // If it's a number, treat it as an index
  if (!isNaN(filename)) {
    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .sort()
      .reverse();
    
    const index = parseInt(filename) - 1;
    if (index < 0 || index >= files.length) {
      console.log(`❌ Invalid index. Please use 1-${files.length}`);
      return;
    }
    
    filePath = path.join(logsDir, files[index]);
    console.log(`📖 Viewing log: ${files[index]}`);
  } else {
    filePath = path.join(logsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filename}`);
      return;
    }
    console.log(`📖 Viewing log: ${filename}`);
  }

  console.log('='.repeat(80));
  console.log('');

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(content);
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  listLogFiles();
} else {
  const filename = args[0];
  viewLogFile(filename);
}
