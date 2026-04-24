---
lang: vi
title: Viết Bài Viết Mới
author: minhpt
description: >-
  Viết bài viết mới với Jekyll, sử dụng Markdown
published: 2025-02-05
categories: hosted
tags: [blog, tutorial, github, jekyll, chirpy, self-hosted]
render_with_liquid: false
---

Hướng dẫn này sẽ chỉ cho bạn cách viết bài trong mẫu _Chirpy_, và rất đáng đọc ngay cả khi bạn đã sử dụng Jekyll trước đây, vì nhiều tính năng yêu cầu các biến cụ thể phải được thiết lập.

## Đặt tên và Đường dẫn

Tạo một file mới có tên `YYYY-MM-DD-TIEUDE.PHANDUOI`{: .filepath} và đặt nó vào thư mục `_posts`{: .filepath} của thư mục gốc. Xin lưu ý rằng `PHANDUOI`{: .filepath} phải là một trong `md`{: .filepath} và `markdown`{: .filepath}. Nếu bạn muốn tiết kiệm thời gian tạo file, hãy cân nhắc sử dụng plugin [`Jekyll-Compose`](https://github.com/jekyll/jekyll-compose).

## Front Matter

Về cơ bản, bạn cần điền [Front Matter](https://jekyllrb.com/docs/front-matter/) như sau ở đầu bài viết:

```yaml
---
title: TIEU_DE
date: YYYY-MM-DD HH:MM:SS +/-TTTT
categories: [DANH_MUC_CHINH, DANH_MUC_PHU]
tags: [THE]     # Tên TAG luôn ở dạng chữ thường
---
```

> _Layout_ của bài viết đã được đặt mặc định là `post`, vì vậy không cần thêm biến _layout_ trong khối Front Matter.
{: .prompt-tip }

### Múi giờ của Ngày

Để ghi lại chính xác ngày xuất bản của bài viết, bạn không chỉ nên thiết lập `timezone` trong `_config.yml`{: .filepath} mà còn cung cấp múi giờ của bài viết trong biến `date` của khối Front Matter. Định dạng: `+/-TTTT`, ví dụ: `+0800`.

### Danh mục và Thẻ

`categories` của mỗi bài viết được thiết kế để chứa tối đa hai phần tử, và số lượng phần tử trong `tags` có thể từ không đến vô hạn. Ví dụ:

```yaml
---
categories: [Animal, Insect]
tags: [bee]
---
```

### Thông tin Tác giả

Thông tin tác giả của bài viết thường không cần điền trong _Front Matter_, chúng sẽ được lấy từ biến `social.name` và mục đầu tiên của `social.links` trong file cấu hình theo mặc định. Nhưng bạn cũng có thể ghi đè như sau:

Thêm thông tin tác giả trong `_data/authors.yml` (Nếu website của bạn không có file này, đừng ngần ngại tạo một file mới).

```yaml
<author_id>:
  name: <tên đầy đủ>
  twitter: <twitter_của_tác_giả>
  url: <trang_chủ_của_tác_giả>
```

{: file="_data/authors.yml" }

Và sau đó sử dụng `author` để chỉ định một mục hoặc `authors` để chỉ định nhiều mục:

```yaml
---
author: <author_id>                     # cho một mục
# hoặc
authors: [<author1_id>, <author2_id>]   # cho nhiều mục
---
```

Tuy nhiên, khóa `author` cũng có thể xác định nhiều mục.

> Lợi ích của việc đọc thông tin tác giả từ file `_data/authors.yml`{: .filepath } là trang sẽ có thẻ meta `twitter:creator`, giúp làm phong phú [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/guides/getting-started#card-and-content-attribution) và tốt cho SEO.
{: .prompt-info }

### Mô tả Bài viết

Theo mặc định, những từ đầu tiên của bài viết được sử dụng để hiển thị trên trang chủ cho danh sách bài viết, trong phần _Further Reading_ và trong XML của RSS feed. Nếu bạn không muốn hiển thị mô tả tự động tạo cho bài viết, bạn có thể tùy chỉnh nó bằng trường `description` trong _Front Matter_ như sau:

```yaml
---
description: Tóm tắt ngắn của bài viết.
---
```

Ngoài ra, văn bản `description` cũng sẽ được hiển thị dưới tiêu đề bài viết trên trang của bài viết.

## Mục lục

Theo mặc định, **M**ục **l**ục (TOC) được hiển thị trên bảng điều khiển bên phải của bài viết. Nếu bạn muốn tắt nó trên toàn cầu, hãy vào `_config.yml`{: .filepath} và đặt giá trị của biến `toc` thành `false`. Nếu bạn muốn tắt TOC cho một bài viết cụ thể, hãy thêm vào [Front Matter](https://jekyllrb.com/docs/front-matter/) của bài viết:

```yaml
---
toc: false
---
```

## Bình luận

Cài đặt toàn cầu cho bình luận được xác định bởi tùy chọn `comments.provider` trong file `_config.yml`{: .filepath}. Khi một hệ thống bình luận được chọn cho biến này, bình luận sẽ được kích hoạt cho tất cả bài viết.

Nếu bạn muốn tắt bình luận cho một bài viết cụ thể, hãy thêm vào **Front Matter** của bài viết:

```yaml
---
comments: false
---
```

## Media

Chúng tôi gọi hình ảnh, âm thanh và video là tài nguyên media trong _Chirpy_.

### Tiền tố URL

Đôi khi chúng ta phải xác định các tiền tố URL trùng lặp cho nhiều tài nguyên trong một bài viết, đó là một công việc nhàm chán mà bạn có thể tránh bằng cách đặt hai tham số.

- Nếu bạn đang sử dụng CDN để lưu trữ file media, bạn có thể chỉ định `cdn` trong `_config.yml`{: .filepath }. URL của tài nguyên media cho avatar site và bài viết sau đó sẽ được thêm tiền tố là tên miền CDN.

  ```yaml
  cdn: https://cdn.com
  ```

  {: file='_config.yml' .nolineno }

- Để chỉ định tiền tố đường dẫn tài nguyên cho phạm vi bài viết/trang hiện tại, hãy đặt `media_subpath` trong _front matter_ của bài viết:

  ```yaml
  ---
  media_subpath: /path/to/media/
  ---
  ```

  {: .nolineno }

Tùy chọn `site.cdn` và `page.media_subpath` có thể được sử dụng riêng lẻ hoặc kết hợp để linh hoạt tạo URL tài nguyên cuối cùng: `[site.cdn/][page.media_subpath/]file.ext`

### Hình ảnh

#### Chú thích

Thêm chữ nghiêng vào dòng tiếp theo của hình ảnh, nó sẽ trở thành chú thích và xuất hiện ở cuối hình ảnh:

```markdown
![img-description](/path/to/image)
_Chú thích Hình ảnh_
```

{: .nolineno}

#### Kích thước

Để ngăn bố cục nội dung trang bị dịch chuyển khi hình ảnh được tải, chúng ta nên đặt chiều rộng và chiều cao cho mỗi hình ảnh.

```markdown
![Desktop View](/assets/img/sample/mockup.png){: width="700" height="400" }
```

{: .nolineno}

> Đối với SVG, bạn phải chỉ định ít nhất _chiều rộng_ của nó, nếu không nó sẽ không được hiển thị.
{: .prompt-info }

Bắt đầu từ _Chirpy v5.0.0_, `height` và `width` hỗ trợ viết tắt (`height` → `h`, `width` → `w`). Ví dụ sau có cùng hiệu quả như trên:

```markdown
![Desktop View](/assets/img/sample/mockup.png){: w="700" h="400" }
```

{: .nolineno}

#### Vị trí

Theo mặc định, hình ảnh được căn giữa, nhưng bạn có thể chỉ định vị trí bằng cách sử dụng một trong các lớp `normal`, `left` và `right`.

> Khi vị trí được chỉ định, không nên thêm chú thích hình ảnh.
{: .prompt-warning }

- **Vị trí bình thường**

  Hình ảnh sẽ được căn trái trong ví dụ dưới đây:

  ```markdown
  ![Desktop View](/assets/img/sample/mockup.png){: .normal }
  ```

  {: .nolineno}

- **Nổi về bên trái**

  ```markdown
  ![Desktop View](/assets/img/sample/mockup.png){: .left }
  ```

  {: .nolineno}

- **Nổi về bên phải**

  ```markdown
  ![Desktop View](/assets/img/sample/mockup.png){: .right }
  ```

  {: .nolineno}

#### Chế độ Tối/Sáng

Bạn có thể làm cho hình ảnh tuân theo tùy chọn giao diện ở chế độ tối/sáng. Điều này yêu cầu bạn chuẩn bị hai hình ảnh, một cho chế độ tối và một cho chế độ sáng, sau đó gán cho chúng một lớp cụ thể (`dark` hoặc `light`):

```markdown
![Light mode only](/path/to/light-mode.png){: .light }
![Dark mode only](/path/to/dark-mode.png){: .dark }
```

#### Đổ bóng

Ảnh chụp màn hình cửa sổ chương trình có thể được xem xét để hiển thị hiệu ứng đổ bóng:

```markdown
![Desktop View](/assets/img/sample/mockup.png){: .shadow }
```

{: .nolineno}

#### Hình ảnh Xem trước

Nếu bạn muốn thêm hình ảnh ở đầu bài viết, hãy cung cấp hình ảnh với độ phân giải `1200 x 630`. Xin lưu ý rằng nếu tỷ lệ khung hình của hình ảnh không đáp ứng `1.91 : 1`, hình ảnh sẽ được thay đổi tỷ lệ và cắt xén.

Biết được các điều kiện tiên quyết này, bạn có thể bắt đầu đặt thuộc tính của hình ảnh:

```yaml
---
image:
  path: /path/to/image
  alt: văn bản thay thế hình ảnh
---
```

Lưu ý rằng [`media_subpath`](#url-prefix) cũng có thể được truyền cho hình ảnh xem trước, nghĩa là khi nó đã được đặt, thuộc tính `path` chỉ cần tên file hình ảnh.

Để sử dụng đơn giản, bạn cũng có thể chỉ sử dụng `image` để xác định đường dẫn.

```yml
---
image: /path/to/image
---
```

#### LQIP

Cho hình ảnh xem trước:

```yaml
---
image:
  lqip: /path/to/lqip-file # hoặc base64 URI
---
```

> Bạn có thể quan sát LQIP trong hình ảnh xem trước của bài viết "[Text and Typography](../text-and-typology/)".

Cho hình ảnh thông thường:

```markdown
![Image description](/path/to/image){: lqip="/path/to/lqip-file" }
```

{: .nolineno }

### Video

#### Nền tảng Mạng xã hội

Bạn có thể nhúng video từ các nền tảng mạng xã hội với cú pháp sau:

```liquid
{% include embed/{Platform}.html id='{ID}' %}
```

Trong đó `Platform` là tên viết thường của nền tảng và `ID` là ID của video.

Bảng sau đây cho thấy cách lấy hai tham số chúng ta cần từ một URL video cụ thể và bạn cũng có thể biết các nền tảng video hiện được hỗ trợ.

| URL Video                                                                                          | Nền tảng   | ID             |
| -------------------------------------------------------------------------------------------------- | ---------- | :------------- |
| [https://www.**youtube**.com/watch?v=**H-B46URT4mg**](https://www.youtube.com/watch?v=H-B46URT4mg) | `youtube`  | `H-B46URT4mg`  |
| [https://www.**twitch**.tv/videos/**1634779211**](https://www.twitch.tv/videos/1634779211)         | `twitch`   | `1634779211`   |
| [https://www.**bilibili**.com/video/**BV1Q44y1B7Wf**](https://www.bilibili.com/video/BV1Q44y1B7Wf) | `bilibili` | `BV1Q44y1B7Wf` |

#### File Video

Nếu bạn muốn nhúng trực tiếp một file video, hãy sử dụng cú pháp sau:

```liquid
{% include embed/video.html src='{URL}' %}
```

Trong đó `URL` là URL đến file video, ví dụ: `/path/to/sample/video.mp4`.

Bạn cũng có thể chỉ định các thuộc tính bổ sung cho file video được nhúng. Đây là danh sách đầy đủ các thuộc tính được phép.

- `poster='/path/to/poster.png'` — hình ảnh áp phích cho video hiển thị khi video đang tải
- `title='Text'` — tiêu đề cho video xuất hiện bên dưới video và trông giống như cho hình ảnh
- `autoplay=true` — video tự động bắt đầu phát lại ngay khi có thể
- `loop=true` — tự động quay lại đầu khi kết thúc video
- `muted=true` — âm thanh sẽ bị tắt ban đầu
- `types` — chỉ định phần mở rộng của các định dạng video bổ sung được phân tách bằng `|`. Đảm bảo các file này tồn tại trong cùng thư mục với file video chính của bạn.

Xem xét một ví dụ sử dụng tất cả những điều trên:

```liquid
{%
  include embed/video.html
  src='/path/to/video.mp4'
  types='ogg|mov'
  poster='poster.png'
  title='Video demo'
  autoplay=true
  loop=true
  muted=true
%}
```

### Âm thanh

Nếu bạn muốn nhúng trực tiếp một file âm thanh, hãy sử dụng cú pháp sau:

```liquid
{% include embed/audio.html src='{URL}' %}
```

Trong đó `URL` là URL đến file âm thanh, ví dụ: `/path/to/audio.mp3`.

Bạn cũng có thể chỉ định các thuộc tính bổ sung cho file âm thanh được nhúng. Đây là danh sách đầy đủ các thuộc tính được phép.

- `title='Text'` — tiêu đề cho âm thanh xuất hiện bên dưới âm thanh và trông giống như cho hình ảnh
- `types` — chỉ định phần mở rộng của các định dạng âm thanh bổ sung được phân tách bằng `|`. Đảm bảo các file này tồn tại trong cùng thư mục với file âm thanh chính của bạn.

Xem xét một ví dụ sử dụng tất cả những điều trên:

```liquid
{%
  include embed/audio.html
  src='/path/to/audio.mp3'
  types='ogg|wav|aac'
  title='Âm thanh demo'
%}
```

## Bài viết Ghim

Bạn có thể ghim một hoặc nhiều bài viết lên đầu trang chủ và các bài viết được ghim sẽ được sắp xếp theo thứ tự ngược lại dựa trên ngày xuất bản. Kích hoạt bằng:

```yaml
---
pin: true
---
```

## Lời nhắc

Có một số loại lời nhắc: `tip`, `info`, `warning` và `danger`. Chúng có thể được tạo bằng cách thêm lớp `prompt-{type}` vào blockquote. Ví dụ, xác định lời nhắc loại `info` như sau:

```md
> Dòng ví dụ cho lời nhắc.
{: .prompt-info }
```

{: .nolineno }

## Cú pháp

### Mã Nội dòng

```md
`phần mã nội dòng`
```

{: .nolineno }

### Đánh dấu Đường dẫn File

```md
`/path/to/a/file.extend`{: .filepath}
```

{: .nolineno }

### Khối Mã

Ký hiệu Markdown ```` ``` ```` có thể dễ dàng tạo khối mã như sau:

````md
```
Đây là một đoạn mã văn bản thường.
```
````

#### Chỉ định Ngôn ngữ

Sử dụng ```` ```{ngôn_ngữ} ```` bạn sẽ nhận được khối mã có tô sáng cú pháp:

````markdown
```yaml
key: value
```
````

> Thẻ Jekyll `{% highlight %}` không tương thích với theme này.
{: .prompt-danger }

#### Số dòng

Theo mặc định, tất cả ngôn ngữ ngoại trừ `plaintext`, `console` và `terminal` sẽ hiển thị số dòng. Khi bạn muốn ẩn số dòng của khối mã, hãy thêm lớp `nolineno` vào nó:

````markdown
```shell
echo 'Không còn số dòng nữa!'
```
{: .nolineno }
````

#### Chỉ định Tên File

Bạn có thể nhận thấy rằng ngôn ngữ mã sẽ được hiển thị ở đầu khối mã. Nếu bạn muốn thay thế nó bằng tên file, bạn có thể thêm thuộc tính `file` để đạt được điều này:

````markdown
```shell
# nội dung
```
{: file="path/to/file" }
````

#### Mã Liquid

Nếu bạn muốn hiển thị đoạn mã **Liquid**, hãy bao quanh mã liquid bằng `{% raw %}` và `{% endraw %}`:

````markdown
{% raw %}
```liquid
{% if product.title contains 'Pack' %}
  Tiêu đề sản phẩm này chứa từ Pack.
{% endif %}
```
{% endraw %}
````

Hoặc thêm `render_with_liquid: false` (Yêu cầu Jekyll 4.0 trở lên) vào khối YAML của bài viết.

## Toán học

Chúng tôi sử dụng [**MathJax**][mathjax] để tạo toán học. Vì lý do hiệu suất website, tính năng toán học sẽ không được tải theo mặc định. Nhưng nó có thể được kích hoạt bằng:

[mathjax]: https://www.mathjax.org/

```yaml
---
math: true
---
```

Sau khi kích hoạt tính năng toán học, bạn có thể thêm phương trình toán học với cú pháp sau:

- **Toán học khối** nên được thêm với `$$ toán $$` với các dòng trống **bắt buộc** trước và sau `$$`
  - **Chèn đánh số phương trình** nên được thêm với `$$\begin{equation} toán \end{equation}$$`
  - **Tham chiếu đánh số phương trình** nên được thực hiện với `\label{eq:label_name}` trong khối phương trình và `\eqref{eq:label_name}` nội dòng với văn bản (xem ví dụ dưới đây)
- **Toán học nội dòng** (trong dòng) nên được thêm với `$$ toán $$` không có bất kỳ dòng trống nào trước hoặc sau `$$`
- **Toán học nội dòng** (trong danh sách) nên được thêm với `\$$ toán $$`

```markdown
<!-- Toán học khối, giữ tất cả các dòng trống -->

$$
Biểu_thức_LaTeX
$$

<!-- Đánh số phương trình, giữ tất cả các dòng trống  -->

$$
\begin{equation}
  Biểu_thức_LaTeX
  \label{eq:label_name}
\end{equation}
$$

Có thể được tham chiếu như \eqref{eq:label_name}.

<!-- Toán học nội dòng trong dòng, KHÔNG có dòng trống -->

"Lorem ipsum dolor sit amet, $$ Biểu_thức_LaTeX $$ consectetur adipiscing elit."

<!-- Toán học nội dòng trong danh sách, thoát `$` đầu tiên -->

1. \$$ Biểu_thức_LaTeX $$
2. \$$ Biểu_thức_LaTeX $$
3. \$$ Biểu_thức_LaTeX $$
```

> Bắt đầu từ `v7.0.0`, các tùy chọn cấu hình cho **MathJax** đã được chuyển đến file `assets/js/data/mathjax.js`{: .filepath } và bạn có thể thay đổi các tùy chọn khi cần, chẳng hạn như thêm [tiện ích mở rộng][mathjax-exts].  
> Nếu bạn đang xây dựng site qua `chirpy-starter`, hãy sao chép file đó từ thư mục cài đặt gem (kiểm tra bằng lệnh `bundle info --path jekyll-theme-chirpy`) vào cùng thư mục trong kho lưu trữ của bạn.
{: .prompt-tip }

[mathjax-exts]: https://docs.mathjax.org/en/latest/input/tex/extensions/index.html

## Mermaid

[**Mermaid**](https://github.com/mermaid-js/mermaid) là một công cụ tạo sơ đồ tuyệt vời. Để kích hoạt nó trên bài viết của bạn, hãy thêm vào khối YAML:

```yaml
---
mermaid: true
---
```

Sau đó, bạn có thể sử dụng nó như các ngôn ngữ markdown khác: bao quanh mã sơ đồ bằng ```` ```mermaid ```` và ```` ``` ````.

## Tìm hiểu thêm

Để biết thêm kiến thức về bài viết Jekyll, hãy truy cập [Jekyll Docs: Posts](https://jekyllrb.com/docs/posts/).
