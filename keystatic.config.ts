import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    // Tự động dùng chế độ local file system ở máy cá nhân (khi chạy pnpm dev) 
    // và chế độ github trên environment production (khi được build và host trên Github Pages)
    kind: process.env.NODE_ENV === 'development' ? 'local' : 'github',
    repo: {
      owner: 'ptminh-kmp',
      name: 'ptminh-kmp.github.io'
    }
  },
  collections: {
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        lang: fields.select({
             label: 'Language',
             defaultValue: 'vi',
             options: [
               { label: 'Tiếng Việt', value: 'vi' },
               { label: 'English', value: 'en' },
             ]
        }),
        description: fields.text({ label: 'Description', multiline: true }),
        author: fields.text({ label: 'Author', defaultValue: 'minhpt' }),
        published: fields.date({ label: 'Publish Date', validation: { isRequired: true } }),
        updated: fields.date({ label: 'Update Date' }),
        category: fields.text({ label: 'Category' }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (props: any) => props.value }),
        image: fields.text({ label: 'Image URL' }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: fields.markdoc({ label: 'Content' }),
      },
    }),
  },
});
