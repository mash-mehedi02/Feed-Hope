<?php
// Notification System for Feed Hope App
// This file handles real-time notifications

include("connection.php");

// Function to send notification
function sendNotification($user_email, $admin_id, $delivery_person_id, $donation_id, $type, $message) {
    global $connection;
    
    $query = "INSERT INTO notifications (user_email, admin_id, delivery_person_id, donation_id, type, message) 
              VALUES ('$user_email', '$admin_id', '$delivery_person_id', '$donation_id', '$type', '$message')";
    
    return mysqli_query($connection, $query);
}

// Function to get notifications for a user
function getNotifications($user_email, $limit = 10) {
    global $connection;
    
    $query = "SELECT * FROM notifications 
              WHERE user_email = '$user_email' 
              ORDER BY created_at DESC 
              LIMIT $limit";
    
    $result = mysqli_query($connection, $query);
    return mysqli_fetch_all($result, MYSQLI_ASSOC);
}

// Function to get notifications for admin
function getAdminNotifications($admin_id, $limit = 10) {
    global $connection;
    
    $query = "SELECT * FROM notifications 
              WHERE admin_id = '$admin_id' 
              ORDER BY created_at DESC 
              LIMIT $limit";
    
    $result = mysqli_query($connection, $query);
    return mysqli_fetch_all($result, MYSQLI_ASSOC);
}

// Function to mark notification as read
function markNotificationAsRead($notification_id) {
    global $connection;
    
    $query = "UPDATE notifications SET is_read = 1 WHERE id = '$notification_id'";
    return mysqli_query($connection, $query);
}

// Function to get unread notification count
function getUnreadCount($user_email) {
    global $connection;
    
    $query = "SELECT COUNT(*) as count FROM notifications 
              WHERE user_email = '$user_email' AND is_read = 0";
    
    $result = mysqli_query($connection, $query);
    $row = mysqli_fetch_assoc($result);
    return $row['count'];
}

// AJAX endpoint for getting notifications
if(isset($_GET['action']) && $_GET['action'] == 'get_notifications') {
    $user_email = $_GET['user_email'] ?? '';
    $notifications = getNotifications($user_email);
    
    header('Content-Type: application/json');
    echo json_encode($notifications);
    exit;
}

// AJAX endpoint for marking notification as read
if(isset($_POST['action']) && $_POST['action'] == 'mark_read') {
    $notification_id = $_POST['notification_id'] ?? '';
    $result = markNotificationAsRead($notification_id);
    
    header('Content-Type: application/json');
    echo json_encode(['success' => $result]);
    exit;
}
?>








