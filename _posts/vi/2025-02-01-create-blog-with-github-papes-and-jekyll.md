---
title: Tạo blog cá nhân với Github Pages và Jekyll sử dụng theme Chirpy
description: >-
    Hướng dẫn cách cài đặt, cấu hình và triển khai theme Chirpy Jekyll cho blog của bạn. Bài viết bao gồm hướng dẫn sử dụng Dev Containers, thiết lập native, tùy chỉnh và các phương pháp triển khai như GitHub Actions.
author: minhpt
date: 2025-02-03 00:00:00 +0700
categories: [Self-hosted, Blogging]
tags: [blog, tutorial, github, jekyll, chirpy, self-hosted]
---

Hướng dẫn này sẽ giúp bạn thiết lập và sử dụng theme Chirpy Jekyll cho website của mình.

### 1. Chọn Điểm Bắt Đầu

* **Khuyến nghị:** Sử dụng **Chirpy Starter** để dễ dàng nâng cấp và cấu hình tối thiểu. 
        * Trên GitHub, truy cập [Chirpy Starter](https://github.com/cotes2020/chirpy-starter) và nhấn "**Use this template**."
        * Tạo một repository mới với tên `<your_username>.github.io` (thay `<your_username>` bằng tên người dùng GitHub của bạn). Điều này sẽ tự động cấu hình GitHub Pages để lưu trữ trang web của bạn.

* **Dành cho Tùy Chỉnh Nâng Cao:** Fork repository theme chính ([Fork Theme Repository](https://tranglc.github.io/posts/getting-started/)). 
        * **Lưu ý:** Tùy chọn này dành cho những người quen thuộc với việc chỉnh sửa Jekyll. Bạn sẽ chịu trách nhiệm quản lý các bản cập nhật và xung đột tiềm ẩn.

### 2. Thiết Lập Môi Trường Phát Triển

* **Khuyến nghị (Windows):** Sử dụng **Dev Containers** để có môi trường cách ly và nhất quán.
        * **Cài đặt Docker:**
                * **Windows/macOS:** Cài đặt Docker Desktop từ [Docker](https://www.docker.com/products/docker-desktop/).
                * **Linux:** Cài đặt Docker Engine từ tài liệu chính thức của Docker.
        * **Cài đặt VS Code:** Tải xuống và cài đặt VS Code từ [code.visualstudio.com](https://code.visualstudio.com/).
        * **Cài đặt Dev Containers Extension:** Tìm kiếm "Remote - Containers" trong marketplace của VS Code và cài đặt.
        * **Clone vào Container:**
                * **Phương pháp 1 (Docker Desktop):** Mở VS Code và sử dụng lệnh "Clone Repository." Chọn repository vừa tạo. VS Code sẽ hướng dẫn bạn tạo Dev Container và mở dự án trong đó.
                * **Phương pháp 2 (Docker Engine):** Clone repository về máy. Trong VS Code, mở thư mục và chọn "Reopen in Container." VS Code sẽ tạo và khởi động container cho dự án của bạn.

* **Thiết Lập Native (Hệ thống Unix-like):**

        * **Cài đặt Jekyll:** Làm theo hướng dẫn cài đặt chính thức của Jekyll: [Jekyll Installation](https://jekyllrb.com/docs/installation/).
        * **Cài đặt Git:** Nếu chưa có, cài đặt Git từ [git-scm.com](https://git-scm.com/).
        * **Clone Repository:** Sử dụng Git để clone repository đã chọn (Starter hoặc theme fork) về máy.
        * **Khởi tạo (nếu fork):** Nếu bạn fork theme, chạy `bash tools/init.sh` trong thư mục gốc để khởi tạo repository.
        * **Cài đặt Dependencies:** Chạy `bundle` trong thư mục gốc của repository để cài đặt các Ruby gems cần thiết.

### 3. Chạy Trang Web Cục Bộ

* **Khởi động Jekyll Server:** Thực thi lệnh sau trong terminal:

```bash
bundle exec jekyll s
```

* **Truy cập Trang Web:** Mở trình duyệt và truy cập `http://127.0.0.1:4000/`.

### 4. Tùy Chỉnh

* **Cấu hình:** Chỉnh sửa tệp `_config.yml` để điều chỉnh các thiết lập:
        * `url`: URL cơ bản của trang web (ví dụ: `https://yourdomain.com`).
        * `title`: Tiêu đề của trang web.
        * `author`: Tên hoặc bút danh của bạn.
        * `avatar`: URL ảnh đại diện của bạn.
        * `timezone`: Múi giờ địa phương của bạn.
        * `lang`: Ngôn ngữ của trang web (ví dụ: `en`, `vi`).
        * **Lưu ý:** Tham khảo tệp `_config.yml` để biết danh sách đầy đủ các tùy chọn có sẵn.

* **Liên hệ Mạng Xã Hội:**
        * Chỉnh sửa tệp `_data/contact.yml` để bật hoặc tắt các liên kết mạng xã hội (ví dụ: Twitter, GitHub, LinkedIn). 
        * Thêm hoặc xóa các tài khoản mạng xã hội theo nhu cầu.

* **Phong cách:**
        * Tùy chỉnh stylesheet bằng cách chỉnh sửa `assets/css/jekyll-theme-chirpy.scss`. 
        * Thêm CSS tùy chỉnh của bạn ở cuối tệp để tránh xung đột khi cập nhật theme trong tương lai.

* **Tài nguyên Tĩnh:**
        * **Tùy chỉnh:** Chỉnh sửa hoặc thay thế các tài nguyên tĩnh hiện có (hình ảnh, JavaScript, v.v.) trong thư mục `assets`.
        * **Tự lưu trữ:** 
                * Tham khảo repository `_chirpy-static-assets_` để biết hướng dẫn tự lưu trữ tài nguyên tĩnh nhằm cải thiện hiệu suất và kiểm soát.
                * Cập nhật URL CDN trong `_data/origin/cors.yml` để trỏ đến tài nguyên tự lưu trữ của bạn.

### 5. Triển Khai Trang Web

* **GitHub Pages với GitHub Actions (Khuyến nghị):**

        * **Đảm bảo Repository Công khai:** Nếu sử dụng gói miễn phí của GitHub, repository của bạn phải công khai.
        * **Tương thích Nền tảng (nếu sử dụng `Gemfile.lock`):** Nếu máy cục bộ của bạn không phải Linux, cập nhật danh sách nền tảng trong `Gemfile.lock`:

```bash
bundle lock --add-platform x86_64-linux
```

* **Cấu hình GitHub Pages:**
        * Trong repository GitHub của bạn, vào **Settings** -> **Pages**.
        * Trong phần **Source**, chọn **"GitHub Actions"** từ menu thả xuống.

* **Triển khai:** Đẩy các thay đổi của bạn lên GitHub. Workflow GitHub Actions sẽ tự động build và triển khai trang web của bạn.

* **Triển khai Thủ Công:**

        * **Build Trang Web:** Chạy lệnh sau trong terminal:

```bash
JEKYLL_ENV=production bundle exec jekyll b
```

> **Tải lên Tệp:** Các tệp trang web được tạo sẽ nằm trong thư mục `_site`. Tải nội dung của thư mục này lên máy chủ web của bạn (ví dụ: sử dụng FTP, SFTP, hoặc rsync).
{: .prompt-info }

**Video**

{% include embed/youtube.html id='hKMF9LXlO7w' %}

**Lưu ý Quan Trọng**

* **Trang Dự Án:** Nếu bạn sử dụng trang GitHub Project hoặc tên miền tùy chỉnh, bạn có thể cần điều chỉnh `baseurl` trong `_config.yml`. Ví dụ, nếu tên dự án của bạn là "my-blog," đặt `baseurl: "/my-blog"`.
* **Tham khảo Tài liệu:** Để biết thông tin chi tiết, tham khảo tài liệu chính thức của Chirpy và Jekyll.
