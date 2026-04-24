---
lang: vi
title: "Dolibarr ERP CRM – Giải Pháp Quản Lý Kinh Doanh Mã Nguồn Mở Toàn Diện"
description: "Khám phá Dolibarr, hệ thống ERP và CRM mã nguồn mở dành cho doanh nghiệp ở mọi quy mô. Tìm hiểu các tính năng, ưu & nhược điểm và cách tự lưu trữ."
published: 2025-08-13
tags: ['open-source', 'self-host', 'erp', 'crm', 'php', 'business-management']
category: Self-hosted
author: minhpt
---

# Dolibarr/dolibarr - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub  
- **URL:** [https://github.com/Dolibarr/dolibarr](https://github.com/Dolibarr/dolibarr)  
- **Sao:** 5951 (tính đến tháng 8/2025)  

## 2. Mô Tả Dự Án  
**Dolibarr ERP CRM** là một ứng dụng web mã nguồn mở hiện đại được thiết kế để giúp các doanh nghiệp, freelancer và tổ chức quản lý hoạt động của họ một cách hiệu quả. Được viết bằng PHP, nó tích hợp các chức năng **Hoạch định Nguồn lực Doanh nghiệp (ERP)** và **Quản lý Quan hệ Khách hàng (CRM)** vào một nền tảng duy nhất.  

Các khía cạnh chính bao gồm:  
✔ **Thiết kế mô-đun** – Chỉ cài đặt các tính năng bạn cần.  
✔ **Tự lưu trữ** – Toàn quyền kiểm soát dữ liệu của bạn.  
✔ **Hỗ trợ nhiều người dùng & nhiều công ty** – Lý tưởng cho các doanh nghiệp đang phát triển.  

## 3. Phần Mềm Này Thay Thế Những Gì?  
Dolibarr phục vụ như một giải pháp thay thế miễn phí, mã nguồn mở cho các giải pháp thương mại như:  
- **SAP Business One** (ERP)  
- **Salesforce CRM** (CRM)  
- **Odoo** (ERP/CRM)  
- **Microsoft Dynamics 365**  

Đối với doanh nghiệp nhỏ, nó có thể thay thế các công cụ độc lập như **QuickBooks (kế toán)**, **Zoho CRM** hoặc **HubSpot**.

## 4. Chức Năng Chính  
Cấu trúc mô-đun của Dolibarr cho phép doanh nghiệp chỉ bật các tính năng họ cần:  

### **Tính năng ERP**  
- **Hóa đơn & Thanh toán** – Tạo báo giá, hóa đơn và theo dõi thanh toán.  
- **Quản lý Hàng tồn kho & Kho** – Quản lý sản phẩm, nhà kho và đơn hàng.  
- **Kế toán** – Kế toán kép với xuất sang phần mềm kế toán.  
- **Quản lý Nhân sự & Dự án** – Theo dõi nhân viên, bảng chấm công và dự án.  

### **Tính năng CRM**  
- **Quản lý Liên hệ & Khách hàng tiềm năng** – Lưu trữ thông tin khách hàng và theo dõi tương tác.  
- **Chiến dịch Email** – Gửi email hàng loạt và bản tin.  
- **Lên lịch Sự kiện** – Quản lý cuộc họp và tác vụ qua lịch tích hợp.  

### **Mô-đun Bổ sung**  
- **Điểm Bán hàng (POS)** – Cho doanh nghiệp bán lẻ.  
- **Quyên góp & Thành viên** – Lý tưởng cho tổ chức phi lợi nhuận.  
- **Tích hợp Thương mại điện tử** – Kết nối với các nền tảng như WooCommerce.  

## 5. Ưu và Nhược Điểm  

### **Ưu điểm ✅**  
✔ **Mã nguồn Mở & Miễn phí** – Không có chi phí cấp phép.  
✔ **Có thể Tùy chỉnh Cao** – Thêm hoặc xóa mô-đun khi cần.  
✔ **Tự lưu trữ** – Đảm bảo quyền riêng tư và bảo mật dữ liệu.  
✔ **Đa ngôn ngữ & Đa tiền tệ** – Hỗ trợ doanh nghiệp toàn cầu.  

### **Nhược điểm ❌**  
❌ **Đường cong Học tập Dốc** – Cần thời gian để làm chủ tất cả các tính năng.  
❌ **Ứng dụng Di động Hạn chế** – Giao diện dựa trên web có thể không thân thiện với di động.  
❌ **Chỉ Hỗ trợ Cộng đồng** – Không có hỗ trợ doanh nghiệp chuyên dụng (có gói trả phí để được hỗ trợ).  

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ trên Ubuntu)  

