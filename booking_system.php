<?php
// Booking System Logic for Feed Hope App
// This file handles the booking process when delivery persons book food

include("connection.php");

// Handle food booking by delivery person
if(isset($_POST['book_food']) && isset($_POST['donation_id'])) {
    $donation_id = $_POST['donation_id'];
    $delivery_person_id = $_POST['delivery_person_id'] ?? '';
    $booking_notes = $_POST['booking_notes'] ?? '';
    
    if($delivery_person_id) {
        // Check if food is still available
        $check_query = "SELECT status FROM food_donations WHERE Fid = '$donation_id'";
        $check_result = mysqli_query($connection, $check_query);
        $food_data = mysqli_fetch_assoc($check_result);
        
        if($food_data && $food_data['status'] == 'available') {
            // Create booking record
            $booking_query = "INSERT INTO delivery_bookings 
                             (donation_id, delivery_person_id, booking_status, booking_notes) 
                             VALUES ('$donation_id', '$delivery_person_id', 'pending', '$booking_notes')";
            
            if(mysqli_query($connection, $booking_query)) {
                // Update food status to booking
                $update_query = "UPDATE food_donations SET 
                                status = 'booking',
                                delivery_by = '$delivery_person_id'
                                WHERE Fid = '$donation_id'";
                mysqli_query($connection, $update_query);
                
                // Add to history
                $delivery_query = "SELECT name FROM delivery_persons WHERE Did = '$delivery_person_id'";
                $delivery_result = mysqli_query($connection, $delivery_query);
                $delivery_data = mysqli_fetch_assoc($delivery_result);
                
                $history_query = "INSERT INTO food_history 
                                 (donation_id, status_from, status_to, changed_by_type, changed_by_id, changed_by_name, notes) 
                                 VALUES ('$donation_id', 'available', 'booking', 'delivery_person', '$delivery_person_id', '{$delivery_data['name']}', '$booking_notes')";
                mysqli_query($connection, $history_query);
                
                // Send notification to user and admin
                $donation_query = "SELECT email, name FROM food_donations WHERE Fid = '$donation_id'";
                $donation_result = mysqli_query($connection, $donation_query);
                $donation_data = mysqli_fetch_assoc($donation_result);
                
                $notification_query = "INSERT INTO notifications 
                                     (user_email, donation_id, type, message, status_from, status_to, action_by_type) 
                                     VALUES ('{$donation_data['email']}', '$donation_id', 'status_update', 
                                            'Your food donation \"{$donation_data['name']}\" has been booked by {$delivery_data['name']}!', 
                                            'available', 'booking', 'delivery_person')";
                mysqli_query($connection, $notification_query);
                
                echo '<script>alert("Food booked successfully! Waiting for your acceptance.");</script>';
            } else {
                echo '<script>alert("Failed to book food. Please try again.");</script>';
            }
        } else {
            echo '<script>alert("This food is no longer available for booking.");</script>';
        }
    }
}

// Function to get available food for booking
function getAvailableFood($delivery_person_city) {
    global $connection;
    
    $sql = "SELECT fd.*, 
            CASE WHEN db.booking_id IS NOT NULL THEN 'booked' ELSE 'available' END as booking_status
            FROM food_donations fd 
            LEFT JOIN delivery_bookings db ON fd.Fid = db.donation_id AND db.delivery_person_id = '$delivery_person_id'
            WHERE fd.status = 'available' AND fd.location = '$delivery_person_city'
            ORDER BY fd.date DESC";
    
    $result = mysqli_query($connection, $sql);
    return mysqli_fetch_all($result, MYSQLI_ASSOC);
}

// Function to get delivery person bookings
function getDeliveryPersonBookings($delivery_person_id) {
    global $connection;
    
    $sql = "SELECT fd.*, db.booking_id, db.booking_status, db.created_at as booking_created
            FROM food_donations fd 
            JOIN delivery_bookings db ON fd.Fid = db.donation_id
            WHERE db.delivery_person_id = '$delivery_person_id'
            ORDER BY db.created_at DESC";
    
    $result = mysqli_query($connection, $sql);
    return mysqli_fetch_all($result, MYSQLI_ASSOC);
}

// Function to get delivery history
function getDeliveryHistory($delivery_person_id) {
    global $connection;
    
    $sql = "SELECT fh.*, fd.food, fd.name as donor_name 
            FROM food_history fh 
            JOIN food_donations fd ON fh.donation_id = fd.Fid 
            WHERE fh.changed_by_id = '$delivery_person_id' AND fh.changed_by_type = 'delivery_person'
            ORDER BY fh.created_at DESC 
            LIMIT 20";
    
    $result = mysqli_query($connection, $sql);
    return mysqli_fetch_all($result, MYSQLI_ASSOC);
}
?>

