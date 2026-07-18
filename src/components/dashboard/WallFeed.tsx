import { useWall } from '../../hooks/useWall';
import PostCreator from '../wall/PostCreator';
import WallPostItem from '../wall/WallPostItem';
import { Activity } from 'lucide-react';

export default function WallFeed() {
    const { posts, loading } = useWall();

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
            <div className="mb-6 flex items-center">
                <Activity className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Muro de Actividad
                </h2>
            </div>

            <PostCreator />

            <div className="flex-1 overflow-y-auto pb-8 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                ) : posts.length > 0 ? (
                    posts.map(post => (
                        <WallPostItem key={post.id} post={post} />
                    ))
                ) : (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Aún no hay publicaciones</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Sé el primero en compartir una novedad con el equipo.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
