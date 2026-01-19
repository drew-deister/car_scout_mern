# Helper Scripts

Utility scripts for managing the Car Scout database.

## delete_thread_data.js

Deletes all data associated with a phone number:
- Thread
- All messages in the thread
- Car listing (if exists)
- Visits (if exist - Note: Visit model not currently in codebase)

### Usage

```bash
# From the server directory
node helper-scripts/delete_thread_data.js <phone_number>

# Or make it executable and run directly
chmod +x helper-scripts/delete_thread_data.js
./helper-scripts/delete_thread_data.js <phone_number>
```

### Example

```bash
node helper-scripts/delete_thread_data.js +15133126863
```

### Requirements

- MongoDB connection configured in `.env` file (MONGODB_URI)
- Node.js environment with all dependencies installed

### Safety

The script will prompt for confirmation before deleting any data. Type `yes` or `y` to confirm, or anything else to cancel.

