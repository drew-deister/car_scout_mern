from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from typing import Optional, Dict, Any
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()


def _get_db_name(uri: str) -> str:
  """
  Extract a database name from a Mongo URI. Fallback to 'test' if missing.
  This avoids pymongo InvalidName when the URI omits the db segment.
  """
  try:
    parsed = urlparse(uri)
    # path starts with "/" if present
    path = parsed.path or ''
    name = path.lstrip('/').split('/')[0].split('?')[0]
    return name or 'test'
  except Exception:
    return 'test'


# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/test')
client = MongoClient(MONGODB_URI)
db_name = _get_db_name(MONGODB_URI)
# Force use 'test' database
db = client['test']

# Collections
threads_collection = db.threads
messages_collection = db.messages
car_listings_collection = db.carlistings

# Create indexes
threads_collection.create_index([("phoneNumber", 1)])
threads_collection.create_index([("lastMessageTime", -1)])
messages_collection.create_index([("threadId", 1)])
messages_collection.create_index([("timestamp", 1)])
car_listings_collection.create_index([("threadId", 1)], unique=True)
car_listings_collection.create_index([("phoneNumber", 1)])
car_listings_collection.create_index([("conversationComplete", 1)])


class Thread:
    @staticmethod
    def find_one(query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return threads_collection.find_one(query)
    
    @staticmethod
    def find(query: Dict[str, Any] = None, sort: list = None) -> list:
        cursor = threads_collection.find(query or {})
        if sort:
            cursor = cursor.sort(sort)
        return list(cursor)
    
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        result = threads_collection.insert_one(data)
        return str(result.inserted_id)
    
    @staticmethod
    def update_one(query: Dict[str, Any], update: Dict[str, Any]):
        return threads_collection.update_one(query, {"$set": update})
    
    @staticmethod
    def find_by_id(thread_id: str) -> Optional[Dict[str, Any]]:
        from bson import ObjectId
        try:
            return threads_collection.find_one({"_id": ObjectId(thread_id)})
        except:
            return None


class Message:
    @staticmethod
    def find(query: Dict[str, Any], sort: list = None) -> list:
        cursor = messages_collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        return list(cursor)
    
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        result = messages_collection.insert_one(data)
        return str(result.inserted_id)


class CarListing:
    @staticmethod
    def find_one(query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return car_listings_collection.find_one(query)
    
    @staticmethod
    def find(query: Dict[str, Any] = None, sort: list = None) -> list:
        cursor = car_listings_collection.find(query or {})
        if sort:
            cursor = cursor.sort(sort)
        return list(cursor)
    
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        result = car_listings_collection.insert_one(data)
        return str(result.inserted_id)
    
    @staticmethod
    def update_one(query: Dict[str, Any], update: Dict[str, Any]):
        return car_listings_collection.update_one(query, {"$set": update})

