<?php
session_start();
include '../connection.php';

$connection = mysqli_connect("localhost","root","");
mysqli_select_db($connection,'demo');

$delivery_id = isset($_GET['delivery_id']) ? intval($_GET['delivery_id']) : 0;
$city = isset($_SESSION['city']) ? $_SESSION['city'] : '';

// Check for new available orders
$sql = "SELECT COUNT(*) as new_count FROM food_donations 
        WHERE status = 'available' 
        AND (assigned_to IS NULL OR assigned_to = '') 
        AND location = '$city'
        AND date > DATE_SUB(NOW(), INTERVAL 5 MINUTE)";

$result = mysqli_query($connection, $sql);
$data = mysqli_fetch_assoc($result);

header('Content-Type: application/json');
echo json_encode(['hasNew' => $data['new_count'] > 0]);
?>

