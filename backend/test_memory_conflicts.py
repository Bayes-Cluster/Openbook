#!/usr/bin/env python3
"""
Test script for memory-aware booking conflicts
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

def test_memory_conflicts():
    """Test memory-aware conflict detection"""
    print("Testing memory-aware booking conflicts...")
    
    # Get database session
    db = next(get_db())
    service = BookingService(db)
    
    try:
        # Test scenario: Resource with 48GB memory
        # Create overlapping bookings that together don't exceed memory
        
        # Get a test resource (assuming one exists)
        resource = db.query(Resource).filter(Resource.is_active == True).first()
        if not resource:
            print("❌ No active resources found for testing")
            return False
            
        print(f"📊 Testing with resource: {resource.name} ({resource.total_memory_gb}GB)")
        
        # Test time period
        start_time = datetime.utcnow() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        # Test 1: Single booking within memory limits
        print("\n🧪 Test 1: Single booking within memory limits")
        memory_check1 = service._check_memory_availability(
            resource.id,
            start_time,
            end_time,
            required_memory_gb=20  # Less than total capacity
        )
        print(f"   Memory check result: {memory_check1}")
        assert memory_check1["can_book"] == True, "Should allow booking within memory limits"
        print("   ✅ Single booking allowed")
        
        # Test 2: Booking that would exceed memory
        print("\n🧪 Test 2: Booking exceeding total memory")
        memory_check2 = service._check_memory_availability(
            resource.id,
            start_time,
            end_time,
            required_memory_gb=resource.total_memory_gb + 10  # More than total capacity
        )
        print(f"   Memory check result: {memory_check2}")
        assert memory_check2["can_book"] == False, "Should deny booking exceeding total memory"
        print("   ✅ Excessive booking denied")
        
        # Test 3: Multiple overlapping bookings within memory limits
        print("\n🧪 Test 3: Multiple overlapping bookings within limits")
        
        # Create first test booking
        test_user_id = "test-user-" + str(uuid.uuid4())[:8]
        booking1_data = BookingCreate(
            resource_id=resource.id,
            task_name="Test Task 1",
            estimated_memory_gb=int(resource.total_memory_gb * 0.3),  # 30% of memory
            start_time=start_time,
            end_time=end_time
        )
        
        print(f"   Creating first booking: {booking1_data.estimated_memory_gb}GB")
        booking1 = service.create_booking(booking1_data, test_user_id)
        
        # Check if second booking can be added
        memory_check3 = service._check_memory_availability(
            resource.id,
            start_time,
            end_time,
            required_memory_gb=int(resource.total_memory_gb * 0.4)  # 40% of memory (total 70%)
        )
        print(f"   Memory check for second booking: {memory_check3}")
        assert memory_check3["can_book"] == True, "Should allow second booking within total limits"
        print("   ✅ Second overlapping booking allowed")
        
        # Test 4: Third booking that would exceed memory
        print("\n🧪 Test 4: Third booking exceeding combined memory limits")
        
        # Let's check what the current state looks like
        current_state = service._check_memory_availability(
            resource.id,
            start_time,
            end_time,
            required_memory_gb=0  # Just check current usage
        )
        print(f"   Current memory state: {current_state}")
        
        # Calculate what would definitely exceed: current usage + something that exceeds remaining
        remaining_memory = current_state['available_memory_gb']
        excessive_memory = remaining_memory + 5  # 5GB more than available
        
        print(f"   Attempting to book additional {excessive_memory}GB")
        print(f"   This would total: {current_state['used_memory_gb']} + {excessive_memory} = {current_state['used_memory_gb'] + excessive_memory}GB")
        print(f"   Resource capacity: {resource.total_memory_gb}GB")
        
        memory_check4 = service._check_memory_availability(
            resource.id,
            start_time,
            end_time,
            required_memory_gb=excessive_memory
        )
        print(f"   Memory check for third booking: {memory_check4}")
        
        assert memory_check4["can_book"] == False, "Should deny third booking exceeding combined limits"
        print("   ✅ Excessive third booking denied")
        
        # Test 5: Non-overlapping booking should be allowed regardless
        print("\n🧪 Test 5: Non-overlapping booking")
        non_overlap_start = end_time + timedelta(hours=1)
        non_overlap_end = non_overlap_start + timedelta(hours=2)
        
        memory_check5 = service._check_memory_availability(
            resource.id,
            non_overlap_start,
            non_overlap_end,
            required_memory_gb=resource.total_memory_gb  # Full memory but no overlap
        )
        print(f"   Memory check for non-overlapping booking: {memory_check5}")
        assert memory_check5["can_book"] == True, "Should allow non-overlapping booking even with full memory"
        print("   ✅ Non-overlapping booking allowed")
        
        # Cleanup test booking
        print("\n🧹 Cleaning up test bookings...")
        db.query(Booking).filter(Booking.id == booking1.id).delete()
        db.commit()
        
        print("\n🎉 All memory conflict tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        # Cleanup on error
        try:
            db.query(Booking).filter(Booking.user_id.like("test-user-%")).delete()
            db.commit()
        except:
            pass
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_memory_conflicts()
    sys.exit(0 if success else 1)
