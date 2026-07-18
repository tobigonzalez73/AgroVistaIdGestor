import { ThumbsUp, ThumbsDown, MessageSquare, Share2, MoreHorizontal, FileText, Trash2, Send } from 'lucide-react';
import { useState } from 'react';
import type { WallPost } from '../../types/wall';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useWall } from '../../hooks/useWall';
import { useChatContext } from '../../context/ChatContext';
import { MOCK_USERS } from '../../services/chatService';

interface WallPostItemProps {
    post: WallPost;
}

export default function WallPostItem({ post }: WallPostItemProps) {
    const { toggleLike, toggleDislike, deletePost, addComment, reactToComment } = useWall();
    const { currentUser } = useChatContext();
    const [isCommenting, setIsCommenting] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const author = MOCK_USERS.find((u: any) => u.id === post.authorId) || { name: 'Usuario Desconocido' };
    const myLike = currentUser ? post.likes.includes(currentUser.id) : false;
    const myDislike = currentUser ? post.dislikes?.includes(currentUser.id) : false;
    const isAuthor = currentUser?.id === post.authorId;

    const formattedDate = () => {
        try {
            const date = new Date(post.createdAt);
            return formatDistanceToNow(date, { addSuffix: true, locale: es });
        } catch (error) {
            return String(post.createdAt);
        }
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await addComment(post.id, commentText.trim());
            setCommentText('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 mb-6 transition-all hover:shadow-md">
            {/* Header: Professional Card Style */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800">
                        {(author?.name || (author as any)?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 dark:text-slate-100 text-[15px]">
                            {author.name}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                            {formattedDate()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isAuthor && (
                        <button
                            onClick={() => window.confirm('¿Eliminar publicación?') && deletePost(post.id)}
                            className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button className="text-slate-300 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="mb-5">
                <p className="text-slate-900 dark:text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </p>

                {post.attachments && post.attachments.length > 0 && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                        {post.attachments.map((file, idx) => (
                            <div key={idx} className="relative bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                {file.type === 'image' ? (
                                    <img src={file.url} alt="post" className="w-full h-auto max-h-[500px] object-contain" />
                                ) : file.type === 'video' ? (
                                    <video src={file.url} controls className="w-full max-h-[500px]" />
                                ) : (
                                    <div className="w-full p-6 flex flex-col items-center">
                                        <FileText className="w-12 h-12 text-emerald-500 mb-3" />
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
                                        <a href={file.url} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold hover:bg-emerald-700 transition shadow-sm">Descargar Archivo</a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Stats & Summary - Muestra quienes pusieron me gusta */}
            {(post.likes.length > 0 || (post.dislikes?.length || 0) > 0) && (
                <div className="flex flex-wrap gap-2 mb-4 px-1">
                    {post.likes.length > 0 && (
                        <div className="flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-full border border-slate-100 dark:border-slate-700/50">
                            <ThumbsUp className="w-3 h-3 text-emerald-500 mr-1.5 fill-emerald-500/20" />
                            <span>
                                {post.likes.slice(0, 2).map(uid => MOCK_USERS.find(u => u.id === uid)?.name).join(', ')}
                                {post.likes.length > 2 ? ` y ${post.likes.length - 2} más` : ''}
                            </span>
                        </div>
                    )}
                    {(post.dislikes?.length || 0) > 0 && (
                        <div className="flex items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-full border border-slate-100 dark:border-slate-700/50">
                            <ThumbsDown className="w-3 h-3 text-rose-500 mr-1.5 fill-rose-500/20" />
                            <span>
                                {post.dislikes?.slice(0, 2).map(uid => MOCK_USERS.find(u => u.id === uid)?.name).join(', ')}
                                {post.dislikes!.length > 2 ? ` y ${post.dislikes!.length - 2} más` : ''}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toggleLike(post.id, myLike)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black text-sm ${myLike ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <ThumbsUp className={`w-4 h-4 ${myLike ? 'fill-current' : ''}`} />
                        <span>{post.likes.length > 0 ? post.likes.length : 'Me gusta'}</span>
                    </button>

                    <button
                        onClick={() => toggleDislike(post.id, myDislike)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black text-sm ${myDislike ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <ThumbsDown className={`w-4 h-4 ${myDislike ? 'fill-current' : ''}`} />
                    </button>

                    <button
                        onClick={() => setIsCommenting(!isCommenting)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black text-sm ${isCommenting ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>Comentar {post.comments && post.comments.length > 0 ? `(${post.comments.length})` : ''}</span>
                    </button>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all font-black text-sm">
                    <Share2 className="w-4 h-4" />
                </button>
            </div>

            {/* Comments Section */}
            {(isCommenting || (post.comments && post.comments.length > 0)) && (
                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    {/* Lista de comentarios */}
                    <div className="space-y-4 mb-5">
                        {[...post.comments || []].reverse().map((comment, idx) => {
                            const cAuthor = MOCK_USERS.find(u => u.id === comment.authorId);
                            const cLiked = currentUser && comment.likes?.includes(currentUser.id);
                            const cDisliked = currentUser && comment.dislikes?.includes(currentUser.id);

                            return (
                                <div key={idx} className="flex gap-3 items-start group">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                                        {(cAuthor?.name || (cAuthor as any)?.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-4 py-2.5">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
                                                    {cAuthor?.name || 'Usuario'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                                    {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: false }).replace('hace ', '')}
                                                </span>
                                            </div>
                                            <p className="text-slate-800 dark:text-slate-300 text-[13px] leading-snug">
                                                {comment.content}
                                            </p>
                                        </div>
                                        {/* Acciones de comentario */}
                                        <div className="flex items-center gap-4 mt-1.5 ml-4">
                                            <button
                                                onClick={() => reactToComment(post.id, comment.id, 'like')}
                                                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-tight transition-colors ${cLiked ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}
                                            >
                                                <ThumbsUp className={`w-3 h-3 ${cLiked ? 'fill-current' : ''}`} />
                                                {comment.likes && comment.likes.length > 0 && comment.likes.length}
                                            </button>
                                            <button
                                                onClick={() => reactToComment(post.id, comment.id, 'dislike')}
                                                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-tight transition-colors ${cDisliked ? 'text-rose-600' : 'text-slate-400 hover:text-rose-500'}`}
                                            >
                                                <ThumbsDown className={`w-3 h-3 ${cDisliked ? 'fill-current' : ''}`} />
                                                {comment.dislikes && comment.dislikes.length > 0 && comment.dislikes.length}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Input nuevo comentario */}
                    <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-[10px] font-black text-emerald-600 shrink-0 border border-emerald-100 dark:border-emerald-800">
                            {(currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && commentText.trim()) {
                                        handleCommentSubmit();
                                    }
                                }}
                                placeholder="Escribe una respuesta..."
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleCommentSubmit}
                            disabled={!commentText.trim() || isSubmitting}
                            className={`p-2 rounded-xl transition-all ${commentText.trim() && !isSubmitting ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-300'}`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
