import { extractImageUrlsFromMarkdown } from '@/lib/utils/markdown';

describe('extractImageUrlsFromMarkdown', () => {
  it('should extract a single image URL', () => {
    const md = `Hello! ![Alt text](https://foo.bar/img.png)`;
    expect(extractImageUrlsFromMarkdown(md)).toEqual([
      'https://foo.bar/img.png',
    ]);
  });

  it('should extract multiple image URLs', () => {
    const md = `![first](https://a.com/img1.jpg) and ![second](https://b.com/img2.svg)`;
    expect(extractImageUrlsFromMarkdown(md)).toEqual([
      'https://a.com/img1.jpg',
      'https://b.com/img2.svg',
    ]);
  });

  it('should ignore links that are not images', () => {
    const md = '[regular link](https://foo.com)\n![pic](https://img.com/x.png)';
    expect(extractImageUrlsFromMarkdown(md)).toEqual([
      'https://img.com/x.png',
    ]);
  });

  it('should work with image titles', () => {
    const md = '![](http://foo/img.png "awesome image")';
    expect(extractImageUrlsFromMarkdown(md)).toEqual([
      'http://foo/img.png',
    ]);
  });

  it('should return an empty array if no images', () => {
    const md = 'This text ![is not] a picture.';
    expect(extractImageUrlsFromMarkdown(md)).toEqual([]);
  });

  it('should handle images with spaces in URLs', () => {
    const md = '![s p a c e](https://f o o.com/img.png)';
    expect(extractImageUrlsFromMarkdown(md)).toEqual([
      'https://f o o.com/img.png',
    ]);
  });

  it('should handle tricky/edge markdown cases', () => {
    const md = '![](https://x.com/x(y).png)';
    expect(extractImageUrlsFromMarkdown(md)).toEqual([
      'https://x.com/x(y).png',
    ]);
  });
});
