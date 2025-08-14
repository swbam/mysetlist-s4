#!/usr/bin/env node

import { testConnection } from './packages/database/src/index.js';

async function main() {
  console.log('Testing database connection...');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection successful!');
      process.exit(0);
    } else {
      console.log('❌ Database connection failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);