// Stubbed CMS package - basehub not needed for MySetlist
// This package is kept to maintain Next-Forge compatibility

export type PostMeta = {
  _slug: string;
  _title: string;
  authors: Array<{
    _title: string;
    avatar: {
      url: string;
      width: number;
      height: number;
      alt: string;
      blurDataURL: string;
    };
    xUrl: string;
  }>;
  categories: Array<{
    _title: string;
  }>;
  date: string;
  description: string;
  image: {
    url: string;
    width: number;
    height: number;
    alt: string;
    blurDataURL: string;
  };
};

export type Post = PostMeta & {
  body: {
    plainText: string;
    json: {
      content: any;
      toc: any;
    };
    readingTime: number;
  };
};

export type LegalPostMeta = {
  _slug: string;
  _title: string;
  description: string;
};

export type LegalPost = LegalPostMeta & {
  body: {
    plainText: string;
    json: {
      content: any;
      toc: any;
    };
    readingTime: number;
  };
};

export const blog = {
  postsQuery: {},
  latestPostQuery: {},
  postQuery: (slug: string) => ({}),

  getPosts: async (): Promise<PostMeta[]> => {
    return [];
  },

  getLatestPost: async () => {
    return null;
  },

  getPost: async (slug: string) => {
    return null;
  },
};

export const legal = {
  postsQuery: {},
  latestPostQuery: {},
  postQuery: (slug: string) => ({}),

  getPosts: async (): Promise<LegalPost[]> => {
    return [];
  },

  getLatestPost: async () => {
    return null;
  },

  getPost: async (slug: string) => {
    return null;
  },
};
