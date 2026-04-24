---
lang: vi
title: "RustDesk: Giải Pháp Máy Tính Từ Xa Mã Nguồn Mở Tối Ưu Cho Tự Lưu Trữ"
description: "Khám phá RustDesk, ứng dụng máy tính từ xa mã nguồn mở mạnh mẽ với hơn 96k sao GitHub. Tìm hiểu cách tự lưu trữ nó như một giải pháp thay thế TeamViewer."
published: 2025-08-26
tags: ['open-source', 'self-host', 'remote-desktop', 'rust', 'privacy']
category: Self-hosted
author: minhpt
---

# rustdesk/rustdesk - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub

- **URL:** [https://github.com/rustdesk/rustdesk](https://github.com/rustdesk/rustdesk)
- **Sao:** 96220

## 2. Mô Tả Dự Án

RustDesk là một ứng dụng máy tính từ xa hiện đại, mã nguồn mở được viết bằng Rust, cung cấp khả năng truy cập từ xa an toàn, đa nền tảng. Được thiết kế với quyền riêng tư và khả năng tự lưu trữ trong tâm trí, nó cung cấp cả tùy chọn máy chủ công cộng và khả năng triển khai máy chủ chuyển tiếp của riêng bạn, mang lại cho người dùng toàn quyền kiểm soát cơ sở hạ tầng máy tính từ xa của họ.

## 3. Phần Mềm Này Thay Thế Những Gì?

RustDesk là giải pháp thay thế hấp dẫn cho một số giải pháp máy tính từ xa phổ biến:

- **TeamViewer** - Phần mềm truy cập từ xa thương mại
- **AnyDesk** - Ứng dụng máy tính từ xa độc quyền
- **Splashtop** - Công cụ truy cập từ xa doanh nghiệp
- **Chrome Remote Desktop** - Giải pháp dựa trên trình duyệt của Google
- **Windows Remote Desktop** - Giải pháp tích hợp của Microsoft

## 4. Chức Năng Chính

RustDesk cung cấp một bộ tính năng toàn diện:

- **Hỗ trợ Đa nền tảng**: Windows, macOS, Linux, Android, iOS
- **Hiệu suất Cao**: Tối ưu hóa cho độ trễ thấp và tốc độ khung hình cao
- **Mã hóa Đầu cuối**: Giao tiếp an toàn với TLS 1.3
- **Truyền Tệp**: Chia sẻ tệp kéo và thả dễ dàng
- **Trò chuyện Thoại**: Giao tiếp âm thanh tích hợp
- **Hỗ trợ Nhiều Màn hình**: Truy cập nhiều màn hình liền mạch
- **Tăng tốc Phần cứng**: Kết xuất tăng tốc GPU
- **Truy cập ID/Mật khẩu**: Thiết lập kết nối đơn giản
- **Truy cập Không giám sát**: Khả năng truy cập từ xa vĩnh viễn

## 5. Ưu và Nhược Điểm

### Ưu điểm:
- **Mã nguồn Mở**: Mã nguồn minh bạch với sự đóng góp của cộng đồng
- **Tùy chọn Tự lưu trữ**: Kiểm soát hoàn toàn dữ liệu và cơ sở hạ tầng
- **Tiết kiệm Chi phí**: Miễn phí sử dụng với tùy chọn lưu trữ trả phí
- **Tập trung vào Quyền riêng tư**: Không thu thập dữ liệu khi tự lưu trữ
- **Nhẹ**: Tiêu thụ tài nguyên tối thiểu
- **Phát triển Tích cực**: Cập nhật và cải tiến thường xuyên

### Nhược điểm:
- **Độ phức tạp Thiết lập**: Tự lưu trữ yêu cầu kiến thức kỹ thuật
- **Hạn chế Ứng dụng Di động**: Một số tính năng nâng cao kém tối ưu hóa trên di động
- **Tài liệu**: Có thể toàn diện hơn cho các thiết lập nâng cao
- **Tính năng Doanh nghiệp**: Thiếu một số công cụ quản lý cấp doanh nghiệp

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)

### Yêu cầu
- Máy chủ Ubuntu 20.04+ (tối thiểu 2GB RAM, khuyến nghị 4GB)
- Docker và Docker Compose đã được cài đặt
- Tên miền đã cấu hình DNS (tùy chọn nhưng khuyến nghị)
- Mở cổng: 21115-21119 (TCP), 21116 (UDP)

### Cài đặt Từng bước

1. **Cập nhật Hệ thống**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Cài đặt Docker**
```bash
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
```

3. **Tạo Thư mục Triển khai**
```bash
mkdir rustdesk-server && cd rustdesk-server
```

4. **Tạo Tệp Docker Compose**
```yaml
version: '3'

networks:
  rustdesk-net:
    driver: bridge

services:
  hbbs:
    container_name: rustdesk-hbbs
    ports:
      - "21115:21115"
      - "21116:21116"
      - "21116:21116/udp"
      - "21118:21118"
    image: rustdesk/rustdesk-server:latest
    command: hbbs -r your-domain.com:21117
    volumes:
      - ./data:/root
    networks:
      - rustdesk-net
    restart: unless-stopped

  hbbr:
    container_name: rustdesk-hbbr
    ports:
      - "21117:21117"
      - "21119:21119"
    image: rustdesk/rustdesk-server:latest
    command: hbbr
    volumes:
      - ./data:/root
    networks:
      - rustdesk-net
    restart: unless-stopped
```

5. **Thay thế Tên miền**
Thay thế `your-domain.com` bằng tên miền thực tế hoặc địa chỉ IP máy chủ của bạn.

6. **Khởi động Dịch vụ**
```bash
sudo docker-compose up -d
```

7. **Cấu hình Tường lửa**
```bash
sudo ufw allow 21115:21119/tcp
sudo ufw allow 21116/udp
```

8. **Xác minh Cài đặt**
Kiểm tra xem các dịch vụ có đang chạy không:
```bash
sudo docker-compose ps
```

9. **Cấu hình Ứng dụng khách**
Tải ứng dụng khách RustDesk và cấu hình để sử dụng máy chủ tự lưu trữ của bạn bằng cách nhập địa chỉ máy chủ vào trường máy chủ ID.

### Cấu hình Bổ sung

Để tăng cường bảo mật, hãy cân nhắc:
- Thiết lập chứng chỉ SSL với Let's Encrypt
- Cấu hình reverse proxy (Nginx)
- Thực hiện các quy tắc tường lửa
- Thiết lập sao lưu định kỳ thư mục dữ liệu

Máy chủ RustDesk tự lưu trữ của bạn hiện đã sẵn sàng! Bạn có thể truy cập nó bằng IP hoặc tên miền máy chủ trong cài đặt ứng dụng khách RustDesk.