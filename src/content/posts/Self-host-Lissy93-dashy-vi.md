---
lang: vi
title: "Lissy93/dashy: Bảng Điều Khiển Cá Nhân Tự Lưu Trữ Tối Ưu - Đánh Giá & Hướng Dẫn Thiết Lập"
description: "Khám phá Lissy93/dashy, một bảng điều khiển cá nhân mã nguồn mở mạnh mẽ với widget, chủ đề và giám sát trạng thái. Hoàn hảo cho những người đam mê tự lưu trữ."
published: 2025-09-16
tags: ['open-source', 'self-host', 'dashboard', 'docker', 'javascript', 'vuejs', 'web-app']
category: Self-hosted
author: minhpt
---

# Lissy93/dashy - Đánh Giá Chi Tiết

## 1. Tổng Quan & Chỉ Số GitHub
- **URL:** [https://github.com/Lissy93/dashy](https://github.com/Lissy93/dashy)
- **Sao:** 22311

## 2. Mô Tả Dự Án
Lissy93/dashy là một bảng điều khiển cá nhân giàu tính năng, tự lưu trữ được thiết kế để tập trung các dịch vụ web, ứng dụng và công cụ được sử dụng nhiều nhất của bạn vào một giao diện duy nhất, có thể tùy chỉnh. Nó cung cấp giao diện người dùng hiện đại, sạch sẽ với hỗ trợ widget, kiểm tra trạng thái, nhiều chủ đề và trình chỉnh sửa giao diện trực quan, khiến nó trở thành giải pháp lý tưởng cho cả sử dụng cá nhân và chuyên nghiệp để hợp lý hóa quy trình làm việc hàng ngày.

## 3. Phần Mềm Này Thay Thế Những Gì?
Dashy có thể là lựa chọn thay thế cho một số giải pháp bảng điều khiển thương mại và mã nguồn mở, bao gồm:
- Heimdall
- Organizr
- Homer
- Các sản phẩm thương mại như My Dashboard hoặc trang chủ cá nhân từ các nhà cung cấp trình duyệt

## 4. Chức Năng Chính
Các tính năng chính của Dashy bao gồm:
- **Hệ thống Widget:** Thêm và tùy chỉnh widget cho thời tiết, ghi chú, nguồn cấp RSS và hơn thế nữa.
- **Giám sát Trạng thái:** Kiểm tra thời gian hoạt động và trạng thái của các dịch vụ và ứng dụng của bạn.
- **Tùy chỉnh Chủ đề:** Chọn từ nhiều chủ đề tích hợp sẵn hoặc tạo chủ đề của riêng bạn.
- **Bộ Biểu tượng:** Thư viện biểu tượng phong phú để cá nhân hóa bảng điều khiển của bạn.
- **Trình chỉnh sửa Giao diện:** Giao diện kéo và thả để sắp xếp các phần và thành phần.
- **Hỗ trợ Nhiều Người dùng:** Cấu hình quyền truy cập cho các người dùng khác nhau với các quyền hạn khác nhau.
- **Tích hợp Tìm kiếm:** Nhanh chóng tìm và truy cập các ứng dụng và dấu trang của bạn.

## 5. Ưu và Nhược Điểm
**Ưu điểm:**
- Khả năng tùy chỉnh cao với bộ tính năng phong phú.
- Mã nguồn mở và miễn phí sử dụng.
- Phát triển tích cực và hỗ trợ cộng đồng mạnh mẽ.
- Dễ dàng triển khai bằng Docker hoặc các phương pháp truyền thống.
- Thiết kế đáp ứng hoạt động trên cả máy tính và thiết bị di động.

**Nhược điểm:**
- Có thể có đường cong học tập đối với người dùng không chuyên về kỹ thuật.
- Tự lưu trữ yêu cầu kỹ năng quản lý máy chủ cơ bản.
- Một số tính năng nâng cao có thể yêu cầu cấu hình ngoài giao diện.

## 6. Hướng Dẫn Cài Đặt Chi Tiết (Tự lưu trữ)
Thực hiện theo các bước sau để triển khai Dashy trên máy chủ Ubuntu:

### Yêu cầu:
- Máy chủ chạy Ubuntu 20.04 trở lên.
- Docker và Docker Compose đã được cài đặt.

### Bước 1: Cập nhật Hệ thống và Cài đặt Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker --now
```

### Bước 2: Tạo Thư mục cho Dashy
```bash
mkdir ~/dashy && cd ~/dashy
```

### Bước 3: Tạo Tệp Docker Compose
Tạo một tệp `docker-compose.yml` với nội dung sau:
```yaml
version: '3.8'
services:
  dashy:
    image: lissy93/dashy
    container_name: dashy
    ports:
      - 4000:80
    volumes:
      - ./conf.yml:/app/public/conf.yml
    restart: unless-stopped
```

### Bước 4: Tạo Tệp Cấu hình
Tạo một tệp `conf.yml` cơ bản:
```yaml
pageInfo:
  title: My Dashboard
sections:
  - name: Welcome
    items:
      - title: GitHub
        description: Code Repository
        icon: fab fa-github
        url: https://github.com
```

### Bước 5: Triển khai Dashy
```bash
docker-compose up -d
```

### Bước 6: Truy cập Bảng Điều Khiển của Bạn
Mở trình duyệt và điều hướng đến `http://your-server-ip:4000`. Bạn sẽ thấy bảng điều khiển Dashy mới của mình. Tùy chỉnh thêm bằng cách chỉnh sửa `conf.yml` và khởi động lại container với `docker-compose restart`.

Để biết thêm các tùy chọn cấu hình, hãy tham khảo [tài liệu chính thức](https://dashy.to/docs/).