---
lang: vi
title: "Cloudreve: Hệ Thống Quản Lý và Chia Sẻ Tệp Tự Lưu Trữ Tối Ưu"
description: "Khám phá Cloudreve, giải pháp quản lý tệp mã nguồn mở tự lưu trữ với hỗ trợ đa lưu trữ, cung cấp giải pháp thay thế liền mạch cho các dịch vụ đám mây thương mại."
published: 2025-09-15
tags: ['open-source', 'self-host', 'file-management', 'cloud-storage', 'docker', 'golang']
category: Self-hosted
author: minhpt
---

# cloudreve/cloudreve - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/cloudreve/cloudreve](https://github.com/cloudreve/cloudreve)
- **Sao:** 24686

## 2. Mô Tả Dự Án
Cloudreve là một hệ thống quản lý và chia sẻ tệp mạnh mẽ, mã nguồn mở, tự lưu trữ được thiết kế để mang lại cho người dùng toàn quyền kiểm soát dữ liệu của họ. Nó hỗ trợ tích hợp với nhiều nhà cung cấp lưu trữ, cho phép quản lý liền mạch các tệp trên nhiều giải pháp lưu trữ đám mây và cục bộ khác nhau. Được xây dựng với hiệu suất và tính linh hoạt trong tâm trí, Cloudreve là giải pháp thay thế mạnh mẽ cho các dịch vụ lưu trữ đám mây độc quyền, cung cấp các tính năng như quản lý người dùng, xem trước tệp và khả năng chia sẻ—tất cả trong khi giữ dữ liệu trên cơ sở hạ tầng bạn kiểm soát.

## 3. Phần Mềm Này Thay Thế Những Gì?
Cloudreve có thể thay thế hiệu quả một số giải pháp thương mại và mã nguồn mở, bao gồm:
- Dropbox, Google Drive và OneDrive cho lưu trữ và chia sẻ tệp tự lưu trữ.
- Nextcloud và ownCloud cho người dùng tìm kiếm giải pháp thay thế nhẹ, dựa trên Golang.
- Seafile cho những người ưu tiên hỗ trợ đa backend lưu trữ.
- Các nền tảng đồng bộ và chia sẻ tệp doanh nghiệp (EFSS) thương mại bằng cách cung cấp giải pháp thay thế có thể tùy chỉnh, miễn phí.

## 4. Chức Năng Chính
Cloudreve cung cấp một bộ tính năng toàn diện, như:
- **Hỗ trợ Đa Lưu trữ:** Kết nối với lưu trữ cục bộ, AWS S3, Aliyun OSS, OneDrive và hơn thế nữa.
- **Quản lý Người dùng và Nhóm:** Tạo người dùng, đặt hạn ngạch lưu trữ và quản lý quyền.
- **Chia sẻ Tệp:** Tạo liên kết chia sẻ có ngày hết hạn và bảo vệ bằng mật khẩu.
- **Xem trước Tệp:** Hỗ trợ xem trước tài liệu, hình ảnh, âm thanh và tệp video.
- **Hỗ trợ WebDAV:** Truy cập và quản lý tệp qua ứng dụng khách WebDAV.
- **Chủ đề và Tùy chỉnh:** Sửa đổi giao diện để phù hợp với thương hiệu hoặc sở thích cá nhân.
- **Truy cập API:** Mở rộng chức năng bằng cách sử dụng REST API được tài liệu hóa tốt.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- **Mã nguồn mở và Miễn phí:** Không có chi phí bản quyền, với toàn quyền truy cập mã nguồn.
- **Tự lưu trữ:** Toàn quyền sở hữu và riêng tư dữ liệu.
- **Linh hoạt Đa Lưu trữ:** Sử dụng kết hợp các backend lưu trữ một cách liền mạch.
- **Nhẹ và Nhanh:** Được xây dựng bằng Go, đảm bảo hiệu suất cao với mức sử dụng tài nguyên thấp.
- **Cộng đồng Tích cực:** Sự hiện diện mạnh mẽ trên GitHub với các bản cập nhật và hỗ trợ thường xuyên.

**Nhược điểm:**
- **Yêu cầu Tự lưu trữ:** Yêu cầu kiến thức kỹ thuật để triển khai và bảo trì.
- **Hỗ trợ Di động Hạn chế:** Chức năng ứng dụng di động có thể không được trau chuốt như các lựa chọn thương mại.
- **Khoảng trống Tài liệu:** Một số tính năng nâng cao có thể có tài liệu thưa thớt.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để triển khai Cloudreve trên máy chủ Ubuntu (khuyến nghị 22.04 LTS). Hướng dẫn này sử dụng Docker cho sự đơn giản và khả năng tái tạo.

### Yêu cầu:
- Máy chủ Ubuntu (22.04 LTS)
- Docker và Docker Compose đã được cài đặt
- Có kiến thức cơ bản về dòng lệnh Linux

### Bước 1: Cập nhật Hệ thống và Cài đặt Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker && sudo systemctl start docker
```

### Bước 2: Tạo Thư mục cho Cloudreve
```bash
mkdir ~/cloudreve && cd ~/cloudreve
```

### Bước 3: Tạo Tệp Docker Compose
Tạo một tệp `docker-compose.yml` với nội dung sau:

```yaml
version: '3.8'
services:
  cloudreve:
    image: cloudreve/cloudreve:latest
    container_name: cloudreve
    restart: unless-stopped
    ports:
      - "5212:5212"
    volumes:
      - ./uploads:/cloudreve/uploads
      - ./conf.ini:/cloudreve/conf.ini
      - ./cloudreve.db:/cloudreve/cloudreve.db
    environment:
      - TZ=Asia/Shanghai  # Điều chỉnh theo múi giờ của bạn
```

### Bước 4: Triển khai Cloudreve
```bash
sudo docker-compose up -d
```

### Bước 5: Truy cập và Cấu hình
Sau khi triển khai, truy cập Cloudreve tại `http://your-server-ip:5212`. Tài khoản quản trị và mật khẩu ban đầu sẽ được hiển thị trong nhật ký container. Lấy chúng bằng:

```bash
sudo docker logs cloudreve
```

Đăng nhập, thay đổi mật khẩu mặc định và cấu hình các backend lưu trữ và cài đặt người dùng thông qua bảng quản trị web.

### Bước 6 (Tùy chọn): Thiết lập Reverse Proxy
Để sử dụng trong sản xuất, hãy thiết lập reverse proxy với Nginx hoặc Apache và SSL để truy cập an toàn.

Thiết lập này cung cấp một phiên bản Cloudreve hoạt động. Đối với các cấu hình nâng cao, hãy tham khảo [tài liệu Cloudreve](https://docs.cloudreve.org/) chính thức.