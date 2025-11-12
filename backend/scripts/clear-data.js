const DataService = require('../services/dataService');
require('dotenv').config();

async function clearAllData() {
  try {
    console.log('Clearing all inventory data...');
    
    const result = await DataService.clearAllData();
    
    console.log('\n✅ All data cleared successfully!');
    console.log('Tables cleared:', result.tablesCleared.join(', '));
    console.log('You can now simulate new events.');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the script
clearAllData().catch(error => {
  console.error('Failed to clear data:', error);
  process.exit(1);
});

