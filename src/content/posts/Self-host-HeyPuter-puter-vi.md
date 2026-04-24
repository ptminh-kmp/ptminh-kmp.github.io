---
lang: vi
title: "HeyPuter/puter: Hệ Điều Hành Internet Mã Nguồn Mở Tối Ưu Cho Tự Lưu Trữ"
description: "Khám phá HeyPuter/puter, một Hệ điều hành Internet miễn phí, mã nguồn mở với hơn 35K sao GitHub. Tìm hiểu các tính năng, ưu nhược điểm và cách tự lưu trữ trên Ubuntu."
published: 2025-09-04
tags: ['open-source', 'self-host', 'web-os', 'javascript', 'docker', 'cloud-computing']
category: Self-hosted
author: minhpt
---

# HeyPuter/puter - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub

- **URL:** [https://github.com/HeyPuter/puter](https://github.com/HeyPuter/puter)
- **Sao:** 35629

## 2. Mô Tả Dự Án

HeyPuter/puter là một dự án mã nguồn mở đầy tham vọng tự xưng là "Hệ Điều Hành Internet." Nó cung cấp một môi trường hệ điều hành miễn phí, có thể tự lưu trữ, chạy trực tiếp trong trình duyệt web của bạn. Bằng cách kết hợp sự quen thuộc của giao diện máy tính truyền thống với các công nghệ web hiện đại, Puter cung cấp một nền tảng linh hoạt cho việc triển khai ứng dụng, quản lý tệp và làm việc cộng tác—tất cả đều có thể truy cập từ bất kỳ thiết bị nào có trình duyệt. Kiến trúc của nó nhấn mạnh quyền riêng tư, khả năng kiểm soát của người dùng và khả năng mở rộng, khiến nó trở thành một lựa chọn thay thế hấp dẫn cho các giải pháp đám mây độc quyền.

## 3. Phần Mềm Này Thay Thế Những Gì?

Puter có thể thay thế cho một số loại phần mềm, bao gồm:

- **Nền tảng Lưu trữ Đám mây & Cộng tác:** Google Drive, Dropbox và OneDrive.
- **Giải pháp Máy tính Từ xa & VDI:** Windows Remote Desktop, Citrix Virtual Apps.
- **IDE & Môi trường Phát triển Dựa trên Web:** CodeSandbox, Glitch và Replit.
- **Bộ Ứng dụng Văn phòng:** Google Workspace và Microsoft 365 cho việc chỉnh sửa tài liệu và cộng tác cơ bản.

## 4. Chức Năng Chính

Chức năng cốt lõi của Puter xoay quanh việc cung cấp trải nghiệm hệ điều hành toàn diện dựa trên trình duyệt. Các tính năng chính bao gồm:

- **Quản lý Tệp:** Trình khám phá tệp đồ họa hỗ trợ tải lên, tải xuống và sắp xếp.
- **Hệ sinh thái Ứng dụng:** Các ứng dụng tích hợp sẵn như trình soạn thảo văn bản, trình xem ảnh và terminal, với hỗ trợ tích hợp ứng dụng bên thứ ba.
- **Đa Nhiệm:** Quản lý cửa sổ, cho phép người dùng chạy nhiều ứng dụng cùng lúc.
- **Tự Lưu trữ & Tùy chỉnh:** Toàn quyền kiểm soát việc triển khai, lưu trữ dữ liệu và sửa đổi giao diện.
- **Công cụ Cộng tác:** Chỉnh sửa tài liệu thời gian thực và khả năng chia sẻ tệp.
- **Khả năng Mở rộng:** API và SDK cho các nhà phát triển để xây dựng và tích hợp các ứng dụng tùy chỉnh.

## 5. Ưu và Nhược Điểm

**Ưu điểm:**

- **Mã nguồn mở & Miễn phí:** Không có chi phí bản quyền, với toàn quyền truy cập mã nguồn.
- **Có thể Tự lưu trữ:** Người dùng giữ toàn quyền kiểm soát dữ liệu và cơ sở hạ tầng.
- **Đa nền tảng:** Chạy trên bất kỳ thiết bị nào có trình duyệt web hiện đại.
- **Có thể Mở rộng:** Các nhà phát triển có thể tạo và tích hợp các ứng dụng tùy chỉnh một cách dễ dàng.
- **Cộng đồng Tích cực:** Sự hiện diện mạnh mẽ trên GitHub với các bản cập nhật và đóng góp thường xuyên.

**Nhược điểm:**

- **Độ phức tạp khi Tự lưu trữ:** Yêu cầu kiến thức kỹ thuật để triển khai và bảo trì.
- **Hiệu suất Ứng dụng Gốc Hạn chế:** Các ứng dụng nặng có thể không hoạt động tốt như phần mềm máy tính gốc.
- **Giai đoạn Đầu:** Một số tính năng có thể vẫn đang được phát triển hoặc thiếu độ trau chuốt so với các lựa chọn thương mại.
- **Phụ thuộc vào Trình duyệt:** Hiệu suất và khả năng tương thích có thể khác nhau giữa các trình duyệt khác nhau.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)

Hướng dẫn này sẽ hướng dẫn bạn triển khai Puter trên máy chủ Ubuntu 22.04 LTS. Quy trình sử dụng Docker để đơn giản hóa việc quản lý phụ thuộc.

**Yêu cầu:**

- Máy chủ Ubuntu 22.04 LTS với người dùng sudo không phải root.
- Docker và Docker Compose đã được cài đặt.
- Có kiến thức cơ bản về dòng lệnh.

**Bước 1: Cập nhật Hệ thống và Cài đặt Docker**

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker --now
```

**Bước 2: Sao chép Kho lưu trữ**

```bash
git clone https://github.com/HeyPuter/puter.git
cd puter
```

**Bước 3: Cấu hình Biến Môi trường**
Tạo một tệp `.env` trong thư mục gốc của dự án và tùy chỉnh các biến sau (điều chỉnh khi cần):

```plaintext
PORT=3000
DB_PATH=./data/db
```

**Bước 4: Xây dựng và Khởi động với Docker Compose**
Chạy lệnh sau để xây dựng và khởi động các dịch vụ:

```bash
docker-compose up -d
```

**Bước 5: Xác minh Triển khai**
Kiểm tra xem container có đang chạy không:

```bash
docker ps
```

Truy cập Puter bằng cách điều hướng đến `http://your-server-ip:3000` trong trình duyệt web của bạn.

**Bước 6: (Tùy chọn) Thiết lập Reverse Proxy với Nginx**
Để sử dụng trong sản xuất, hãy thiết lập Nginx làm reverse proxy:

1. Cài đặt Nginx:

   ```bash
   sudo apt install nginx -y
   ```

2. Tạo tệp cấu hình mới tại `/etc/nginx/sites-available/puter`:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. Kích hoạt cấu hình và khởi động lại Nginx:

   ```bash
   sudo ln -s /etc/nginx/sites-available/puter /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl restart nginx
   ```

Phiên bản Puter tự lưu trữ của bạn hiện đã hoạt động và có thể truy cập được! Để biết thêm tùy chỉnh, hãy tham khảo [tài liệu chính thức](https://github.com/HeyPuter/puter).