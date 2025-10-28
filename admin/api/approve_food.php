<?php
session_start();
header('Content-Type: application/json');

// Require admin session
if (!isset($_SESSION['Aid'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

require_once '../../connection.php';

// Ensure status column supports required values (safe no-op if already present)
@mysqli_query($connection, "ALTER TABLE food_donations 
    MODIFY COLUMN status ENUM('food_approval','pending','available','assigned','ongoing','delivered','completed','rejected') DEFAULT 'food_approval'");

// Ensure admin_approved_by/admin_approved_at columns exist
$__c1 = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'admin_approved_by'");
if ($__c1 && mysqli_num_rows($__c1) == 0) {
    @mysqli_query($connection, "ALTER TABLE food_donations ADD COLUMN admin_approved_by INT(11) DEFAULT NULL");
}
$__c2 = mysqli_query($connection, "SHOW COLUMNS FROM food_donations LIKE 'admin_approved_at'");
if ($__c2 && mysqli_num_rows($__c2) == 0) {
    @mysqli_query($connection, "ALTER TABLE food_donations ADD COLUMN admin_approved_at DATETIME DEFAULT NULL");
}

// Validate input
$donationId = isset($_POST['donation_id']) ? (int)$_POST['donation_id'] : 0;
if ($donationId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid donation_id']);
    exit;
}

$adminId = (int)$_SESSION['Aid'];

// Approve only if currently waiting approval (food_approval or NULL/legacy)
$stmt = mysqli_prepare(
    $connection,
    "UPDATE food_donations 
     SET status='available', admin_approved_by=?, admin_approved_at=NOW()
     WHERE Fid=? AND (status='food_approval' OR status IS NULL OR status='pending')"
);
mysqli_stmt_bind_param($stmt, 'ii', $adminId, $donationId);
mysqli_stmt_execute($stmt);

if (mysqli_stmt_errno($stmt)) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>mysqli_stmt_error($stmt)]);
} elseif (mysqli_stmt_affected_rows($stmt) > 0) {
    echo json_encode(['ok' => true, 'status' => 'available', 'donation_id' => $donationId]);
} else {
    echo json_encode(['ok' => false, 'error' => 'Already processed or not found']);
}
?>


