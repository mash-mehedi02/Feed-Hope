<?php
// Simple Image Upload Test for Feed Hope App
// This page tests image upload functionality without the full donation form

$message = '';
$error = '';

if ($_POST && isset($_FILES['test_image'])) {
    // Create upload directories if they don't exist
    if (!file_exists('uploads/food_images')) {
        mkdir('uploads/food_images', 0777, true);
    }
    if (!file_exists('uploads/food_images/thumbs')) {
        mkdir('uploads/food_images/thumbs', 0777, true);
    }
    
    $file = $_FILES['test_image'];
    
    if ($file['error'] == 0) {
        $upload_dir = 'uploads/food_images/';
        $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed_extensions = array('jpg', 'jpeg', 'png', 'gif');
        
        if (in_array($file_extension, $allowed_extensions)) {
            $new_filename = 'test_' . time() . '.' . $file_extension;
            $upload_path = $upload_dir . $new_filename;
            
            if (move_uploaded_file($file['tmp_name'], $upload_path)) {
                $message = "✅ Image uploaded successfully!";
                
                // Test thumbnail creation
                if (extension_loaded('gd')) {
                    // Include the createThumbnail function from fooddonateform.php
                    function createThumbnail($source, $destination, $width, $height) {
                        if (!extension_loaded('gd')) {
                            return copy($source, $destination);
                        }
                        
                        $image_info = getimagesize($source);
                        if (!$image_info) {
                            return false;
                        }
                        
                        $image_type = $image_info[2];
                        
                        switch($image_type) {
                            case IMAGETYPE_JPEG:
                                if (!function_exists('imagecreatefromjpeg')) {
                                    return copy($source, $destination);
                                }
                                $source_image = imagecreatefromjpeg($source);
                                break;
                            case IMAGETYPE_PNG:
                                if (!function_exists('imagecreatefrompng')) {
                                    return copy($source, $destination);
                                }
                                $source_image = imagecreatefrompng($source);
                                break;
                            case IMAGETYPE_GIF:
                                if (!function_exists('imagecreatefromgif')) {
                                    return copy($source, $destination);
                                }
                                $source_image = imagecreatefromgif($source);
                                break;
                            default:
                                return copy($source, $destination);
                        }
                        
                        if (!$source_image) {
                            return copy($source, $destination);
                        }
                        
                        $thumbnail = imagecreatetruecolor($width, $height);
                        if (!$thumbnail) {
                            imagedestroy($source_image);
                            return copy($source, $destination);
                        }
                        
                        if ($image_type == IMAGETYPE_PNG || $image_type == IMAGETYPE_GIF) {
                            imagealphablending($thumbnail, false);
                            imagesavealpha($thumbnail, true);
                            $transparent = imagecolorallocatealpha($thumbnail, 255, 255, 255, 127);
                            imagefilledrectangle($thumbnail, 0, 0, $width, $height, $transparent);
                        }
                        
                        imagecopyresampled($thumbnail, $source_image, 0, 0, 0, 0, $width, $height, $image_info[0], $image_info[1]);
                        
                        $result = false;
                        switch($image_type) {
                            case IMAGETYPE_JPEG:
                                if (function_exists('imagejpeg')) {
                                    $result = imagejpeg($thumbnail, $destination, 85);
                                }
                                break;
                            case IMAGETYPE_PNG:
                                if (function_exists('imagepng')) {
                                    $result = imagepng($thumbnail, $destination, 8);
                                }
                                break;
                            case IMAGETYPE_GIF:
                                if (function_exists('imagegif')) {
                                    $result = imagegif($thumbnail, $destination);
                                }
                                break;
                        }
                        
                        imagedestroy($source_image);
                        imagedestroy($thumbnail);
                        
                        if (!$result) {
                            return copy($source, $destination);
                        }
                        
                        return true;
                    }
                    
                    $thumbnail_path = 'uploads/food_images/thumbs/' . $new_filename;
                    if (createThumbnail($upload_path, $thumbnail_path, 300, 300)) {
                        $message .= " ✅ Thumbnail created successfully!";
                    } else {
                        $message .= " ⚠️ Thumbnail creation failed, but original image was saved.";
                    }
                } else {
                    $message .= " ⚠️ GD extension not available - no thumbnail created.";
                }
                
                $message .= "<br><br><strong>Uploaded file:</strong> " . $new_filename;
                $message .= "<br><strong>File size:</strong> " . round($file['size'] / 1024, 2) . " KB";
                
            } else {
                $error = "❌ Failed to move uploaded file.";
            }
        } else {
            $error = "❌ Invalid file type. Please upload JPG, PNG, or GIF images only.";
        }
    } else {
        $error = "❌ File upload error: " . $file['error'];
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feed Hope - Image Upload Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 {
            color: #06C167;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input[type="file"] {
            width: 100%;
            padding: 10px;
            border: 2px dashed #06C167;
            border-radius: 5px;
            background: #f9f9f9;
        }
        button {
            background: linear-gradient(135deg, #06C167, #05a854);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        .message {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
            margin-bottom: 20px;
        }
        .links {
            text-align: center;
            margin-top: 30px;
        }
        .links a {
            display: inline-block;
            margin: 0 10px;
            padding: 10px 20px;
            background: #06C167;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.2s;
        }
        .links a:hover {
            background: #05a854;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖼️ Image Upload Test</h1>
        
        <div class="info">
            <strong>GD Extension Status:</strong> 
            <?php if (extension_loaded('gd')): ?>
                <span style="color: green;">✅ Enabled</span> - Thumbnails will be created
            <?php else: ?>
                <span style="color: red;">❌ Disabled</span> - Only original images will be saved
            <?php endif; ?>
        </div>
        
        <?php if ($message): ?>
            <div class="message success">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="message error">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>
        
        <form method="post" enctype="multipart/form-data">
            <div class="form-group">
                <label for="test_image">Select an image to upload:</label>
                <input type="file" id="test_image" name="test_image" accept="image/*" required>
            </div>
            
            <button type="submit">Upload Test Image</button>
        </form>
        
        <div class="links">
            <a href="php_check.php">Check PHP Configuration</a>
            <a href="fooddonateform.php">Food Donation Form</a>
            <a href="food_newsfeed.php">Food Newsfeed</a>
        </div>
    </div>
</body>
</html>



