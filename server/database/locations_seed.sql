-- =====================================================
-- Bangladesh Locations Data (Divisions → Districts → Areas)
-- FeedHope Location System
-- =====================================================

USE `feedhope`;

-- Insert Divisions, Districts, and Areas for Bangladesh
-- Focus on Dhaka Division with detailed areas

INSERT INTO `locations` (`division`, `district`, `area`, `latitude`, `longitude`) VALUES
-- Dhaka Division - Dhaka District
('Dhaka', 'Dhaka', 'Mirpur 1', 23.8075, 90.3586),
('Dhaka', 'Dhaka', 'Mirpur 2', 23.8068, 90.3650),
('Dhaka', 'Dhaka', 'Mirpur 6', 23.8033, 90.3694),
('Dhaka', 'Dhaka', 'Mirpur 10', 23.7969, 90.3650),
('Dhaka', 'Dhaka', 'Mirpur 11', 23.7933, 90.3617),
('Dhaka', 'Dhaka', 'Mirpur 12', 23.7897, 90.3583),
('Dhaka', 'Dhaka', 'Dhanmondi', 23.7465, 90.3708),
('Dhaka', 'Dhaka', 'Gulshan 1', 23.7915, 90.4147),
('Dhaka', 'Dhaka', 'Gulshan 2', 23.7950, 90.4100),
('Dhaka', 'Dhaka', 'Banani', 23.7942, 90.4072),
('Dhaka', 'Dhaka', 'Uttara Sector 1', 23.8691, 90.3969),
('Dhaka', 'Dhaka', 'Uttara Sector 3', 23.8639, 90.3944),
('Dhaka', 'Dhaka', 'Uttara Sector 7', 23.8547, 90.3914),
('Dhaka', 'Dhaka', 'Uttara Sector 11', 23.8444, 90.3878),
('Dhaka', 'Dhaka', 'Agargaon', 23.7806, 90.3797),
('Dhaka', 'Dhaka', 'Farmgate', 23.7595, 90.3897),
('Dhaka', 'Dhaka', 'Mohammadpur', 23.7642, 90.3583),
('Dhaka', 'Dhaka', 'Old Dhaka', 23.7104, 90.4074),
('Dhaka', 'Dhaka', 'Lalbagh', 23.7167, 90.4000),
('Dhaka', 'Dhaka', 'Wari', 23.7200, 90.4083),
('Dhaka', 'Dhaka', 'Motijheel', 23.7347, 90.4147),
('Dhaka', 'Dhaka', 'Ramna', 23.7361, 90.3944),
('Dhaka', 'Dhaka', 'Tejgaon', 23.7672, 90.3972),
('Dhaka', 'Dhaka', 'Badda', 23.7861, 90.4278),
('Dhaka', 'Dhaka', 'Khilgaon', 23.7542, 90.4306),
('Dhaka', 'Dhaka', 'Shyamoli', 23.7764, 90.3556),
('Dhaka', 'Dhaka', 'Kotwali', 23.7125, 90.4083),

-- Dhaka Division - Gazipur District
('Dhaka', 'Gazipur', 'Gazipur City', 23.9983, 90.4206),
('Dhaka', 'Gazipur', 'Kaliakair', 24.0889, 90.3833),
('Dhaka', 'Gazipur', 'Kapasia', 23.9819, 90.5764),

-- Dhaka Division - Narayanganj District
('Dhaka', 'Narayanganj', 'Narayanganj City', 23.6222, 90.4997),
('Dhaka', 'Narayanganj', 'Rupganj', 23.7678, 90.5411),
('Dhaka', 'Narayanganj', 'Sonargaon', 23.6583, 90.5917),

-- Chittagong Division - Chittagong District
('Chittagong', 'Chittagong', 'Agrabad', 22.3167, 91.8167),
('Chittagong', 'Chittagong', 'Pahartali', 22.3667, 91.8000),
('Chittagong', 'Chittagong', 'Halishahar', 22.3333, 91.8333),
('Chittagong', 'Chittagong', 'Kotwali', 22.3500, 91.8333),
('Chittagong', 'Chittagong', 'Double Mooring', 22.3200, 91.8167),

-- Sylhet Division - Sylhet District
('Sylhet', 'Sylhet', 'Sylhet City', 24.8949, 91.8687),
('Sylhet', 'Sylhet', 'Balaganj', 24.6867, 91.8783),
('Sylhet', 'Sylhet', 'Beanibazar', 24.6667, 91.9333),

-- Rajshahi Division - Rajshahi District
('Rajshahi', 'Rajshahi', 'Rajshahi City', 24.3745, 88.6042),
('Rajshahi', 'Rajshahi', 'Puthia', 24.4000, 88.7500),
('Rajshahi', 'Rajshahi', 'Bagha', 24.3167, 88.4833),

-- Khulna Division - Khulna District
('Khulna', 'Khulna', 'Khulna City', 22.8088, 89.2464),
('Khulna', 'Khulna', 'Dumuria', 22.8000, 89.4000),
('Khulna', 'Khulna', 'Batiaghata', 22.7833, 89.2833),

-- Barisal Division - Barisal District
('Barisal', 'Barisal', 'Barisal City', 22.7010, 90.3535),
('Barisal', 'Barisal', 'Mehendiganj', 22.9167, 90.5333),
('Barisal', 'Barisal', 'Muladi', 22.8333, 90.4000),

-- Rangpur Division - Rangpur District
('Rangpur', 'Rangpur', 'Rangpur City', 25.7439, 89.2752),
('Rangpur', 'Rangpur', 'Mithapukur', 25.7500, 89.1667),
('Rangpur', 'Rangpur', 'Pirgacha', 25.8833, 89.2500),

-- Mymensingh Division - Mymensingh District
('Mymensingh', 'Mymensingh', 'Mymensingh City', 24.7471, 90.4203),
('Mymensingh', 'Mymensingh', 'Muktagachha', 24.7167, 90.2167),
('Mymensingh', 'Mymensingh', 'Fulbaria', 24.6667, 90.4167);

