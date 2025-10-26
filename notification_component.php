<?php
// Notification Display Component
// Include this in your pages to show notifications

include("notifications.php");

$user_email = isset($_SESSION['email']) ? $_SESSION['email'] : '';
$notifications = getNotifications($user_email, 5);
$unread_count = getUnreadCount($user_email);
?>

<style>
.notification-bell {
    position: relative;
    display: inline-block;
    cursor: pointer;
}

.notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ef4444;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.notification-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    min-width: 300px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
}

.notification-dropdown.show {
    display: block;
}

.notification-header {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    color: #374151;
}

.notification-item {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background-color 0.2s;
}

.notification-item:hover {
    background-color: #f9fafb;
}

.notification-item.unread {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
}

.notification-message {
    font-size: 0.9rem;
    color: #374151;
    margin-bottom: 0.5rem;
}

.notification-time {
    font-size: 0.75rem;
    color: #6b7280;
}

.notification-empty {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
}

.notification-footer {
    padding: 1rem;
    text-align: center;
    border-top: 1px solid #e5e7eb;
}

.notification-footer a {
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.9rem;
}

.notification-footer a:hover {
    text-decoration: underline;
}
</style>

<div class="notification-bell" id="notificationBell">
    <i class="fas fa-bell" style="font-size: 1.2rem; color: #6b7280;"></i>
    <?php if($unread_count > 0): ?>
        <span class="notification-badge"><?php echo $unread_count; ?></span>
    <?php endif; ?>
    
    <div class="notification-dropdown" id="notificationDropdown">
        <div class="notification-header">
            <i class="fas fa-bell"></i> Notifications
        </div>
        
        <?php if(empty($notifications)): ?>
            <div class="notification-empty">
                <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 1rem; color: #d1d5db;"></i>
                <p>No notifications yet</p>
            </div>
        <?php else: ?>
            <?php foreach($notifications as $notification): ?>
                <div class="notification-item <?php echo $notification['is_read'] ? '' : 'unread'; ?>" 
                     data-id="<?php echo $notification['id']; ?>">
                    <div class="notification-message">
                        <?php echo htmlspecialchars($notification['message']); ?>
                    </div>
                    <div class="notification-time">
                        <?php echo date('M j, Y g:i A', strtotime($notification['created_at'])); ?>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
        
        <div class="notification-footer">
            <a href="notifications.php">View All Notifications</a>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const bell = document.getElementById('notificationBell');
    const dropdown = document.getElementById('notificationDropdown');
    
    // Toggle dropdown
    bell.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!bell.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Mark notification as read when clicked
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const notificationId = this.dataset.id;
            
            // Mark as read via AJAX
            fetch('notifications.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'action=mark_read&notification_id=' + notificationId
            });
            
            // Update UI
            this.classList.remove('unread');
            
            // Update badge count
            const badge = document.querySelector('.notification-badge');
            if (badge) {
                const currentCount = parseInt(badge.textContent);
                if (currentCount > 1) {
                    badge.textContent = currentCount - 1;
                } else {
                    badge.remove();
                }
            }
        });
    });
    
    // Auto-refresh notifications every 30 seconds
    setInterval(function() {
        fetch('notifications.php?action=get_notifications&user_email=<?php echo $user_email; ?>')
            .then(response => response.json())
            .then(data => {
                // Update notification count if needed
                // This is a simple implementation - you might want to update the entire dropdown
            });
    }, 30000);
});
</script>


