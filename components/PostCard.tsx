'use client';

import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { cn, formatRelativeTime, unescapeHtml } from '@/lib/utils';

export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  author: { id: string; username: string };
  comments: { id: string }[];
}

interface PostCardProps {
  post: Post;
  liked: boolean;
  likeLoading?: boolean;
  onLike: () => void;
}

const PREVIEW_LENGTH = 200;

export default function PostCard({ post, liked, likeLoading, onLike }: PostCardProps) {
  const rawContent = unescapeHtml(post.content);
  const preview =
    rawContent.length > PREVIEW_LENGTH ? rawContent.slice(0, PREVIEW_LENGTH) + '…' : rawContent;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm">
      {/* Title */}
      <Link href={`/posts/${post.id}`} className="group">
        <h2 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
          {unescapeHtml(post.title)}
        </h2>
      </Link>

      {/* Meta */}
      <p className="text-sm text-muted">
        <Link
          href={`/users/${post.author.username}`}
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          {post.author.username}
        </Link>
        {' · '}
        {formatRelativeTime(post.createdAt)}
      </p>

      {/* Content preview */}
      <p className="text-sm leading-relaxed text-foreground">{preview}</p>

      {/* Action bar */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={onLike}
          disabled={likeLoading}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50',
            liked ? 'text-primary' : 'text-muted hover:text-primary'
          )}
        >
          <Heart className={cn('h-4 w-4', liked && 'fill-primary')} />
          <span>{post.likes}</span>
        </button>

        <Link
          href={`/posts/${post.id}#comments`}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments.length}</span>
        </Link>
      </div>
    </article>
  );
}
