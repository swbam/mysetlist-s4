// Simple database connection test
const { testConnection } = require('./packages/database/src/index.ts');

async function runTest() {
  try {
    console.log('Testing database connection...');
    const result = await testConnection();
    console.log('Database connection:', result ? 'SUCCESS ✅' : 'FAILED ❌');
    
    if (result) {
      console.log('Database is ready for operations!');
    } else {
      console.log('Please check your database configuration.');
    }
    
    process.exit(result ? 0 : 1);
  } catch (error) {
    console.error('Test failed with error:', error.message);
    process.exit(1);
  }
}

runTest();