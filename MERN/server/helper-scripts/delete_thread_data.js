#!/usr/bin/env node

/**
 * Script to delete all data associated with a phone number:
 * - Thread
 * - All messages in the thread
 * - Car listing (if exists)
 * - Visits (if exist - Note: Visit model not currently in codebase)
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

// Import models
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const CarListing = require('../models/CarListing');

// Visit model not currently in codebase - uncomment if you add it later
// const Visit = require('../models/Visit');

/**
 * Delete all data for a given phone number
 * @param {string} phoneNumber - The phone number to delete data for
 * @returns {Promise<boolean>} - True if deletion was successful, false otherwise
 */
async function deleteThreadData(phoneNumber) {
  console.log('\n' + '='.repeat(60));
  console.log(`🗑️  DELETING DATA FOR: ${phoneNumber}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Find thread by phone number
    const thread = await Thread.findOne({ phoneNumber });

    if (!thread) {
      console.log(`❌ No thread found for phone number: ${phoneNumber}`);
      return false;
    }

    const threadId = thread._id;
    const threadIdStr = threadId.toString();

    console.log(`✅ Found thread: ${threadIdStr}`);
    const lastMessage = thread.lastMessage || 'N/A';
    console.log(`   Last message: ${lastMessage.substring(0, 50)}...`);
    console.log(`   Last message time: ${thread.lastMessageTime || 'N/A'}`);

    // Count and delete messages
    const messages = await Message.find({ threadId });
    const messageCount = messages.length;
    console.log(`\n📨 Found ${messageCount} messages`);

    if (messageCount > 0) {
      const result = await Message.deleteMany({ threadId });
      console.log(`   ✅ Deleted ${result.deletedCount} messages`);
    }

    // Delete car listing if exists
    const carListing = await CarListing.findOne({ threadId });
    if (carListing) {
      const result = await CarListing.deleteOne({ _id: carListing._id });
      if (result.deletedCount > 0) {
        const make = carListing.make || '';
        const model = carListing.model || '';
        console.log(`   ✅ Deleted car listing: ${make} ${model}`.trim());
      }
    } else {
      console.log(`   ℹ️  No car listing found`);
    }

    // Delete visits if exist (Visit model not currently in codebase)
    // Uncomment this section if you add a Visit model later
    /*
    const visits = await Visit.find({ threadId });
    const visitCount = visits.length;
    if (visitCount > 0) {
      const result = await Visit.deleteMany({ threadId });
      console.log(`   ✅ Deleted ${result.deletedCount} visits`);
    } else {
      console.log(`   ℹ️  No visits found`);
    }
    */

    // Finally, delete the thread
    const result = await Thread.deleteOne({ _id: threadId });

    if (result.deletedCount > 0) {
      console.log(`\n✅ Successfully deleted thread and all associated data!`);
      console.log(`   - Thread: ${threadIdStr}`);
      console.log(`   - Messages: ${messageCount}`);
      console.log(`   - Car listing: ${carListing ? 'Yes' : 'No'}`);
      // console.log(`   - Visits: ${visitCount || 0}`); // Uncomment if Visit model is added
      return true;
    } else {
      console.log(`\n❌ Failed to delete thread`);
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Error deleting thread data:`, error.message);
    return false;
  }
}

/**
 * Prompt user for confirmation
 * @param {string} question - The question to ask
 * @returns {Promise<string>} - The user's response
 */
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Main function
 */
async function main() {
  // Get phone number from command line arguments
  const phoneNumber = process.argv[2];

  if (!phoneNumber) {
    console.log('Usage: node delete_thread_data.js <phone_number>');
    console.log('Example: node delete_thread_data.js +15133126863');
    process.exit(1);
  }

  // Confirm deletion
  console.log('\n⚠️  WARNING: This will permanently delete ALL data for ' + phoneNumber);
  console.log('   - Thread');
  console.log('   - All messages');
  console.log('   - Car listing (if exists)');
  console.log('   - Visits (if exist)');

  const response = await askQuestion('\nAre you sure you want to continue? (yes/no): ');

  if (response.toLowerCase() !== 'yes' && response.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  // Connect to MongoDB
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/car_scout';
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.error('   Please check your MONGODB_URI in .env file');
    process.exit(1);
  }

  // Delete the data
  const success = await deleteThreadData(phoneNumber);

  // Close MongoDB connection
  await mongoose.connection.close();

  if (success) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Deletion complete!');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('❌ Deletion failed or nothing found');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

