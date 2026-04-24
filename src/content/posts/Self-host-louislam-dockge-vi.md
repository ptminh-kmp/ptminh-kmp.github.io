---
lang: vi
title: "Dockge: Trình Quản Lý Docker Compose Tự Lưu Trữ Hiện Đại - Đánh Giá Hoàn Chỉnh & Hướng Dẫn Thiết Lập"
description: "Khám phá louislam/dockge, trình quản lý Docker Compose tự lưu trữ phản ứng và thân thiện với người dùng với hơn 19K sao GitHub. Tìm hiểu cách cài đặt, tính năng và các lựa chọn thay thế."
published: 2025-09-19
tags: ['open-source', 'self-host', 'docker', 'docker-compose', 'web-ui', 'devops']
category: Self-hosted
author: minhpt
---

# louislam/dockge - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/louislam/dockge](https://github.com/louislam/dockge)
- **Sao:** 19225

## 2. Mô Tả Dự Án
Dockge là một giao diện web thanh lịch, phản ứng được thiết kế để đơn giản hóa việc quản lý các stack Docker Compose. Không giống như các phương pháp dựa trên CLI truyền thống, Dockge cung cấp một môi trường trực quan, nơi người dùng có thể chỉnh sửa, triển khai và giám sát các tệp `docker-compose.yaml` của họ với cập nhật thời gian thực. Được xây dựng với công nghệ hiện đại bao gồm Express.js và React, nó nhấn mạnh sự dễ sử dụng, giúp việc quản lý stack Docker có thể tiếp cận ngay cả với những người ít quen thuộc với thao tác dòng lệnh.

## 3. Phần Mềm Này Thay Thế Những Gì?
Dockge là giải pháp thay thế hấp dẫn cho một số công cụ hiện có trong hệ sinh thái Docker:
- **Portainer**: Trong khi Portainer cung cấp quản lý container rộng hơn, Dockge tập trung cụ thể vào các stack Compose với giao diện phản ứng, tinh gọn hơn.
- **Docker Compose CLI**: Thay thế việc chỉnh sửa thủ công và thực thi lệnh bằng phương pháp dựa trên web, tương tác.
- **Yacht** và **CasaOS**: Cho người dùng tìm kiếm một công cụ quản lý nhẹ, hướng đến stack mà không có chi phí của các nền tảng container đầy đủ.

## 4. Chức Năng Chính
Các tính năng chính của Dockge bao gồm:
- **Giao diện Web Phản ứng**: Cập nhật thời gian thực và giao diện hiện đại, đáp ứng.
- **Quản lý Tệp Compose**: Chỉnh sửa, xác thực và triển khai tệp `docker-compose.yaml` trực tiếp qua trình duyệt.
- **Triển khai Stack**: Triển khai và quản lý stack Docker chỉ với một cú nhấp chuột.
- **Xem Nhật ký**: Trình xem nhật ký tích hợp để giám sát đầu ra container.
- **Biến Môi trường**: Quản lý dễ dàng các biến môi trường trong giao diện.
- **Sao lưu và Phục hồi**: Xuất và nhập cấu hình stack để sao lưu hoặc di chuyển.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- Giao diện thân thiện giúp hạ thấp rào cản quản lý Docker Compose.
- Phản ứng thời gian thực nâng cao trải nghiệm người dùng.
- Nhẹ và tập trung duy nhất vào các stack Compose, tránh phình to tính năng.
- Phát triển tích cực và hỗ trợ cộng đồng mạnh mẽ với hơn 19K sao.

**Nhược điểm:**
- Thiếu các tính năng quản lý container rộng hơn có trong các công cụ như Portainer.
- Hiện đang trong quá trình phát triển tích cực, do đó thỉnh thoảng có thể xảy ra lỗi.
- Yêu cầu Docker và Docker Compose được cài đặt sẵn, có thể là rào cản cho người mới bắt đầu.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để triển khai Dockge trên máy chủ Ubuntu (các bản phân phối Linux khác tương tự).

### Yêu cầu:
- Máy chủ chạy Ubuntu 20.04 trở lên.
- Docker và Docker Compose đã được cài đặt. Nếu chưa cài đặt, chạy:
  ```bash
  sudo apt update && sudo apt install docker.io docker-compose -y
  ```
- Đảm bảo dịch vụ Docker đang chạy: `sudo systemctl start docker && sudo systemctl enable docker`.

### Các bước Cài đặt:
1. **Tạo thư mục cho Dockge:**
   ```bash
   mkdir -p /opt/dockge
   cd /opt/dockge
   ```

2. **Tạo tệp `docker-compose.yaml`:**
   ```bash
   nano docker-compose.yaml
   ```
   Dán cấu hình sau:
   ```yaml
   version: "3.8"
   services:
     dockge:
       image: louislam/dockge:latest
       restart: unless-stopped
       ports:
         - 5001:5001
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - ./data:/app/data
         - /opt/dockge/stacks:/opt/stacks
       environment:
         - DOCKGE_STACKS_DIR=/opt/stacks
   ```

3. **Triển khai Stack:**
   ```bash
   docker-compose up -d
   ```

4. **Truy cập Dockge:**
   Mở trình duyệt và điều hướng đến `http://your-server-ip:5001`. Bạn sẽ thấy giao diện Dockge sẵn sàng quản lý các stack Docker Compose của mình.

### Lưu ý Bổ sung:
- Để quản lý các stack hiện có, đảm bảo chúng nằm trong thư mục được chỉ định trong `DOCKGE_STACKS_DIR` (ở đây là `/opt/dockge/stacks`).
- Để bảo mật, hãy cân nhắc thiết lập reverse proxy (ví dụ: Nginx) với SSL.

Tận hưởng việc quản lý Docker Compose tinh gọn với Dockge!