### **Yêu cầu**  
- **Ubuntu 22.04 LTS** (hoặc mới hơn)  
- **LAMP Stack** (Linux, Apache, MySQL, PHP)  
- **Composer** (Trình quản lý phụ thuộc PHP)  

### **Thiết lập Từng bước**  

#### **1. Cài đặt LAMP Stack**  
```bash
sudo apt update && sudo apt upgrade -y  
sudo apt install apache2 mysql-server php libapache2-mod-php php-mysql php-curl php-gd php-zip php-xml -y  
```

#### **2. Cấu hình MySQL**  
Bảo mật MySQL và tạo cơ sở dữ liệu:  
```bash
sudo mysql_secure_installation  
sudo mysql -u root -p  
CREATE DATABASE dolibarr_db;  
CREATE USER 'doliuser'@'localhost' IDENTIFIED BY 'YourSecurePassword';  
GRANT ALL PRIVILEGES ON dolibarr_db.* TO 'doliuser'@'localhost';  
FLUSH PRIVILEGES;  
EXIT;  
```

#### **3. Cài đặt Dolibarr**  
```bash
cd /var/www/html  
sudo git clone https://github.com/Dolibarr/dolibarr.git  
cd dolibarr  
sudo chown -R www-data:www-data /var/www/html/dolibarr  
```

#### **4. Cấu hình Apache**  
Tạo một virtual host:  
```bash
sudo nano /etc/apache2/sites-available/dolibarr.conf  
```
Dán:  
```apache
<VirtualHost *:80>
    ServerAdmin admin@yourdomain.com  
    DocumentRoot /var/www/html/dolibarr/htdocs  
    ServerName yourdomain.com  
    <Directory /var/www/html/dolibarr/htdocs>  
        Options FollowSymLinks  
        AllowOverride All  
        Require all granted  
    </Directory>  
</VirtualHost>  
```
Kích hoạt site:  
```bash
sudo a2ensite dolibarr.conf  
sudo a2enmod rewrite  
sudo systemctl restart apache2  
```

#### **5. Hoàn tất Thiết lập qua Web Installer**  
- Truy cập `http://yourdomain.com/install` trong trình duyệt.  
- Làm theo hướng dẫn trên màn hình để cấu hình Dolibarr.  
- Nhập thông tin đăng nhập MySQL khi được yêu cầu.  

### **Cài đặt Tùy chọn: Docker**  
Đối với người dùng Docker:  
```bash
docker run -d --name dolibarr -p 80:80 -v dolibarr_data:/var/www/html/dolibarr -e PHP_TIMEZONE="UTC" dolibarr/dolibarr:latest  
```

### **Lưu ý Cuối cùng**  
✔ Bảo mật cài đặt của bạn với **HTTPS** (sử dụng Let's Encrypt).  
✔ Thường xuyên sao lưu thư mục `/var/www/html/dolibarr` và cơ sở dữ liệu.  

Dolibarr là một giải pháp mạnh mẽ, tiết kiệm chi phí cho các doanh nghiệp muốn hợp lý hóa hoạt động mà không bị khóa nhà cung cấp. Hãy dùng thử ngay hôm nay!  
```