---
lang: vi
title: >- 
  💰 Kiếm Tiền Từ Trang Jekyll Của Bạn 💰: Hướng Dẫn Từng Bước Thêm Google AdSense
description: >-
  Học cách tích hợp Google AdSense vào trang Jekyll của bạn và bắt đầu kiếm thu nhập. Hướng dẫn toàn diện này bao gồm mọi thứ từ thiết lập tài khoản đến vị trí đặt quảng cáo tối ưu.
author: minhpt
published: 2025-02-18
category: Self-hosted
tags: [tutorial, self-hosted, jekyll, Jekyll AdSense, Add Google AdSense Jekyll, Monetize Jekyll Blog, Google AdSense Integration, Jekyll Ads, Jekyll Ad Revenue, Jekyll Ad Placement]
image: https://minixium-bucket.hn.ss.bfcplatform.vn/blog/posts/google-adsense.jpg

---

Bạn muốn biến niềm đam mê viết lách thành nguồn thu nhập? Nếu bạn đang chạy một trang web hoặc blog sử dụng Jekyll, việc thêm Google AdSense là một cách tuyệt vời để kiếm tiền từ nội dung của bạn. Mặc dù Jekyll nổi tiếng với sự đơn giản và tốc độ, việc tích hợp các dịch vụ bên ngoài như AdSense đôi khi có vẻ khó khăn. Nhưng đừng lo! Hướng dẫn này sẽ hướng dẫn bạn từng bước, đảm bảo bạn có thể thêm AdSense vào trang Jekyll của mình một cách dễ dàng.

### Tại Sao Sử Dụng Google AdSense Với Jekyll?

- **Kiếm Thu Nhập**: Tạo thu nhập từ lưu lượng truy cập trang web của bạn.
- **Tích hợp Dễ dàng**: Mặc dù cần một vài bước, nhưng khá đơn giản.
- **Quảng cáo Mục tiêu**: Thuật toán của Google hiển thị quảng cáo phù hợp với khán giả của bạn.
- **Tùy chỉnh**: Kiểm soát vị trí và giao diện quảng cáo.

### Yêu Cầu

- Tài khoản Google AdSense (đăng ký tại google.com/adsense)
- Trang web hoặc blog Jekyll.
- Quyền truy cập vào các tệp HTML của trang web.

#### Bước 1: Lấy Mã AdSense

1. Đăng nhập vào tài khoản Google AdSense của bạn <https://adsense.google.com/start/>.
2. Điều hướng đến `Site` > `New site`
![Desktop View](https://minixium-bucket.hn.ss.bfcplatform.vn/blog/posts/create-new-site.png)
3. Chọn phương thức xác minh (ví dụ: `Adsense Code snippet`, `Ads.txt snippet`, `Meta tag`)
![Desktop View](https://minixium-bucket.hn.ss.bfcplatform.vn/blog/posts/add-code.png)

#### Bước 2: Thêm Mã Xác Minh Vào Trang Jekyll

##### Sử dụng Mã AdSense (Code snippet)

1. Tạo thư mục `_includes` trong dự án Jekyll của bạn

```bash
cd [du-an-jekyll-cua-ban]
mkdir _includes
```

2. Tạo tệp `head.html` trong thư mục `_includes`.

```bash
touch head.html
```

3. Sao chép và dán toàn bộ nội dung của `head.html` từ liên kết này: <https://github.com/cotes2020/jekyll-theme-chirpy/blob/master/_includes/head.html>
4. Tạo tệp `google-adsense.html` trong thư mục `_includes`.

```bash
touch google-adsense.html
```

5. Chỉnh sửa tệp `google-adsense.html` với đoạn mã Google AdSense của bạn ở trên.

```text
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=[ID-ca-pub-cua-ban]"
     crossorigin="anonymous"></script>
```

1. Chỉnh sửa `head.html`:

```html
  <head>
    <!--một số mã phía trên-->
    {% include metadata-hook.html %}
    <!--thêm dòng này-->
    {% include google-adsense.html %} 
  </head>
```

##### Sử dụng Mã Ads.txt (snippet)

1. Tạo tệp `ads.txt` trong dự án Jekyll của bạn:

```bash
  touch ads.txt
```

2. Chỉnh sửa tệp `ads.txt` với đoạn mã Ads.txt của bạn.

##### Sử dụng Thẻ Meta

1. Chỉnh sửa tệp `head.html` trong thư mục `_includes`.
2. Thêm thẻ meta Google AdSense bên trong thẻ `<head>`:

```html
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f7f7">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1b1b1e">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <!--thêm dòng này-->
  <meta name="google-adsense-account" content="[thẻ-meta-của-ban]">
  <meta
    name="viewport"
    content="width=device-width, user-scalable=no initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
  >
  <!--một số mã còn lại-->
</head>
```

#### Bước 3: Xác Minh Mã và Theo Dõi

1. **Xác Minh AdSense**: Google sẽ xem xét trang web của bạn để đảm bảo tuân thủ chính sách. Quá trình này có thể mất một thời gian.
2. **Kiểm Tra Hiển Thị Quảng Cáo**: Sau khi được phê duyệt, quảng cáo sẽ bắt đầu xuất hiện trên trang của bạn.
3. **Theo Dõi Hiệu Suất**: Sử dụng bảng điều khiển AdSense để theo dõi thu nhập và hiệu suất quảng cáo.
4. **Tối Ưu Vị Trí Đặt Quảng Cáo**: Thử nghiệm với các vị trí đặt quảng cáo khác nhau để tối đa hóa doanh thu.

### Mẹo Thành Công

- **Nội Dung Là Vua**: Tập trung vào việc tạo nội dung chất lượng cao, hấp dẫn.
- **Thiết Kế Đáp Ứng**: Đảm bảo trang web và quảng cáo của bạn hiển thị tốt trên mọi thiết bị.
- **Tối Ưu Vị Trí Quảng Cáo**: Tránh đặt quá nhiều quảng cáo hoặc quảng cáo làm gián đoạn trải nghiệm người dùng.
- **Chính Sách AdSense**: Tuân thủ chính sách của Google AdSense để tránh bị đình chỉ tài khoản.

### Kết Luận

Thêm Google AdSense vào trang Jekyll của bạn là một quy trình đơn giản có thể giúp bạn kiếm tiền từ nội dung. Bằng cách làm theo các bước này và tối ưu vị trí đặt quảng cáo, bạn có thể bắt đầu kiếm thu nhập từ công sức của mình. Hãy nhớ ưu tiên trải nghiệm người dùng và tạo nội dung có giá trị để tối đa hóa thu nhập. Chúc bạn kiếm tiền thành công!- Quay lại trang Google AdSense và nhấp vào nút `Verify`.