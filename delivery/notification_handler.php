<?php
session_start();
include '../connection.php';

$connection = mysqli_connect("localhost","root","");
mysqli_select_db($connection,'demo');

// Check for new notifications for the delivery person
$delivery_id = isset($_SESSION['Did']) ? $_SESSION['Did'] : 0;
$city = isset($_SESSION['city']) ? $_SESSION['city'] : '';

// Get new orders in their area
$sql = "SELECT COUNT(*) as new_count FROM food_donations 
        WHERE status = 'available' 
        AND location = '$city'
        AND date > DATE_SUB(NOW(), INTERVAL 10 SECOND)";

$result = mysqli_query($connection, $sql);
$data = mysqli_fetch_assoc($result);

header('Content-Type: application/json');
echo json_encode([
    'hasNew' => $data['new_count'] > 0,
    'count' => $data['new_count'],
    'message' => $data['new_count'] > 0 ? 'New order available!' : ''
]);
?>

