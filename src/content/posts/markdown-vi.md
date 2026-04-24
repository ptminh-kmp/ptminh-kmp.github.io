---
lang: vi
title: Ví Dụ Markdown
published: 2023-10-01
description: Một ví dụ đơn giản về bài đăng blog Markdown.
tags: [Markdown, Blogging, Demo]
category: Examples
draft: false
---

# Tiêu đề h1

Các đoạn văn được phân cách bằng một dòng trống.

Đoạn thứ 2. _Nghiêng_, **đậm**, và `mã đơn`. Danh sách các mục
trông như thế này:

- mục này
- mục kia
- mục khác

Lưu ý rằng --- không tính dấu sao --- nội dung văn bản thực tế
bắt đầu ở cột thứ 4.

> Trích dẫn khối được
> viết như thế này.
>
> Chúng có thể trải dài nhiều đoạn,
> nếu bạn muốn.

Sử dụng 3 dấu gạch ngang cho em-dash. Sử dụng 2 dấu gạch ngang cho phạm vi (ví dụ: "tất cả nằm trong chương 12--14"). Ba dấu chấm ... sẽ được chuyển đổi thành dấu ba chấm.
Unicode được hỗ trợ. ☺

## Tiêu đề h2

Đây là danh sách đánh số:

1. mục đầu tiên
2. mục thứ hai
3. mục thứ ba

Lưu ý lại rằng văn bản thực tế bắt đầu ở cột thứ 4 (4 ký tự từ bên trái). Đây là một mẫu mã:

    # Hãy để tôi nhắc lại ...
    for i in 1 .. 10 { do-something(i) }

Như bạn có thể đoán, thụt lề 4 dấu cách. Nhân tiện, thay vì thụt lề khối, bạn có thể sử dụng các khối được phân cách, nếu bạn muốn:

```
define foobar() {
    print "Chào mừng đến với flavor country!";
}
```

(điều này làm cho sao chép & dán dễ dàng hơn). Bạn có thể tùy chọn đánh dấu khối được phân cách để Pandoc tô màu cú pháp:

```python
import time
# Nhanh, đếm đến mười!
for i in range(10):
    # (nhưng không *quá* nhanh)
    time.sleep(0.5)
    print i
```

### Tiêu đề h3

Bây giờ là danh sách lồng nhau:

1. Đầu tiên, lấy những nguyên liệu này:

    - cà rốt
    - cần tây
    - đậu lăng

2. Đun sôi một ít nước.

3. Đổ mọi thứ vào nồi và làm theo
    thuật toán này:

        tìm thìa gỗ
        mở nắp nồi
        khuấy
        đậy nắp nồi
        đặt thìa gỗ không cân bằng trên tay cầm nồi
        đợi 10 phút
        quay lại bước đầu tiên (hoặc tắt bếp khi xong)

    Đừng chạm vào thìa gỗ nếu không nó sẽ rơi.

Lưu ý lại cách văn bản luôn căn chỉnh trên thụt lề 4 dấu cách (bao gồm cả dòng cuối cùng tiếp tục mục 3 ở trên).

Đây là liên kết đến [một trang web](http://foo.bar), đến [một tài liệu cục bộ](local-doc.html), và đến [một tiêu đề trong tài liệu hiện tại](#tiêu-đề-h2). Đây là một chú thích cuối trang [^1].

[^1]: Nội dung chú thích ở đây.

Bảng có thể trông như thế này:

kích thước chất liệu màu sắc

---

9 da nâu
10 vải canvas tự nhiên
11 thủy tinh trong suốt

Bảng: Giày, kích cỡ và chất liệu

(Trên đây là chú thích cho bảng.) Pandoc cũng hỗ trợ
bảng nhiều dòng:

---

từ khóa văn bản

---

đỏ Hoàng hôn, táo, và
những thứ màu đỏ hoặc
đỏ khác.

xanh lá Lá, cỏ, ếch
và những thứ khác không
dễ dàng có màu xanh.

---

Một đường kẻ ngang sau đây.

---

Đây là danh sách định nghĩa:

táo
: Tốt để làm sốt táo.
cam
: Họ cam chanh!
cà chua
: Không có chữ "e" trong tomatoe.

Lại một lần nữa, văn bản được thụt lề 4 dấu cách. (Đặt một dòng trống giữa mỗi cặp thuật ngữ/định nghĩa để dàn trải mọi thứ hơn.)

Đây là một "khối dòng":

| Dòng một
| Dòng hai
| Dòng ba

và hình ảnh có thể được chỉ định như thế này:

[//]: # (![hình ảnh ví dụ]&#40;./demo-banner.png "Một hình ảnh mẫu"&#41;)

Phương trình toán nội dòng như thế này: $\omega = d\phi / dt$. Toán hiển thị nên được đặt trên dòng riêng và đặt trong dấu đô-la kép:

$$I = \int \rho R^{2} dV$$

$$
\begin{equation*}
\pi
=3.1415926535
 \;8979323846\;2643383279\;5028841971\;6939937510\;5820974944
 \;5923078164\;0628620899\;8628034825\;3421170679\;\ldots
\end{equation*}
$$

Và lưu ý rằng bạn có thể sử dụng dấu gạch chéo ngược để thoát bất kỳ ký tự dấu câu nào bạn muốn hiển thị nguyên văn, ví dụ: \`foo\`, \*bar\*, v.v.