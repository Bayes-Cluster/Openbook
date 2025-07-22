#!/usr/bin/env python3
"""
Comprehensive test for memory-aware booking system workflow
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from services import BookingService
from schemas import BookingCreate
from database import get_db
from models import Resource, Booking
import uuid

def test_complete_memory_workflow():
    """Test complete memory-aware booking workflow"""
    print("Testing complete memory-aware booking workflow...")
    
    # Get database session
    db = next(get_db())
    service = BookingService(db)
    
    try:
        # Clean up any existing test bookings first
        print("🧹 Cleaning up any existing test bookings...")
        db.query(Booking).filter(Booking.user_id.like("test-user-%")).delete()
        db.commit()
        
        # Get test resource
        resource = db.query(Resource).filter(Resource.is_active == True).first()
        if not resource:
            print("❌ No active resources found for testing")
            return False
            
        print(f"📊 Testing with resource: {resource.name} ({resource.total_memory_gb}GB)")
        
        # Test user
        test_user_id = "test-user-" + str(uuid.uuid4())[:8]
        
        # Test time period
        start_time = datetime.utcnow() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=3)
        
        print(f"🕒 Test period: {start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}")
        
        # Scenario: Multiple users booking overlapping time slots
        print("\n📝 Scenario: Multiple users sharing resource memory")
        
        # User 1: Books 40% of memory
        user1_memory = int(resource.total_memory_gb * 0.4)
        booking1_data = BookingCreate(
            resource_id=resource.id,
            task_name="AI Training Job 1",
            estimated_memory_gb=user1_memory,
            start_time=start_time,
            end_time=end_time
        )
        
        print(f"👤 User 1 booking {user1_memory}GB...")
        booking1 = service.create_booking(booking1_data, test_user_id + "-1")
        print(f"   ✅ Booking 1 created: {booking1.id}")
        
        # User 2: Books 35% of memory (total 75%)
        user2_memory = int(resource.total_memory_gb * 0.35)
        booking2_data = BookingCreate(
            resource_id=resource.id,
            task_name="ML Model Training 2",
            estimated_memory_gb=user2_memory,
            start_time=start_time,
            end_time=end_time
        )
        
        print(f"👤 User 2 booking {user2_memory}GB...")
        booking2 = service.create_booking(booking2_data, test_user_id + "-2")
        print(f"   ✅ Booking 2 created: {booking2.id}")
        
        # User 3: Tries to book 35% of memory (would total 110%)
        user3_memory = int(resource.total_memory_gb * 0.35)
        booking3_data = BookingCreate(
            resource_id=resource.id,
            task_name="Deep Learning Experiment 3",
            estimated_memory_gb=user3_memory,
            start_time=start_time,
            end_time=end_time
        )
        
        print(f"👤 User 3 attempting to book {user3_memory}GB...")
        print(f"   Current usage: {user1_memory} + {user2_memory} = {user1_memory + user2_memory}GB")
        print(f"   Would total: {user1_memory + user2_memory + user3_memory}GB (exceeds {resource.total_memory_gb}GB)")
        
        try:
            booking3 = service.create_booking(booking3_data, test_user_id + "-3")
            print("   ❌ User 3 booking should have been denied!")
            return False
        except ValueError as e:
            print(f"   ✅ User 3 booking correctly denied: {e}")
        
        # User 3: Books smaller amount that fits
        user3_small_memory = resource.total_memory_gb - (user1_memory + user2_memory)
        if user3_small_memory > 0:
            booking3_small_data = BookingCreate(
                resource_id=resource.id,
                task_name="Small GPU Task 3",
                estimated_memory_gb=user3_small_memory,
                start_time=start_time,
                end_time=end_time
            )
            
            print(f"👤 User 3 booking remaining {user3_small_memory}GB...")
            booking3_small = service.create_booking(booking3_small_data, test_user_id + "-3")
            print(f"   ✅ Booking 3 created: {booking3_small.id}")
            
            # Verify resource is now fully utilized
            memory_check = service._check_memory_availability(
                resource.id,
                start_time,
                end_time,
                required_memory_gb=1  # Even 1GB should be denied
            )
            print(f"📊 Final memory state: {memory_check}")
            assert memory_check["can_book"] == False, "Resource should be fully utilized"
            print("   ✅ Resource fully utilized, new bookings correctly denied")
            
            # Cleanup
            db.query(Booking).filter(Booking.id == booking3_small.id).delete()
        
        # Test non-overlapping time period
        print("\n🕒 Testing non-overlapping time period...")
        later_start = end_time + timedelta(hours=1)
        later_end = later_start + timedelta(hours=2)
        
        booking4_data = BookingCreate(
            resource_id=resource.id,
            task_name="Full Resource Later",
            estimated_memory_gb=resource.total_memory_gb,  # Use full memory
            start_time=later_start,
            end_time=later_end
        )
        
        print(f"👤 User 4 booking full {resource.total_memory_gb}GB for later period...")
        booking4 = service.create_booking(booking4_data, test_user_id + "-4")
        print(f"   ✅ Full memory booking allowed for non-overlapping time: {booking4.id}")
        
        # Cleanup all test bookings
        print("\n🧹 Cleaning up test bookings...")
        db.query(Booking).filter(Booking.user_id.like(f"{test_user_id}%")).delete()
        db.commit()
        
        print("\n🎉 Complete memory workflow test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        # Cleanup on error
        try:
            db.query(Booking).filter(Booking.user_id.like(f"{test_user_id}%")).delete()
            db.commit()
        except:
            pass
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_complete_memory_workflow()
    sys.exit(0 if success else 1)
